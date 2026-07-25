"""Runs every Sproutlandia pixel-art generator and prints a summary of every
file written, with its measured pixel dimensions.

Usage (from repo root):
    python3 tools/pixelart/build_all.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import gen_backgrounds
import gen_bosses
import gen_enemies
import gen_hero
import gen_tiles
import gen_ui

GENERATORS = [
    ("hero", gen_hero),
    ("enemies", gen_enemies),
    ("bosses", gen_bosses),
    ("tiles", gen_tiles),
    ("backgrounds", gen_backgrounds),
    ("ui", gen_ui),
]


def main():
    all_results = []
    for name, module in GENERATORS:
        results = module.generate()
        all_results.extend(results)
        print(f"[{name}] wrote {len(results)} file(s)")

    print("\n--- Sproutlandia pixel-art build summary ---")
    from PIL import Image

    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    for path, expected_size in all_results:
        rel = os.path.relpath(path, repo_root)
        with Image.open(path) as img:
            actual_size = img.size
        match = "OK" if actual_size == expected_size else "MISMATCH"
        print(f"{match:8} {rel}: {actual_size[0]}x{actual_size[1]}")

    print(f"\nTotal files: {len(all_results)}")


if __name__ == "__main__":
    main()
