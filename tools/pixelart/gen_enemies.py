"""Generates the two regular-enemy spritesheets:

- assets/enemies/bonk_bug.png -- a round ember-red beetle with a shell
  stripe, stubby legs and bobbly antennae.
- assets/enemies/twiglet.png -- a grumpy walking twig with a leaf tuft.

Each sheet: 3 frames horizontally, 32x32px, 96x32px total.
Frame order: 0 move1, 1 move2, 2 hurt.
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
    shaded_ellipse,
    tint_toward,
)
from palette import (
    BARK_BROWN,
    CREAM_BELLY,
    EMBER_ORANGE,
    FERN_GREEN,
    GRASS_GREEN,
    PALE_MIST,
    SHADOW_INK,
    TRANSPARENT,
    TWIG_TAN,
)

FRAME_SIZE = 32
BUG_PATH = os.path.join(ASSETS_DIR, "enemies", "bonk_bug.png")
TWIG_PATH = os.path.join(ASSETS_DIR, "enemies", "twiglet.png")

SHELL_LIGHT = lighten(EMBER_ORANGE, 0.35)
SHELL_SHADE = darken(EMBER_ORANGE, 0.3)
TWIG_LIGHT = lighten(BARK_BROWN, 0.3)


def _bug_frame(step):
    """step: 0/1 walk poses, 2 hurt."""
    canvas = PixelCanvas(FRAME_SIZE, FRAME_SIZE, TRANSPARENT)
    cx = FRAME_SIZE // 2
    bob = 1 if step == 1 else 0
    cy = 19 - bob

    # legs (three per side, alternating stride)
    leg_y = 27
    stride = 2 if step == 1 else 0
    for i, lx in enumerate((-7, 0, 7)):
        off = stride if i % 2 == 0 else -stride
        canvas.draw.line(
            [cx + lx, cy + 5, cx + lx + off, leg_y], fill=SHADOW_INK, width=2
        )

    # shell dome
    shaded_ellipse(canvas, cx, cy, 10, 8, EMBER_ORANGE, SHELL_SHADE, SHELL_LIGHT)
    # shell center stripe + spots
    canvas.draw.line([cx, cy - 8, cx, cy + 4], fill=SHELL_SHADE, width=1)
    for sx, sy in ((-5, -3), (5, -3), (-4, 2), (4, 2)):
        canvas.draw.ellipse(
            [cx + sx - 1, cy + sy - 1, cx + sx + 1, cy + sy + 1], fill=SHELL_SHADE
        )

    # face band along the bottom front
    canvas.draw.ellipse([cx - 6, cy + 2, cx + 6, cy + 8], fill=CREAM_BELLY)

    # cranky eyes on the face band
    if step == 2:
        for side in (-1, 1):
            ex = cx + side * 3
            canvas.draw.line([ex - 1, cy + 3, ex + 1, cy + 5], fill=SHADOW_INK, width=1)
            canvas.draw.line([ex + 1, cy + 3, ex - 1, cy + 5], fill=SHADOW_INK, width=1)
    else:
        for side in (-1, 1):
            ex = cx + side * 3
            canvas.draw.ellipse([ex - 1, cy + 3, ex + 1, cy + 6], fill=SHADOW_INK)
            canvas.set_pixel(ex, cy + 4, PALE_MIST)
        # frown brows
        canvas.draw.line([cx - 5, cy + 2, cx - 2, cy + 3], fill=SHADOW_INK, width=1)
        canvas.draw.line([cx + 5, cy + 2, cx + 2, cy + 3], fill=SHADOW_INK, width=1)

    # antennae with ball tips
    for side in (-1, 1):
        ax = cx + side * 4
        tip_x = ax + side * (3 + bob)
        canvas.draw.line([ax, cy - 7, tip_x, cy - 12], fill=SHADOW_INK, width=1)
        canvas.draw.ellipse(
            [tip_x - 1, cy - 14, tip_x + 1, cy - 12], fill=EMBER_ORANGE
        )

    outline_pass(canvas.image, SHADOW_INK)
    if step == 2:
        canvas.image = tint_toward(canvas.image, PALE_MIST, 0.4)
    return canvas.image


def _twig_frame(step):
    """step: 0/1 walk poses, 2 hurt."""
    canvas = PixelCanvas(FRAME_SIZE, FRAME_SIZE, TRANSPARENT)
    cx = FRAME_SIZE // 2
    sway = 1 if step == 1 else -1

    # legs: two bent twigs, alternating
    hip_y = 22
    for side, knee in ((-1, 2 * sway), (1, -2 * sway)):
        kx = cx + side * 3 + knee
        canvas.draw.line([cx + side * 2, hip_y, kx, hip_y + 4], fill=BARK_BROWN, width=2)
        canvas.draw.line([kx, hip_y + 4, kx + side, hip_y + 8], fill=BARK_BROWN, width=2)

    # torso: a knobbly trunk
    canvas.draw.rectangle([cx - 3, 12, cx + 3, hip_y], fill=BARK_BROWN)
    canvas.draw.line([cx - 3, 13, cx - 3, hip_y - 1], fill=TWIG_LIGHT, width=1)
    canvas.set_pixel(cx + 1, 15, darken(BARK_BROWN, 0.3))
    canvas.set_pixel(cx - 1, 19, darken(BARK_BROWN, 0.3))

    # arms: bent twigs with little leaf hands
    arm_y = 14
    for side in (-1, 1):
        raise_arm = 2 * sway * side
        hx = cx + side * 8
        hy = arm_y + 3 - raise_arm
        canvas.draw.line([cx + side * 3, arm_y, hx, hy], fill=BARK_BROWN, width=2)
        canvas.draw.ellipse([hx - 2, hy - 2, hx + 2, hy + 2], fill=FERN_GREEN)

    # head: rounded knob with a leaf tuft
    head_cy = 8
    shaded_ellipse(canvas, cx, head_cy, 6, 6, TWIG_TAN, darken(TWIG_TAN, 0.25),
                   lighten(TWIG_TAN, 0.3))
    canvas.draw.line([cx, head_cy - 6, cx - 1, head_cy - 9], fill=BARK_BROWN, width=1)
    canvas.draw.ellipse([cx - 5, head_cy - 13, cx + 1, head_cy - 8], fill=GRASS_GREEN)
    canvas.draw.ellipse([cx - 4, head_cy - 12, cx - 1, head_cy - 10],
                        fill=lighten(GRASS_GREEN, 0.3))

    # grumpy face
    if step == 2:
        for side in (-1, 1):
            ex = cx + side * 2
            canvas.draw.line([ex - 1, head_cy - 1, ex + 1, head_cy + 1],
                             fill=SHADOW_INK, width=1)
            canvas.draw.line([ex + 1, head_cy - 1, ex - 1, head_cy + 1],
                             fill=SHADOW_INK, width=1)
    else:
        for side in (-1, 1):
            ex = cx + side * 2
            canvas.draw.rectangle([ex, head_cy - 1, ex + 1, head_cy + 1], fill=SHADOW_INK)
            canvas.set_pixel(ex, head_cy - 1, PALE_MIST)
        canvas.draw.line([cx - 3, head_cy - 3, cx - 1, head_cy - 2], fill=SHADOW_INK, width=1)
        canvas.draw.line([cx + 3, head_cy - 3, cx + 1, head_cy - 2], fill=SHADOW_INK, width=1)
    canvas.draw.line([cx - 1, head_cy + 3, cx + 1, head_cy + 3], fill=SHADOW_INK, width=1)

    outline_pass(canvas.image, SHADOW_INK)
    if step == 2:
        canvas.image = tint_toward(canvas.image, PALE_MIST, 0.4)
    return canvas.image


def generate():
    results = []
    for path, frame_fn in ((BUG_PATH, _bug_frame), (TWIG_PATH, _twig_frame)):
        frames = [frame_fn(i) for i in range(3)]
        sheet = hstack_frames(frames)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        sheet.save(path)
        results.append((path, sheet.size))
    return results


if __name__ == "__main__":
    for path, size in generate():
        print(f"{path}: {size[0]}x{size[1]}")
