/* ============================================================
   PUFF PALS
   A cozy virtual pet: adopt a little cloud creature, keep it fed,
   clean, rested and entertained, teach it tricks, and watch it
   grow up. Needs tick along in real time — even while you're away.

   Everything here is drawn procedurally on a canvas. No images,
   no audio files, no dependencies.
   ============================================================ */

(() => {
  "use strict";

  // ---------- tiny helpers ----------
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (n) => (Math.random() * n) | 0;
  const choice = (arr) => arr[randInt(arr.length)];
  const TAU = Math.PI * 2;
  const now = () => Date.now();
  const $ = (id) => document.getElementById(id);

  const SAVE_KEY = "pp_save_v1";
  const MUTE_KEY = "pp_mute";

  // ============================================================
  // Sound — soft little chimes, all synthesized
  // ============================================================
  const Sound = {
    ctx: null, master: null,
    enabled: localStorage.getItem(MUTE_KEY) !== "1",
    ensure() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.4;
        this.master.connect(this.ctx.destination);
      } catch (e) { this.ctx = null; }
    },
    resume() { this.ensure(); if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },
    setEnabled(on) { this.enabled = on; localStorage.setItem(MUTE_KEY, on ? "0" : "1"); },
    note(freq, t0, dur, opts) {
      if (!this.ctx) return;
      const { type = "sine", gain = 0.22, glideTo = null } = opts || {};
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + dur + 0.03);
    },
    play(name) {
      if (!this.enabled) return;
      this.ensure(); if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const t = this.ctx.currentTime;
      const seq = (freqs, step, dur, type, gain) =>
        freqs.forEach((f, i) => this.note(f, t + i * step, dur, { type, gain }));
      switch (name) {
        case "pet":     this.note(880, t, 0.14, { type: "sine", gain: 0.13, glideTo: 1170 }); break;
        case "happy":   seq([659, 880, 1046], 0.06, 0.2, "sine", 0.2); break;
        case "eat":     this.note(420, t, 0.08, { type: "triangle", gain: 0.16, glideTo: 300 });
                        this.note(380, t + 0.11, 0.08, { type: "triangle", gain: 0.14, glideTo: 280 }); break;
        case "bubble":  seq([700, 900, 1150, 1400], 0.045, 0.13, "sine", 0.11); break;
        case "ball":    this.note(520, t, 0.1, { type: "triangle", gain: 0.16, glideTo: 780 }); break;
        case "fetch":   seq([784, 1046, 1318], 0.055, 0.18, "triangle", 0.18); break;
        case "success": seq([523, 659, 784, 1046, 1318], 0.07, 0.24, "sine", 0.2); break;
        case "fail":    this.note(400, t, 0.22, { type: "sine", gain: 0.14, glideTo: 260 }); break;
        case "levelup": seq([523, 659, 784, 1046, 1318, 1568], 0.075, 0.3, "triangle", 0.2); break;
        case "yawn":    this.note(330, t, 0.5, { type: "sine", gain: 0.14, glideTo: 220 }); break;
        case "wake":    seq([523, 784], 0.1, 0.24, "sine", 0.18); break;
        case "sad":     seq([494, 415, 349], 0.12, 0.3, "sine", 0.16); break;
        case "adopt":   seq([523, 659, 784, 1046], 0.09, 0.32, "sine", 0.22); break;
        case "tap":     this.note(660, t, 0.06, { type: "sine", gain: 0.1 }); break;
      }
    },
  };

  // ============================================================
  // Puff genetics — a look you can't get anywhere else
  // ============================================================
  const PALETTES = [
    { name: "Mochi",  body: "#fffaf5", shade: "#ffe6d6", ear: "#ffc9b0", blush: "#ffab9c" },
    { name: "Matcha", body: "#f0fae6", shade: "#d8eec4", ear: "#b6dd97", blush: "#ffb3ce" },
    { name: "Taro",   body: "#f4eeff", shade: "#e0d4ff", ear: "#c3aeff", blush: "#ffb3ce" },
    { name: "Peach",  body: "#fff4ec", shade: "#ffe0cb", ear: "#ffc39b", blush: "#ff9ec4" },
    { name: "Sky",    body: "#eef7ff", shade: "#d3e9ff", ear: "#a8d5f7", blush: "#ffb3ce" },
    { name: "Butter", body: "#fffbe8", shade: "#ffefc2", ear: "#ffdd8a", blush: "#ffab9c" },
    { name: "Rosie",  body: "#fff1f6", shade: "#ffd9e7", ear: "#ffb3ce", blush: "#ff8fb8" },
    { name: "Mint",   body: "#eafbf5", shade: "#cbf2e5", ear: "#98e3cb", blush: "#ffb3ce" },
    { name: "Lilac",  body: "#faf0ff", shade: "#eed9fb", ear: "#dcb0f0", blush: "#ff9ec4" },
  ];
  const EARS = ["floppy", "round", "pointy"];
  const PATTERNS = ["plain", "spots", "freckles", "star", "tips"];
  const INK = "#5b4a55";

  const ADJECTIVES = [
    "a daydreamer", "very brave", "extremely soft", "a bit dramatic",
    "endlessly curious", "a champion napper", "quietly mischievous",
    "the friendliest", "a little shy", "full of opinions",
  ];

  function makeGenes() {
    return {
      pal: randInt(PALETTES.length),
      ear: choice(EARS),
      pattern: choice(PATTERNS),
      bigEyes: Math.random() < 0.5,
      curlTail: Math.random() < 0.6,
      blurb: choice(ADJECTIVES),
      seed: randInt(100000),
    };
  }

  // ============================================================
  // Save state
  // ============================================================
  const NEED_KEYS = ["food", "fun", "clean", "energy"];

  // full drain time, in hours, for each need
  const DRAIN_HOURS = { food: 7, fun: 6, clean: 11, energy: 9 };
  const SLEEP_RECHARGE_MIN = 40;     // minutes of sleep for a full battery
  const SLEEP_DECAY_FACTOR = 0.35;   // other needs move slower while asleep
  const OFFLINE_CAP_HOURS = 14;      // mercy: we never simulate more than this

  let S = null;   // the save object

  function freshPet(genes, name) {
    return {
      v: 1,
      name: name,
      genes: genes,
      born: now(),
      lastSeen: now(),
      need: { food: 78, fun: 74, clean: 88, energy: 82 },
      bond: 8,
      health: 100,
      stage: 0,                 // 0 puffling · 1 pup · 2 puff
      sleeping: false,
      tricks: {},               // name -> level (1..3)
      messes: [],               // {x, s}
      dirt: [],                 // {x, y, r} spots on the pet
      meals: 0, baths: 0, fetches: 0, pets: 0,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.genes || !s.need) return null;
      return s;
    } catch (e) { return null; }
  }

  let saveTimer = 0;
  function save() {
    if (!S) return;
    S.lastSeen = now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* full or private mode */ }
  }

  // ============================================================
  // Time simulation
  // ============================================================
  function applyElapsed(seconds) {
    if (!S || seconds <= 0) return;
    const factor = S.sleeping ? SLEEP_DECAY_FACTOR : 1;
    for (const k of NEED_KEYS) {
      if (k === "energy" && S.sleeping) continue;
      const perSec = 100 / (DRAIN_HOURS[k] * 3600);
      S.need[k] = clamp(S.need[k] - perSec * seconds * factor, 0, 100);
    }
    if (S.sleeping) {
      S.need.energy = clamp(S.need.energy + (100 / (SLEEP_RECHARGE_MIN * 60)) * seconds, 0, 100);
    }

    // health follows how well the needs are being met
    const avg = NEED_KEYS.reduce((a, k) => a + S.need[k], 0) / 4;
    if (avg < 22) S.health = clamp(S.health - (seconds / 60) * 1.4, 0, 100);
    else if (avg > 55) S.health = clamp(S.health + (seconds / 60) * 2.2, 0, 100);

    // bond very slowly fades if the poor thing is being ignored
    if (avg < 20) S.bond = clamp(S.bond - (seconds / 60) * 0.35, 0, 100);

    // messes accumulate on their own too (about one every 40 awake minutes)
    if (!S.sleeping) {
      const chance = seconds / (40 * 60);
      if (Math.random() < chance && S.messes.length < 4) addMess();
    }

    // and they make the place less clean
    if (S.messes.length) {
      S.need.clean = clamp(S.need.clean - S.messes.length * (seconds / 60) * 0.25, 0, 100);
    }
  }

  function catchUpOffline() {
    const elapsed = clamp((now() - (S.lastSeen || now())) / 1000, 0, OFFLINE_CAP_HOURS * 3600);
    if (elapsed < 30) return 0;
    // sleeping pets wake up on their own once rested
    if (S.sleeping && elapsed > SLEEP_RECHARGE_MIN * 60) {
      applyElapsed(SLEEP_RECHARGE_MIN * 60);
      S.sleeping = false;
      applyElapsed(elapsed - SLEEP_RECHARGE_MIN * 60);
    } else {
      applyElapsed(elapsed);
    }
    return elapsed;
  }

  function ageMinutes() { return (now() - S.born) / 60000; }

  const STAGE_NAMES = ["puffling", "pup", "big puff"];
  const STAGE_GATES = [
    { minutes: 0,  bond: 0 },
    { minutes: 12, bond: 25 },
    { minutes: 50, bond: 55 },
  ];

  function checkGrowth() {
    if (S.stage >= 2) return false;
    const nx = S.stage + 1;
    const gate = STAGE_GATES[nx];
    if (ageMinutes() >= gate.minutes && S.bond >= gate.bond) {
      S.stage = nx;
      return true;
    }
    return false;
  }

  function ageLabel() {
    const m = ageMinutes();
    if (m < 2) return "newborn";
    if (m < 60) return Math.floor(m) + " min old";
    const h = m / 60;
    if (h < 24) return Math.floor(h) + (Math.floor(h) === 1 ? " hour old" : " hours old");
    const d = Math.floor(h / 24);
    return d + (d === 1 ? " day old" : " days old");
  }

  function addMess() {
    S.messes.push({ x: rand(0.15, 0.85), s: rand(0.85, 1.15), id: Math.random() });
  }
  function addDirt(n) {
    // Keep smudges on the body and off the face — a splodge over one eye
    // reads as a black eye rather than "needs a bath".
    for (let i = 0; i < n; i++) {
      S.dirt.push({
        x: rand(-0.78, 0.78),
        y: rand(0.18, 0.82),
        r: rand(0.07, 0.13),
        id: Math.random(),
      });
    }
  }

  // ============================================================
  // Canvas & scene
  // ============================================================
  const canvas = $("stage");
  /* `ctx` is deliberately a `let`: every drawing helper below renders into
     whatever it currently points at, which lets the adoption screen reuse
     drawPuff() to paint the little preview canvases. */
  let ctx = canvas.getContext("2d");
  const mainCtx = ctx;
  let W = 0, H = 0, DPR = 1, groundY = 0;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    mainCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    groundY = Math.round(H * 0.70);
  }
  window.addEventListener("resize", resize);

  // stable decorative clouds
  const clouds = [];
  (function seedClouds() {
    let s = 20260725;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 6; i++) clouds.push({ x: rnd(), y: rnd() * 0.42 + 0.04, s: rnd() * 0.5 + 0.6, v: rnd() * 0.006 + 0.002 });
  })();

  // ============================================================
  // Runtime (non-persisted) state
  // ============================================================
  const R = {
    t: 0,
    mode: "idle",          // idle | walk | eat | fetch | wash | sleep | trick
    px: 0.5,               // pet position, fraction of width
    target: null,
    facing: 1,
    bob: 0,
    squash: 1,
    blink: 0, nextBlink: 2,
    hearts: [], sparkles: [], crumbs: [], bubbles: [], zzz: [],
    ball: null, awaitThrow: false,
    fetchesLeft: 0,
    bowl: null,
    eatT: 0,
    washing: false,
    petCool: 0,
    trickAnim: 0, trickName: "",
    lastPetSound: 0,
  };

  function petAnchor() {
    return { x: R.px * W, y: groundY };
  }
  function petRadius() {
    // Three caps so the puff sits well on a tall phone, a portrait tablet and
    // a wide desktop. The geometric-mean term is what stops mid-size portrait
    // windows (tablets) from getting a comically huge pet.
    const base = Math.min(W * 0.21, H * 0.15, Math.sqrt(W * H) * 0.155);
    return base * [0.78, 0.95, 1.12][S.stage];
  }

  // ============================================================
  // Drawing the puff  ✨ the important part ✨
  // ============================================================

  // Fill the union of a set of circles, with a clean outline around
  // the whole silhouette (outline pass = same circles, grown by lw).
  function blobPath(parts, grow) {
    ctx.beginPath();
    for (const p of parts) {
      ctx.moveTo(p.x + p.r + grow, p.y);
      ctx.arc(p.x, p.y, p.r + grow, 0, TAU);
    }
  }

  function bodyParts(r, stage) {
    // head is proportionally bigger on babies — the classic cuteness cheat
    const headBias = [1.0, 0.9, 0.82][stage];
    return [
      { x: 0, y: -r * 0.95, r: r * 0.98 * headBias },
      { x: -r * 0.6, y: -r * 1.5 * headBias, r: r * 0.5 * headBias },
      { x: r * 0.6, y: -r * 1.5 * headBias, r: r * 0.5 * headBias },
      { x: -r * 0.82, y: -r * 0.72, r: r * 0.46 },
      { x: r * 0.82, y: -r * 0.72, r: r * 0.46 },
    ];
  }

  function drawEar(side, r, pal, g, wag) {
    const dir = side;
    ctx.save();
    // sit the ears out past the head bumps so the silhouette actually reads
    ctx.translate(dir * r * 1.02, -r * 1.72);
    ctx.rotate(dir * (0.46 + Math.sin(wag) * 0.17));
    const ew = r * 0.42, eh = r * (g.ear === "floppy" ? 0.72 : g.ear === "round" ? 0.52 : 0.66);

    ctx.beginPath();
    if (g.ear === "pointy") {
      ctx.moveTo(0, eh); ctx.quadraticCurveTo(-ew, eh * 0.2, 0, -eh);
      ctx.quadraticCurveTo(ew, eh * 0.2, 0, eh);
    } else {
      ctx.ellipse(0, 0, ew, eh, 0, 0, TAU);
    }
    ctx.fillStyle = pal.ear; ctx.fill();
    ctx.lineWidth = Math.max(2, r * 0.055); ctx.strokeStyle = INK; ctx.stroke();

    // inner ear
    ctx.beginPath();
    ctx.ellipse(0, eh * 0.1, ew * 0.45, eh * 0.5, 0, 0, TAU);
    ctx.fillStyle = pal.blush; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawTail(r, pal, g, wag) {
    ctx.save();
    ctx.translate(-r * 1.0, -r * 0.55);
    const sw = Math.max(2.5, r * 0.16);
    const a = Math.sin(wag * 1.6) * 0.5;
    ctx.rotate(a * 0.4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    if (g.curlTail) {
      ctx.quadraticCurveTo(-r * 0.55, -r * 0.1, -r * 0.42, -r * 0.52);
      ctx.quadraticCurveTo(-r * 0.32, -r * 0.78, -r * 0.06, -r * 0.66);
    } else {
      ctx.quadraticCurveTo(-r * 0.6, -r * 0.05, -r * 0.72, -r * 0.5);
    }
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.lineWidth = sw + Math.max(2, r * 0.055) * 2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = sw; ctx.strokeStyle = pal.ear; ctx.stroke();
    ctx.restore();
  }

  function drawFace(r, pal, g, mood, t) {
    const eyeY = -r * 1.05;
    const eyeDX = r * 0.42;
    const eyeR = r * (g.bigEyes ? 0.19 : 0.155);
    const blinking = R.blink > 0;
    const lw = Math.max(2, r * 0.055);

    // --- eyes ---
    ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.95; ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      const ex = side * eyeDX;
      if (mood === "sleep" || blinking) {
        ctx.beginPath();
        ctx.moveTo(ex - eyeR, eyeY);
        ctx.quadraticCurveTo(ex, eyeY + eyeR * 0.85, ex + eyeR, eyeY);
        ctx.stroke();
      } else if (mood === "happy") {
        // ^ ^ delighted eyes
        ctx.beginPath();
        ctx.moveTo(ex - eyeR, eyeY + eyeR * 0.45);
        ctx.quadraticCurveTo(ex, eyeY - eyeR * 0.75, ex + eyeR, eyeY + eyeR * 0.45);
        ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(ex, eyeY, eyeR, 0, TAU);
        ctx.fillStyle = INK; ctx.fill();
        // highlights
        ctx.beginPath(); ctx.arc(ex + eyeR * 0.32, eyeY - eyeR * 0.36, eyeR * 0.34, 0, TAU);
        ctx.fillStyle = "#fff"; ctx.fill();
        ctx.beginPath(); ctx.arc(ex - eyeR * 0.3, eyeY + eyeR * 0.32, eyeR * 0.17, 0, TAU);
        ctx.globalAlpha = 0.8; ctx.fill(); ctx.globalAlpha = 1;
      }
    }

    // sad brows / sick sweat
    if (mood === "sad" || mood === "sick") {
      ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.8;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * eyeDX - eyeR * 1.1, eyeY - eyeR * 1.5);
        ctx.lineTo(side * eyeDX + eyeR * 0.2, eyeY - eyeR * 2.1);
        ctx.stroke();
      }
    }

    // --- blush ---
    ctx.fillStyle = pal.blush; ctx.globalAlpha = mood === "happy" ? 0.85 : 0.6;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * r * 0.72, eyeY + r * 0.3, r * 0.19, r * 0.13, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // --- snoot ---
    const my = eyeY + r * 0.34;
    ctx.beginPath();
    ctx.moveTo(-r * 0.09, my - r * 0.03);
    ctx.lineTo(r * 0.09, my - r * 0.03);
    ctx.lineTo(0, my + r * 0.09);
    ctx.closePath();
    ctx.fillStyle = INK; ctx.fill();

    // --- mouth ---
    ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.9; ctx.lineCap = "round";
    ctx.beginPath();
    const mw = r * 0.2;
    if (mood === "eat") {
      ctx.ellipse(0, my + r * 0.2, mw * 0.9, r * 0.15 * (1 + Math.sin(t * 18) * 0.5), 0, 0, TAU);
      ctx.fillStyle = "#c96a86"; ctx.fill(); ctx.stroke();
    } else if (mood === "sad") {
      ctx.moveTo(-mw, my + r * 0.28);
      ctx.quadraticCurveTo(0, my + r * 0.14, mw, my + r * 0.28);
      ctx.stroke();
    } else if (mood === "sleep") {
      ctx.moveTo(-mw * 0.7, my + r * 0.19);
      ctx.quadraticCurveTo(0, my + r * 0.3, mw * 0.7, my + r * 0.19);
      ctx.stroke();
    } else if (mood === "happy") {
      // open smile
      ctx.moveTo(-mw * 1.15, my + r * 0.13);
      ctx.quadraticCurveTo(0, my + r * 0.48, mw * 1.15, my + r * 0.13);
      ctx.quadraticCurveTo(0, my + r * 0.26, -mw * 1.15, my + r * 0.13);
      ctx.fillStyle = "#c96a86"; ctx.fill(); ctx.stroke();
    } else {
      // gentle w-shaped cat mouth
      ctx.moveTo(-mw, my + r * 0.11);
      ctx.quadraticCurveTo(-mw * 0.5, my + r * 0.28, 0, my + r * 0.11);
      ctx.quadraticCurveTo(mw * 0.5, my + r * 0.28, mw, my + r * 0.11);
      ctx.stroke();
    }

    // sick: a little thermometer cheek
    if (mood === "sick") {
      ctx.font = `${r * 0.34}px system-ui`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🤒", r * 1.05, eyeY - r * 0.5);
    }
  }

  function drawPattern(r, pal, g, parts) {
    ctx.save();
    blobPath(parts, 0); ctx.clip();
    ctx.fillStyle = pal.shade;
    let s = g.seed;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    if (g.pattern === "spots") {
      for (let i = 0; i < 5; i++) {
        const a = rnd() * TAU, d = rnd() * r * 0.9;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * d, -r * 0.95 + Math.sin(a) * d * 0.9, r * (0.14 + rnd() * 0.12), r * (0.12 + rnd() * 0.1), rnd() * TAU, 0, TAU);
        ctx.fill();
      }
    } else if (g.pattern === "freckles") {
      ctx.fillStyle = pal.ear;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(lerp(-r * 0.85, r * 0.85, rnd()), -r * 0.72 + rnd() * r * 0.35, r * 0.035, 0, TAU);
        ctx.fill();
      }
    } else if (g.pattern === "star") {
      ctx.fillStyle = pal.ear;
      for (let i = 0; i < 3; i++) {
        const cx = lerp(-r * 0.7, r * 0.7, rnd()), cy = -r * 1.55 + rnd() * r * 0.3;
        star(cx, cy, r * 0.16, r * 0.07, 5);
        ctx.fill();
      }
    } else if (g.pattern === "tips") {
      ctx.fillStyle = pal.shade;
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.1, r * 1.5, r * 0.5, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function star(cx, cy, outer, inner, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rr = i % 2 ? inner : outer;
      const a = (i / (points * 2)) * TAU - Math.PI / 2;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  /* Draw a puff. Used for the live pet AND the adoption previews,
     so it takes everything it needs as arguments. */
  function drawPuff(g, x, y, r, opts) {
    const o = opts || {};
    const pal = PALETTES[g.pal];
    const stage = o.stage === undefined ? 2 : o.stage;
    const mood = o.mood || "content";
    const t = o.t || 0;
    const squash = o.squash === undefined ? 1 : o.squash;
    const facing = o.facing || 1;
    const lw = Math.max(2, r * 0.055);
    const asleep = mood === "sleep";

    ctx.save();
    ctx.translate(x, y);

    // ground shadow
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95 * squash, r * 0.2, 0, 0, TAU);
    ctx.fillStyle = "rgba(120, 90, 115, 0.14)"; ctx.fill();

    ctx.scale(facing, 1);
    ctx.translate(0, o.lift || 0);
    ctx.scale(squash, 2 - squash);

    if (asleep) ctx.rotate(-0.12);

    const parts = bodyParts(r, stage);
    const wag = t * 3.2;

    drawTail(r, pal, g, wag);
    drawEar(-1, r, pal, g, wag);
    drawEar(1, r, pal, g, wag + 0.6);

    // feet
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * r * 0.44, -r * 0.06, r * 0.26, r * 0.15, 0, 0, TAU);
      ctx.fillStyle = pal.ear; ctx.fill();
      ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
    }

    // body: outline pass then fill pass
    blobPath(parts, lw); ctx.fillStyle = INK; ctx.fill();
    blobPath(parts, 0); ctx.fillStyle = pal.body; ctx.fill();

    drawPattern(r, pal, g, parts);

    // belly
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.42, r * 0.5, r * 0.36, 0, 0, TAU);
    ctx.fillStyle = pal.shade; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;

    drawFace(r, pal, g, mood, t);

    // dirt smudges
    if (o.dirt && o.dirt.length) {
      ctx.save();
      blobPath(parts, 0); ctx.clip();
      for (const d of o.dirt) {
        ctx.beginPath();
        ctx.ellipse(d.x * r * 0.85, -r * 0.95 + d.y * r * 0.85, d.r * r, d.r * r * 0.8, 0, 0, TAU);
        ctx.fillStyle = "rgba(150,120,95,0.5)"; ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // ============================================================
  // Scene props
  // ============================================================
  function drawCloud(x, y, s, alpha) {
    ctx.save(); ctx.globalAlpha = alpha === undefined ? 0.9 : alpha;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, 22 * s, 0, TAU);
    ctx.arc(x + 24 * s, y + 5 * s, 17 * s, 0, TAU);
    ctx.arc(x - 24 * s, y + 6 * s, 15 * s, 0, TAU);
    ctx.arc(x + 6 * s, y - 14 * s, 16 * s, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawBowl(x, y, r, full) {
    ctx.save(); ctx.translate(x, y);
    const lw = Math.max(2, r * 0.1);
    if (full) {
      ctx.beginPath(); ctx.ellipse(0, -r * 0.34, r * 0.62, r * 0.3, 0, 0, TAU);
      ctx.fillStyle = "#e6a469"; ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, -r * 0.42);
    ctx.quadraticCurveTo(0, r * 0.5, r * 0.8, -r * 0.42);
    ctx.closePath();
    ctx.fillStyle = "#ffd6e6"; ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = "round"; ctx.stroke();
    ctx.restore();
  }

  function drawBall(x, y, r) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = "#c8f06a"; ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.16); ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, -r * 0.4); ctx.quadraticCurveTo(0, 0, -r * 0.75, r * 0.4);
    ctx.moveTo(r * 0.75, -r * 0.4); ctx.quadraticCurveTo(0, 0, r * 0.75, r * 0.4);
    ctx.lineWidth = Math.max(1, r * 0.12); ctx.stroke();
    ctx.restore();
  }

  function drawMess(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const r = Math.min(W, H) * 0.022;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.15, r * 0.62, 0, 0, TAU);
    ctx.ellipse(0, -r * 0.5, r * 0.8, r * 0.5, 0, 0, TAU);
    ctx.ellipse(0, -r * 0.95, r * 0.5, r * 0.36, 0, 0, TAU);
    ctx.fillStyle = "#a98262"; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = "#7d5c43"; ctx.stroke();
    // a couple of wavy wisps rising off it, so it reads as "please tidy me"
    ctx.strokeStyle = "rgba(125,92,67,0.35)"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
    for (let i = -1; i <= 1; i += 2) {
      const drift = Math.sin(R.t * 1.6 + i) * 1.5;
      ctx.beginPath();
      ctx.moveTo(i * r * 0.45, -r * 1.5);
      ctx.quadraticCurveTo(i * r * 0.75 + drift, -r * 1.85, i * r * 0.4, -r * 2.15);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ============================================================
  // Particles
  // ============================================================
  function spawnHeart(x, y) { R.hearts.push({ x, y, vx: rand(-18, 18), vy: rand(-60, -34), life: 1, s: rand(0.7, 1.15) }); }
  function spawnSparkle(x, y) { R.sparkles.push({ x, y, life: 1, s: rand(0.5, 1), a: rand(0, TAU) }); }
  function spawnCrumb(x, y) { R.crumbs.push({ x, y, vx: rand(-50, 50), vy: rand(-70, -20), life: 1 }); }
  function spawnBubble(x, y) { R.bubbles.push({ x, y, vx: rand(-12, 12), vy: rand(-42, -18), life: 1, r: rand(4, 13) }); }

  function updateParticles(dt) {
    R.hearts = R.hearts.filter((p) => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 14 * dt; p.life -= dt * 0.85; return p.life > 0;
    });
    R.sparkles = R.sparkles.filter((p) => { p.life -= dt * 1.5; p.a += dt * 3; return p.life > 0; });
    R.crumbs = R.crumbs.filter((p) => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; p.life -= dt * 1.2; return p.life > 0;
    });
    R.bubbles = R.bubbles.filter((p) => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 0.7; return p.life > 0;
    });
    R.zzz = R.zzz.filter((p) => { p.y -= 26 * dt; p.x += 12 * dt; p.life -= dt * 0.55; return p.life > 0; });
  }

  function drawParticles() {
    for (const p of R.hearts) {
      ctx.save(); ctx.globalAlpha = clamp(p.life, 0, 1); ctx.translate(p.x, p.y);
      ctx.scale(p.s, p.s); ctx.font = "22px system-ui"; ctx.textAlign = "center";
      ctx.fillText("💗", 0, 0); ctx.restore();
    }
    for (const p of R.sparkles) {
      ctx.save(); ctx.globalAlpha = clamp(p.life, 0, 1); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = "#ffe9a8";
      star(0, 0, 9 * p.s * p.life + 3, 3.4 * p.s, 4); ctx.fill(); ctx.restore();
    }
    for (const p of R.crumbs) {
      ctx.save(); ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = "#d99a5e";
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU); ctx.fill(); ctx.restore();
    }
    for (const p of R.bubbles) {
      ctx.save(); ctx.globalAlpha = clamp(p.life, 0, 1) * 0.85;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(150,200,240,0.8)"; ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.22, 0, TAU);
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
    }
    for (const p of R.zzz) {
      ctx.save(); ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.font = `${16 * (p.s || 1)}px system-ui`; ctx.fillStyle = "#8f7fa8";
      ctx.textAlign = "center"; ctx.fillText("z", p.x, p.y); ctx.restore();
    }
  }

  // ============================================================
  // Mood
  // ============================================================
  function mood() {
    if (S.sleeping) return "sleep";
    if (R.mode === "eat") return "eat";
    if (S.health < 35) return "sick";
    const lowest = Math.min(...NEED_KEYS.map((k) => S.need[k]));
    if (lowest < 18) return "sad";
    const avg = NEED_KEYS.reduce((a, k) => a + S.need[k], 0) / 4;
    if (R.mode === "fetch" || R.trickAnim > 0) return "happy";
    if (avg > 72 && S.bond > 40) return "happy";
    return "content";
  }

  // ============================================================
  // Render
  // ============================================================
  function nightAmount() {
    if (S.sleeping) return 1;
    const h = new Date().getHours();
    if (h >= 21 || h < 6) return 0.55;
    if (h === 20 || h === 6) return 0.25;
    return 0;
  }

  /* Draws the world. `withPet` is false on the adoption screen, where we
     still want a nice meadow behind the panel but nobody living in it yet. */
  function render(withPet) {
    const night = S ? nightAmount() : 0;
    ctx.clearRect(0, 0, W, H);

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    if (night > 0.5) { sky.addColorStop(0, "#4b4370"); sky.addColorStop(1, "#7a6a95"); }
    else if (night > 0) { sky.addColorStop(0, "#ffd9ea"); sky.addColorStop(1, "#d9c9f0"); }
    else { sky.addColorStop(0, "#ffeef6"); sky.addColorStop(1, "#eae4ff"); }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // sun / moon
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.beginPath(); ctx.arc(W * 0.83, H * 0.16, Math.min(W, H) * 0.075, 0, TAU);
    ctx.fillStyle = night > 0.5 ? "#fff6d0" : "#ffe6a8"; ctx.fill();
    if (night > 0.5) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath(); ctx.arc(W * 0.80, H * 0.135, Math.min(W, H) * 0.062, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // stars at night
    if (night > 0.5) {
      let s = 777;
      const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      ctx.fillStyle = "#fff";
      for (let i = 0; i < 34; i++) {
        const x = rnd() * W, y = rnd() * groundY * 0.8;
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(R.t * 1.2 + i));
        ctx.beginPath(); ctx.arc(x, y, rnd() * 1.6 + 0.7, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // drifting clouds
    for (const c of clouds) {
      c.x += c.v * 0.02;
      if (c.x > 1.2) c.x = -0.2;
      drawCloud(c.x * W, c.y * groundY, c.s * (Math.min(W, H) / 700 + 0.55), night > 0.5 ? 0.28 : 0.85);
    }

    // ground
    const gg = ctx.createLinearGradient(0, groundY - 20, 0, H);
    if (night > 0.5) { gg.addColorStop(0, "#8fbf9a"); gg.addColorStop(1, "#6f9b7e"); }
    else { gg.addColorStop(0, "#cdf0c6"); gg.addColorStop(1, "#a8dfb0"); }
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.quadraticCurveTo(W * 0.5, groundY - Math.min(28, H * 0.035), W, groundY);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

    // little tufts
    ctx.strokeStyle = night > 0.5 ? "rgba(60,95,70,.45)" : "rgba(110,175,120,.6)";
    ctx.lineWidth = 2.5; ctx.lineCap = "round";
    let s2 = 4242;
    const rnd2 = () => ((s2 = (s2 * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 22; i++) {
      const x = rnd2() * W, y = groundY + rnd2() * (H - groundY) * 0.75 + 6;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 3, y - 8, x + 7, y - 10);
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 3, y - 8, x - 7, y - 10);
      ctx.stroke();
    }

    // a few little flowers, nodding in the breeze
    const FLOWER_COLS = ["#ffb3ce", "#fff0a8", "#c9b6ff", "#ffd0b0"];
    for (let i = 0; i < 7; i++) {
      const x = rnd2() * W;
      const y = groundY + rnd2() * (H - groundY) * 0.7 + 14;
      const sc = 0.7 + rnd2() * 0.6;
      const col = FLOWER_COLS[(rnd2() * FLOWER_COLS.length) | 0];
      const sway = Math.sin(R.t * 1.3 + i) * 0.08;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(sway); ctx.scale(sc, sc);
      ctx.globalAlpha = night > 0.5 ? 0.5 : 1;
      ctx.strokeStyle = night > 0.5 ? "#5d8a68" : "#8fca97";
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(1, -7, 0, -13); ctx.stroke();
      ctx.fillStyle = col;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 4.4, -13 + Math.sin(a) * 4.4, 3.2, 3.2, 0, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = "#fff6c9";
      ctx.beginPath(); ctx.arc(0, -13, 2.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    if (withPet) {
      // messes (behind the pet)
      for (const m of S.messes) drawMess(m.x * W, groundY + Math.min(30, H * 0.03), m.s * (Math.min(W, H) / 620));

      // bowl
      if (R.bowl) drawBowl(R.bowl.x * W, groundY + 6, petRadius() * 0.62, R.bowl.full);

      // ball
      if (R.ball) drawBall(R.ball.x * W, R.ball.y, Math.min(W, H) * 0.028);

      // the star of the show
      const a = petAnchor();
      const r = petRadius();
      drawPuff(S.genes, a.x, a.y - R.bob, r, {
        stage: S.stage,
        mood: mood(),
        t: R.t,
        squash: R.squash,
        facing: R.facing,
        dirt: S.dirt,
      });

      // trick label
      if (R.trickAnim > 0) {
        ctx.save();
        ctx.globalAlpha = clamp(R.trickAnim, 0, 1);
        ctx.font = `800 ${Math.min(W, H) * 0.05}px ui-rounded, system-ui`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#e0679c";
        ctx.fillText(R.trickName + "!", a.x, a.y - r * 2.9);
        ctx.restore();
      }

      drawParticles();
    }

    // night veil
    if (night > 0.5) {
      ctx.fillStyle = "rgba(40, 30, 70, 0.22)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ============================================================
  // Behaviour
  // ============================================================
  function walkTo(px, onArrive) {
    R.target = { px: clamp(px, 0.08, 0.92), cb: onArrive };
    R.mode = "walk";
  }

  function updatePet(dt) {
    // blinking
    R.blink -= dt;
    R.nextBlink -= dt;
    if (R.nextBlink <= 0) { R.blink = 0.13; R.nextBlink = rand(2.2, 6); }

    // idle bobbing / breathing
    const m = mood();
    const bobAmp = S.sleeping ? 2 : m === "happy" ? 9 : 4.5;
    const bobSpd = S.sleeping ? 1.1 : m === "happy" ? 5.2 : 2.1;
    R.bob = Math.abs(Math.sin(R.t * bobSpd)) * bobAmp;
    R.squash = lerp(R.squash, 1 + Math.sin(R.t * bobSpd * 2) * (S.sleeping ? 0.012 : 0.03), 0.2);

    if (S.sleeping) {
      if (Math.random() < dt * 1.1) {
        const a = petAnchor(), r = petRadius();
        R.zzz.push({ x: a.x + r * 0.7, y: a.y - r * 2.1, life: 1, s: rand(0.8, 1.3) });
      }
      return;
    }

    // walking
    if (R.mode === "walk" && R.target) {
      const d = R.target.px - R.px;
      const speed = 0.32 * dt;
      R.facing = d > 0 ? 1 : -1;
      R.bob = Math.abs(Math.sin(R.t * 9)) * 8;
      if (Math.abs(d) <= speed) {
        R.px = R.target.px;
        const cb = R.target.cb; R.target = null; R.mode = "idle";
        if (cb) cb();
      } else {
        R.px += Math.sign(d) * speed;
      }
    } else if (R.mode === "idle" && !R.washing) {
      // gentle wandering, but kept away from the edges — a puff pressed up
      // against the side of the screen is harder to pet and looks stranded
      if (Math.random() < dt * 0.16) walkTo(clamp(R.px + rand(-0.18, 0.18), 0.26, 0.74));
    }

    // eating
    if (R.mode === "eat") {
      R.eatT -= dt;
      const a = petAnchor(), r = petRadius();
      if (Math.random() < dt * 12) spawnCrumb(a.x + rand(-r * 0.4, r * 0.4), a.y - r * 0.9);
      if (R.eatT <= 0) {
        R.mode = "idle";
        R.bowl = null;
        if (Math.random() < 0.45 && S.messes.length < 4) {
          setTimeout(() => { if (S) { addMess(); save(); } }, rand(6000, 20000));
        }
      }
    }

    // fetch
    if (R.ball) updateBall(dt);

    // happy sparkles
    if (m === "happy" && Math.random() < dt * 2.2) {
      const a = petAnchor(), r = petRadius();
      spawnSparkle(a.x + rand(-r * 1.3, r * 1.3), a.y - r * rand(0.6, 2.4));
    }

    if (R.trickAnim > 0) R.trickAnim -= dt;
    if (R.petCool > 0) R.petCool -= dt;
  }

  function updateBall(dt) {
    const b = R.ball;
    if (b.state === "fly") {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 1500 * dt;
      if (b.y >= groundY + 4) {
        b.y = groundY + 4;
        b.vy *= -0.42; b.vx *= 0.7;
        if (Math.abs(b.vy) < 60) {
          b.vy = 0; b.vx = 0; b.state = "rest";
          walkTo(b.x, () => {
            // grabbed it
            Sound.play("fetch");
            R.ball = null;
            S.need.fun = clamp(S.need.fun + 9, 0, 100);
            S.need.energy = clamp(S.need.energy - 4, 0, 100);
            S.bond = clamp(S.bond + 2.5, 0, 100);
            S.fetches++;
            const a = petAnchor(), r = petRadius();
            for (let i = 0; i < 5; i++) spawnSparkle(a.x + rand(-r, r), a.y - r * rand(0.8, 2.2));
            R.fetchesLeft--;
            bumpUI();
            if (R.fetchesLeft > 0) {
              say(choice(["again! again!", "throw it again! 🎾", "one more!"]));
              armFetch();
            } else {
              say(choice(["that was so fun 💗", "good game!", "*happy wiggle*"]));
              R.mode = "idle";
              setAction("play", false);
            }
            save();
          });
        }
      }
      if (b.x < 0.04) { b.x = 0.04; b.vx *= -0.5; }
      if (b.x > 0.96) { b.x = 0.96; b.vx *= -0.5; }
    }
  }

  // ============================================================
  // Actions
  // ============================================================
  const FOODS = [
    { k: "berry",  e: "🍓", name: "Berry",     food: 16, fun: 3,  msg: "so juicy!" },
    { k: "biscuit",e: "🍪", name: "Biscuit",   food: 26, fun: 5,  msg: "crunch crunch" },
    { k: "cake",   e: "🧁", name: "Cloudcake", food: 34, fun: 12, msg: "the BEST one" },
    { k: "soup",   e: "🍲", name: "Warm soup", food: 30, fun: 2,  msg: "cozy…", heal: 18 },
  ];

  const TRICKS = [
    { k: "sit",   e: "🪑", name: "Sit" },
    { k: "spin",  e: "🌀", name: "Spin" },
    { k: "speak", e: "🗣️", name: "Speak" },
    { k: "dance", e: "💃", name: "Dance" },
  ];

  let sayTimer = 0;
  function say(text, ms) {
    const el = $("say"), tx = $("say-text");
    tx.textContent = text;
    el.classList.remove("hidden");
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => el.classList.add("hidden"), ms || 2600);
  }

  function setAction(name, on) {
    const b = document.querySelector(`.act[data-act="${name}"]`);
    if (b) b.classList.toggle("on", !!on);
  }

  // --- feed ---
  function openTray() {
    if (S.sleeping) return say(`${S.name} is fast asleep 💤`);
    const wrap = $("foods");
    wrap.innerHTML = "";
    for (const f of FOODS) {
      const b = document.createElement("button");
      b.className = "food";
      b.innerHTML = `<span>${f.e}</span><b>${f.name}</b><i>+${f.food}</i>`;
      b.onclick = () => { closeOverlay("tray"); feed(f); };
      wrap.appendChild(b);
    }
    $("tray-sub").textContent = S.need.food < 30
      ? `${S.name} is really hungry!`
      : S.need.food > 88 ? `${S.name} looks pretty full, honestly.` : "What sounds good?";
    openOverlay("tray");
  }

  function feed(f) {
    Sound.resume();
    const spot = clamp(R.px + (Math.random() < 0.5 ? -0.18 : 0.18), 0.15, 0.85);
    R.bowl = { x: spot, full: true };
    walkTo(spot, () => {
      R.mode = "eat";
      R.eatT = 2.2;
      R.bowl.full = false;
      Sound.play("eat");
      S.need.food = clamp(S.need.food + f.food, 0, 100);
      S.need.fun = clamp(S.need.fun + f.fun, 0, 100);
      if (f.heal) S.health = clamp(S.health + f.heal, 0, 100);
      S.need.clean = clamp(S.need.clean - 4, 0, 100);
      S.bond = clamp(S.bond + 2, 0, 100);
      S.meals++;
      if (Math.random() < 0.5) addDirt(1);
      say(f.msg);
      bumpUI(); save(); maybeGrow();
    });
  }

  // --- play ---
  function togglePlay() {
    if (S.sleeping) return say(`${S.name} is fast asleep 💤`);
    if (R.fetchesLeft > 0) {           // cancel
      R.fetchesLeft = 0; R.ball = null; R.awaitThrow = false; R.mode = "idle";
      setAction("play", false);
      return;
    }
    if (S.need.energy < 12) {
      say(`${S.name} is too tired to play 😴`);
      return;
    }
    R.fetchesLeft = 3;
    setAction("play", true);
    say("tap anywhere to throw the ball! 🎾");
    armFetch();
  }

  function armFetch() {
    R.ball = null;
    R.awaitThrow = true;
  }

  function throwBallTo(px) {
    if (!R.awaitThrow) return;
    R.awaitThrow = false;
    const from = R.px;
    const dist = px - from;
    R.ball = {
      x: from, y: groundY - petRadius() * 1.4,
      vx: dist * 1.5, vy: -520, state: "fly",
    };
    R.facing = dist > 0 ? 1 : -1;
    Sound.play("ball");
  }

  // --- wash ---
  function toggleWash() {
    if (S.sleeping) return say(`${S.name} is fast asleep 💤`);
    R.washing = !R.washing;
    setAction("wash", R.washing);
    if (R.washing) {
      if (!S.dirt.length) addDirt(3 + randInt(3));
      say("scrub scrub! drag over your puff 🫧");
      R.mode = "idle"; R.target = null;
    } else {
      say(S.dirt.length ? "…still a bit grubby" : "all sparkly! ✨");
    }
  }

  function scrubAt(x, y) {
    const a = petAnchor(), r = petRadius();
    const dx = (x - a.x) / r, dy = (y - (a.y - R.bob)) / r;
    if (dx * dx + dy * dy > 3.2) return;
    for (let i = 0; i < 2; i++) spawnBubble(x + rand(-14, 14), y + rand(-14, 14));
    // remove the nearest dirt spot under the cursor
    for (let i = 0; i < S.dirt.length; i++) {
      const d = S.dirt[i];
      const px2 = d.x * 0.85, py2 = -0.95 + d.y * 0.85;
      if (Math.hypot(dx - px2, dy - py2) < 0.45) {
        S.dirt.splice(i, 1);
        S.need.clean = clamp(S.need.clean + 9, 0, 100);
        S.bond = clamp(S.bond + 0.7, 0, 100);
        Sound.play("bubble");
        bumpUI();
        if (!S.dirt.length) {
          S.need.clean = clamp(S.need.clean + 22, 0, 100);
          S.baths++;
          say("so fresh! ✨");
          R.washing = false; setAction("wash", false);
          const aa = petAnchor(), rr = petRadius();
          for (let k = 0; k < 8; k++) spawnSparkle(aa.x + rand(-rr, rr), aa.y - rr * rand(0.5, 2.3));
          Sound.play("happy");
          bumpUI(); save(); maybeGrow();
        }
        break;
      }
    }
  }

  // --- sleep ---
  function toggleSleep() {
    S.sleeping = !S.sleeping;
    setAction("sleep", S.sleeping);
    // drop whatever was in progress so nothing is left stranded on the lawn
    R.target = null; R.mode = "idle"; R.ball = null; R.awaitThrow = false;
    R.fetchesLeft = 0; R.bowl = null;
    R.washing = false; setAction("wash", false); setAction("play", false);
    if (S.sleeping) {
      Sound.play("yawn");
      say("goodnight… 💤", 2200);
    } else {
      Sound.play("wake");
      say(S.need.energy > 80 ? "so well rested! ☀️" : "*yawn* …five more minutes?");
    }
    bumpUI(); save();
  }

  // --- petting ---
  function petAt(x, y) {
    const a = petAnchor(), r = petRadius();
    const dx = x - a.x, dy = y - (a.y - R.bob);
    if (dx * dx + dy * dy > (r * 1.7) * (r * 1.7)) return false;

    spawnHeart(x + rand(-10, 10), y - 10);
    if (R.petCool <= 0) {
      R.petCool = 0.28;
      S.need.fun = clamp(S.need.fun + 1.1, 0, 100);
      S.bond = clamp(S.bond + 0.5, 0, 100);
      S.pets++;
      if (now() - R.lastPetSound > 260) { Sound.play("pet"); R.lastPetSound = now(); }
      if (S.sleeping && Math.random() < 0.12) say("mmf… 💤", 1400);
      else if (Math.random() < 0.07) say(choice(["*purr*", "💗", "more please", "*happy wiggle*", "eee!"]), 1500);
      bumpUI();
      maybeGrow();
    }
    return true;
  }

  // --- messes ---
  function tapMess(x, y) {
    const yy = groundY + Math.min(30, H * 0.03);
    for (let i = 0; i < S.messes.length; i++) {
      const m = S.messes[i];
      if (Math.hypot(x - m.x * W, y - yy) < Math.min(W, H) * 0.05) {
        S.messes.splice(i, 1);
        S.need.clean = clamp(S.need.clean + 10, 0, 100);
        Sound.play("bubble");
        for (let k = 0; k < 4; k++) spawnBubble(m.x * W + rand(-12, 12), yy - 6);
        say("all tidy! ✨", 1600);
        bumpUI(); save();
        return true;
      }
    }
    return false;
  }

  // ============================================================
  // Training minigame
  // ============================================================
  const Train = {
    active: false, trick: null, round: 0, hits: 0,
    pos: 0, dir: 1, speed: 0.85, zoneLo: 0.4, zoneHi: 0.6, raf: 0, last: 0,
  };

  function openTraining() {
    if (S.sleeping) return say(`${S.name} is fast asleep 💤`);
    if (S.need.energy < 15) return say(`${S.name} is too sleepy to concentrate 😴`);
    const list = $("trick-list");
    list.innerHTML = "";
    for (const tr of TRICKS) {
      const lvl = S.tricks[tr.k] || 0;
      const b = document.createElement("button");
      b.className = "trick";
      b.innerHTML = `<span>${tr.e}</span><b>${tr.name}</b><i>${lvl ? "★".repeat(lvl) : "not learned"}</i>`;
      b.onclick = () => startTrick(tr);
      list.appendChild(b);
    }
    $("trick-list").classList.remove("hidden");
    $("trick-game").classList.add("hidden");
    $("train-title").textContent = "Teach a trick 🎓";
    $("train-sub").textContent = "Pick something to practise.";
    openOverlay("training");
  }

  function startTrick(tr) {
    Train.active = true; Train.trick = tr; Train.round = 0; Train.hits = 0;
    Train.pos = 0; Train.dir = 1;
    const lvl = S.tricks[tr.k] || 0;
    // gets harder as they get better at it
    Train.speed = 0.75 + lvl * 0.22;
    const zoneW = 0.26 - lvl * 0.05;
    Train.zoneLo = rand(0.12, 0.88 - zoneW);
    Train.zoneHi = Train.zoneLo + zoneW;

    $("trick-list").classList.add("hidden");
    $("trick-game").classList.remove("hidden");
    $("train-title").textContent = `${tr.e} ${tr.name}`;
    $("train-sub").textContent = `Land 3 in the pink zone to teach ${S.name}.`;
    updateTrickUI();
    Train.last = performance.now();
    cancelAnimationFrame(Train.raf);
    Train.raf = requestAnimationFrame(trainLoop);
  }

  function updateTrickUI() {
    const zone = $("timing-zone");
    zone.style.left = (Train.zoneLo * 100).toFixed(1) + "%";
    zone.style.width = ((Train.zoneHi - Train.zoneLo) * 100).toFixed(1) + "%";
    $("trick-pips").textContent =
      "●".repeat(Train.hits) + "○".repeat(Math.max(0, 3 - Train.hits));
  }

  function trainLoop(ts) {
    if (!Train.active) return;
    const dt = Math.min(0.05, (ts - Train.last) / 1000);
    Train.last = ts;
    Train.pos += Train.dir * Train.speed * dt;
    if (Train.pos >= 1) { Train.pos = 1; Train.dir = -1; }
    if (Train.pos <= 0) { Train.pos = 0; Train.dir = 1; }
    $("timing-marker").style.left = `calc(${(Train.pos * 100).toFixed(2)}% - 3px)`;
    Train.raf = requestAnimationFrame(trainLoop);
  }

  function trickHit() {
    if (!Train.active) return;
    const inZone = Train.pos >= Train.zoneLo && Train.pos <= Train.zoneHi;
    if (inZone) {
      Train.hits++;
      Sound.play("tap");
      updateTrickUI();
      if (Train.hits >= 3) return finishTrick(true);
      // reposition the zone for the next round
      const zoneW = Train.zoneHi - Train.zoneLo;
      Train.zoneLo = rand(0.1, 0.9 - zoneW);
      Train.zoneHi = Train.zoneLo + zoneW;
      Train.speed += 0.12;
      updateTrickUI();
    } else {
      Sound.play("fail");
      Train.hits = Math.max(0, Train.hits - 1);
      updateTrickUI();
      $("train-sub").textContent = "Ooh, so close — keep going!";
    }
  }

  function finishTrick(ok) {
    Train.active = false;
    cancelAnimationFrame(Train.raf);
    const tr = Train.trick;
    if (ok) {
      const was = S.tricks[tr.k] || 0;
      S.tricks[tr.k] = Math.min(3, was + 1);
      S.need.fun = clamp(S.need.fun + 14, 0, 100);
      S.need.energy = clamp(S.need.energy - 8, 0, 100);
      S.bond = clamp(S.bond + 7, 0, 100);
      Sound.play("success");
      closeOverlay("training");
      performTrick(tr);
      bumpUI(); save(); maybeGrow();
    }
  }

  function performTrick(tr) {
    R.trickName = tr.name;
    R.trickAnim = 1.9;
    R.mode = "idle"; R.target = null;
    const a = petAnchor(), r = petRadius();
    for (let i = 0; i < 12; i++) spawnSparkle(a.x + rand(-r * 1.6, r * 1.6), a.y - r * rand(0.4, 2.6));
    for (let i = 0; i < 4; i++) spawnHeart(a.x + rand(-r, r), a.y - r * 1.4);
    const lvl = S.tricks[tr.k];
    say(lvl >= 3 ? `${S.name} has MASTERED ${tr.name}! 🌟` : `${S.name} learned ${tr.name}! ${"★".repeat(lvl)}`, 3200);
  }

  // ============================================================
  // Growth + care notices
  // ============================================================
  function maybeGrow() {
    if (checkGrowth()) {
      Sound.play("levelup");
      R.growFlash = 1.6;
      const a = petAnchor(), r = petRadius();
      for (let i = 0; i < 20; i++) spawnSparkle(a.x + rand(-r * 2, r * 2), a.y - r * rand(0.2, 3));
      showCare(
        "✨ Look at you! ✨",
        `${S.name} grew into a <b>${STAGE_NAMES[S.stage]}</b>! ` +
        (S.stage === 1
          ? "All that care is paying off — they're getting bolder."
          : "Fully grown, thoroughly spoiled, and completely devoted to you.")
      );
      bumpUI(); save();
      return true;
    }
    return false;
  }

  function showCare(title, html) {
    $("care-title").innerHTML = title;
    $("care-body").innerHTML = html;
    openOverlay("care");
  }

  // Greet the player based on how long they were gone
  function welcomeBack(elapsedSec) {
    const mins = elapsedSec / 60;
    const lowest = NEED_KEYS.reduce((lo, k) => (S.need[k] < S.need[lo] ? k : lo), "food");
    const label = { food: "hungry", fun: "bored", clean: "grubby", energy: "sleepy" }[lowest];

    if (mins > 45 && S.need[lowest] < 35) {
      showCare(
        `${S.name} missed you!`,
        `You were away for <b>${mins > 120 ? Math.round(mins / 60) + " hours" : Math.round(mins) + " minutes"}</b>. ` +
        `Your puff is looking a bit <b>${label}</b> — maybe start there? 💗`
      );
    } else if (mins > 8) {
      say(choice([`${S.name} heard you coming! 💗`, "you're back! 🎉", "*excited wiggle*"]), 3000);
      Sound.play("happy");
    }
  }

  // ============================================================
  // UI wiring
  // ============================================================
  const HEART_CHARS = ["♡", "♥"];
  function bumpUI() {
    if (!S) return;
    $("pet-name").textContent = S.name;
    $("pet-stage").textContent = STAGE_NAMES[S.stage];
    $("pet-age").textContent = ageLabel();

    const filled = Math.round((S.bond / 100) * 5);
    $("bond-hearts").textContent = HEART_CHARS[1].repeat(filled) + HEART_CHARS[0].repeat(5 - filled);

    for (const el of document.querySelectorAll(".need")) {
      const k = el.dataset.need;
      const v = S.need[k];
      el.querySelector("i").style.width = v.toFixed(1) + "%";
      el.classList.toggle("low", v < 40 && v >= 18);
      el.classList.toggle("critical", v < 18);
    }

    // nudge the relevant action button when a need is dire
    const urgent = { food: "feed", fun: "play", clean: "wash", energy: "sleep" };
    for (const k of NEED_KEYS) {
      const b = document.querySelector(`.act[data-act="${urgent[k]}"]`);
      if (b) b.classList.toggle("urgent", S.need[k] < 18 && !S.sleeping);
    }
    document.querySelector('.act[data-act="sleep"] span').textContent = S.sleeping ? "☀️" : "🌙";
    document.querySelector('.act[data-act="sleep"] b').textContent = S.sleeping ? "Wake" : "Sleep";
  }

  function openOverlay(id) { $(id).classList.remove("hidden"); }
  function closeOverlay(id) {
    $(id).classList.add("hidden");
    if (id === "training") { Train.active = false; cancelAnimationFrame(Train.raf); }
  }

  document.querySelectorAll("[data-close]").forEach((b) => {
    b.addEventListener("click", () => { Sound.resume(); closeOverlay(b.dataset.close); });
  });

  document.querySelectorAll(".act").forEach((b) => {
    b.addEventListener("click", () => {
      Sound.resume();
      switch (b.dataset.act) {
        case "feed":  openTray(); break;
        case "play":  togglePlay(); break;
        case "wash":  toggleWash(); break;
        case "train": openTraining(); break;
        case "sleep": toggleSleep(); break;
      }
    });
  });

  $("trick-hit").addEventListener("click", (e) => { e.preventDefault(); trickHit(); });
  window.addEventListener("keydown", (e) => {
    if (Train.active && (e.key === " " || e.key === "Enter")) { e.preventDefault(); trickHit(); }
  });

  $("sound-btn").addEventListener("click", () => {
    Sound.resume();
    Sound.setEnabled(!Sound.enabled);
    $("sound-btn").textContent = Sound.enabled ? "🔊" : "🔈";
    if (Sound.enabled) Sound.play("tap");
  });
  $("sound-btn").textContent = Sound.enabled ? "🔊" : "🔈";

  $("menu-btn").addEventListener("click", () => {
    Sound.resume();
    const t = Object.entries(S.tricks).filter(([, v]) => v > 0);
    $("menu-stats").innerHTML =
      `<b>${S.name}</b> · ${STAGE_NAMES[S.stage]} · ${ageLabel()}<br>` +
      `${PALETTES[S.genes.pal].name} · ${S.genes.pattern} · ${S.genes.ear} ears<br><br>` +
      `🍽️ ${S.meals} meals · 🫧 ${S.baths} baths<br>` +
      `🎾 ${S.fetches} fetches · 💗 ${S.pets} pets<br>` +
      `🎓 ${t.length ? t.map(([k, v]) => TRICKS.find((x) => x.k === k).name + " " + "★".repeat(v)).join(" · ") : "no tricks yet"}`;
    openOverlay("menu");
  });

  $("rehome").addEventListener("click", () => {
    closeOverlay("menu");
    $("rehome-body").innerHTML =
      `<b>${S.name}</b> is ${ageLabel()} and you've shared ` +
      `${S.meals} meals and ${S.pets} pets.<br><br>` +
      `Starting over adopts a brand new puff, and ${S.name} won't be coming back.`;
    openOverlay("rehome-confirm");
  });
  $("rehome-yes").addEventListener("click", () => {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    location.reload();
  });

  // ---------- pointer: petting, scrubbing, throwing, tidying ----------
  let pointerDown = false;
  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  }

  function onDown(e) {
    Sound.resume();
    pointerDown = true;
    const { x, y } = canvasPos(e);

    if (R.awaitThrow) { throwBallTo(clamp(x / W, 0.08, 0.92)); return; }
    if (tapMess(x, y)) return;
    if (R.washing) { scrubAt(x, y); return; }
    petAt(x, y);
    canvas.classList.add("petting");
  }
  function onMove(e) {
    if (!pointerDown) return;
    const { x, y } = canvasPos(e);
    if (R.washing) scrubAt(x, y);
    else petAt(x, y);
  }
  function onUp() { pointerDown = false; canvas.classList.remove("petting"); }

  canvas.addEventListener("mousedown", onDown);
  canvas.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  canvas.addEventListener("touchstart", (e) => { e.preventDefault(); onDown(e); }, { passive: false });
  canvas.addEventListener("touchmove", (e) => { e.preventDefault(); onMove(e); }, { passive: false });
  window.addEventListener("touchend", onUp);

  // ============================================================
  // Adoption
  // ============================================================
  let litter = [], chosen = null;

  function drawPreview(cv, genes, size) {
    const c = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr);
    cv.style.width = size + "px"; cv.style.height = size + "px";
    // point the shared drawing context at this preview canvas, draw, put it back
    ctx = c;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, size, size);
    drawPuff(genes, size / 2, size * 0.9, size * 0.24, {
      stage: 0, mood: "happy", t: performance.now() / 1000,
    });
    ctx = mainCtx;
  }

  function buildLitter() {
    litter = [makeGenes(), makeGenes(), makeGenes()];
    // make sure they're visibly different
    litter[1].pal = (litter[0].pal + 3 + randInt(3)) % PALETTES.length;
    litter[2].pal = (litter[1].pal + 3 + randInt(3)) % PALETTES.length;

    const wrap = $("litter");
    wrap.innerHTML = "";
    litter.forEach((g, i) => {
      const b = document.createElement("button");
      b.className = "pup";
      const cv = document.createElement("canvas");
      b.appendChild(cv);
      const em = document.createElement("em");
      em.textContent = PALETTES[g.pal].name;
      b.appendChild(em);
      wrap.appendChild(b);
      drawPreview(cv, g, 96);
      b.onclick = () => { Sound.resume(); Sound.play("tap"); pickPup(i); };
    });
  }

  function pickPup(i) {
    chosen = litter[i];
    $("adopt-step-1").classList.add("hidden");
    $("adopt-step-2").classList.remove("hidden");
    drawPreview($("adopt-preview"), chosen, 200);
    $("adopt-blurb").innerHTML =
      `This one is <b>${chosen.blurb}</b>.<br>What will you call them?`;
    const suggestions = ["Mochi", "Pudding", "Bean", "Waffle", "Nimbus", "Biscuit", "Dumpling", "Marshmallow", "Peaches", "Tofu"];
    $("name-input").placeholder = choice(suggestions);
    setTimeout(() => $("name-input").focus(), 80);
  }

  $("adopt-back").addEventListener("click", () => {
    $("adopt-step-2").classList.add("hidden");
    $("adopt-step-1").classList.remove("hidden");
    buildLitter();
  });

  $("adopt-go").addEventListener("click", doAdopt);
  $("name-input").addEventListener("keydown", (e) => { if (e.key === "Enter") doAdopt(); });

  function doAdopt() {
    Sound.resume();
    const inp = $("name-input");
    const name = (inp.value.trim() || inp.placeholder).slice(0, 12);
    S = freshPet(chosen, name);
    save();
    closeOverlay("adopt");
    document.body.classList.remove("no-pet");
    Sound.play("adopt");
    bumpUI();
    setTimeout(() => {
      say(`${name} is so happy to meet you! 💗`, 3600);
      const a = petAnchor(), r = petRadius();
      for (let i = 0; i < 14; i++) spawnSparkle(a.x + rand(-r * 2, r * 2), a.y - r * rand(0.3, 2.6));
      for (let i = 0; i < 5; i++) spawnHeart(a.x + rand(-r, r), a.y - r * 1.5);
    }, 420);
    setTimeout(() => {
      if (S && S.stage === 0) showCare("Taking care of " + name,
        "Keep the four little meters up top topped up — they drain in real time, " +
        "even while this tab is closed.<br><br>" +
        "<b>Drag on your puff to pet them</b> 💗 — it's the fastest way to build your bond, " +
        "and your bond is what helps them grow.");
    }, 4200);
  }

  // ============================================================
  // Boot
  // ============================================================
  resize();

  S = load();
  if (!S) {
    document.body.classList.add("no-pet");   // hides the HUD until adoption
    buildLitter();
    openOverlay("adopt");
  } else {
    closeOverlay("adopt");
    const elapsed = catchUpOffline();
    bumpUI();
    setAction("sleep", S.sleeping);
    setTimeout(() => welcomeBack(elapsed), 500);
  }

  // save on the way out
  window.addEventListener("pagehide", save);
  window.addEventListener("beforeunload", save);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) save();
    else if (S) { const e = catchUpOffline(); bumpUI(); if (e > 300) welcomeBack(e); }
  });

  let last = performance.now();
  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    R.t += dt;

    if (S) {
      applyElapsed(dt);
      updatePet(dt);
      updateParticles(dt);
      render(true);

      // periodic housekeeping
      saveTimer += dt;
      if (saveTimer > 12) { saveTimer = 0; save(); bumpUI(); }
    } else {
      render(false);   // empty meadow behind the adoption panel
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ---------- service worker ----------
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
