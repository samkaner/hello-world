/* ============================================================
   ORBITAL BREAKER
   A radial take on brick breaker: your paddle orbits a central
   core, bricks surround you in concentric rings, and the ball
   dives inward from any direction. Defend the core.
   ============================================================ */

(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  // normalize angle to (-PI, PI]
  const norm = (a) => {
    a = a % TAU;
    if (a > Math.PI) a -= TAU;
    else if (a <= -Math.PI) a += TAU;
    return a;
  };

  // ---------- Canvas ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  let cx = 0, cy = 0, maxR = 300;

  // Layout radii (derived from maxR)
  let R_core, R_paddle, R_wall, R_brickIn, R_brickOut;

  function computeLayout() {
    R_core = Math.max(22, maxR * 0.10);
    R_paddle = maxR * 0.30;
    R_wall = maxR * 0.99;
    R_brickIn = maxR * 0.45;
    R_brickOut = maxR * 0.93;
  }

  // ---------- Game state ----------
  const State = { MENU: 0, READY: 1, PLAY: 2, PAUSE: 3, LEVELUP: 4, DEAD: 5, WIN: 6 };
  const G = {
    state: State.MENU,
    score: 0,
    best: Number(localStorage.getItem("ob_best") || 0),
    level: 1,
    lives: 3,
    bricks: [],
    balls: [],
    particles: [],
    powerups: [],
    floaters: [],
    speed: 5,
    // temporary effects
    expandT: 0,
    slowT: 0,
    shake: 0,
    time: 0,
  };

  // ---------- Paddle ----------
  const paddle = { angle: -Math.PI / 2, prev: -Math.PI / 2, vel: 0, half: 0.42 };
  const BASE_HALF = 0.42;
  const EXPAND_HALF = 0.72;

  // ---------- Input ----------
  const keys = { left: false, right: false };
  let usingMouse = false;

  function pointerAngle(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - cx;
    const y = clientY - rect.top - cy;
    if (x === 0 && y === 0) return paddle.angle;
    return Math.atan2(y, x);
  }

  canvas.addEventListener("mousemove", (e) => {
    usingMouse = true;
    paddle.target = pointerAngle(e.clientX, e.clientY);
  });
  canvas.addEventListener("mousedown", (e) => {
    e.preventDefault();
    usingMouse = true;
    paddle.target = pointerAngle(e.clientX, e.clientY);
    primaryAction();
  });
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const t = e.touches[0];
    paddle.target = pointerAngle(t.clientX, t.clientY);
    paddle.angle = paddle.target;
    // On touch, a tap only launches — it never pauses. Repositioning the
    // paddle by tapping/dragging should not interrupt play; use the button.
    if (G.state === State.READY) {
      launchStuck();
      G.state = State.PLAY;
      showHint(false);
    }
  }, { passive: false });
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const t = e.touches[0];
    paddle.target = pointerAngle(t.clientX, t.clientY);
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { keys.left = true; usingMouse = false; }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { keys.right = true; usingMouse = false; }
    if (e.code === "Space" || e.key === "Enter") { e.preventDefault(); primaryAction(); }
    if (e.key === "p" || e.key === "P") togglePause();
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
  });

  // ---------- DOM ----------
  const el = {
    score: document.getElementById("score"),
    level: document.getElementById("level"),
    lives: document.getElementById("lives"),
    best: document.getElementById("best"),
    overlay: document.getElementById("overlay"),
    message: document.getElementById("message"),
    msgTitle: document.getElementById("msg-title"),
    msgSub: document.getElementById("msg-sub"),
    msgBtn: document.getElementById("msg-btn"),
    startBtn: document.getElementById("start-btn"),
    hint: document.getElementById("hint"),
    pauseBtn: document.getElementById("pause-btn"),
  };
  el.best.textContent = G.best;

  el.startBtn.addEventListener("click", startGame);
  el.pauseBtn.addEventListener("click", (e) => { e.preventDefault(); togglePause(); });
  el.msgBtn.addEventListener("click", () => {
    if (G.state === State.PAUSE) togglePause();
    else if (G.state === State.LEVELUP) nextLevel();
    else if (G.state === State.DEAD || G.state === State.WIN) startGame();
  });

  // ---------- Resize (keeps everything scaled) ----------
  function resize() {
    const oldCx = cx, oldCy = cy, oldMax = maxR;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2;
    cy = H / 2;
    maxR = Math.min(W, H) / 2 - 16;
    computeLayout();
    buildStars();

    // rescale dynamic objects so a resize doesn't warp play
    if (oldMax > 0) {
      const f = maxR / oldMax;
      const rescale = (o) => {
        const dx = o.x - oldCx, dy = o.y - oldCy;
        const d = Math.hypot(dx, dy) * f;
        const a = Math.atan2(dy, dx);
        o.x = cx + Math.cos(a) * d;
        o.y = cy + Math.sin(a) * d;
        if (o.vx !== undefined) { o.vx *= f; o.vy *= f; }
      };
      G.balls.forEach(rescale);
      G.particles.forEach(rescale);
      G.powerups.forEach((p) => { p.dist *= f; });
    }
  }
  window.addEventListener("resize", resize);

  // ---------- Starfield ----------
  let stars = [];
  function buildStars() {
    stars = [];
    const n = Math.floor((W * H) / 9000);
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.3 + 0.2,
        a: Math.random() * 0.6 + 0.15,
        tw: Math.random() * TAU,
      });
    }
  }

  // ---------- Level building ----------
  const RING_HUES = [188, 268, 320, 44, 150, 210];

  function buildLevel(level) {
    G.bricks = [];
    const rings = Math.min(3 + Math.floor((level - 1) / 1.5), 6);
    const span = R_brickOut - R_brickIn;
    const thick = span / rings;

    for (let i = 0; i < rings; i++) {
      const fr0 = (R_brickIn + i * thick) / maxR;
      const fr1 = (R_brickIn + (i + 1) * thick - thick * 0.16) / maxR;
      const mid = ((fr0 + fr1) / 2) * maxR;
      let sectors = Math.max(9, Math.round((TAU * mid) / 52));
      const full = TAU / sectors;
      const gap = full * 0.16;
      const hue = RING_HUES[i % RING_HUES.length];

      for (let j = 0; j < sectors; j++) {
        // carve a few gaps for a woven look on higher levels
        if (level > 2 && (i * 3 + j) % 11 === 0) continue;
        let hp = 1;
        if (i >= rings - 1 && level >= 2) hp = 2;
        if (level >= 4 && Math.random() < 0.14) hp += 1;
        G.bricks.push({
          fr0, fr1,
          a0: j * full + gap / 2,
          width: full - gap,
          hp, maxHp: hp,
          hue,
          alive: true,
          hit: 0, // flash timer
        });
      }
    }
  }

  function aliveBricks() {
    let n = 0;
    for (const b of G.bricks) if (b.alive) n++;
    return n;
  }

  // ---------- Balls ----------
  function spawnBall(stuck) {
    const b = {
      x: cx + Math.cos(paddle.angle) * (R_paddle + 12),
      y: cy + Math.sin(paddle.angle) * (R_paddle + 12),
      vx: 0, vy: 0,
      r: Math.max(6, maxR * 0.018),
      stuck: !!stuck,
      pd: R_paddle + 12,
      hitThisFrame: false,
    };
    G.balls.push(b);
    return b;
  }

  function launchStuck() {
    for (const b of G.balls) {
      if (b.stuck) {
        b.stuck = false;
        b.vx = Math.cos(paddle.angle) * G.speed;
        b.vy = Math.sin(paddle.angle) * G.speed;
      }
    }
  }

  // ---------- Effects ----------
  function burst(x, y, hue, count, power) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const sp = (Math.random() * 2.4 + 0.6) * (power || 1);
      G.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: Math.random() * 2.4 + 1,
        life: 1,
        decay: Math.random() * 0.03 + 0.02,
        hue,
      });
    }
  }

  function floatText(text, x, y, color) {
    G.floaters.push({ text, x, y, life: 1, color });
  }

  // ---------- Powerups ----------
  const PU_TYPES = [
    { t: "expand", c: "#00e5ff", label: "WIDE" },
    { t: "slow", c: "#8a5cff", label: "SLOW" },
    { t: "multi", c: "#ff3cac", label: "MULTI" },
    { t: "life", c: "#4dff9e", label: "+CORE" },
  ];
  function maybeDropPowerup(x, y) {
    if (Math.random() > 0.11) return;
    const angle = Math.atan2(y - cy, x - cx);
    const dist = Math.hypot(x - cx, y - cy);
    const def = PU_TYPES[Math.floor(Math.random() * PU_TYPES.length)];
    G.powerups.push({ angle, dist, x, y, type: def.t, color: def.c, label: def.label });
  }
  function applyPowerup(p) {
    floatText(PU_TYPES.find((d) => d.t === p.type).label, p.x, p.y, p.color);
    burst(p.x, p.y, 190, 16, 1.4);
    if (p.type === "expand") { G.expandT = 8; paddle.half = EXPAND_HALF; }
    else if (p.type === "slow") { G.slowT = 7; }
    else if (p.type === "life") { G.lives = Math.min(6, G.lives + 1); updateHud(); }
    else if (p.type === "multi") {
      const src = G.balls.find((b) => !b.stuck) || G.balls[0];
      if (src) {
        for (let k = -1; k <= 1; k += 2) {
          const ang = Math.atan2(src.vy, src.vx) + k * 0.4;
          G.balls.push({
            x: src.x, y: src.y,
            vx: Math.cos(ang) * G.speed, vy: Math.sin(ang) * G.speed,
            r: src.r, stuck: false, pd: Math.hypot(src.x - cx, src.y - cy),
            hitThisFrame: false,
          });
        }
      }
    }
  }

  // ---------- Flow ----------
  function startGame() {
    G.score = 0;
    G.level = 1;
    G.lives = 3;
    beginLevel();
    hideOverlays();
  }
  function beginLevel() {
    G.speed = 4.6 * (maxR / 340) * Math.pow(1.06, G.level - 1);
    G.balls = [];
    G.particles = [];
    G.powerups = [];
    G.floaters = [];
    G.expandT = 0; G.slowT = 0;
    paddle.half = BASE_HALF;
    buildLevel(G.level);
    spawnBall(true);
    G.state = State.READY;
    updateHud();
    showHint(true);
  }
  function nextLevel() {
    G.level++;
    beginLevel();
    hideOverlays();
  }
  function loseLife() {
    G.lives--;
    updateHud();
    G.shake = 18;
    if (G.lives <= 0) {
      gameOver();
    } else {
      paddle.half = BASE_HALF;
      G.expandT = 0; G.slowT = 0;
      spawnBall(true);
      G.state = State.READY;
      showHint(true);
    }
  }
  function gameOver() {
    G.state = State.DEAD;
    saveBest();
    showMessage("CORE BREACHED", `You reached level ${G.level} with ${G.score} pts.`, "RETRY");
  }
  function levelComplete() {
    G.state = State.LEVELUP;
    G.score += 250;
    saveBest();
    updateHud();
    showMessage("RING CLEARED", `Level ${G.level} complete &mdash; +250 bonus.`, "NEXT WAVE");
  }
  function saveBest() {
    if (G.score > G.best) {
      G.best = G.score;
      localStorage.setItem("ob_best", String(G.best));
      el.best.textContent = G.best;
    }
  }

  function primaryAction() {
    switch (G.state) {
      case State.MENU: return; // start button handles it
      case State.READY: launchStuck(); G.state = State.PLAY; showHint(false); break;
      case State.PLAY: togglePause(); break;
      case State.PAUSE: togglePause(); break;
      default: break;
    }
  }
  function togglePause() {
    if (G.state === State.PLAY) {
      G.state = State.PAUSE;
      showMessage("PAUSED", "", "RESUME");
    } else if (G.state === State.PAUSE) {
      G.state = State.PLAY;
      hideOverlays();
    }
  }

  // ---------- UI helpers ----------
  function updateHud() {
    el.score.textContent = G.score;
    el.level.textContent = G.level;
    el.lives.textContent = "♥".repeat(Math.max(0, G.lives)) || "—";
  }
  function showMessage(title, sub, btn) {
    el.msgTitle.innerHTML = title;
    el.msgSub.innerHTML = sub || "";
    el.msgBtn.textContent = btn;
    el.message.classList.remove("hidden");
  }
  function hideOverlays() {
    el.overlay.classList.add("hidden");
    el.message.classList.add("hidden");
  }
  function showHint(on) {
    el.hint.classList.toggle("hidden", !on);
  }

  // ---------- Update ----------
  function updatePaddle(dt) {
    paddle.prev = paddle.angle;
    if (usingMouse && paddle.target !== undefined) {
      // ease toward pointer angle along the shortest arc
      const d = norm(paddle.target - paddle.angle);
      paddle.angle += d * Math.min(1, 20 * dt);
    }
    const kb = 4.5 * dt;
    if (keys.left) paddle.angle -= kb;
    if (keys.right) paddle.angle += kb;
    paddle.angle = ((paddle.angle % TAU) + TAU) % TAU;
    paddle.vel = norm(paddle.angle - paddle.prev);
  }

  function reflectRadial(b, nx, ny) {
    const dot = b.vx * nx + b.vy * ny;
    b.vx -= 2 * dot * nx;
    b.vy -= 2 * dot * ny;
  }

  // Advance one ball by `frac` of a full frame's movement. Velocity is kept
  // normalized to the current target speed so reflections never change speed.
  // Called several times per frame (sub-stepping) so fast balls can't tunnel
  // through the thin paddle arc or bricks. Returns false when the ball dies.
  function stepBall(b, frac) {
    if (b.stuck) {
      b.x = cx + Math.cos(paddle.angle) * (R_paddle + 12);
      b.y = cy + Math.sin(paddle.angle) * (R_paddle + 12);
      b.pd = R_paddle + 12;
      return true;
    }
    const spd = G.speed * (G.slowT > 0 ? 0.62 : 1);
    const mag = Math.hypot(b.vx, b.vy) || 1;
    b.vx = (b.vx / mag) * spd;
    b.vy = (b.vy / mag) * spd;

    const prevDist = b.pd;
    b.x += b.vx * frac;
    b.y += b.vy * frac;

    let dx = b.x - cx, dy = b.y - cy;
    let dist = Math.hypot(dx, dy) || 0.0001;
    let nx = dx / dist, ny = dy / dist;
    const ballAngle = Math.atan2(dy, dx);
    const radialV = b.vx * nx + b.vy * ny; // >0 outward

    // Outer wall
    if (dist + b.r > R_wall && radialV > 0) {
      reflectRadial(b, nx, ny);
      const back = (dist + b.r) - R_wall;
      b.x -= nx * back; b.y -= ny * back;
      dist = R_wall - b.r;
    }

    // Bricks (one per step)
    for (const br of G.bricks) {
      if (!br.alive) continue;
      const r0 = br.fr0 * maxR, r1 = br.fr1 * maxR;
      if (dist + b.r < r0 || dist - b.r > r1) continue;
      let d = ((ballAngle - br.a0) % TAU + TAU) % TAU;
      const angTol = b.r / Math.max(1, dist);
      if (d <= br.width + angTol || d >= TAU - angTol) {
        // hit
        reflectRadial(b, nx, ny);
        br.hp--;
        br.hit = 1;
        if (br.hp <= 0) {
          br.alive = false;
          G.score += 10 * G.level;
          burst(b.x, b.y, br.hue, 10, 1.2);
          maybeDropPowerup((r0 + r1) / 2 * Math.cos(br.a0 + br.width / 2) + cx,
                           (r0 + r1) / 2 * Math.sin(br.a0 + br.width / 2) + cy);
        } else {
          G.score += 3 * G.level;
          burst(b.x, b.y, br.hue, 4, 0.7);
        }
        // nudge out of brick along the (now reflected) velocity
        const nm = Math.hypot(b.vx, b.vy) || 1;
        b.x += (b.vx / nm) * (b.r * 0.6);
        b.y += (b.vy / nm) * (b.r * 0.6);
        updateHud();
        break;
      }
    }

    // Paddle (deflect inward-moving ball) — crossing detection
    if (prevDist > R_paddle && dist <= R_paddle + b.r && radialV < 0) {
      const off = norm(ballAngle - paddle.angle);
      if (Math.abs(off) <= paddle.half + b.r / Math.max(1, R_paddle)) {
        const ratio = clamp(off / paddle.half, -1, 1);
        const spin = clamp(paddle.vel * 5, -0.5, 0.5);
        let theta = clamp(ratio * 0.7 + spin, -1.15, 1.15);
        const nnx = Math.cos(ballAngle), nny = Math.sin(ballAngle); // outward
        const tx = -nny, ty = nnx;
        const out = Math.cos(theta), tang = Math.sin(theta);
        b.vx = spd * (out * nnx + tang * tx);
        b.vy = spd * (out * nny + tang * ty);
        const nd = R_paddle + b.r + 1.5;
        b.x = cx + nnx * nd; b.y = cy + nny * nd;
        dist = nd;
        burst(b.x, b.y, 190, 6, 0.8);
      }
    }

    // recompute dist for core check
    dx = b.x - cx; dy = b.y - cy;
    dist = Math.hypot(dx, dy);
    b.pd = dist;

    // Core breach
    if (dist - b.r <= R_core) {
      burst(b.x, b.y, 0, 22, 1.6);
      return false; // ball dies
    }
    return true;
  }

  function update(dt) {
    G.time += dt;
    // pause button is only meaningful while a round is in progress
    const inRound = G.state === State.READY || G.state === State.PLAY || G.state === State.PAUSE;
    el.pauseBtn.classList.toggle("hidden", !inRound);
    if (G.shake > 0) G.shake *= 0.86;
    if (G.expandT > 0) { G.expandT -= dt; if (G.expandT <= 0) paddle.half = BASE_HALF; }
    if (G.slowT > 0) G.slowT -= dt;

    if (G.state === State.READY || G.state === State.PLAY) {
      updatePaddle(dt);
    }

    if (G.state === State.PLAY) {
      const spd = G.speed * (G.slowT > 0 ? 0.62 : 1);
      const survivors = [];
      for (const b of G.balls) {
        // enough sub-steps that each move is well under the ball radius
        const steps = Math.max(1, Math.ceil(spd / (b.r * 0.5)));
        let alive = true;
        for (let s = 0; s < steps && alive; s++) alive = stepBall(b, 1 / steps);
        if (alive) survivors.push(b);
      }
      G.balls = survivors;

      if (G.balls.length === 0) {
        loseLife();
      } else if (aliveBricks() === 0) {
        levelComplete();
      }

      // powerups drift inward
      const keep = [];
      for (const p of G.powerups) {
        p.dist -= 1.15;
        p.x = cx + Math.cos(p.angle) * p.dist;
        p.y = cy + Math.sin(p.angle) * p.dist;
        if (p.dist <= R_core) continue; // missed
        if (p.dist <= R_paddle + 14 && Math.abs(norm(p.angle - paddle.angle)) <= paddle.half) {
          applyPowerup(p);
          updateHud();
          continue;
        }
        keep.push(p);
      }
      G.powerups = keep;
    }

    // particles
    const pk = [];
    for (const p of G.particles) {
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.96; p.vy *= 0.96;
      p.life -= p.decay;
      if (p.life > 0) pk.push(p);
    }
    G.particles = pk;

    // floaters
    const fk = [];
    for (const f of G.floaters) {
      f.y -= 0.6; f.life -= 0.02;
      if (f.life > 0) fk.push(f);
    }
    G.floaters = fk;
  }

  // ---------- Render ----------
  function drawRingSector(r0, r1, a0, a1) {
    ctx.beginPath();
    ctx.arc(cx, cy, r1, a0, a1, false);
    ctx.arc(cx, cy, r0, a1, a0, true);
    ctx.closePath();
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // shake
    if (G.shake > 0.4) {
      const s = G.shake;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    // background
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.3);
    bg.addColorStop(0, "#0a1030");
    bg.addColorStop(0.55, "#070a1c");
    bg.addColorStop(1, "#04050d");
    ctx.fillStyle = bg;
    ctx.fillRect(-30, -30, W + 60, H + 60);

    // stars
    for (const st of stars) {
      const tw = 0.6 + 0.4 * Math.sin(G.time * 2 + st.tw);
      ctx.globalAlpha = st.a * tw;
      ctx.fillStyle = "#bcd2ff";
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // outer wall ring
    ctx.strokeStyle = "rgba(138,92,255,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R_wall, 0, TAU);
    ctx.stroke();

    // bricks
    ctx.lineJoin = "round";
    for (const b of G.bricks) {
      if (!b.alive) continue;
      const r0 = b.fr0 * maxR, r1 = b.fr1 * maxR;
      const a0 = b.a0, a1 = b.a0 + b.width;
      const light = b.hp / b.maxHp; // brighter = healthier
      const l = 42 + light * 16 + (b.hit > 0 ? 30 : 0);
      const sat = 85;
      ctx.fillStyle = `hsl(${b.hue}, ${sat}%, ${l}%)`;
      ctx.shadowColor = `hsl(${b.hue}, ${sat}%, 60%)`;
      ctx.shadowBlur = 14;
      drawRingSector(r0, r1, a0, a1);
      ctx.fill();
      // inner highlight
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `hsla(${b.hue}, 90%, 78%, ${0.5 + (b.hit > 0 ? 0.4 : 0)})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      if (b.hit > 0) b.hit -= 0.12;
    }
    ctx.shadowBlur = 0;

    // powerups
    for (const p of G.powerups) {
      ctx.save();
      ctx.translate(p.x, p.y);
      const pulse = 1 + 0.12 * Math.sin(G.time * 8);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(0, 0, 8 * pulse, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#04121a";
      ctx.font = "bold 9px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.label[0], 0, 0.5);
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    // paddle (arc)
    {
      const a0 = paddle.angle - paddle.half;
      const a1 = paddle.angle + paddle.half;
      const pw = Math.max(7, maxR * 0.03);
      ctx.strokeStyle = "#00e5ff";
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 20;
      ctx.lineWidth = pw;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, cy, R_paddle, a0, a1);
      ctx.stroke();
      // inner glow line
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = pw * 0.35;
      ctx.beginPath();
      ctx.arc(cx, cy, R_paddle, a0, a1);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.lineCap = "butt";

    // core
    {
      const pulse = 1 + 0.06 * Math.sin(G.time * 3);
      const cr = R_core * pulse;
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 1.6);
      const dangerT = G.balls.reduce((m, b) => Math.min(m, b.pd || 999), 999);
      const danger = clamp(1 - (dangerT - R_core) / (R_paddle - R_core), 0, 1);
      const hue = 190 - danger * 190; // shifts to red as ball nears
      grd.addColorStop(0, `hsla(${hue},100%,75%,0.95)`);
      grd.addColorStop(0.6, `hsla(${hue},100%,55%,0.5)`);
      grd.addColorStop(1, `hsla(${hue},100%,50%,0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, cr * 1.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `hsl(${hue},100%,${60 + danger * 15}%)`;
      ctx.shadowColor = `hsl(${hue},100%,60%)`;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      // core ring
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, cr * 0.62, G.time, G.time + Math.PI * 1.3);
      ctx.stroke();
    }

    // particles
    for (const p of G.particles) {
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = `hsl(${p.hue}, 90%, 65%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // balls
    for (const b of G.balls) {
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 16;
      const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      grd.addColorStop(0, "#ffffff");
      grd.addColorStop(1, "#8ad6ff");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // floaters
    for (const f of G.floaters) {
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // reset transform (undo shake)
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // ---------- Main loop ----------
  let last = performance.now();
  function loop(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05; // clamp big frame gaps
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // ---------- Boot ----------
  resize();
  updateHud();
  requestAnimationFrame(loop);

  // Register the service worker so the game installs & runs offline as a PWA.
  // (No-op under file://; needs to be served over http/https.)
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
