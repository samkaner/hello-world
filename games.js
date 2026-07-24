/* ============================================================
   CLOUD ARCADE — games registry
   The single source of truth for the whole library.

   To add a new game:
     1. Drop its self-contained folder in the repo (e.g. /snake/).
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
    screenshot: "./orbital-breaker/screenshot.png",
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
    id: "snake",
    title: "Snake",
    emoji: "🐍",
    tagline: "The slithery classic, reimagined.",
    description: "A fresh, cuddly spin on Snake is on the way to the arcade.",
    accent: "#7ed957",
    accent2: "#39b54a",
    status: "soon",
    tags: ["Arcade", "Classic"],
    players: "1 player",
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
