"""Generates parallax background layers for all 5 levels:
  assets/backgrounds/<level>/{far,mid,near}.png  -- each 480x270px

far.png  = sky/gradient, fully opaque
mid.png  = silhouette hills/trees, fully opaque
near.png = foreground detail, has transparent areas (RGBA alpha)

Level moods:
  ladle_meadow      bright green/blue daytime meadow
  whispering_grove  dusky purple-green twilight forest
  fizzy_falls       blue/teal waterfall canyon
  snoring_stump     warm orange/brown dusk, mini-boss lair
  bramble_tower     dark purple/near-black night sky with stars, final boss tower
"""

import os
import random

from PIL import Image

from canvas import ASSETS_DIR
from palette import (
    BARK_BROWN,
    DEEP_TEAL,
    DUSK_PURPLE,
    EMBER_ORANGE,
    FERN_GREEN,
    GRASS_GREEN,
    MOSS_GREEN,
    NIGHT_INDIGO,
    PALE_MIST,
    SHADOW_INK,
    SKY_BLUE,
    SUNSET_GOLD,
    TRANSPARENT,
)

W, H = 480, 270
BG_DIR = os.path.join(ASSETS_DIR, "backgrounds")

_SEED = 7160709  # fixed seed -> deterministic star/texture placement


def _vgradient(w, h, top_color, bottom_color):
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        r = round(top_color[0] + (bottom_color[0] - top_color[0]) * t)
        g = round(top_color[1] + (bottom_color[1] - top_color[1]) * t)
        b = round(top_color[2] + (bottom_color[2] - top_color[2]) * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    return img.convert("RGBA")


def _hill_silhouette(w, h, base_y, amplitude, color, rng, waviness=3):
    """A single rolling hill/tree-line band drawn as a polygon, with a
    low-frequency deterministic wobble so it doesn't look like a perfect
    sine wave."""
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    from PIL import ImageDraw

    draw = ImageDraw.Draw(img)
    points = [(0, h)]
    step = 24
    phase = rng.uniform(0, 6.28)
    import math

    for x in range(0, w + step, step):
        wobble = amplitude * math.sin(x / 70.0 + phase) + rng.uniform(
            -waviness, waviness
        )
        points.append((x, base_y + wobble))
    points.append((w, h))
    draw.polygon(points, fill=color)
    return img


def _stars(w, h, count, rng, color=PALE_MIST):
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    for _ in range(count):
        x = rng.randrange(w)
        y = rng.randrange(int(h * 0.7))
        img.putpixel((x, y), color)
        if rng.random() < 0.3:
            img.putpixel((min(x + 1, w - 1), y), color)
    return img


def _gen_ladle_meadow(rng):
    far = _vgradient(W, H, SKY_BLUE, PALE_MIST)
    sun_glow = Image.new("RGBA", (W, H), TRANSPARENT)
    from PIL import ImageDraw

    ImageDraw.Draw(sun_glow).ellipse(
        [W - 150, 20, W - 30, 140], fill=SUNSET_GOLD[:3] + (90,)
    )
    far.alpha_composite(sun_glow)
    mid = far.copy()
    hills = _hill_silhouette(W, H, base_y=190, amplitude=20, color=FERN_GREEN, rng=rng)
    mid.alpha_composite(hills)
    near = Image.new("RGBA", (W, H), TRANSPARENT)
    grass_tufts = _hill_silhouette(
        W, H, base_y=240, amplitude=14, color=GRASS_GREEN, rng=rng
    )
    near.alpha_composite(grass_tufts)
    return far, mid, near


def _gen_whispering_grove(rng):
    far = _vgradient(W, H, DUSK_PURPLE, MOSS_GREEN)
    mid = far.copy()
    trees = _hill_silhouette(
        W, H, base_y=170, amplitude=26, color=NIGHT_INDIGO, rng=rng
    )
    mid.alpha_composite(trees)
    near = Image.new("RGBA", (W, H), TRANSPARENT)
    fg_trees = _hill_silhouette(
        W, H, base_y=230, amplitude=30, color=SHADOW_INK, rng=rng
    )
    near.alpha_composite(fg_trees)
    return far, mid, near


def _gen_fizzy_falls(rng):
    far = _vgradient(W, H, SKY_BLUE, DEEP_TEAL)
    mid = far.copy()
    canyon = _hill_silhouette(W, H, base_y=180, amplitude=18, color=DEEP_TEAL, rng=rng)
    mid.alpha_composite(canyon)
    near = Image.new("RGBA", (W, H), TRANSPARENT)
    from PIL import ImageDraw

    draw = ImageDraw.Draw(near)
    # semi-transparent falling water streaks, deterministic positions
    for x in range(20, W, 46):
        draw.rectangle([x, 0, x + 10, H], fill=SKY_BLUE[:3] + (90,))
        draw.rectangle([x + 2, 0, x + 4, H], fill=PALE_MIST[:3] + (110,))
    mist = _hill_silhouette(W, H, base_y=250, amplitude=10, color=PALE_MIST, rng=rng)
    # lower mist opacity
    r, g, b, a = mist.split()
    a = a.point(lambda v: int(v * 0.5))
    mist = Image.merge("RGBA", (r, g, b, a))
    near.alpha_composite(mist)
    return far, mid, near


def _gen_snoring_stump(rng):
    far = _vgradient(W, H, EMBER_ORANGE, BARK_BROWN)
    mid = far.copy()
    stumps = _hill_silhouette(
        W, H, base_y=185, amplitude=22, color=BARK_BROWN, rng=rng
    )
    mid.alpha_composite(stumps)
    near = Image.new("RGBA", (W, H), TRANSPARENT)
    fg = _hill_silhouette(W, H, base_y=235, amplitude=16, color=SHADOW_INK, rng=rng)
    near.alpha_composite(fg)
    return far, mid, near


def _gen_bramble_tower(rng):
    far = _vgradient(W, H, NIGHT_INDIGO, DUSK_PURPLE)
    far.alpha_composite(_stars(W, H, 90, rng))
    mid = far.copy()
    tower_silhouette = _hill_silhouette(
        W, H, base_y=150, amplitude=34, color=SHADOW_INK, rng=rng
    )
    mid.alpha_composite(tower_silhouette)
    near = Image.new("RGBA", (W, H), TRANSPARENT)
    brambles = _hill_silhouette(
        W, H, base_y=245, amplitude=20, color=NIGHT_INDIGO, rng=rng
    )
    near.alpha_composite(brambles)
    return far, mid, near


LEVELS = {
    "ladle_meadow": _gen_ladle_meadow,
    "whispering_grove": _gen_whispering_grove,
    "fizzy_falls": _gen_fizzy_falls,
    "snoring_stump": _gen_snoring_stump,
    "bramble_tower": _gen_bramble_tower,
}


def generate():
    results = []
    for i, (level_name, fn) in enumerate(LEVELS.items()):
        rng = random.Random(_SEED + i)
        far, mid, near = fn(rng)

        level_dir = os.path.join(BG_DIR, level_name)
        os.makedirs(level_dir, exist_ok=True)

        for layer_name, img in (("far", far), ("mid", mid), ("near", near)):
            assert img.size == (W, H), f"{level_name}/{layer_name} wrong size: {img.size}"
            path = os.path.join(level_dir, f"{layer_name}.png")
            img.save(path)
            results.append((path, img.size))

    return results


if __name__ == "__main__":
    for path, size in generate():
        print(f"{path}: {size[0]}x{size[1]}")
