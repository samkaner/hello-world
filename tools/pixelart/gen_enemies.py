"""Generates the regular enemy spritesheets:
  assets/enemies/bonk_bug.png   -- small round platforming bug, 3x32x32 = 96x32
  assets/enemies/twiglet.png    -- small stick-figure dungeon enemy, 3x32x32 = 96x32

Frame order for both: 0 move1, 1 move2, 2 hurt.
"""

import os

from canvas import ASSETS_DIR, PixelCanvas, hstack_frames, tint_toward
from palette import (
    BARK_BROWN,
    BERRY_RED,
    EMBER_ORANGE,
    PALE_MIST,
    SHADOW_INK,
    TRANSPARENT,
    TWIG_TAN,
)

FRAME_SIZE = 32
BUG_OUT = os.path.join(ASSETS_DIR, "enemies", "bonk_bug.png")
TWIG_OUT = os.path.join(ASSETS_DIR, "enemies", "twiglet.png")


def _bug_frame(pose):
    canvas = PixelCanvas(FRAME_SIZE, FRAME_SIZE, TRANSPARENT)
    cx, cy = FRAME_SIZE // 2, 20
    rx, ry = 8, 6

    if pose == "move1":
        leg_offset = 2
    elif pose == "move2":
        leg_offset = -2
    else:  # hurt
        leg_offset = 0

    # legs (three per side), simple ticks
    for i, lx in enumerate((-6, 0, 6)):
        off = leg_offset if i % 2 == 0 else -leg_offset
        canvas.draw.line(
            [cx + lx, cy + ry - 1, cx + lx - 2, cy + ry + 4 + off],
            fill=SHADOW_INK,
            width=1,
        )
        canvas.draw.line(
            [cx + lx, cy + ry - 1, cx + lx + 2, cy + ry + 4 - off],
            fill=SHADOW_INK,
            width=1,
        )

    # shell body
    canvas.draw.ellipse(
        [cx - rx, cy - ry, cx + rx, cy + ry], fill=EMBER_ORANGE, outline=SHADOW_INK
    )
    canvas.draw.arc([cx - rx, cy - ry, cx + rx, cy + ry], 200, 340, fill=BARK_BROWN)

    # antennae
    canvas.draw.line([cx - 3, cy - ry + 1, cx - 5, cy - ry - 5], fill=SHADOW_INK)
    canvas.draw.line([cx + 3, cy - ry + 1, cx + 5, cy - ry - 5], fill=SHADOW_INK)

    # eyes
    eye_r = 2
    for dx in (-3, 3):
        ex, ey = cx + dx, cy - 1
        canvas.draw.ellipse(
            [ex - eye_r, ey - eye_r, ex + eye_r, ey + eye_r],
            fill=PALE_MIST,
            outline=SHADOW_INK,
        )
        pupil_r = 1 if pose != "hurt" else 1
        canvas.draw.ellipse(
            [ex - pupil_r, ey - pupil_r, ex + pupil_r, ey + pupil_r], fill=SHADOW_INK
        )

    if pose == "hurt":
        canvas.image = tint_toward(canvas.image, PALE_MIST, 0.5)

    return canvas.image


def _twiglet_frame(pose):
    canvas = PixelCanvas(FRAME_SIZE, FRAME_SIZE, TRANSPARENT)
    cx, cy = FRAME_SIZE // 2, 16

    if pose == "move1":
        arm_swing, leg_swing = 3, 3
    elif pose == "move2":
        arm_swing, leg_swing = -3, -3
    else:  # hurt
        arm_swing, leg_swing = 0, 0

    # torso: a knobby vertical twig
    canvas.draw.line([cx, cy - 8, cx, cy + 8], fill=BARK_BROWN, width=3)
    # head knot
    head_r = 5
    canvas.draw.ellipse(
        [cx - head_r, cy - 8 - head_r, cx + head_r, cy - 8 + head_r],
        fill=TWIG_TAN,
        outline=SHADOW_INK,
    )
    # eyes
    eye_r = 2
    for dx in (-2, 2):
        ex, ey = cx + dx, cy - 9
        canvas.draw.ellipse(
            [ex - eye_r, ey - eye_r, ex + eye_r, ey + eye_r],
            fill=PALE_MIST,
            outline=SHADOW_INK,
        )
        canvas.draw.ellipse([ex - 1, ey - 1, ex + 1, ey + 1], fill=SHADOW_INK)

    # arms (twig branches)
    canvas.draw.line(
        [cx, cy - 3, cx - 7, cy - 3 + arm_swing], fill=BARK_BROWN, width=2
    )
    canvas.draw.line(
        [cx, cy - 3, cx + 7, cy - 3 - arm_swing], fill=BARK_BROWN, width=2
    )
    # legs (twig branches)
    canvas.draw.line(
        [cx, cy + 8, cx - 5, cy + 15 + leg_swing], fill=BARK_BROWN, width=2
    )
    canvas.draw.line(
        [cx, cy + 8, cx + 5, cy + 15 - leg_swing], fill=BARK_BROWN, width=2
    )

    if pose == "hurt":
        canvas.image = tint_toward(canvas.image, BERRY_RED, 0.35)

    return canvas.image


def generate():
    order = ["move1", "move2", "hurt"]

    bug_frames = [_bug_frame(p) for p in order]
    bug_sheet = hstack_frames(bug_frames)
    os.makedirs(os.path.dirname(BUG_OUT), exist_ok=True)
    bug_sheet.save(BUG_OUT)

    twig_frames = [_twiglet_frame(p) for p in order]
    twig_sheet = hstack_frames(twig_frames)
    os.makedirs(os.path.dirname(TWIG_OUT), exist_ok=True)
    twig_sheet.save(TWIG_OUT)

    return [(BUG_OUT, bug_sheet.size), (TWIG_OUT, twig_sheet.size)]


if __name__ == "__main__":
    for path, size in generate():
        print(f"{path}: {size[0]}x{size[1]}")
