"""Generates assets/sprites/hero.png -- "Pip", a round floaty sprout/acorn
creature with big eyes and a small wooden ladle.

Spritesheet: 6 frames horizontally, 32x32px each, 192x32px total.
Frame order: 0 idle, 1 walk1, 2 walk2, 3 jump, 4 attack, 5 hurt.
"""

import os

from PIL import Image

from canvas import ASSETS_DIR, PixelCanvas, hstack_frames, tint_toward
from palette import (
    CREAM_BELLY,
    FERN_GREEN,
    GRASS_GREEN,
    LADLE_BROWN,
    PALE_MIST,
    SHADOW_INK,
    TRANSPARENT,
)

FRAME_SIZE = 32
OUT_PATH = os.path.join(ASSETS_DIR, "sprites", "hero.png")


def _draw_body(canvas, cx, cy, rx, ry):
    canvas.draw.ellipse(
        [cx - rx, cy - ry, cx + rx, cy + ry], fill=GRASS_GREEN, outline=SHADOW_INK
    )
    belly_rx, belly_ry = rx * 0.55, ry * 0.42
    belly_cy = cy + ry * 0.3
    canvas.draw.ellipse(
        [cx - belly_rx, belly_cy - belly_ry, cx + belly_rx, belly_cy + belly_ry],
        fill=CREAM_BELLY,
    )


def _draw_leaf_left(canvas, cx, top_y):
    canvas.draw.polygon(
        [(cx - 1, top_y + 1), (cx - 7, top_y - 5), (cx - 2, top_y - 1)],
        fill=FERN_GREEN,
        outline=SHADOW_INK,
    )


def _draw_arm_leaf_left(canvas, cx, cy, rx):
    # a small leaf-like arm raised up-and-out to the left, used for jump pose
    base_x, base_y = cx - rx + 1, cy
    canvas.draw.polygon(
        [(base_x, base_y), (base_x - 5, base_y - 8), (base_x + 1, base_y - 3)],
        fill=FERN_GREEN,
        outline=SHADOW_INK,
    )


def _draw_eyes(canvas, cx, cy, eye_r=3, spacing=5, pupil_r=1):
    for dx in (-spacing, spacing):
        ex, ey = cx + dx, cy
        canvas.draw.ellipse(
            [ex - eye_r, ey - eye_r, ex + eye_r, ey + eye_r],
            fill=PALE_MIST,
            outline=SHADOW_INK,
        )
        canvas.draw.ellipse(
            [ex - pupil_r, ey - pupil_r, ex + pupil_r, ey + pupil_r], fill=SHADOW_INK
        )


def _draw_ladle(canvas, hand_x, hand_y, end_x, end_y):
    canvas.draw.line([hand_x, hand_y, end_x, end_y], fill=LADLE_BROWN, width=2)
    cup_r = 3
    canvas.draw.ellipse(
        [end_x - cup_r, end_y - cup_r, end_x + cup_r, end_y + cup_r],
        fill=LADLE_BROWN,
        outline=SHADOW_INK,
    )


def _render_pose(pose):
    canvas = PixelCanvas(FRAME_SIZE, FRAME_SIZE, TRANSPARENT)
    cx = FRAME_SIZE // 2

    if pose == "idle":
        cy, rx, ry = 18, 9, 9
        leaf_top = cy - ry
        eye_cy = cy - 3
        _draw_body(canvas, cx, cy, rx, ry)
        _draw_leaf_left(canvas, cx, leaf_top)
        canvas.mirror_horizontal(axis_x=cx)
        _draw_eyes(canvas, cx, eye_cy)
        _draw_ladle(canvas, cx + rx - 1, cy + 2, cx + rx + 7, cy + 5)

    elif pose == "walk1":  # squash: wide + short, weight down
        cy, rx, ry = 21, 11, 7
        leaf_top = cy - ry
        eye_cy = cy - 2
        _draw_body(canvas, cx, cy, rx, ry)
        _draw_leaf_left(canvas, cx, leaf_top)
        canvas.mirror_horizontal(axis_x=cx)
        _draw_eyes(canvas, cx, eye_cy)
        _draw_ladle(canvas, cx + rx - 2, cy + 1, cx + rx + 6, cy + 6)

    elif pose == "walk2":  # stretch: narrow + tall, lifted
        cy, rx, ry = 16, 8, 11
        leaf_top = cy - ry
        eye_cy = cy - 4
        _draw_body(canvas, cx, cy, rx, ry)
        _draw_leaf_left(canvas, cx, leaf_top)
        canvas.mirror_horizontal(axis_x=cx)
        _draw_eyes(canvas, cx, eye_cy)
        _draw_ladle(canvas, cx + rx - 1, cy, cx + rx + 7, cy + 2)

    elif pose == "jump":  # airborne, leaves/arms up
        cy, rx, ry = 15, 9, 9
        leaf_top = cy - ry
        eye_cy = cy - 3
        _draw_body(canvas, cx, cy, rx, ry)
        _draw_leaf_left(canvas, cx, leaf_top)
        _draw_arm_leaf_left(canvas, cx, cy - 2, rx)
        canvas.mirror_horizontal(axis_x=cx)
        _draw_eyes(canvas, cx, eye_cy)
        _draw_ladle(canvas, cx + rx - 2, cy + 3, cx + rx + 4, cy + 8)

    elif pose == "attack":  # ladle swung far out to one side
        cy, rx, ry = 18, 9, 9
        leaf_top = cy - ry
        eye_cy = cy - 3
        _draw_body(canvas, cx, cy, rx, ry)
        _draw_leaf_left(canvas, cx, leaf_top)
        canvas.mirror_horizontal(axis_x=cx)
        _draw_eyes(canvas, cx, eye_cy)
        # motion accent dots trailing the swing
        for i, off in enumerate((2, 5, 8)):
            canvas.set_pixel(cx + rx + 8 + off, cy - 6 + off // 2, PALE_MIST)
        _draw_ladle(canvas, cx + rx - 1, cy - 1, cx + rx + 13, cy - 9)

    elif pose == "hurt":  # flinch, wide eyes, pulled-back ladle
        cy, rx, ry = 19, 9, 8
        leaf_top = cy - ry
        eye_cy = cy - 2
        _draw_body(canvas, cx, cy, rx, ry)
        _draw_leaf_left(canvas, cx, leaf_top)
        canvas.mirror_horizontal(axis_x=cx)
        _draw_eyes(canvas, cx, eye_cy, eye_r=4, pupil_r=1)
        _draw_ladle(canvas, cx + rx - 2, cy + 3, cx + rx + 4, cy + 5)
        canvas.image = tint_toward(canvas.image, PALE_MIST, 0.45)

    else:
        raise ValueError(f"unknown pose: {pose}")

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
