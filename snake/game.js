/* ============================================================
   BEAVER CHASE
   A Meerca-Chase-inspired snake: steer a bucktoothed beaver
   around a woodland board, chomp goodies to grow your tail,
   dodge rocks & critters, and survive snappy ~30s levels.
   ============================================================ */

(() => {
  "use strict";

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const randInt = (n) => (Math.random() * n) | 0;
  const choice = (arr) => arr[randInt(arr.length)];

  // ---------- Sound (cute WebAudio SFX) ----------
  const Sound = {
    ctx: null, master: null,
    enabled: localStorage.getItem("bc_mute") !== "1",
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
    resume() { this.ensure(); if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },
    setEnabled(on) { this.enabled = on; localStorage.setItem("bc_mute", on ? "0" : "1"); },
    note(freq, t0, dur, opts) {
      if (!this.ctx) return;
      const { type = "sine", gain = 0.3, glideTo = null } = opts || {};
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + dur + 0.03);
    },
    play(name) {
      if (!this.enabled) return;
      this.ensure(); if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const t = this.ctx.currentTime;
      const P = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      switch (name) {
        case "chomp":
          this.note(320, t, 0.08, { type: "square", gain: 0.16, glideTo: 200 });
          break;
        case "gem":
          [784, 988, 1319].forEach((f, i) => this.note(f, t + i * 0.05, 0.16, { type: "triangle", gain: 0.22 }));
          break;
        case "special":
          [523, 659, 880, 1174].forEach((f, i) => this.note(f, t + i * 0.05, 0.18, { type: "sine", gain: 0.22 }));
          break;
        case "crash":
          this.note(300, t, 0.35, { type: "sawtooth", gain: 0.2, glideTo: 90 });
          break;
        case "level":
          [523, 659, 784, 1046, 1319].forEach((f, i) => this.note(f, t + i * 0.08, 0.26, { type: "triangle", gain: 0.22 }));
          break;
        case "start":
          [659, 784, 1046].forEach((f, i) => this.note(f, t + i * 0.08, 0.22, { type: "sine", gain: 0.22 }));
          break;
        case "gameover":
          [659, 523, 392, 262].forEach((f, i) => this.note(f, t + i * 0.14, 0.32, { type: "sine", gain: 0.24 }));
          break;
      }
    },
  };

  // ---------- Canvas & layout ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  let N = 16;                       // grid cells per side (fixed per session)
  let cell = 30, boardX = 0, boardY = 0, boardPx = 0;
  const isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

  function computeLayout() {
    const top = 62;
    const bottom = isTouch ? 176 : 40;
    const availW = W - 20;
    const availH = H - top - bottom;
    boardPx = Math.max(120, Math.min(availW, availH));
    cell = Math.floor(boardPx / N);
    boardPx = cell * N;
    boardX = Math.round((W - boardPx) / 2);
    boardY = Math.round(top + (availH - boardPx) / 2);
  }
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    computeLayout();
  }
  window.addEventListener("resize", resize);

  // grid -> pixel center
  const px = (gx) => boardX + gx * cell + cell / 2;
  const py = (gy) => boardY + gy * cell + cell / 2;
  const key = (x, y) => x + "," + y;

  // ---------- State ----------
  const State = { MENU: 0, INTRO: 1, PLAY: 2, PAUSE: 3, DEAD: 4 };
  const G = {
    state: State.MENU,
    score: 0,
    best: Number(localStorage.getItem("bc_best") || 0),
    level: 1,
    lives: 3,
    timeLeft: 30,
    tick: 0.18,           // seconds per grid step
    acc: 0,               // tick accumulator
    combo: 0, comboT: 0,
    invuln: 0,
    starT: 0, shield: false, speedT: 0,
    introT: 0,
    shake: 0,
    time: 0,
    target: 0,
  };

  // snake as list of grid cells (head first); prev = pre-tick copy for lerp
  let snake = [], snakePrev = [], dir = { x: 1, y: 0 }, dirQueue = [], grow = 0;
  let items = [], special = null, specialT = 0, nextSpecial = 0;
  let rocks = new Set(), hazards = [];
  let floaters = [], puffs = [];

  // ---------- Level design ----------
  const LEVEL_NAMES = [
    "Pondside Picnic", "Log Jam", "Rocky Rapids", "Critter Creek",
    "Dam Chaos", "Timber Trouble", "Rapids of Doom", "Beaver Fever",
  ];
  function levelConfig(level) {
    return {
      tick: Math.max(0.085, 0.185 - (level - 1) * 0.012),
      rocks: Math.min(2 + (level - 1) * 3, 46),
      hazards: level >= 3 ? Math.min(level - 2, 5) : 0,
      target: 30 + (level - 1) * 25,
      duration: 30,
    };
  }

  // ---------- Items / specials ----------
  // kind: glyph, points, grow, weight, effect
  const ITEM_TYPES = [
    { k: "log", g: "🪵", pts: 1, grow: 1, w: 55 },
    { k: "acorn", g: "🌰", pts: 3, grow: 1, w: 28 },
    { k: "berry", g: "🍓", pts: 5, grow: 1, w: 13, speed: true },
    { k: "gem", g: "💎", pts: 15, grow: 2, w: 4 },
  ];
  const SPECIAL_TYPES = [
    { k: "star", g: "⭐", pts: 10, label: "INVINCIBEAVER!" },
    { k: "clock", g: "⏱️", pts: 10, label: "+6 SECONDS" },
    { k: "shrink", g: "🌀", pts: 10, label: "TIDY TAIL" },
    { k: "shield", g: "🛡️", pts: 10, label: "SHIELDED" },
    { k: "bolt", g: "⚡", pts: 5, label: "ZOOMIES" },
  ];
  function weightedItem() {
    const total = ITEM_TYPES.reduce((s, t) => s + t.w, 0);
    let r = Math.random() * total;
    for (const t of ITEM_TYPES) { if ((r -= t.w) <= 0) return t; }
    return ITEM_TYPES[0];
  }

  // ---------- Occupancy / spawning ----------
  function occupied() {
    const s = new Set();
    for (const c of snake) s.add(key(c.x, c.y));
    for (const r of rocks) s.add(r);
    for (const it of items) s.add(key(it.x, it.y));
    for (const h of hazards) s.add(key(h.x, h.y));
    if (special) s.add(key(special.x, special.y));
    return s;
  }
  function freeCell(avoidCenter) {
    const occ = occupied();
    for (let tries = 0; tries < 300; tries++) {
      const x = randInt(N), y = randInt(N);
      if (occ.has(key(x, y))) continue;
      if (avoidCenter && Math.abs(x - N / 2) < 3 && Math.abs(y - N / 2) < 3) continue;
      return { x, y };
    }
    return null;
  }
  function spawnItem() {
    const spot = freeCell(false);
    if (!spot) return;
    const t = weightedItem();
    items.push({ x: spot.x, y: spot.y, ...t });
  }
  function spawnSpecial() {
    const spot = freeCell(true);
    if (!spot) return;
    const t = choice(SPECIAL_TYPES);
    special = { x: spot.x, y: spot.y, ...t, life: 7 };
  }

  // ---------- Level flow ----------
  function buildLevel() {
    const cfg = levelConfig(G.level);
    G.tick = cfg.tick;
    G.timeLeft = cfg.duration;
    G.target = cfg.target;
    G.acc = 0;
    dir = { x: 1, y: 0 }; dirQueue = []; grow = 0;
    // snake starts short, centered, heading right
    const cxg = Math.floor(N / 2), cyg = Math.floor(N / 2);
    snake = [
      { x: cxg, y: cyg }, { x: cxg - 1, y: cyg }, { x: cxg - 2, y: cyg },
    ];
    snakePrev = snake.map((c) => ({ ...c }));
    // rocks
    rocks = new Set();
    let placed = 0, guard = 0;
    while (placed < cfg.rocks && guard++ < 600) {
      const x = randInt(N), y = randInt(N);
      // keep the central spawn lane and a margin clear
      if (Math.abs(y - cyg) <= 1 && x >= cxg - 3 && x <= cxg + 4) continue;
      if (Math.abs(x - cxg) < 2 && Math.abs(y - cyg) < 2) continue;
      const k = key(x, y);
      if (rocks.has(k)) continue;
      rocks.add(k); placed++;
    }
    // hazards (patrolling critters)
    hazards = [];
    for (let i = 0; i < cfg.hazards; i++) {
      const spot = freeCell(true);
      if (!spot) break;
      const axis = Math.random() < 0.5 ? "x" : "y";
      hazards.push({ x: spot.x, y: spot.y, px: spot.x, py: spot.y, axis, d: Math.random() < 0.5 ? 1 : -1, acc: 0, tick: 0.22 });
    }
    // items
    items = [];
    for (let i = 0; i < 3; i++) spawnItem();
    special = null; nextSpecial = 6 + Math.random() * 5;
    // reset temporary effects for a fresh level
    G.starT = 0; G.shield = false; G.speedT = 0; G.invuln = 1.0;
    G.combo = 0; G.comboT = 0;
  }
  function startGame() {
    G.score = 0; G.level = 1; G.lives = 3;
    buildLevel();
    G.state = State.INTRO; G.introT = 1.3;
    updateHud(); hideOverlays();
    Sound.play("start");
  }
  function nextLevel() {
    G.level++;
    buildLevel();
    G.state = State.INTRO; G.introT = 1.3;
    updateHud();
    Sound.play("level");
  }
  function loseLife() {
    G.lives--; updateHud(); G.shake = 14; Sound.play("crash");
    if (G.lives <= 0) { gameOver(); return; }
    // respawn short beaver at center, keep level & timer running
    const cxg = Math.floor(N / 2), cyg = Math.floor(N / 2);
    snake = [{ x: cxg, y: cyg }, { x: cxg - 1, y: cyg }, { x: cxg - 2, y: cyg }];
    snakePrev = snake.map((c) => ({ ...c }));
    dir = { x: 1, y: 0 }; dirQueue = []; grow = 0;
    G.invuln = 1.6; G.starT = 0;
  }
  function gameOver() {
    G.state = State.DEAD;
    if (G.score > G.best) { G.best = G.score; localStorage.setItem("bc_best", String(G.best)); }
    Sound.play("gameover");
    showGameOver();
  }

  // ---------- Movement / tick ----------
  function opposite(a, b) { return a.x === -b.x && a.y === -b.y; }
  function queueDir(nx, ny) {
    const nd = { x: nx, y: ny };
    const last = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir;
    if ((nd.x === last.x && nd.y === last.y) || opposite(nd, last)) return;
    if (dirQueue.length < 2) dirQueue.push(nd);
  }

  function step() {
    if (dirQueue.length) dir = dirQueue.shift();
    const head = snake[0];
    const target = { x: head.x + dir.x, y: head.y + dir.y };

    const solid = target.x < 0 || target.y < 0 || target.x >= N || target.y >= N || rocks.has(key(target.x, target.y));
    let soft = false;
    for (let i = 0; i < snake.length; i++) if (snake[i].x === target.x && snake[i].y === target.y) { soft = true; break; }
    for (const h of hazards) if (h.x === target.x && h.y === target.y) soft = true;

    const protectedNow = G.starT > 0 || G.invuln > 0;

    if (solid) {
      if (G.starT > 0 || G.invuln > 0) { return; }        // bonk, but no death — just hold
      if (G.shield) { G.shield = false; G.invuln = 1.2; return; }
      loseLife(); return;
    }
    if (soft && !protectedNow) {
      if (G.shield) { G.shield = false; G.invuln = 1.2; return; }
      loseLife(); return;
    }

    // advance
    snakePrev = snake.map((c) => ({ ...c }));
    snake.unshift({ x: target.x, y: target.y });
    if (grow > 0) grow--; else snake.pop();

    // eat item?
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.x === target.x && it.y === target.y) {
        eatItem(it);
        items.splice(i, 1);
        spawnItem();
        break;
      }
    }
    // eat special?
    if (special && special.x === target.x && special.y === target.y) {
      eatSpecial(special);
      special = null;
    }
  }

  function eatItem(it) {
    G.comboT = 2.0;
    G.combo = Math.min(G.combo + 1, 5);
    const mult = Math.max(1, G.combo);
    const gained = it.pts * mult;
    G.score += gained;
    grow += it.grow;
    if (it.speed) G.speedT = 3;
    floater(px(it.x), py(it.y), "+" + gained + (mult > 1 ? " x" + mult : ""), it.k === "gem" ? "#ffd54a" : "#3f7d3a");
    puff(px(it.x), py(it.y), it.g);
    Sound.play(it.k === "gem" ? "gem" : "chomp");
    updateHud();
  }
  function eatSpecial(sp) {
    G.score += sp.pts;
    Sound.play("special");
    floater(px(sp.x), py(sp.y), sp.label, "#8a5cff");
    puff(px(sp.x), py(sp.y), sp.g);
    if (sp.k === "star") G.starT = 5;
    else if (sp.k === "clock") G.timeLeft += 6;
    else if (sp.k === "shrink") { for (let i = 0; i < 5 && snake.length > 3; i++) snake.pop(); }
    else if (sp.k === "shield") G.shield = true;
    else if (sp.k === "bolt") G.speedT = 4;
    updateHud();
  }

  function floater(x, y, text, color) { floaters.push({ x, y, text, color, life: 1 }); }
  function puff(x, y, glyph) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * 2 + 1;
      puffs.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, glyph: Math.random() < 0.3 ? glyph : null });
    }
  }

  // ---------- Update ----------
  function update(dt) {
    G.time += dt;
    if (G.shake > 0) G.shake *= 0.86;
    // decay floaters/puffs always
    floaters = floaters.filter((f) => (f.y -= 0.5, f.life -= dt * 1.4, f.life > 0));
    puffs = puffs.filter((p) => (p.x += p.vx, p.y += p.vy, p.vx *= 0.9, p.vy *= 0.9, p.life -= dt * 2, p.life > 0));

    if (G.state === State.INTRO) {
      G.introT -= dt;
      if (G.introT <= 0) G.state = State.PLAY;
      return;
    }
    if (G.state !== State.PLAY) return;

    // timers
    if (G.starT > 0) G.starT -= dt;
    if (G.speedT > 0) G.speedT -= dt;
    if (G.invuln > 0) G.invuln -= dt;
    if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }

    // special lifecycle
    if (!special) {
      nextSpecial -= dt;
      if (nextSpecial <= 0) { spawnSpecial(); nextSpecial = 8 + Math.random() * 6; }
    } else {
      special.life -= dt;
      if (special.life <= 0) special = null;
    }

    // level timer
    G.timeLeft -= dt;
    if (G.timeLeft <= 0) {
      G.score += 50 * G.level + (G.score >= G.target ? 50 : 0);
      updateHud();
      nextLevel();
      return;
    }

    // movement tick (berry/bolt speed boost)
    const tick = G.speedT > 0 ? G.tick * 0.6 : G.tick;
    G.acc += dt;
    while (G.acc >= tick) {
      G.acc -= tick;
      stepHazards();
      step();
      if (G.state !== State.PLAY) { G.acc = 0; break; }
    }
  }

  function stepHazards() {
    for (const h of hazards) {
      h.px = h.x; h.py = h.y;
      let nx = h.x + (h.axis === "x" ? h.d : 0);
      let ny = h.y + (h.axis === "y" ? h.d : 0);
      if (nx < 0 || ny < 0 || nx >= N || ny >= N || rocks.has(key(nx, ny))) {
        h.d *= -1;
        nx = h.x + (h.axis === "x" ? h.d : 0);
        ny = h.y + (h.axis === "y" ? h.d : 0);
        if (nx < 0 || ny < 0 || nx >= N || ny >= N || rocks.has(key(nx, ny))) { nx = h.x; ny = h.y; }
      }
      h.x = nx; h.y = ny;
    }
  }

  // ---------- Render ----------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBeaverHead(cx2, cy2, ang, r) {
    ctx.save();
    ctx.translate(cx2, cy2);
    ctx.rotate(ang);
    // ears
    ctx.fillStyle = "#7a4a24";
    ctx.beginPath(); ctx.arc(-r * 0.5, -r * 0.7, r * 0.28, 0, 7); ctx.arc(r * 0.5, -r * 0.7, r * 0.28, 0, 7); ctx.fill();
    // face
    ctx.fillStyle = "#a9713f";
    roundRect(-r, -r * 0.85, r * 2, r * 1.7, r * 0.7); ctx.fill();
    // muzzle
    ctx.fillStyle = "#e7c9a3";
    ctx.beginPath(); ctx.ellipse(r * 0.55, 0, r * 0.6, r * 0.75, 0, 0, 7); ctx.fill();
    // eyes
    ctx.fillStyle = "#2c2016";
    ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 0.17, 0, 7); ctx.arc(0, r * 0.35, r * 0.17, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(r * 0.06, -r * 0.4, r * 0.06, 0, 7); ctx.arc(r * 0.06, r * 0.3, r * 0.06, 0, 7); ctx.fill();
    // nose
    ctx.fillStyle = "#5b3b22";
    ctx.beginPath(); ctx.arc(r * 0.95, 0, r * 0.16, 0, 7); ctx.fill();
    // buck teeth
    ctx.fillStyle = "#fff";
    roundRect(r * 0.9, -r * 0.16, r * 0.34, r * 0.5, r * 0.06); ctx.fill();
    ctx.strokeStyle = "#dcae6a"; ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.beginPath(); ctx.moveTo(r * 1.07, -r * 0.1); ctx.lineTo(r * 1.07, r * 0.32); ctx.stroke();
    ctx.restore();
  }

  // ----- drawn collectibles / props (color-consistent across every device) -----
  function drawLog(cx2, cy2, s) {
    const w = s * 0.66, h = s * 0.4;
    ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(-0.3);
    ctx.fillStyle = "#b07a43"; roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.fillStyle = "#d9b078"; ctx.beginPath(); ctx.ellipse(-w / 2 + h * 0.3, 0, h * 0.32, h * 0.42, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "#8a5a2f"; ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.beginPath(); ctx.ellipse(-w / 2 + h * 0.3, 0, h * 0.15, h * 0.22, 0, 0, 7); ctx.stroke();
    ctx.restore();
  }
  function drawAcorn(cx2, cy2, s) {
    ctx.save(); ctx.translate(cx2, cy2);
    ctx.fillStyle = "#c98a3f"; ctx.beginPath(); ctx.ellipse(0, s * 0.1, s * 0.24, s * 0.28, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#7a4a24"; roundRect(-s * 0.27, -s * 0.24, s * 0.54, s * 0.26, s * 0.1); ctx.fill();
    ctx.fillStyle = "#5b3b22"; roundRect(-s * 0.04, -s * 0.36, s * 0.08, s * 0.14, s * 0.03); ctx.fill();
    ctx.restore();
  }
  function drawBerry(cx2, cy2, s) {
    ctx.save(); ctx.translate(cx2, cy2);
    ctx.fillStyle = "#e5484d"; ctx.beginPath(); ctx.arc(0, s * 0.07, s * 0.26, 0, 7); ctx.fill();
    ctx.fillStyle = "#5bbf4a";
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.ellipse(k * s * 0.13, -s * 0.19, s * 0.11, s * 0.05, k * 0.5, 0, 7); ctx.fill(); }
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 5; i++) { const a = i * 1.4; ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.12, s * 0.07 + Math.sin(a) * s * 0.12, s * 0.02, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function drawGem(cx2, cy2, s) {
    const r = s * 0.27;
    ctx.save(); ctx.translate(cx2, cy2);
    ctx.fillStyle = "#5fd0e5"; ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r, -r * 0.15); ctx.lineTo(0, r); ctx.lineTo(-r, -r * 0.15); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.moveTo(-r, -r * 0.15); ctx.lineTo(r, -r * 0.15); ctx.stroke();
    ctx.restore();
  }
  function drawItemGlyph(kind, cx2, cy2, s) {
    if (kind === "log") drawLog(cx2, cy2, s);
    else if (kind === "acorn") drawAcorn(cx2, cy2, s);
    else if (kind === "berry") drawBerry(cx2, cy2, s);
    else drawGem(cx2, cy2, s);
  }
  function drawRock(cx2, cy2, s) {
    ctx.save(); ctx.translate(cx2, cy2);
    ctx.fillStyle = "#9aa0a6"; ctx.beginPath();
    ctx.moveTo(-s * 0.3, s * 0.18);
    ctx.quadraticCurveTo(-s * 0.36, -s * 0.1, -s * 0.1, -s * 0.24);
    ctx.quadraticCurveTo(s * 0.18, -s * 0.32, s * 0.3, -s * 0.05);
    ctx.quadraticCurveTo(s * 0.38, s * 0.2, s * 0.1, s * 0.26);
    ctx.quadraticCurveTo(-s * 0.14, s * 0.3, -s * 0.3, s * 0.18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.28)"; ctx.beginPath(); ctx.ellipse(-s * 0.06, -s * 0.09, s * 0.13, s * 0.07, -0.4, 0, 7); ctx.fill();
    ctx.restore();
  }
  function drawFish(cx2, cy2, s, faceRight) {
    ctx.save(); ctx.translate(cx2, cy2); if (faceRight) ctx.scale(-1, 1);
    ctx.fillStyle = "#6fb7c9";
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.3, s * 0.2, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.22, 0); ctx.lineTo(s * 0.42, -s * 0.16); ctx.lineTo(s * 0.42, s * 0.16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-s * 0.13, -s * 0.04, s * 0.06, 0, 7); ctx.fill();
    ctx.fillStyle = "#12303a"; ctx.beginPath(); ctx.arc(-s * 0.13, -s * 0.04, s * 0.03, 0, 7); ctx.fill();
    ctx.strokeStyle = "#12303a"; ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath(); ctx.moveTo(-s * 0.22, -s * 0.13); ctx.lineTo(-s * 0.04, -s * 0.06); ctx.stroke();
    ctx.restore();
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (G.shake > 0.4) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);

    // sky
    ctx.fillStyle = "#dff4ff";
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // board (grass) with soft checker
    roundRect(boardX - 6, boardY - 6, boardPx + 12, boardPx + 12, 16);
    ctx.fillStyle = "#8a5a34"; ctx.fill(); // wooden frame
    ctx.save();
    roundRect(boardX, boardY, boardPx, boardPx, 10); ctx.clip();
    ctx.fillStyle = "#bfe3a0"; ctx.fillRect(boardX, boardY, boardPx, boardPx);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
      if ((gx + gy) % 2 === 0) ctx.fillRect(boardX + gx * cell, boardY + gy * cell, cell, cell);
    }

    const t = clamp(G.acc / (G.speedT > 0 ? G.tick * 0.6 : G.tick), 0, 1);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";

    // rocks
    rocks.forEach((k) => {
      const [x, y] = k.split(",").map(Number);
      drawRock(px(x), py(y), cell);
    });

    // items (drawn shapes → consistent color on every platform)
    for (const it of items) {
      const bob = Math.sin(G.time * 5 + it.x) * cell * 0.06;
      drawItemGlyph(it.k, px(it.x), py(it.y) + bob, cell);
    }
    // special (a glowing bubble with its emoji — blinks near end of life)
    if (special && (special.life > 1.5 || Math.floor(G.time * 8) % 2 === 0)) {
      const pulse = 1 + 0.12 * Math.sin(G.time * 8);
      ctx.save();
      ctx.translate(px(special.x), py(special.y));
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.shadowColor = "#ffd54a"; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0, 0, cell * 0.44, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffb52e"; ctx.lineWidth = Math.max(1.5, cell * 0.05);
      ctx.beginPath(); ctx.arc(0, 0, cell * 0.44, 0, 7); ctx.stroke();
      ctx.font = Math.round(cell * 0.5) + "px system-ui";
      ctx.fillStyle = "#3f4d3a";
      ctx.fillText(special.g, 0, cell * 0.02);
      ctx.restore();
    }

    // hazards (grumpy fish critters)
    for (const h of hazards) {
      const hx = boardX + lerp(h.px, h.x, t) * cell + cell / 2;
      const hy = boardY + lerp(h.py, h.y, t) * cell + cell / 2;
      drawFish(hx, hy, cell, h.axis === "x" && h.d > 0);
    }

    // snake body (only once the game has placed the beaver)
    const flash = G.invuln > 0 && Math.floor(G.time * 12) % 2 === 0;
    const starOn = G.starT > 0;
    ctx.globalAlpha = flash ? 0.4 : 1;
    if (snake.length) {
    for (let i = snake.length - 1; i >= 1; i--) {
      const from = snakePrev[i] || snake[i];
      const cx2 = boardX + lerp(from.x, snake[i].x, t) * cell + cell / 2;
      const cy2 = boardY + lerp(from.y, snake[i].y, t) * cell + cell / 2;
      const isTail = i === snake.length - 1;
      const rad = cell * (isTail ? 0.5 : 0.42);
      if (starOn) { ctx.fillStyle = `hsl(${(G.time * 200 + i * 24) % 360}, 80%, 65%)`; }
      else { ctx.fillStyle = i % 2 === 0 ? "#a9713f" : "#9c6636"; }
      if (isTail) {
        // flat paddle tail
        const prev = snake[i - 1] || snake[i];
        const ang = Math.atan2(snake[i].y - prev.y, snake[i].x - prev.x);
        ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(ang);
        ctx.beginPath(); ctx.ellipse(rad * 0.2, 0, rad * 1.15, rad * 0.8, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-rad * 0.4, -rad * 0.4); ctx.lineTo(rad * 0.9, -rad * 0.2);
        ctx.moveTo(-rad * 0.4, rad * 0.4); ctx.lineTo(rad * 0.9, rad * 0.2); ctx.stroke();
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(cx2, cy2, rad, 0, 7); ctx.fill();
      }
    }
    // head
    {
      const from = snakePrev[0] || snake[0];
      const hx = boardX + lerp(from.x, snake[0].x, t) * cell + cell / 2;
      const hy = boardY + lerp(from.y, snake[0].y, t) * cell + cell / 2;
      const ang = Math.atan2(dir.y, dir.x);
      if (starOn) { ctx.save(); ctx.shadowColor = "#ffe37a"; ctx.shadowBlur = 16; }
      drawBeaverHead(hx, hy, ang, cell * 0.5);
      if (starOn) ctx.restore();
    }
    } // end if snake.length
    ctx.globalAlpha = 1;

    ctx.restore(); // unclip board

    // puffs & floaters (screen space over board)
    for (const p of puffs) {
      ctx.globalAlpha = clamp(p.life, 0, 1);
      if (p.glyph) { ctx.font = Math.round(cell * 0.5) + "px system-ui"; ctx.fillText(p.glyph, p.x, p.y); }
      else { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, cell * 0.12 * p.life + 1, 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (const f of floaters) {
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = "800 " + Math.round(cell * 0.5) + "px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // combo indicator
    if (G.combo >= 2 && G.state === State.PLAY) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "800 " + Math.round(cell * 0.6) + "px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("COMBO x" + G.combo, W / 2, boardY - 12);
    }

    // intro banner
    if (G.state === State.INTRO) {
      ctx.fillStyle = "rgba(63,77,102,0.16)";
      ctx.fillRect(boardX, boardY, boardPx, boardPx);
      ctx.textAlign = "center";
      ctx.fillStyle = "#3f7d3a";
      ctx.font = "900 " + Math.round(boardPx * 0.11) + "px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("LEVEL " + G.level, W / 2, boardY + boardPx / 2 - boardPx * 0.03);
      ctx.fillStyle = "#5b7a3f";
      ctx.font = "700 " + Math.round(boardPx * 0.05) + "px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(LEVEL_NAMES[(G.level - 1) % LEVEL_NAMES.length], W / 2, boardY + boardPx / 2 + boardPx * 0.06);
    }

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // time bar
    updateTimeBar();
  }

  // ---------- HUD / overlays ----------
  const el = {};
  ["score", "level", "lives", "best", "timefill", "menu", "message", "msg-title", "msg-sub",
    "gameover", "final-score", "final-msg", "lb-list", "initials", "save-score", "again",
    "start-btn", "pause-btn", "sound-btn", "dpad", "hint", "lb-peek"].forEach((id) => {
    el[id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = document.getElementById(id);
  });

  function updateHud() {
    el.score.textContent = G.score;
    el.level.textContent = G.level;
    el.lives.textContent = "♥".repeat(Math.max(0, G.lives)) || "—";
    el.best.textContent = G.best;
  }
  function updateTimeBar() {
    const cfg = levelConfig(G.level);
    const frac = clamp(G.timeLeft / cfg.duration, 0, 1);
    el.timefill.style.width = (frac * 100) + "%";
    el.timefill.style.background = frac < 0.25 ? "#ff7e7e" : frac < 0.5 ? "#ffca6a" : "#7ed957";
  }
  function hideOverlays() {
    el.menu.classList.add("hidden");
    el.message.classList.add("hidden");
    el.gameover.classList.add("hidden");
  }
  function showMessage(title, sub) {
    el.msgTitle.innerHTML = title; el.msgSub.innerHTML = sub || "";
    el.message.classList.remove("hidden");
  }

  // ---------- Leaderboard (on-device) ----------
  function getScores() { try { return JSON.parse(localStorage.getItem("bc_scores") || "[]"); } catch (e) { return []; } }
  function saveScores(s) { localStorage.setItem("bc_scores", JSON.stringify(s.slice(0, 10))); }
  function qualifies(score) { const s = getScores(); return score > 0 && (s.length < 10 || score > s[s.length - 1].score); }
  function renderLbInto(node, highlightIdx) {
    const s = getScores();
    if (!s.length) { node.innerHTML = '<li class="lb-empty">No scores yet — be the first! 🦫</li>'; return; }
    node.innerHTML = s.map((r, i) =>
      `<li class="${i === highlightIdx ? "me" : ""}"><span class="rank">${i + 1}</span>` +
      `<span class="who">${r.name}</span><span class="lv">Lv ${r.level}</span>` +
      `<span class="pts">${r.score}</span></li>`).join("");
  }

  const GO_MSGS = [
    "Dam, so close!", "You gnawed it out there!", "Timberrr… try again?",
    "That's a wrap, log-lover!", "Splashdown! Nice run.", "Chewed up and spat out!",
  ];
  let pendingScore = null;
  function showGameOver() {
    el.finalScore.textContent = G.score;
    el.finalMsg.textContent = choice(GO_MSGS) + ` Reached level ${G.level}.`;
    const canSave = qualifies(G.score);
    pendingScore = canSave ? { score: G.score, level: G.level } : null;
    document.getElementById("save-row").style.display = canSave ? "flex" : "none";
    renderLbInto(el.lbList, -1);
    el.initials.value = "";
    el.gameover.classList.remove("hidden");
    updateHud();
  }
  function saveScore() {
    if (!pendingScore) return;
    const name = (el.initials.value || "BVR").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) || "BVR";
    const s = getScores();
    s.push({ name, score: pendingScore.score, level: pendingScore.level });
    s.sort((a, b) => b.score - a.score);
    saveScores(s);
    const idx = s.findIndex((r) => r.name === name && r.score === pendingScore.score);
    pendingScore = null;
    document.getElementById("save-row").style.display = "none";
    renderLbInto(el.lbList, idx);
    renderLbInto(el.lbPeek, -1);
  }

  // ---------- Flow control ----------
  function togglePause() {
    if (G.state === State.PLAY) { G.state = State.PAUSE; showMessage("Paused 🦫", "Take a breather!"); }
    else if (G.state === State.PAUSE) { G.state = State.PLAY; el.message.classList.add("hidden"); }
  }
  function toggleSound() {
    Sound.setEnabled(!Sound.enabled);
    el.soundBtn.textContent = Sound.enabled ? "🔊" : "🔇";
    if (Sound.enabled) Sound.play("chomp");
  }

  // ---------- Input ----------
  window.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k === "ArrowUp" || k === "w" || k === "W") { queueDir(0, -1); e.preventDefault(); }
    else if (k === "ArrowDown" || k === "s" || k === "S") { queueDir(0, 1); e.preventDefault(); }
    else if (k === "ArrowLeft" || k === "a" || k === "A") { queueDir(-1, 0); e.preventDefault(); }
    else if (k === "ArrowRight" || k === "d" || k === "D") { queueDir(1, 0); e.preventDefault(); }
    else if (k === "p" || k === "P") togglePause();
    else if (k === "m" || k === "M") toggleSound();
    else if (k === " " || k === "Enter") {
      Sound.resume();
      if (G.state === State.MENU) startGame();
      else if (G.state === State.DEAD) startGame();
    }
  });

  // swipe on canvas
  let touchStart = null;
  canvas.addEventListener("touchstart", (e) => {
    Sound.resume();
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  canvas.addEventListener("touchmove", (e) => {
    if (!touchStart) return;
    const dx = e.touches[0].clientX - touchStart.x;
    const dy = e.touches[0].clientY - touchStart.y;
    if (Math.hypot(dx, dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) queueDir(dx > 0 ? 1 : -1, 0);
    else queueDir(0, dy > 0 ? 1 : -1);
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    e.preventDefault();
  }, { passive: false });

  // d-pad
  if (el.dpad) {
    if (isTouch) el.dpad.classList.remove("hidden");
    el.dpad.querySelectorAll("button").forEach((b) => {
      const handler = (e) => {
        e.preventDefault(); Sound.resume();
        const d = b.dataset.dir;
        if (d === "up") queueDir(0, -1);
        else if (d === "down") queueDir(0, 1);
        else if (d === "left") queueDir(-1, 0);
        else if (d === "right") queueDir(1, 0);
      };
      b.addEventListener("touchstart", handler, { passive: false });
      b.addEventListener("mousedown", handler);
    });
  }

  el.startBtn.addEventListener("click", () => { Sound.resume(); startGame(); });
  el.again.addEventListener("click", () => { Sound.resume(); startGame(); });
  el.saveScore.addEventListener("click", saveScore);
  el.pauseBtn.addEventListener("click", (e) => { e.preventDefault(); Sound.resume(); togglePause(); });
  el.soundBtn.addEventListener("click", (e) => { e.preventDefault(); Sound.resume(); toggleSound(); });

  // ---------- Main loop ----------
  let last = performance.now();
  function loop(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05;
    // pause button only during a round
    el.pauseBtn.classList.toggle("hidden", !(G.state === State.PLAY || G.state === State.PAUSE || G.state === State.INTRO));
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // ---------- Boot ----------
  resize();
  el.soundBtn.textContent = Sound.enabled ? "🔊" : "🔇";
  updateHud();
  renderLbInto(el.lbPeek, -1);
  requestAnimationFrame(loop);

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
