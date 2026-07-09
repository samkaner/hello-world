"""Tiny helper around a PIL Image for drawing pixel art on a fixed grid.

This is intentionally minimal: a PixelCanvas is just an RGBA PIL Image plus
a couple of grid-aware conveniences (set_pixel, rect, mirror_horizontal) and
a plain PIL.ImageDraw.Draw handle for anything fancier (ellipses, polygons,
lines) so we don't reinvent shape rasterization.

"Indexed grid" here means every drawing operation addresses whole pixel
cells by (x, y) grid coordinates -- there is no PIL palette (P-mode) or
sub-pixel positioning involved, which keeps output crisp, deterministic,
16-bit-style pixel art.
"""

import os

from PIL import Image, ImageDraw

from palette import TRANSPARENT

# Repo-root-relative paths so generators work no matter what directory
# they're invoked from (e.g. `python3 tools/pixelart/build_all.py` from the
# repo root, or running a gen_*.py file directly from within its folder).
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ASSETS_DIR = os.path.join(REPO_ROOT, "assets")


class PixelCanvas:
    def __init__(self, width, height, bg=TRANSPARENT):
        self.width = width
        self.height = height
        self.image = Image.new("RGBA", (width, height), bg)
        self.draw = ImageDraw.Draw(self.image)

    def set_pixel(self, x, y, color):
        """Set a single pixel. Out-of-bounds writes are silently ignored so
        symmetric drawing code doesn't need to bounds-check constantly."""
        if 0 <= x < self.width and 0 <= y < self.height:
            self.image.putpixel((x, y), color)

    def get_pixel(self, x, y):
        return self.image.getpixel((x, y))

    def rect(self, x0, y0, x1, y1, color, fill=True):
        """Filled (or outlined) rectangle, inclusive of x1/y1, in grid
        coordinates."""
        if fill:
            self.draw.rectangle([x0, y0, x1, y1], fill=color)
        else:
            self.draw.rectangle([x0, y0, x1, y1], outline=color)

    def mirror_horizontal(self, axis_x=None, src_side="left"):
        """Mirror one half of the canvas onto the other, for symmetric
        character drawing. `axis_x` is the column that acts as the mirror
        line (defaults to the canvas's horizontal center). Pixels from
        `src_side` ("left" or "right") of the axis are copied, flipped,
        onto the opposite side."""
        if axis_x is None:
            axis_x = self.width // 2
        for y in range(self.height):
            for x in range(axis_x):
                mirror_x = self.width - 1 - x
                if src_side == "left":
                    color = self.image.getpixel((x, y))
                    self.image.putpixel((mirror_x, y), color)
                else:
                    color = self.image.getpixel((mirror_x, y))
                    self.image.putpixel((x, y), color)

    def paste(self, other_image, x, y):
        """Paste another RGBA image (e.g. a rendered frame) at grid (x, y),
        alpha-composited."""
        self.image.alpha_composite(other_image, (x, y))

    def crop_frame(self, frame_index, frame_w, frame_h):
        x0 = frame_index * frame_w
        return self.image.crop((x0, 0, x0 + frame_w, frame_h))

    def save(self, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self.image.save(path)


def tint_toward(image, color, amount):
    """Blend an RGBA image's RGB channels toward `color` by `amount`
    (0.0-1.0), preserving the original alpha channel untouched. Used for
    quick hurt-flash tinting of a frame without hand-editing every pixel."""
    r, g, b, a = image.split()
    rgb = Image.merge("RGB", (r, g, b))
    solid = Image.new("RGB", image.size, tuple(color[:3]))
    blended = Image.blend(rgb, solid, amount)
    br, bg, bb = blended.split()
    return Image.merge("RGBA", (br, bg, bb, a))


def hstack_frames(frames):
    """Compose a list of equal-height RGBA frame images side by side into
    one spritesheet image."""
    width = sum(f.width for f in frames)
    height = frames[0].height
    sheet = Image.new("RGBA", (width, height), TRANSPARENT)
    x = 0
    for f in frames:
        sheet.alpha_composite(f, (x, 0))
        x += f.width
    return sheet
