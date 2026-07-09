"""Generates the boss spritesheets:
  assets/bosses/big_yawn.png     -- mini-boss sleepy stump/log, 4x64x64 = 256x64
  assets/bosses/grumbleroot.png  -- final boss grumpy stump wizard, 4x64x64 = 256x64

Frame order for both: 0 idle, 1 telegraph, 2 attack, 3 hurt.
"""

import os

from canvas import ASSETS_DIR, PixelCanvas, hstack_frames, tint_toward
from palette import (
    BARK_BROWN,
    CREAM_BELLY,
    DUSK_PURPLE,
    EMBER_ORANGE,
    FERN_GREEN,
    MOSS_GREEN,
    PALE_MIST,
    SHADOW_INK,
    SUNSET_GOLD,
    TRANSPARENT,
    TWIG_TAN,
)

FRAME_SIZE = 64
YAWN_OUT = os.path.join(ASSETS_DIR, "bosses", "big_yawn.png")
ROOT_OUT = os.path.join(ASSETS_DIR, "bosses", "grumbleroot.png")


def _big_yawn_frame(pose):
    canvas = PixelCanvas(FRAME_SIZE, FRAME_SIZE, TRANSPARENT)
    cx, cy = FRAME_SIZE // 2, 40
    rx, ry = 22, 16

    lean = 0
    eye_open = 2
    mouth_open = 3
    if pose == "telegraph":
        eye_open = 5
        lean = -3
    elif pose == "attack":
        lean = 6
        mouth_open = 9
    elif pose == "hurt":
        eye_open = 1
        lean = -2

    # squat log body (rounded rectangle via ellipse + rect)
    canvas.draw.rectangle(
        [cx - rx, cy - ry + 6, cx + rx, cy + ry], fill=BARK_BROWN, outline=SHADOW_INK
    )
    canvas.draw.ellipse(
        [cx - rx, cy - ry, cx + rx, cy - ry + 14], fill=BARK_BROWN, outline=SHADOW_INK
    )
    # bark rings (wood grain texture, deterministic)
    for i, ring_y in enumerate((cy - 4, cy + 4, cy + 10)):
        canvas.draw.line(
            [cx - rx + 4, ring_y, cx + rx - 4, ring_y], fill=MOSS_GREEN, width=1
        )
    # little sprout tufts on top
    for dx in (-10, 0, 10):
        canvas.draw.polygon(
            [
                (cx + dx, cy - ry - 2),
                (cx + dx - 3, cy - ry + 6),
                (cx + dx + 3, cy - ry + 6),
            ],
            fill=FERN_GREEN,
            outline=SHADOW_INK,
        )

    # sleepy eyes (droopy arcs, widen for telegraph)
    for dx in (-9, 9):
        ex, ey = cx + dx + lean, cy - 2
        canvas.draw.arc(
            [ex - 5, ey - eye_open, ex + 5, ey + eye_open], 10, 170, fill=SHADOW_INK
        )

    # big sleepy mouth
    canvas.draw.ellipse(
        [cx - 8 + lean, cy + 4, cx + 8 + lean, cy + 4 + mouth_open],
        fill=SHADOW_INK,
    )

    if pose == "hurt":
        canvas.image = tint_toward(canvas.image, PALE_MIST, 0.4)

    return canvas.image


def _grumbleroot_frame(pose):
    canvas = PixelCanvas(FRAME_SIZE, FRAME_SIZE, TRANSPARENT)
    cx, cy = FRAME_SIZE // 2, 38
    rx, ry = 16, 20

    brow_dip = 2
    staff_raise = 0
    glow = False
    if pose == "telegraph":
        brow_dip = 5
        staff_raise = 6
        glow = True
    elif pose == "attack":
        staff_raise = 14
        glow = True
    elif pose == "hurt":
        brow_dip = 0

    # stump-wizard body: tapered trunk
    canvas.draw.polygon(
        [
            (cx - rx, cy + ry),
            (cx + rx, cy + ry),
            (cx + rx - 5, cy - ry),
            (cx - rx + 5, cy - ry),
        ],
        fill=BARK_BROWN,
        outline=SHADOW_INK,
    )
    # belly patch
    canvas.draw.ellipse(
        [cx - 7, cy + 2, cx + 7, cy + 14], fill=CREAM_BELLY
    )
    # hooded robe collar
    canvas.draw.arc(
        [cx - rx + 3, cy - ry - 4, cx + rx - 3, cy - ry + 10], 0, 180, fill=DUSK_PURPLE
    )
    canvas.draw.rectangle(
        [cx - rx + 4, cy - ry + 2, cx + rx - 4, cy - ry + 8], fill=DUSK_PURPLE
    )

    # grumpy angled eyebrows + eyes (brows dip inward toward the nose)
    for dx, inward in ((-8, 1), (8, -1)):
        ex, ey = cx + dx, cy - ry + 12
        canvas.draw.line(
            [ex - 4 * inward, ey - brow_dip, ex + 4 * inward, ey + brow_dip],
            fill=SHADOW_INK,
            width=2,
        )
        canvas.draw.ellipse([ex - 2, ey, ex + 2, ey + 4], fill=EMBER_ORANGE, outline=SHADOW_INK)

    # twisted branch staff to one side, raised higher when winding up/attacking
    staff_x = cx + rx + 4
    staff_top_y = cy - 6 - staff_raise
    canvas.draw.line(
        [staff_x, cy + ry, staff_x, staff_top_y], fill=TWIG_TAN, width=3
    )
    canvas.draw.line(
        [staff_x - 3, staff_top_y + 6, staff_x + 3, staff_top_y - 4],
        fill=TWIG_TAN,
        width=2,
    )
    orb_color = SUNSET_GOLD if glow else TWIG_TAN
    canvas.draw.ellipse(
        [staff_x - 4, staff_top_y - 8, staff_x + 4, staff_top_y],
        fill=orb_color,
        outline=SHADOW_INK,
    )

    if pose == "hurt":
        canvas.image = tint_toward(canvas.image, PALE_MIST, 0.4)

    return canvas.image


def generate():
    order = ["idle", "telegraph", "attack", "hurt"]

    yawn_frames = [_big_yawn_frame(p) for p in order]
    yawn_sheet = hstack_frames(yawn_frames)
    os.makedirs(os.path.dirname(YAWN_OUT), exist_ok=True)
    yawn_sheet.save(YAWN_OUT)

    root_frames = [_grumbleroot_frame(p) for p in order]
    root_sheet = hstack_frames(root_frames)
    os.makedirs(os.path.dirname(ROOT_OUT), exist_ok=True)
    root_sheet.save(ROOT_OUT)

    return [(YAWN_OUT, yawn_sheet.size), (ROOT_OUT, root_sheet.size)]


if __name__ == "__main__":
    for path, size in generate():
        print(f"{path}: {size[0]}x{size[1]}")
