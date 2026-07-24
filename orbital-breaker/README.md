# 🛰️ Orbital Breaker

**A brick breaker turned inside-out.**

Classic breakout has a paddle sliding along the bottom of the screen. Orbital
Breaker takes that idea and wraps it around a circle: your paddle **orbits a
glowing core**, the bricks surround you in concentric neon rings, and the ball
can dive inward from *any* direction. Spin to deflect it back out — and never
let it reach the core.

No build step, no dependencies. It's an installable **Progressive Web App** —
add it to your phone's home screen and it runs full-screen and offline.

## ▶️ Play

```bash
# serve it locally (needed for PWA install + offline to work)
python3 -m http.server 8000
# then visit http://localhost:8000

# or just open the file directly for a quick look (no install/offline)
open index.html          # macOS  (use xdg-open on Linux, start on Windows)
```

## 📱 Install as an app

Because it ships a web manifest + service worker, you can install it like a
native app:

- **iOS Safari** — Share → *Add to Home Screen*
- **Android Chrome** — menu → *Install app* / *Add to Home Screen*
- **Desktop Chrome/Edge** — the install icon in the address bar

Once installed it launches standalone (no browser chrome) and works **offline**,
since the app shell is cached by the service worker.

## 🎮 Controls

| Action | Keys |
| --- | --- |
| Aim the paddle around the ring | **Move mouse** / **touch & drag** |
| Rotate the paddle | **← →** or **A / D** |
| Launch the ball | **Space** / **Enter** / **tap** / **click** |
| Pause | **P** / the on-screen ❚❚ button |

Where the ball strikes the paddle — and how fast the paddle is sweeping —
angles the rebound, so you can "steer" the ball toward the bricks you want.

On touch devices, tapping only launches or repositions — it never pauses — so
use the ❚❚ button (bottom corner) to pause.

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
- Fully responsive & touch-friendly — plays on desktop and mobile, with
  safe-area insets so the HUD clears notches/rounded corners
- Installable PWA that runs standalone and offline

## 🧩 Tech

Plain HTML5 Canvas + vanilla JavaScript + CSS. Zero dependencies, no build:

```
orbital-breaker/
├── index.html            # markup, HUD, overlays, PWA meta
├── style.css             # neon UI / overlay styling, safe-area insets
├── game.js               # engine: physics, rendering, game loop, SW register
├── manifest.webmanifest  # PWA manifest (name, icons, standalone)
├── sw.js                 # service worker — offline app-shell cache
├── icon-192.png          # app icons
├── icon-512.png
├── icon-maskable-512.png # maskable icon (Android adaptive)
└── apple-touch-icon.png  # iOS home-screen icon
```

Enjoy defending the core. 🔮
