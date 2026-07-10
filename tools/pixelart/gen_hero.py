"""Generates assets/sprites/hero.png -- "Pip", a round sprout creature with
big expressive eyes, a two-leaf sprig, stubby feet, and a wooden ladle.

Spritesheet: 6 frames horizontally, 32x32px each, 192x32px total.
Frame order: 0 idle, 1 walk1, 2 walk2, 3 jump, 4 attack, 5 hurt.

Drawn with 3-tone shading + a final silhouette outline pass (see canvas.py)
rather than per-shape outlines, which is what gives it the hand-inked look.
"""

import os

from canvas import (
    ASSETS_DIR,
    PixelCanvas,
    darken,
    hstack_frames,
    lighten,
    outline_pass,
    shaded_ellipse,
    tint_toward,
)
from palette import (
    BARK_BROWN,
    BERRY_RED,
    CREAM_BELLY,
    FERN_GREEN,
    GRASS_GREEN,
    LADLE_BROWN,
    PALE_MIST,
    SHADOW_INK,
    TRANSPARENT,
    TWIG_TAN,
)

FRAME_SIZE = 32
OUT_PATH = os.path.join(ASSETS_DIR, "sprites", "hero.png")

BODY_LIGHT = lighten(GRASS_GREEN, 0.4)
BELLY_SHADE = darken(CREAM_BELLY, 0.12)
BLUSH = lighten(BERRY_RED, 0.35)


def _draw_leaf(canvas, tip_x, tip_y, base_x, base_y):
    """A small pointed leaf from base to tip with a midrib."""
    # perpendicular width vector
    dx, dy = tip_x - base_x, tip_y - base_y
    px, py = -dy, dx
    norm = max(1.0, (px * px + py * py) ** 0.5)
    px, py = px / norm * 2.2, py / norm * 2.2
    mid_x, mid_y = (tip_x + base_x) / 2.0, (tip_y + base_y) / 2.0
    canvas.draw.polygon(
        [
            (base_x, base_y),
            (mid_x + px, mid_y + py),
            (tip_x, tip_y),
            (mid_x - px, mid_y - py),
        ],
        fill=FERN_GREEN,
    )
    canvas.draw.line([base_x, base_y, tip_x, tip_y], fill=BODY_LIGHT, width=1)


def _draw_sprig(canvas, cx, top_y, spread=0):
    """Stem + two leaves on top of the head. `spread` pushes the leaf tips
    outward/up (used for the jump pose)."""
    canvas.draw.line([cx, top_y, cx, top_y - 3], fill=BARK_BROWN, width=2)
    _draw_leaf(canvas, cx - 6 - spread, top_y - 6 - spread, cx, top_y - 2)
    _draw_leaf(canvas, cx + 6 + spread, top_y - 6 - spread, cx + 1, top_y - 2)


def _draw_body(canvas, cx, cy, rx, ry):
    shaded_ellipse(canvas, cx, cy, rx, ry, GRASS_GREEN, FERN_GREEN, BODY_LIGHT)
    # belly patch
    belly_ry = int(ry * 0.5)
    belly_rx = int(rx * 0.55)
    belly_cy = cy + int(ry * 0.38)
    canvas.draw.ellipse(
        [cx - belly_rx, belly_cy - belly_ry, cx + belly_rx, belly_cy + belly_ry],
        fill=CREAM_BELLY,
    )
    canvas.draw.arc(
        [cx - belly_rx, belly_cy - belly_ry, cx + belly_rx, belly_cy + belly_ry],
        start=20, end=160, fill=BELLY_SHADE, width=1,
    )


def _draw_feet(canvas, cx, foot_y, apart, tucked=False):
    """Two stubby feet. `apart` is the gap from center; tucked=True lifts
    them (jump pose)."""
    h = 2 if tucked else 3
    for side in (-1, 1):
        fx = cx + side * apart
        canvas.draw.ellipse(
            [fx - 3, foot_y - h, fx + 3, foot_y + h], fill=FERN_GREEN
        )


def _draw_face(canvas, cx, eye_y, mood="happy"):
    """Big two-tone eyes with sparkle, blush, tiny mouth."""
    for side in (-1, 1):
        ex = cx + side * 4
        if mood == "hurt":
            # squeezed shut: > < shapes
            canvas.draw.line([ex - 2, eye_y - 2, ex + 1, eye_y], fill=SHADOW_INK, width=1)
            canvas.draw.line([ex + 1, eye_y, ex - 2, eye_y + 2], fill=SHADOW_INK, width=1)
            continue
        canvas.draw.ellipse([ex - 2, eye_y - 3, ex + 2, eye_y + 3], fill=PALE_MIST)
        canvas.draw.ellipse([ex - 1, eye_y - 1, ex + 1, eye_y + 2], fill=SHADOW_INK)
        canvas.set_pixel(ex, eye_y, PALE_MIST)  # sparkle
    # blush
    canvas.set_pixel(cx - 7, eye_y + 4, BLUSH)
    canvas.set_pixel(cx - 6, eye_y + 4, BLUSH)
    canvas.set_pixel(cx + 6, eye_y + 4, BLUSH)
    canvas.set_pixel(cx + 7, eye_y + 4, BLUSH)
    # mouth
    if mood == "open":
        canvas.draw.ellipse([cx - 1, eye_y + 4, cx + 1, eye_y + 6], fill=SHADOW_INK)
    elif mood == "hurt":
        canvas.draw.line([cx - 1, eye_y + 5, cx + 1, eye_y + 5], fill=SHADOW_INK, width=1)
    else:
        canvas.set_pixel(cx - 1, eye_y + 5, SHADOW_INK)
        canvas.set_pixel(cx, eye_y + 6, SHADOW_INK)
        canvas.set_pixel(cx + 1, eye_y + 5, SHADOW_INK)


def _draw_ladle(canvas, hand_x, hand_y, angle_deg):
    """Wooden ladle: 2px handle with grain, shaded bowl at the end."""
    import math

    a = math.radians(angle_deg)
    end_x = hand_x + int(math.cos(a) * 9)
    end_y = hand_y + int(math.sin(a) * 9)
    canvas.draw.line([hand_x, hand_y, end_x, end_y], fill=LADLE_BROWN, width=2)
    canvas.draw.line([hand_x, hand_y, (hand_x + end_x) // 2, (hand_y + end_y) // 2],
                     fill=TWIG_TAN, width=1)
    canvas.draw.ellipse([end_x - 3, end_y - 3, end_x + 3, end_y + 3], fill=LADLE_BROWN)
    canvas.draw.ellipse([end_x - 2, end_y - 2, end_x + 1, end_y + 1], fill=TWIG_TAN)


def _render_pose(pose):
    canvas = PixelCanvas(FRAME_SIZE, FRAME_SIZE, TRANSPARENT)
    cx = FRAME_SIZE // 2

    if pose == "idle":
        cy, rx, ry = 18, 9, 8
        _draw_feet(canvas, cx, cy + ry + 2, 5)
        _draw_body(canvas, cx, cy, rx, ry)
        _draw_sprig(canvas, cx, cy - ry)
        _draw_face(canvas, cx, cy - 2)
        _draw_ladle(canvas, cx + rx - 1, cy + 3, 15)

    elif pose == "walk1":  # weight down: wider, feet apart
        cy, rx, ry = 19, 10, 7
        _draw_feet(canvas, cx, cy + ry + 2, 7)
        _draw_body(canvas, cx, cy, rx, ry)
        _draw_sprig(canvas, cx, cy - ry)
        _draw_face(canvas, cx, cy - 2)
        _draw_ladle(canvas, cx + rx - 1, cy + 3, 25)

    elif pose == "walk2":  # lifted: taller, feet together
        cy, rx, ry = 17, 9, 8
        _draw_feet(canvas, cx, cy + ry + 2, 3)
        _draw_body(canvas, cx, cy, rx, ry)
        _draw_sprig(canvas, cx, cy - ry)
        _draw_face(canvas, cx, cy - 2)
        _draw_ladle(canvas, cx + rx - 1, cy + 2, 5)

    elif pose == "jump":  # airborne: feet tucked, sprig splayed, mouth open
        cy, rx, ry = 17, 9, 8
        _draw_feet(canvas, cx, cy + ry + 1, 4, tucked=True)
        _draw_body(canvas, cx, cy, rx, ry)
        _draw_sprig(canvas, cx, cy - ry, spread=1)
        _draw_face(canvas, cx, cy - 2, mood="open")
        _draw_ladle(canvas, cx + rx - 1, cy + 1, -30)

    elif pose == "attack":  # lunge: ladle thrust forward with streaks
        cy, rx, ry = 18, 9, 8
        _draw_feet(canvas, cx - 1, cy + ry + 2, 5)
        _draw_body(canvas, cx - 1, cy, rx, ry)
        _draw_sprig(canvas, cx - 1, cy - ry)
        _draw_face(canvas, cx, cy - 2, mood="open")
        _draw_ladle(canvas, cx + rx - 2, cy - 1, -12)
        for off in (0, 3, 6):
            canvas.set_pixel(cx + rx + 4 + off, cy - 7 + off // 3, PALE_MIST)

    elif pose == "hurt":  # flinch: squashed, eyes shut
        cy, rx, ry = 19, 10, 7
        _draw_feet(canvas, cx, cy + ry + 2, 6)
        _draw_body(canvas, cx, cy, rx, ry)
        _draw_sprig(canvas, cx, cy - ry)
        _draw_face(canvas, cx, cy - 2, mood="hurt")
        _draw_ladle(canvas, cx + rx - 2, cy + 4, 55)

    else:
        raise ValueError(f"unknown pose: {pose}")

    outline_pass(canvas.image, SHADOW_INK)
    if pose == "hurt":
        canvas.image = tint_toward(canvas.image, PALE_MIST, 0.35)
    return canvas.image


def generate():
    order = ["idle", "walk1", "walk2", "jump", "attack", "hurt"]
    frames = [_render_pose(p) for p in order]
    sheet = hstack_frames(frames)
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    sheet.save(OUT_PATH)
    return [(OUT_PATH, sheet.size)]


if __name__ == "__main__":
    for path, size in generate():
        print(f"{path}: {size[0]}x{size[1]}")
