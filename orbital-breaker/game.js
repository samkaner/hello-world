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

  // ---------- Sound (cute little WebAudio chimes) ----------
  // No audio files — every sound is synthesized from soft sine/triangle
  // notes on a pentatonic scale, with gentle attacks so nothing is harsh.
  const Sound = {
    ctx: null,
    master: null,
    enabled: localStorage.getItem("ob_mute") !== "1",
    ensure() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      } catch (e) { this.ctx = null; }
    },
    resume() {
      this.ensure();
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    },
    setEnabled(on) {
      this.enabled = on;
      localStorage.setItem("ob_mute", on ? "0" : "1");
    },
    // one soft, rounded note
    note(freq, t0, dur, opts) {
      if (!this.ctx) return;
      const { type = "sine", gain = 0.3, glideTo = null } = opts || {};
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0);
      o.stop(t0 + dur + 0.03);
    },
    play(name) {
      if (!this.enabled) return;
      this.ensure();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const t = this.ctx.currentTime;
      // C5 D5 E5 G5 A5 C6 — a sweet, always-consonant scale
      const P = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      const r = () => P[(Math.random() * P.length) | 0];
      switch (name) {
        case "hit":
          this.note(r(), t, 0.13, { type: "triangle", gain: 0.2 });
          break;
        case "break": {
          const f = r();
          this.note(f, t, 0.16, { type: "triangle", gain: 0.22 });
          this.note(f * 2, t + 0.02, 0.12, { type: "sine", gain: 0.09 });
          break;
        }
        case "bounce":
          this.note(392, t, 0.15, { type: "sine", gain: 0.26, glideTo: 523.25 });
          break;
        case "powerup":
          [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
            this.note(f, t + i * 0.06, 0.2, { type: "sine", gain: 0.24 }));
          break;
        case "life":
          this.note(659.25, t, 0.16, { type: "sine", gain: 0.28 });
          this.note(987.77, t + 0.09, 0.24, { type: "sine", gain: 0.28 });
          break;
        case "lose":
          this.note(523.25, t, 0.5, { type: "sine", gain: 0.28, glideTo: 261.63 });
          break;
        case "level":
          [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
            this.note(f, t + i * 0.09, 0.28, { type: "triangle", gain: 0.24 }));
          break;
        case "launch":
          this.note(783.99, t, 0.12, { type: "sine", gain: 0.26, glideTo: 1318.5 });
          break;
        case "start":
          [659.25, 783.99, 1046.5].forEach((f, i) =>
            this.note(f, t + i * 0.08, 0.24, { type: "sine", gain: 0.24 }));
          break;
      }
    },
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
    Sound.resume();
    usingMouse = true;
    paddle.target = pointerAngle(e.clientX, e.clientY);
    primaryAction();
  });
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    Sound.resume();
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
    if (e.code === "Space" || e.key === "Enter") { e.preventDefault(); Sound.resume(); primaryAction(); }
    if (e.key === "p" || e.key === "P") togglePause();
    if (e.key === "m" || e.key === "M") toggleSound();
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
    soundBtn: document.getElementById("sound-btn"),
  };
  el.best.textContent = G.best;

  el.startBtn.addEventListener("click", () => { Sound.resume(); startGame(); });
  el.pauseBtn.addEventListener("click", (e) => { e.preventDefault(); Sound.resume(); togglePause(); });
  el.soundBtn.addEventListener("click", (e) => { e.preventDefault(); Sound.resume(); toggleSound(); });

  function updateSoundBtn() {
    el.soundBtn.textContent = Sound.enabled ? "🔊" : "🔇";
    el.soundBtn.setAttribute("aria-label", Sound.enabled ? "Mute" : "Unmute");
  }
  function toggleSound() {
    Sound.setEnabled(!Sound.enabled);
    updateSoundBtn();
    if (Sound.enabled) Sound.play("hit");
  }
  updateSoundBtn();
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
    buildScenery();

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

  // ---------- Scenery: drifting clouds + twinkling sparkles ----------
  let sparkles = [];
  let clouds = [];
  function buildScenery() {
    sparkles = [];
    const n = Math.floor((W * H) / 13000);
    for (let i = 0; i < n; i++) {
      sparkles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.6 + 0.6,
        a: Math.random() * 0.5 + 0.25,
        tw: Math.random() * TAU,
      });
    }
    clouds = [];
    const nc = Math.max(4, Math.floor(W / 240));
    for (let i = 0; i < nc; i++) {
      clouds.push({
        x: Math.random() * (W + 240) - 120,
        y: Math.random() * H,
        s: Math.random() * 0.7 + 0.55,
        spd: Math.random() * 9 + 4,       // px/sec, gentle drift
        a: Math.random() * 0.22 + 0.12,
      });
    }
  }

  // ---------- Level building ----------
  // soft pastel candy hues: sky-blue, mint, lavender, pink, butter, aqua
  const RING_HUES = [203, 165, 260, 335, 48, 190];

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
        Sound.play("launch");
      }
    }
  }

  // ---------- Effects ----------
  function burst(x, y, hue, count, power) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const sp = (Math.random() * 2.4 + 0.6) * (power || 1);
      const heart = Math.random() < 0.25;
      G.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: Math.random() * 2.4 + 1.4,
        life: 1,
        decay: Math.random() * 0.03 + 0.02,
        hue,
        shape: heart ? "heart" : "dot",
      });
    }
  }

  // a shower of little hearts (for power-up pickups)
  function heartBurst(x, y, count, hue) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const sp = Math.random() * 2.6 + 0.8;
      G.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.6,
        r: Math.random() * 2.6 + 2,
        life: 1,
        decay: Math.random() * 0.02 + 0.014,
        hue: hue == null ? 335 : hue,
        shape: "heart",
      });
    }
  }

  function floatText(text, x, y, color) {
    G.floaters.push({ text, x, y, life: 1, color });
  }

  // ---------- Powerups ----------
  const PU_TYPES = [
    { t: "expand", c: "#5fbff9", hue: 205, icon: "🎀", label: "FLUFFY" },
    { t: "slow", c: "#b39dff", hue: 260, icon: "💤", label: "SLEEPY" },
    { t: "multi", c: "#8fd6ff", hue: 200, icon: "☁️", label: "POOF" },
    { t: "life", c: "#ff9ec4", hue: 335, icon: "💗", label: "LOVE" },
  ];
  function maybeDropPowerup(x, y) {
    if (Math.random() > 0.13) return;
    const angle = Math.atan2(y - cy, x - cx);
    const dist = Math.hypot(x - cx, y - cy);
    const def = PU_TYPES[Math.floor(Math.random() * PU_TYPES.length)];
    G.powerups.push({ angle, dist, x, y, type: def.t, color: def.c, hue: def.hue, icon: def.icon, label: def.label });
  }
  function applyPowerup(p) {
    const def = PU_TYPES.find((d) => d.t === p.type);
    floatText(def.icon + " " + def.label, p.x, p.y, p.color);
    heartBurst(p.x, p.y, 14, p.hue);
    Sound.play(p.type === "life" ? "life" : "powerup");
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
    Sound.play("start");
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
    G.shake = 14;
    Sound.play("lose");
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
    showMessage("Oh nooo… ☁️💧", `You floated to level ${G.level} with ${G.score} points.`, "Try again 🩵");
  }
  function levelComplete() {
    G.state = State.LEVELUP;
    G.score += 250;
    saveBest();
    updateHud();
    Sound.play("level");
    showMessage("Yay! Ring cleared ✨", `Level ${G.level} done &mdash; +250 treats!`, "Next cloud ☁️");
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
      showMessage("Nap time 💤", "", "Resume 🩵");
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
          Sound.play("break");
          maybeDropPowerup((r0 + r1) / 2 * Math.cos(br.a0 + br.width / 2) + cx,
                           (r0 + r1) / 2 * Math.sin(br.a0 + br.width / 2) + cy);
        } else {
          G.score += 3 * G.level;
          burst(b.x, b.y, br.hue, 4, 0.7);
          Sound.play("hit");
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
        burst(b.x, b.y, 205, 6, 0.8);
        Sound.play("bounce");
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
    // gently drift the clouds across the sky (always, even on menus)
    for (const c of clouds) {
      c.x += c.spd * dt;
      if (c.x - 140 * c.s > W) c.x = -140 * c.s;
    }
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

  // a fluffy puff = a few overlapping circles
  function drawPuff(x, y, r, fill) {
    ctx.fillStyle = fill;
    const lobes = [
      [0, 0.15, 1], [-0.75, 0.28, 0.68], [0.75, 0.28, 0.68],
      [-0.4, -0.35, 0.62], [0.4, -0.35, 0.62],
    ];
    ctx.beginPath();
    for (const [dx, dy, s] of lobes) {
      ctx.moveTo(x + dx * r + r * s, y + dy * r);
      ctx.arc(x + dx * r, y + dy * r, r * s, 0, TAU);
    }
    ctx.fill();
  }

  function drawHeart(x, y, s, fill) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s / 16, s / 16);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(-8, -4, -6, -12, 0, -6);
    ctx.bezierCurveTo(6, -12, 8, -4, 0, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // the cloud friend at the center — the thing you protect
  // ---------- SVG sprite: the cloud friend ----------
  // Authored as layered vector art, stamped into the canvas. Eyes and mouth are
  // drawn on top in canvas so the little one can blink and look worried.
  const CLOUD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120" width="256" height="256">
<defs>
 <radialGradient id="cl" cx="-16" cy="-20" r="72" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ddefff"/></radialGradient>
</defs>
<g fill="url(#cl)">
 <ellipse cx="-44" cy="4" rx="12" ry="20"/><ellipse cx="44" cy="4" rx="12" ry="20"/>
 <circle cx="-26" cy="8" r="23"/><circle cx="26" cy="8" r="23"/>
 <circle cx="-13" cy="-11" r="21"/><circle cx="14" cy="-9" r="23"/>
 <circle cx="0" cy="12" r="27"/>
</g>
<circle cx="-27" cy="15" r="8.5" fill="#ffb0c8" opacity="0.6"/>
<circle cx="27" cy="15" r="8.5" fill="#ffb0c8" opacity="0.6"/>
</svg>`;
  const cloudImg = new Image();
  let cloudReady = false;
  cloudImg.onload = () => { cloudReady = true; };
  cloudImg.src = "data:image/svg+xml;charset=utf8," + encodeURIComponent(CLOUD_SVG);

  function drawCloudFriend(danger) {
    const bob = Math.sin(G.time * 2) * (R_core * 0.06);
    const worried = danger > 0.55;
    const size = R_core * 3.1;
    ctx.save();
    ctx.translate(cx, cy + bob);

    // soft blue glow so it reads against the sky
    ctx.shadowColor = worried ? "rgba(255,150,170,0.75)" : "rgba(130,195,245,0.75)";
    ctx.shadowBlur = R_core * 0.6;
    if (cloudReady) {
      ctx.drawImage(cloudImg, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(0, 0, R_core, 0, TAU); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // ----- face (canvas so it can emote) -----
    const k = size / 120;                       // sprite units -> px
    const ex = 11 * k, ey = -2 * k, er = 4.6 * k;
    const blink = ((G.time * 0.85) % 4.6) < 0.14;

    for (const sgn of [-1, 1]) {
      const bx = sgn * ex;
      if (blink && !worried) {
        ctx.strokeStyle = "#5a6b86"; ctx.lineWidth = Math.max(1.3, 1.9 * k); ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(bx, ey, er * 0.9, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      } else if (worried) {
        // upside-down U — anxious little eyes
        ctx.strokeStyle = "#5a6b86"; ctx.lineWidth = Math.max(1.4, 2.1 * k); ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(bx, ey + er * 0.3, er * 0.85, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      } else {
        ctx.fillStyle = "#4a5a72";
        ctx.beginPath(); ctx.ellipse(bx, ey, er * 0.78, er, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath(); ctx.arc(bx - er * 0.3, ey - er * 0.36, er * 0.3, 0, TAU); ctx.fill();
      }
    }

    // mouth
    ctx.strokeStyle = "#5a6b86"; ctx.lineWidth = Math.max(1.3, 1.9 * k); ctx.lineCap = "round";
    ctx.beginPath();
    if (worried) {
      ctx.ellipse(0, 11 * k, 2.4 * k, 3 * k, 0, 0, TAU);   // little "o"
    } else {
      ctx.moveTo(-3.2 * k, 8 * k);
      ctx.quadraticCurveTo(0, 12 * k, 3.2 * k, 8 * k);      // gentle smile
    }
    ctx.stroke();

    ctx.restore();
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // shake
    if (G.shake > 0.4) {
      const s = G.shake;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    // sky background — soft light-blue gradient
    const bg = ctx.createLinearGradient(0, -30, 0, H + 30);
    bg.addColorStop(0, "#cbeeff");
    bg.addColorStop(0.5, "#dff4ff");
    bg.addColorStop(1, "#eafaff");
    ctx.fillStyle = bg;
    ctx.fillRect(-30, -30, W + 60, H + 60);

    // fluffy drifting clouds
    for (const c of clouds) {
      drawPuff(c.x, c.y, 26 * c.s, `rgba(255,255,255,${c.a})`);
    }

    // twinkling sparkles
    for (const st of sparkles) {
      const tw = 0.55 + 0.45 * Math.sin(G.time * 2 + st.tw);
      ctx.globalAlpha = st.a * tw;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // outer wall ring — a soft dotted halo
    ctx.strokeStyle = "rgba(120,180,240,0.45)";
    ctx.lineWidth = 3;
    ctx.setLineDash([2, 10]);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, R_wall, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = "butt";

    // bricks — pastel candy tiles with rounded, glossy tops
    ctx.lineJoin = "round";
    for (const b of G.bricks) {
      if (!b.alive) continue;
      const r0 = b.fr0 * maxR, r1 = b.fr1 * maxR;
      const a0 = b.a0, a1 = b.a0 + b.width;
      const health = b.hp / b.maxHp;
      const l = 80 - (1 - health) * 8 + (b.hit > 0 ? 10 : 0);
      ctx.fillStyle = `hsl(${b.hue}, 72%, ${l}%)`;
      ctx.shadowColor = `hsla(${b.hue}, 70%, 72%, 0.9)`;
      ctx.shadowBlur = 10;
      drawRingSector(r0, r1, a0, a1);
      ctx.fill();
      ctx.shadowBlur = 0;
      // glossy inner rim
      ctx.strokeStyle = `hsla(${b.hue}, 90%, 94%, ${0.7 + (b.hit > 0 ? 0.3 : 0)})`;
      ctx.lineWidth = 1.6;
      drawRingSector(r0 + 1.5, r1 - 1.5, a0, a1);
      ctx.stroke();
      if (b.hit > 0) b.hit -= 0.12;
    }
    ctx.shadowBlur = 0;

    // power-ups — bobbing candy bubbles with a cute emoji
    for (const p of G.powerups) {
      const bob = Math.sin(G.time * 4 + p.angle * 3) * 2;
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      const rad = Math.max(11, maxR * 0.03);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, TAU);
      ctx.stroke();
      ctx.font = `${Math.round(rad * 1.15)}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.icon, 0, rad * 0.08);
      ctx.restore();
    }

    // paddle — a puffy little cloud bar
    {
      const a0 = paddle.angle - paddle.half;
      const a1 = paddle.angle + paddle.half;
      const pw = Math.max(9, maxR * 0.036);
      ctx.lineCap = "round";
      // soft blue underglow
      ctx.strokeStyle = "rgba(140,200,255,0.9)";
      ctx.shadowColor = "rgba(120,190,255,0.9)";
      ctx.shadowBlur = 16;
      ctx.lineWidth = pw;
      ctx.beginPath();
      ctx.arc(cx, cy, R_paddle, a0, a1);
      ctx.stroke();
      // fluffy white body
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = pw * 0.68;
      ctx.beginPath();
      ctx.arc(cx, cy, R_paddle, a0, a1);
      ctx.stroke();
      ctx.lineCap = "butt";
    }
    ctx.shadowBlur = 0;

    // core — a cute fluffy cloud friend guarding the center
    {
      const dangerT = G.balls.reduce((m, b) => Math.min(m, b.pd || 999), 999);
      const danger = clamp(1 - (dangerT - R_core) / (R_paddle - R_core), 0, 1);
      drawCloudFriend(danger);
    }

    // particles — soft pastel dots & little hearts
    for (const p of G.particles) {
      const a = clamp(p.life, 0, 1);
      ctx.globalAlpha = a;
      if (p.shape === "heart") {
        drawHeart(p.x, p.y, p.r * (0.9 + p.life) * 1.5, `hsl(${p.hue}, 85%, 72%)`);
      } else {
        ctx.fillStyle = `hsl(${p.hue}, 80%, 80%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // balls — soft white puffs with a shine and a tiny blush
    for (const b of G.balls) {
      ctx.shadowColor = "rgba(150,205,255,0.9)";
      ctx.shadowBlur = 12;
      const grd = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 0, b.x, b.y, b.r);
      grd.addColorStop(0, "#ffffff");
      grd.addColorStop(1, "#d6f0ff");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      // blush
      ctx.fillStyle = "rgba(255,160,190,0.55)";
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.42, b.y + b.r * 0.15, b.r * 0.2, 0, TAU);
      ctx.arc(b.x + b.r * 0.42, b.y + b.r * 0.15, b.r * 0.2, 0, TAU);
      ctx.fill();
      // shine
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.32, b.y - b.r * 0.34, b.r * 0.22, 0, TAU);
      ctx.fill();
    }

    // floaters — cute rounded labels
    for (const f of G.floaters) {
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = "700 15px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
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
