/* ============================================================
   CLOUD ARCADE — games registry
   The single source of truth for the whole library.

   To add a new game:
     1. Drop its self-contained folder in the repo (e.g. /beaver-chase/).
     2. Add an entry to the GAMES array below.
   The hub (index.html) and the per-game landing (game.html) render
   themselves from this data — no other code changes needed.

   Fields:
     id          unique slug (used in game.html?id=<id>)
     title       display name
     emoji       cover / header emoji
     tagline     one short line
     description a sentence or two for the game's landing page
     accent      primary theme color (hex)
     accent2     secondary theme color (hex) — used for gradients
     status      "live" | "soon"
     playUrl     where "Play" goes (live games only)
     screenshot  path to a gameplay still (optional; used as card cover)
     tags        array of short category labels
     players     e.g. "1 player"
     controls    array of [keys, description] rows (optional)
     installable true if the game ships as an installable PWA
     heavy       optional { mb, note } — shows a friendly "big first load"
                 warning on the game's landing page
   ============================================================ */

window.GAMES = [
  {
    id: "orbital-breaker",
    title: "Orbital Breaker",
    emoji: "☁️",
    tagline: "A cuddly cloud take on brick breaker.",
    description:
      "Your fluffy paddle orbits a little cloud friend while pastel bricks " +
      "surround you in rings. The ball drifts inward from every direction — " +
      "bop it back out and keep your cloud safe & cozy.",
    accent: "#5fbff9",
    accent2: "#b39dff",
    status: "live",
    playUrl: "./orbital-breaker/",
    screenshot: "./orbital-breaker/screenshot.webp",
    icon: "./orbital-breaker/icon-512.png",
    tags: ["Arcade", "Brick Breaker", "PWA"],
    players: "1 player",
    installable: true,
    controls: [
      ["Move mouse / drag", "float the paddle around the ring"],
      ["← → or A / D", "rotate the paddle"],
      ["Space / tap / click", "launch the ball"],
      ["P · M", "pause · mute"],
    ],
  },

  // ----- Coming soon (placeholders that prove the library is extensible) -----
  {
    id: "beaver-chase",
    title: "Beaver Chase",
    emoji: "🦫",
    tagline: "A cuddly, Neopets-flavored snake.",
    description:
      "Steer a bucktoothed beaver around the pond, chomping 🪵 logs, 🌰 acorns, " +
      "🍓 berries and 💎 gems to grow your tail and score. Grab specials, dodge " +
      "rocks and grumpy fish, and survive snappy 30-second levels of rising " +
      "chaos. Inspired by the Neopets classic Meerca Chase — now with a beaver.",
    accent: "#7ed957",
    accent2: "#39b54a",
    status: "live",
    playUrl: "./beaver-chase/",
    screenshot: "./beaver-chase/screenshot.webp",
    icon: "./beaver-chase/icon-512.png",
    tags: ["Arcade", "Snake", "Retro", "PWA"],
    players: "1 player",
    installable: true,
    controls: [
      ["Arrow keys / WASD", "steer the beaver"],
      ["Swipe / on-screen D-pad", "steer on mobile"],
      ["P · M", "pause · mute"],
    ],
  },
  {
    id: "sproutlandia",
    title: "Sproutlandia",
    emoji: "🌱",
    tagline: "A very small adventure with a very brave sprout.",
    description:
      "A cozy pixel platformer: hop, bonk and swing your way through five " +
      "handmade worlds — Ladle Meadow, Whispering Grove, Fizzy Falls, the " +
      "Snoring Stump and Bramble Tower — then face down Grumbleroot and the " +
      "Big Yawn. Built in Godot, with every sprite and every chiptune made " +
      "from scratch. It runs right here in your browser. ✨",
    accent: "#7bc86c",
    accent2: "#4a9d5f",
    status: "live",
    playUrl: "./sproutlandia/",
    screenshot: "./sproutlandia/screenshot.webp",
    tags: ["Platformer", "Adventure", "Bosses", "Godot"],
    players: "1 player",
    installable: true,
    heavy: {
      mb: 40,
      note:
        "Sproutlandia is a full little console game compiled to the web, so " +
        "the first visit downloads about 40 MB. Your browser caches it, so " +
        "every visit after that starts straight away.",
    },
    controls: [
      ["Arrow keys / WASD", "wander around"],
      ["Space or Z", "hop"],
      ["X", "swing your sprig"],
      ["Esc", "pause"],
      ["Gamepad", "stick / d-pad, B to hop, Y to swing"],
    ],
  },
  {
    id: "puff-pals",
    title: "Puff Pals",
    emoji: "🐾",
    tagline: "Adopt a fluffy little cloud creature.",
    description:
      "Pick a puff, name them, and take them home. Feed them cloudcake, " +
      "scrub them clean, throw a ball, teach them tricks, and pet them until " +
      "the hearts spill over. Their hunger, energy, fun and cleanliness tick " +
      "along in real time — even while the tab is closed — so they'll be " +
      "genuinely pleased to see you. Care for them well and they'll grow up. 💗",
    accent: "#ff9ec4",
    accent2: "#b39dff",
    status: "live",
    playUrl: "./puff-pals/",
    screenshot: "./puff-pals/screenshot.webp",
    icon: "./puff-pals/icon-512.png",
    tags: ["Virtual Pet", "Cozy", "Idle", "PWA"],
    players: "1 player",
    installable: true,
    controls: [
      ["Drag on your puff", "pet them 💗 — builds your bond fastest"],
      ["Feed · Wash · Play", "keep the four meters topped up"],
      ["Train", "time the sparkle into the pink zone"],
      ["Tap a mess", "tidy it away"],
    ],
  },
  {
    id: "cloud-runner",
    title: "Cloud Runner",
    emoji: "🏃",
    tagline: "Dash, leap, and never look back.",
    description: "An endless runner across the skies. Coming soon.",
    accent: "#ffb15f",
    accent2: "#ff7eb3",
    status: "soon",
    tags: ["Runner", "Endless"],
    players: "1 player",
  },
  {
    id: "trivia-sky",
    title: "Trivia Sky",
    emoji: "💭",
    tagline: "Float through questions across the clouds.",
    description: "A breezy trivia quiz game. Coming soon.",
    accent: "#b39dff",
    accent2: "#5fbff9",
    status: "soon",
    tags: ["Quiz", "Brain"],
    players: "1–4 players",
  },
];
