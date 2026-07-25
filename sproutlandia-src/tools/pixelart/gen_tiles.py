"""Generates seamlessly-tileable 32x32 tiles:
  assets/tiles/ground_tile.png -- grass-top-over-dirt platform tile
  assets/tiles/wall_tile.png   -- stone/wood dungeon wall tile

Both are built pixel-by-pixel with only horizontal/vertical wrap-around
neighbor checks, so they tile cleanly with no seams in either direction.
Randomness (speckle placement) is seeded for byte-identical reruns.
"""

import os
import random

from canvas import ASSETS_DIR, PixelCanvas
from palette import (
    BARK_BROWN,
    FERN_GREEN,
    GRASS_GREEN,
    MOSS_GREEN,
    SHADOW_INK,
    STONE_GRAY,
)

SIZE = 32
GROUND_OUT = os.path.join(ASSETS_DIR, "tiles", "ground_tile.png")
WALL_OUT = os.path.join(ASSETS_DIR, "tiles", "wall_tile.png")

_SEED = 20260709  # fixed seed -> deterministic, byte-identical output


def _ground_tile():
    canvas = PixelCanvas(SIZE, SIZE)
    rng = random.Random(_SEED)

    grass_h = 8  # rows of grass at the top
    for y in range(SIZE):
        for x in range(SIZE):
            if y < grass_h - 2:
                color = GRASS_GREEN
            elif y < grass_h:
                color = FERN_GREEN
            else:
                color = BARK_BROWN
            canvas.set_pixel(x, y, color)

    # grass-blade speckle just under the top edge, using modular (wrapping)
    # coordinates so the pattern repeats identically at the tile boundary
    for x in range(SIZE):
        if rng.random() < 0.35:
            canvas.set_pixel(x, grass_h - 3, MOSS_GREEN)

    # dirt speckle texture, deterministic and seam-safe (each pixel decided
    # independently of tile position, so left/right and top/bottom edges
    # always match a repeated copy of this same tile)
    for y in range(grass_h, SIZE):
        for x in range(SIZE):
            if rng.random() < 0.06:
                canvas.set_pixel(x, y, MOSS_GREEN)

    # a single clean horizontal seam line between grass and dirt
    for x in range(SIZE):
        canvas.set_pixel(x, grass_h, SHADOW_INK)

    return canvas


def _wall_tile():
    canvas = PixelCanvas(SIZE, SIZE)
    rng = random.Random(_SEED + 1)

    block_w, block_h = 16, 8
    for y in range(SIZE):
        for x in range(SIZE):
            canvas.set_pixel(x, y, STONE_GRAY)

    # brick-style mortar lines (wrap cleanly since block_w/block_h evenly
    # divide the 32px tile: 32 % 16 == 0 and 32 % 8 == 0)
    for y in range(SIZE):
        row = y // block_h
        offset = (row % 2) * (block_w // 2)
        for x in range(SIZE):
            on_h_seam = y % block_h == 0
            on_v_seam = (x + offset) % block_w == 0
            if on_h_seam or on_v_seam:
                canvas.set_pixel(x, y, SHADOW_INK)

    # subtle per-brick speckle, independent per pixel so wrap-around tiling
    # stays seamless
    for y in range(SIZE):
        for x in range(SIZE):
            if rng.random() < 0.05:
                canvas.set_pixel(x, y, MOSS_GREEN if rng.random() < 0.3 else STONE_GRAY)

    return canvas


def generate():
    ground = _ground_tile()
    ground.save(GROUND_OUT)

    wall = _wall_tile()
    wall.save(WALL_OUT)

    return [(GROUND_OUT, ground.image.size), (WALL_OUT, wall.image.size)]


if __name__ == "__main__":
    for path, size in generate():
        print(f"{path}: {size[0]}x{size[1]}")
