"""Generates HUD/menu UI assets:
  assets/ui/heart_full.png   -- 16x16 filled health heart
  assets/ui/heart_empty.png  -- 16x16 outline/empty health heart
  assets/ui/panel_bg.png     -- 128x64 wooden-sign menu panel, 9-slice friendly
  assets/ui/zestberry.png    -- 16x16 berry/seed power-up projectile
"""

import os

from canvas import ASSETS_DIR, PixelCanvas
from palette import (
    BARK_BROWN,
    BERRY_RED,
    FERN_GREEN,
    LADLE_BROWN,
    PALE_MIST,
    SHADOW_INK,
    SUNSET_GOLD,
    TRANSPARENT,
)

UI_DIR = os.path.join(ASSETS_DIR, "ui")

HEART_FULL_OUT = os.path.join(UI_DIR, "heart_full.png")
HEART_EMPTY_OUT = os.path.join(UI_DIR, "heart_empty.png")
PANEL_OUT = os.path.join(UI_DIR, "panel_bg.png")
ZESTBERRY_OUT = os.path.join(UI_DIR, "zestberry.png")


def _heart_points(size):
    """Return a polygon approximating a heart shape, scaled to `size`."""
    s = size
    return [
        (s * 0.50, s * 0.90),
        (s * 0.08, s * 0.55),
        (s * 0.08, s * 0.28),
        (s * 0.28, s * 0.10),
        (s * 0.50, s * 0.28),
        (s * 0.72, s * 0.10),
        (s * 0.92, s * 0.28),
        (s * 0.92, s * 0.55),
    ]


def _gen_heart(filled):
    canvas = PixelCanvas(16, 16, TRANSPARENT)
    pts = _heart_points(16)
    if filled:
        canvas.draw.polygon(pts, fill=BERRY_RED, outline=SHADOW_INK)
        # small highlight
        canvas.set_pixel(5, 5, PALE_MIST)
        canvas.set_pixel(6, 5, PALE_MIST)
    else:
        canvas.draw.polygon(pts, fill=None, outline=SHADOW_INK)
    return canvas


def _gen_panel_bg():
    w, h = 128, 64
    canvas = PixelCanvas(w, h, TRANSPARENT)
    border = 8

    # flat wood-plank center
    canvas.rect(0, 0, w - 1, h - 1, LADLE_BROWN)
    # darker frame border (keeps a visually distinct 8px border region so it
    # behaves like a 9-slice panel even without being a real NinePatch)
    canvas.rect(0, 0, w - 1, border - 1, BARK_BROWN)
    canvas.rect(0, h - border, w - 1, h - 1, BARK_BROWN)
    canvas.rect(0, 0, border - 1, h - 1, BARK_BROWN)
    canvas.rect(w - border, 0, w - 1, h - 1, BARK_BROWN)

    # corner rivets/knots for a hand-crafted sign look
    for cx, cy in (
        (border // 2, border // 2),
        (w - border // 2 - 1, border // 2),
        (border // 2, h - border // 2 - 1),
        (w - border // 2 - 1, h - border // 2 - 1),
    ):
        canvas.draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=SHADOW_INK)

    # subtle plank seams in the flat center
    for x in (border + 20, border + 52, border + 84):
        if x < w - border:
            canvas.draw.line([x, border, x, h - border - 1], fill=BARK_BROWN, width=1)

    # outer outline for crispness
    canvas.rect(0, 0, w - 1, h - 1, SHADOW_INK, fill=False)

    return canvas


def _gen_zestberry():
    canvas = PixelCanvas(16, 16, TRANSPARENT)
    cx, cy, r = 8, 9, 6
    canvas.draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BERRY_RED, outline=SHADOW_INK)
    # gold seed flecks (deterministic fixed positions)
    for dx, dy in ((-2, -1), (2, 0), (0, 2), (-1, 3)):
        canvas.set_pixel(cx + dx, cy + dy, SUNSET_GOLD)
    # little stem + leaf on top
    canvas.draw.line([cx, cy - r, cx, cy - r - 3], fill=BARK_BROWN, width=1)
    canvas.draw.polygon(
        [(cx, cy - r - 3), (cx - 3, cy - r - 5), (cx + 1, cy - r - 2)],
        fill=FERN_GREEN,
        outline=SHADOW_INK,
    )
    # highlight
    canvas.set_pixel(cx - 2, cy - 2, PALE_MIST)
    return canvas


def generate():
    results = []

    heart_full = _gen_heart(True)
    heart_full.save(HEART_FULL_OUT)
    results.append((HEART_FULL_OUT, heart_full.image.size))

    heart_empty = _gen_heart(False)
    heart_empty.save(HEART_EMPTY_OUT)
    results.append((HEART_EMPTY_OUT, heart_empty.image.size))

    panel = _gen_panel_bg()
    panel.save(PANEL_OUT)
    results.append((PANEL_OUT, panel.image.size))

    zestberry = _gen_zestberry()
    zestberry.save(ZESTBERRY_OUT)
    results.append((ZESTBERRY_OUT, zestberry.image.size))

    return results


if __name__ == "__main__":
    for path, size in generate():
        print(f"{path}: {size[0]}x{size[1]}")
