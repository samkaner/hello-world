# 🛰️ Orbital Breaker

**A brick breaker turned inside-out.**

Classic breakout has a paddle sliding along the bottom of the screen. Orbital
Breaker takes that idea and wraps it around a circle: your paddle **orbits a
glowing core**, the bricks surround you in concentric neon rings, and the ball
can dive inward from *any* direction. Spin to deflect it back out — and never
let it reach the core.

No build step, no dependencies. Just open `index.html`.

## ▶️ Play

```bash
# from this folder, either just open the file…
open index.html          # macOS  (use xdg-open on Linux, start on Windows)

# …or serve it locally
python3 -m http.server 8000
# then visit http://localhost:8000
```

## 🎮 Controls

| Action | Keys |
| --- | --- |
| Aim the paddle around the ring | **Move mouse** / **touch & drag** |
| Rotate the paddle | **← →** or **A / D** |
| Launch the ball · pause | **Space** / **Enter** / **click** |

Where the ball strikes the paddle — and how fast the paddle is sweeping —
angles the rebound, so you can "steer" the ball toward the bricks you want.

## 🌀 The twist

- **Radial playfield.** Everything is polar. The "floor" you're defending
  isn't below you — it's the core at the center.
- **360° threat.** The ball attacks from every angle, so positioning is a
  constant orbital chase rather than a left-right shuffle.
- **Defend, don't just clear.** Lose the ball past your paddle and it breaches
  the core, costing you a life. Clear every ring to advance.

## ✨ Features

- Concentric brick rings that grow denser and tougher each level
- Four catchable power-ups that drift inward toward the core:
  - **WIDE** — a wider paddle arc
  - **SLOW** — slows the ball down
  - **MULTI** — splits into three balls
  - **+CORE** — an extra life
- Constant-speed physics with anti-tunneling sub-steps, spin transfer, and
  angle control off the paddle
- Neon glow aesthetic, particle bursts, screen shake, a core that flushes red
  as danger closes in, and a parallax starfield
- Best-score saved to `localStorage`
- Fully responsive & touch-friendly — plays on desktop and mobile

## 🧩 Tech

Plain HTML5 Canvas + vanilla JavaScript + CSS. Three files, zero dependencies:

```
orbital-breaker/
├── index.html   # markup, HUD, overlays
├── style.css    # neon UI / overlay styling
└── game.js      # engine: physics, rendering, game loop
```

Enjoy defending the core. 🔮
