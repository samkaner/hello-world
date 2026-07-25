"""Shared original 16-color palette for Sproutlandia pixel art.

Every generator module should import colors from here rather than hard-coding
RGB tuples, so the whole game shares one consistent, original palette.
No color here is copied from or references any existing commercial game's
character or scheme -- these are original names/values picked for this
project's own tone (a cozy sprout/acorn woodland adventure).

Colors are RGBA 4-tuples so they can be used directly on RGBA canvases.
"""

# Greens -- hero body, grass, foliage
GRASS_GREEN = (92, 176, 74, 255)
FERN_GREEN = (58, 132, 60, 255)
MOSS_GREEN = (34, 84, 46, 255)

# Browns -- wood, bark, ladle, dirt
LADLE_BROWN = (176, 128, 74, 255)
BARK_BROWN = (94, 62, 42, 255)
TWIG_TAN = (204, 168, 118, 255)

# Warm neutrals -- hero belly, highlights, wood grain
CREAM_BELLY = (250, 232, 188, 255)
SUNSET_GOLD = (244, 196, 78, 255)

# Blues / teals -- sky, water
SKY_BLUE = (120, 196, 232, 255)
DEEP_TEAL = (36, 118, 132, 255)

# Purples -- twilight, night sky
DUSK_PURPLE = (98, 78, 138, 255)
NIGHT_INDIGO = (30, 24, 58, 255)

# Warm accent -- dusk lair, embers
EMBER_ORANGE = (216, 108, 58, 255)

# Reds / pinks -- berries, hearts
BERRY_RED = (210, 62, 78, 255)

# Grays -- stone walls, dungeon
STONE_GRAY = (128, 128, 138, 255)

# Ink / highlight extremes
SHADOW_INK = (26, 22, 28, 255)
PALE_MIST = (240, 244, 240, 255)

# Sentinel for "no pixel here" on RGBA canvases
TRANSPARENT = (0, 0, 0, 0)

# Convenience: every named color, useful for tests / sanity checks
ALL_COLORS = {
    "GRASS_GREEN": GRASS_GREEN,
    "FERN_GREEN": FERN_GREEN,
    "MOSS_GREEN": MOSS_GREEN,
    "LADLE_BROWN": LADLE_BROWN,
    "BARK_BROWN": BARK_BROWN,
    "TWIG_TAN": TWIG_TAN,
    "CREAM_BELLY": CREAM_BELLY,
    "SUNSET_GOLD": SUNSET_GOLD,
    "SKY_BLUE": SKY_BLUE,
    "DEEP_TEAL": DEEP_TEAL,
    "DUSK_PURPLE": DUSK_PURPLE,
    "NIGHT_INDIGO": NIGHT_INDIGO,
    "EMBER_ORANGE": EMBER_ORANGE,
    "BERRY_RED": BERRY_RED,
    "STONE_GRAY": STONE_GRAY,
    "SHADOW_INK": SHADOW_INK,
    "PALE_MIST": PALE_MIST,
}
