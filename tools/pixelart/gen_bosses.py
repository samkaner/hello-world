"""Generates the boss spritesheets:

- assets/bosses/big_yawn.png -- mini-boss: a huge sleepy tree stump whose
  yawns are dangerous. 4 frames x 64x64 = 256x64.
- assets/bosses/grumbleroot.png -- final boss: a grumpy old stump wizard
  with an acorn-cap hat, moss beard and a berry-topped branch staff.
  4 frames x 64x64 = 256x64.

Frame order for both: 0 idle, 1 telegraph, 2 attack, 3 hurt.
Same 3-tone shading + silhouette outline pass as the hero (see gen_hero.py).
"""

import os

from canvas import (
    ASSETS_DIR,
    PixelCanvas,
    darken,
    hstack_frames,
    lighten,
    outline_pass,
    tint_toward,
)
from palette import (
    BARK_BROWN,
    BERRY_RED,
    CREAM_BELLY,
    FERN_GREEN,
    GRASS_GREEN,
    LADLE_BROWN,
    MOSS_GREEN,
    PALE_MIST,
    SHADOW_INK,
    SUNSET_GOLD,
    TRANSPARENT,
    TWIG_TAN,
)

FRAME_SIZE = 64
YAWN_PATH = os.path.join(ASSETS_DIR, "bosses", "big_yawn.png")
GRUMBLE_PATH = os.path.join(ASSETS_DIR, "bosses", "grumbleroot.png")

BARK_LIGHT = lighten(BARK_BROWN, 0.25)
BARK_DARK = darken(BARK_BROWN, 0.3)
RING_TAN = lighten(TWIG_TAN, 0.15)


def _bark_texture(canvas, x0, y0, x1, y1):
    """Vertical bark grooves at fixed (deterministic) offsets."""
    for i, gx in enumerate(range(x0 + 3, x1 - 2, 5)):
        wobble = (i * 7) % 3 - 1
        canvas.draw.line([gx + wobble, y0 + 2, gx, y1 - 2], fill=BARK_DARK, width=1)
        if i % 2 == 0:
            canvas.draw.line([gx + wobble + 1, y0 + 4, gx + 1, y1 - 6],
                             fill=BARK_LIGHT, width=1)


def _trunk(canvas, x0, y0, x1, y1):
    """A stump trunk: rounded rectangle body, bark grooves, root feet."""
    canvas.draw.rounded_rectangle([x0, y0, x1, y1 - 3], radius=6, fill=BARK_BROWN)
    _bark_texture(canvas, x0, y0, x1, y1)
    # root feet along the base
    base_y = y1 - 3
    n_roots = 4
    span = (x1 - x0) // n_roots
    for i in range(n_roots):
        rx = x0 + span // 2 + i * span
        canvas.draw.ellipse([rx - span // 2, base_y - 3, rx + span // 2, y1 + 2],
                            fill=BARK_BROWN)
        canvas.draw.arc([rx - span // 2, base_y - 3, rx + span // 2, y1 + 2],
                        start=20, end=160, fill=BARK_DARK, width=1)


def _stump_top(canvas, x0, y, x1):
    """Sawn-off top face with growth rings."""
    cx = (x0 + x1) // 2
    rx = (x1 - x0) // 2
    canvas.draw.ellipse([x0, y - 6, x1, y + 6], fill=TWIG_TAN)
    for r in range(rx - 4, 2, -5):
        ry = max(1, r * 6 // rx)
        canvas.draw.ellipse([cx - r, y - ry, cx + r, y + ry], outline=RING_TAN)


def _moss(canvas, spots):
    for mx, my, mr in spots:
        canvas.draw.ellipse([mx - mr, my - mr // 2, mx + mr, my + mr // 2],
                            fill=MOSS_GREEN)
        canvas.draw.ellipse([mx - mr + 1, my - mr // 2, mx + mr - 2, my],
                            fill=GRASS_GREEN)


def _yawn_frame(pose):
    canvas = PixelCanvas(FRAME_SIZE, FRAME_SIZE, TRANSPARENT)
    cx = FRAME_SIZE // 2
    x0, x1 = cx - 22, cx + 22
    top_y = 12 if pose != "telegraph" else 10  # inhale: puffs up

    _trunk(canvas, x0, top_y, x1, 60)
    _stump_top(canvas, x0, top_y, x1)
    _moss(canvas, [(x0 + 4, 30, 5), (x1 - 6, 44, 6), (cx - 4, 54, 5)])

    # sleepy face
    eye_y = top_y + 14
    if pose == "hurt":
        for side in (-1, 1):
            ex = cx + side * 9
            canvas.draw.line([ex - 2, eye_y - 2, ex + 2, eye_y + 2], fill=SHADOW_INK, width=2)
            canvas.draw.line([ex + 2, eye_y - 2, ex - 2, eye_y + 2], fill=SHADOW_INK, width=2)
    elif pose == "telegraph":
        # eyes snap wide open
        for side in (-1, 1):
            ex = cx + side * 9
            canvas.draw.ellipse([ex - 3, eye_y - 4, ex + 3, eye_y + 4], fill=PALE_MIST)
            canvas.draw.ellipse([ex - 1, eye_y - 2, ex + 1, eye_y + 2], fill=SHADOW_INK)
    else:
        # heavy half-closed lids
        for side in (-1, 1):
            ex = cx + side * 9
            canvas.draw.ellipse([ex - 3, eye_y - 2, ex + 3, eye_y + 3], fill=PALE_MIST)
            canvas.draw.rectangle([ex - 3, eye_y - 3, ex + 3, eye_y], fill=BARK_BROWN)
            canvas.draw.line([ex - 3, eye_y, ex + 3, eye_y], fill=SHADOW_INK, width=1)
            canvas.draw.ellipse([ex - 1, eye_y + 1, ex + 1, eye_y + 3], fill=SHADOW_INK)

    # the yawn itself
    mouth_y = eye_y + 12
    if pose == "attack":
        canvas.draw.ellipse([cx - 10, mouth_y - 8, cx + 10, mouth_y + 10], fill=SHADOW_INK)
        canvas.draw.ellipse([cx - 7, mouth_y + 2, cx + 7, mouth_y + 9],
                            fill=darken(BERRY_RED, 0.2))
        canvas.draw.ellipse([cx - 2, mouth_y - 6, cx + 2, mouth_y - 2],
                            fill=darken(BERRY_RED, 0.35))  # uvula
    elif pose == "telegraph":
        canvas.draw.ellipse([cx - 4, mouth_y - 2, cx + 4, mouth_y + 3], fill=SHADOW_INK)
    else:
        canvas.draw.arc([cx - 6, mouth_y - 4, cx + 6, mouth_y + 4],
                        start=20, end=160, fill=SHADOW_INK, width=2)
    # sleepy drool sparkle + "z" for idle
    if pose == "idle":
        canvas.draw.line([x1 - 2, top_y - 6, x1 + 2, top_y - 6], fill=PALE_MIST, width=1)
        canvas.draw.line([x1 + 2, top_y - 6, x1 - 2, top_y - 2], fill=PALE_MIST, width=1)
        canvas.draw.line([x1 - 2, top_y - 2, x1 + 2, top_y - 2], fill=PALE_MIST, width=1)

    outline_pass(canvas.image, SHADOW_INK)
    if pose == "hurt":
        canvas.image = tint_toward(canvas.image, PALE_MIST, 0.35)
    return canvas.image


def _grumble_frame(pose):
    canvas = PixelCanvas(FRAME_SIZE, FRAME_SIZE, TRANSPARENT)
    cx = 28
    x0, x1 = cx - 18, cx + 18
    top_y = 10

    # staff first (behind the body): a gnarled branch with a berry
    staff_x = x1 + 10
    staff_top = 8 if pose in ("telegraph", "attack") else 16
    canvas.draw.line([staff_x, staff_top, staff_x - 2, 58], fill=LADLE_BROWN, width=3)
    canvas.draw.line([staff_x, staff_top + 6, staff_x + 4, staff_top + 2],
                     fill=LADLE_BROWN, width=2)
    canvas.draw.ellipse([staff_x - 3, staff_top - 6, staff_x + 3, staff_top],
                        fill=BERRY_RED)
    canvas.set_pixel(staff_x - 1, staff_top - 4, lighten(BERRY_RED, 0.4))
    if pose in ("telegraph", "attack"):
        # berry charges up: glow spokes
        for dx, dy in ((-6, -4), (6, -4), (0, -9), (-7, 2), (7, 2)):
            canvas.set_pixel(staff_x + dx, staff_top - 3 + dy, SUNSET_GOLD)

    _trunk(canvas, x0, top_y, x1, 60)
    _moss(canvas, [(x0 + 5, 36, 5), (x1 - 8, 50, 5)])

    # acorn-cap hat
    canvas.draw.ellipse([x0 + 2, top_y - 7, x1 - 2, top_y + 5], fill=LADLE_BROWN)
    canvas.draw.arc([x0 + 2, top_y - 7, x1 - 2, top_y + 5], start=180, end=360,
                    fill=lighten(LADLE_BROWN, 0.25), width=2)
    canvas.draw.rectangle([cx - 2, top_y - 11, cx + 1, top_y - 6], fill=BARK_BROWN)

    # angry brows + eyes
    eye_y = top_y + 13
    brow_drop = 2 if pose in ("telegraph", "attack") else 1
    if pose == "hurt":
        for side in (-1, 1):
            ex = cx + side * 8
            canvas.draw.line([ex - 2, eye_y - 2, ex + 2, eye_y + 2], fill=SHADOW_INK, width=2)
            canvas.draw.line([ex + 2, eye_y - 2, ex - 2, eye_y + 2], fill=SHADOW_INK, width=2)
    else:
        for side in (-1, 1):
            ex = cx + side * 8
            canvas.draw.ellipse([ex - 3, eye_y - 3, ex + 3, eye_y + 3], fill=SUNSET_GOLD)
            canvas.draw.ellipse([ex - 1, eye_y - 1, ex + 1, eye_y + 1], fill=SHADOW_INK)
            canvas.draw.line([ex - 4, eye_y - 4 + side * 0, ex + 3, eye_y - 4 + brow_drop * side * 0],
                             fill=SHADOW_INK, width=2)
        # angled angry brows (drawn separately so they slant inward)
        canvas.draw.line([cx - 12, eye_y - 6, cx - 4, eye_y - 3 - brow_drop + 2],
                         fill=SHADOW_INK, width=2)
        canvas.draw.line([cx + 12, eye_y - 6, cx + 4, eye_y - 3 - brow_drop + 2],
                         fill=SHADOW_INK, width=2)

    # moss beard around the mouth
    beard_y = eye_y + 10
    canvas.draw.ellipse([cx - 12, beard_y - 4, cx + 12, beard_y + 10], fill=MOSS_GREEN)
    canvas.draw.ellipse([cx - 10, beard_y - 4, cx + 10, beard_y + 4], fill=GRASS_GREEN)
    # mouth inside the beard
    if pose == "attack":
        canvas.draw.ellipse([cx - 5, beard_y - 2, cx + 5, beard_y + 5], fill=SHADOW_INK)
    elif pose == "telegraph":
        canvas.draw.line([cx - 4, beard_y + 1, cx + 4, beard_y + 1], fill=SHADOW_INK, width=2)
    elif pose == "hurt":
        canvas.draw.ellipse([cx - 3, beard_y - 1, cx + 3, beard_y + 3], fill=SHADOW_INK)
    else:
        canvas.draw.arc([cx - 5, beard_y - 2, cx + 5, beard_y + 4],
                        start=200, end=340, fill=SHADOW_INK, width=2)

    outline_pass(canvas.image, SHADOW_INK)
    if pose == "hurt":
        canvas.image = tint_toward(canvas.image, PALE_MIST, 0.35)
    return canvas.image


def generate():
    results = []
    order = ["idle", "telegraph", "attack", "hurt"]
    for path, frame_fn in ((YAWN_PATH, _yawn_frame), (GRUMBLE_PATH, _grumble_frame)):
        frames = [frame_fn(p) for p in order]
        sheet = hstack_frames(frames)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        sheet.save(path)
        results.append((path, sheet.size))
    return results


if __name__ == "__main__":
    for path, size in generate():
        print(f"{path}: {size[0]}x{size[1]}")
