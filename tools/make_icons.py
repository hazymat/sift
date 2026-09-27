"""Make the app's icons from tools/icon-source.png (needs Pillow).

The source is a drawn rounded tile on a white background. Phones round an
icon's corners themselves and want a full square with nothing transparent
(iPhone shows transparency as black), so: cut a square from the middle of the
tile, fill its white corners with the blue beside them, then save each size
into app/icons/. Run from the repo root:  python tools/make_icons.py
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


def tile(im):
    """The square inside the drawn tile."""
    px = im.load()
    w, h = im.size
    white = lambda p: min(p) > 238
    rows = [y for y in range(h) if any(not white(px[x, y]) for x in range(0, w, 4))]
    cols = [x for x in range(w) if any(not white(px[x, y]) for y in range(0, h, 4))]
    left, top, right, bottom = cols[0], rows[0], cols[-1], rows[-1]
    side = min(right - left, bottom - top) + 1
    cx, cy = (left + right + 1) // 2, (top + bottom + 1) // 2
    return im.crop((cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side))


def corner_radius(im):
    """The drawn tile's corner radius, from how far in its top edge starts."""
    px = im.load()
    n = im.size[0]
    white = lambda p: min(p) > 238
    y = 2
    inset = next(x for x in range(n) if not white(px[x, y]))
    # A circle of radius R reaches the row y at R - sqrt(R² - (R - y)²) in.
    return next(r for r in range(inset, n) if r - (r * r - (r - y) ** 2) ** 0.5 <= inset)


MARGIN = 8  # px in from the tile's soft straight edges


def fill_corners(im):
    """Outside the tile's rounded corners (and its soft edge): the colour just
    inside the curve, straight in towards the corner's centre. Then MARGIN
    off every side, clear of the soft straight edges."""
    r = corner_radius(im)  # measured on the whole tile
    m = MARGIN
    im = im.crop((m, m, im.size[0] - m, im.size[1] - m))
    px = im.load()
    n = im.size[0]
    edge = r - 10  # clear of the soft edge
    c0, c1 = r - m, n - 1 - (r - m)
    for cx, cy, sx, sy in ((c0, c0, -1, -1), (c1, c0, 1, -1), (c0, c1, -1, 1), (c1, c1, 1, 1)):
        for y in range(n):
            for x in range(n):
                dx, dy = x - cx, y - cy
                if dx * sx <= 0 or dy * sy <= 0:
                    continue
                d = (dx * dx + dy * dy) ** 0.5
                if d <= edge:
                    continue
                k = edge / d
                px[x, y] = px[int(cx + dx * k), int(cy + dy * k)]
    return im


def main():
    square = fill_corners(tile(Image.open(SRC).convert('RGB')))
    for name, size in SIZES.items():
        square.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)
        print(name, size)


if __name__ == '__main__':
    main()
