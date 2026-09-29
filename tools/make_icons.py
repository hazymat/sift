"""Make the app's icons from tools/icon-source.png (needs Pillow).

The source is a drawn rounded tile on a white background. Phones round an
icon's corners themselves and want a full square with nothing white or
transparent at its edges (iPhone shows transparency as black), so: find the
tile, cut the largest square that stays inside its rounded corners, then save
each size into app/icons/. Run from the repo root:  python tools/make_icons.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'tools' / 'icon-source.png'
OUT = ROOT / 'app' / 'icons'
SIZES = {
    'app-icon-512.png': 512,
    'app-icon-192.png': 192,
    'app-icon-180.png': 180,  # iPhone home screen (apple-touch-icon)
    'app-icon-32.png': 32,    # browser tab
}
MARGIN = 8  # px further in, clear of the tile's soft edge

white = lambda p: sum(p) > 700


def square(im):
    """The square inside the drawn tile, clear of its rounded corners."""
    px = im.load()
    w, h = im.size
    cols = [x for x in range(w) if not white(px[x, h // 2])]
    rows = [y for y in range(h) if not white(px[w // 2, y])]
    left, right, top, bottom = cols[0], cols[-1], rows[0], rows[-1]
    # Along the diagonal from the top left, the tile starts R(1 - 1/sqrt 2) in: the square's corner must be past that.
    inset = next(k for k in range(min(w, h)) if not white(px[left + k, top + k])) + MARGIN
    side = min(right - left, bottom - top) - 2 * inset
    return im.crop((left + inset, top + inset, left + inset + side, top + inset + side))


def main():
    icon = square(Image.open(SRC).convert('RGB'))
    for name, size in SIZES.items():
        icon.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)
        print(name, size)


if __name__ == '__main__':
    main()
