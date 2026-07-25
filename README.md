# ☁️ Cloud Arcade

A growing library of tiny, delightful browser games.
**Play at → [samkaner.github.io/hello-world](https://samkaner.github.io/hello-world/)**

No downloads, no accounts, no tracking. Every game runs in the browser and
installs to your home screen if you want it there.

> This repo started life in 2017 as `hello-world`, my first-ever GitHub repo.
> It grew up into an arcade. The original README is preserved at the bottom.

## The games

| Game | What it is | Built with |
|---|---|---|
| [☁️ Orbital Breaker](./orbital-breaker/) | Brick breaker turned inside out — your paddle orbits a cloud while bricks surround you in rings | Canvas + WebAudio, PWA |
| [🦫 Beaver Chase](./beaver-chase/) | A cuddly Meerca-Chase-flavored snake with 30-second levels | Canvas + WebAudio, PWA |
| [🌱 Sproutlandia](./sproutlandia/) | A cozy pixel platformer: 5 worlds, 2 bosses, ~25 minutes | Godot 4 → WebAssembly |
| [🐾 Puff Pals](./puff-pals/) | Adopt a fluffy cloud creature and raise it — needs decay in real time | Canvas + WebAudio, PWA |

## How the arcade works

`games.js` is the single source of truth. The hub (`index.html`) and every
per-game landing page (`game.html?id=<slug>`) render themselves from that
array — there is no build step and no framework.

**To add a game:**

1. Drop a self-contained folder in the repo root (e.g. `/my-game/`).
2. Add one entry to the `GAMES` array in `games.js`.

That's it. The card, the search index, the tag filter chips, the detail page,
the controls table and the install instructions all come from that entry.

```
index.html      hub — grid, search, tag filters
game.html       per-game landing page, themed from the registry
games.js        ← the registry
arcade.css      shared pastel-cloud theme
```

Games with a heavy first download declare a `heavy: { mb, note }` field and the
landing page grows a friendly warning panel automatically.

## Sproutlandia — the Godot one

Sproutlandia is a real little console game, so it works differently from the
others: the Godot project lives in **`sproutlandia-src/`** and the *exported
web build* in **`sproutlandia/`** is what gets committed and served.

It's exported with **threads disabled**, which is what lets it run on GitHub
Pages at all — a threaded Godot web build needs `Cross-Origin-Opener-Policy` /
`Cross-Origin-Embedder-Policy` response headers, and Pages can't set those.

**To re-export after changing the game:**

```sh
cd sproutlandia-src
godot --headless --import .
godot --headless --export-release "Web"    # writes ../sproutlandia/
```

The first visit downloads ~40 MB of WebAssembly; the browser caches it after
that. The custom loading screen (`sproutlandia-src/web/shell.html`) shows real
download progress and says so up front.

A macOS desktop build is still available via the `macOS` export preset
(`godot --headless --export-release "macOS"`), which writes to
`sproutlandia-src/builds/` and is not committed.

### Sproutlandia's art and audio are generated

Nothing under `sproutlandia-src/assets/` is hand-drawn or recorded — it's all
produced by deterministic Python:

```sh
python3 sproutlandia-src/tools/pixelart/build_all.py   # every PNG
python3 sproutlandia-src/tools/audio/gen_audio.py      # every WAV
```

### Controller mapping note

Godot's joypad constants follow the Xbox-style "standard gamepad" layout
rather than Nintendo's printed labels. On a Switch controller the physical
**B** button (bottom face) jumps and **Y** (left face) attacks — see
`sproutlandia-src/scripts/systems/InputSetup.gd` for the full rationale.

## Deploying

GitHub Pages serves the `master` branch from the repo root. Push to `master`
and the site updates. `.nojekyll` is present so Jekyll doesn't eat any
underscore-prefixed files.

---

<details>
<summary>The original 2017 README</summary>

# hello-world
My first GitHub repository

Hi there!

Sam Kaner here.
Finally trying this GitHub thing out.
Gotta learn the ropes to make the most of my career.
Yeah yeah, yeah yeah.

</details>
