# ☁️ Orbital Breaker

**A cuddly cloud take on brick breaker.**

Classic breakout has a paddle sliding along the bottom of the screen. Orbital
Breaker takes that idea and wraps it around a circle: your fluffy paddle
**orbits a little cloud friend**, pastel candy bricks surround you in concentric
rings, and the ball drifts inward from *any* direction. Bop it back out — and
keep your cloud safe and cozy.

Soft pastel, light-blue, cloud-friend aesthetic with adorable synthesized sound
effects — gentle chimes and boops, no audio files.

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
| Mute / unmute | **M** / the on-screen 🔊 button |

Where the ball strikes the paddle — and how fast the paddle is sweeping —
angles the rebound, so you can "steer" the ball toward the bricks you want.

On touch devices, tapping only launches or repositions — it never pauses — so
use the ❚❚ button (bottom corner) to pause.

## 🌀 The twist

- **Radial playfield.** Everything is polar. The "floor" you're defending
  isn't below you — it's the little cloud friend at the center.
- **360° threat.** The ball drifts in from every angle, so positioning is a
  constant orbital chase rather than a left-right shuffle.
- **Defend, don't just clear.** Lose the ball past your paddle and it reaches
  your cloud, costing you a heart. Clear every ring to advance.

## ✨ Features

- Concentric pastel brick rings that grow denser and tougher each level
- Four adorable power-ups that drift inward toward your cloud:
  - **🎀 FLUFFY** — a wider paddle arc
  - **💤 SLEEPY** — slows the ball down
  - **☁️ POOF** — splits into three balls
  - **💗 LOVE** — an extra heart
- Cute synthesized sound effects (WebAudio, no files): soft chimes on hits,
  gentle boops on bounces, a sparkle on power-ups — toggle with **M** / 🔊
- Constant-speed physics with anti-tunneling sub-steps, spin transfer, and
  angle control off the paddle
- Soft pastel cloud aesthetic: a smiling cloud-friend core (that looks worried
  as danger nears), drifting clouds, heart & sparkle particles
- Best-score saved to `localStorage`
- Fully responsive & touch-friendly — plays on desktop and mobile, with
  safe-area insets so the HUD clears notches/rounded corners
- Installable PWA that runs standalone and offline

## 🧩 Tech

Plain HTML5 Canvas + vanilla JavaScript + CSS. Zero dependencies, no build:

```
orbital-breaker/
├── index.html            # markup, HUD, overlays, PWA meta
├── style.css             # pastel UI / overlay styling, safe-area insets
├── game.js               # engine: physics, rendering, sound, game loop, SW register
├── manifest.webmanifest  # PWA manifest (name, icons, standalone)
├── sw.js                 # service worker — offline app-shell cache
├── screenshot.png        # gameplay still (also the landing-page hero)
├── icon-192.png          # app icons (cute cloud friend)
├── icon-512.png
├── icon-maskable-512.png # maskable icon (Android adaptive)
└── apple-touch-icon.png  # iOS home-screen icon
```

Keep your cloud safe and cozy. ☁️🩵
