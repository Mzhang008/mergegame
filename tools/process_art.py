"""Build the game's scenes, character sprites, interface icons and app icons
from the pixel-art sources in art-source/.

Sources (generated pixel art, JPEG):
  village-0.jpg .. village-5.jpg  One 16:9 scene per restoration step, all from
                  the same camera so the game can crossfade between them.
  hana-sheet.jpg  One row on flat magenta: Hana (neutral, joyful, moved), the
                  torii emblem, the Tanabata bamboo.
  ui-icons.jpg    One row on flat magenta: energy, coin, blossom, sparkle,
                  gift, torii.
  app-icon.jpg    Torii and sakura on a four-band diagonal gradient. Its bottom
                  corners came out rounded off; they are repainted from the bands.

The sheets and the app icon are drawn on a regular grid of big pixels. Taking
the median of each grid cell's centre recovers the clean pixel art and drops
the JPEG noise; magenta becomes transparency. The scenes' grid drifts too much
to snap without doubling outlines, so they are only downscaled.

Usage: process_art.py [SRC_DIR] [GAME_DIR]      (default: art-source game)
Writes, under GAME_DIR:
  art/village-N.webp                  1200x670 scenes
  art/hana.png, hana-joy.png, hana-moved.png, art/torii.png
                                      native size, shown 1:1 with pixelated scaling
  art/tanabata.png, art/ui/NAME.png   4x, for smooth scaling to any size
  icons/icon-180.png, icon-192.png, icon-512.png, icon-maskable-512.png,
  icons/favicon-32.png
"""
import os
import sys
import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'art-source'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'game'

SCENE_SIZE = (1200, 670)
HANA_SHEET = ['hana', 'hana-joy', 'hana-moved', 'torii', 'tanabata']
HANA_FACES = HANA_SHEET[:3]
UI_SHEET = ['energy', 'coin', 'blossom', 'sparkle', 'gift', 'torii']
UPSCALE = 4
# Maskable icons keep their subject inside a centred circle of 80% diameter;
# padding by 1/8 each side shrinks the artwork to 80% of the canvas.
MASKABLE_PAD = 1 / 8


def load(name):
    return np.asarray(Image.open(os.path.join(SRC, name)).convert('RGB')).astype(np.int16)


def save(px, path, scale=1):
    im = Image.fromarray(px.astype(np.uint8), 'RGBA' if px.shape[2] == 4 else 'RGB')
    if scale != 1:
        im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    path = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, optimize=True)
    print(f'  {path}  {im.width}x{im.height}  {os.path.getsize(path) // 1024} KB')


def grid(a, lo=3.0, hi=16.0):
    """Cell size and offset of the art grid, found from where colour edges fall."""
    def fit(edge):
        edge = edge - edge.mean()
        n = np.arange(len(edge)) + 1  # edge i lies between pixels i and i+1
        best = (0.0, 0.0, 0.0)
        for p in np.arange(lo, hi, 0.01):
            z = (edge * np.exp(-2j * np.pi * n / p)).sum()
            if abs(z) > best[1]:
                best = (p, abs(z), np.angle(z))
        p, _, angle = best
        return p, (angle / (2 * np.pi) * p) % p
    px, ox = fit(np.abs(np.diff(a, axis=1)).sum(axis=(0, 2)))
    py, oy = fit(np.abs(np.diff(a, axis=0)).sum(axis=(1, 2)))
    return (px + py) / 2, ox, oy


def snap(a):
    """One pixel per grid cell: the median of the cell's middle."""
    p, ox, oy = grid(a)
    r = max(1, int(p // 4))
    H, W = a.shape[:2]
    xs = np.array([int(x) for x in ox + (np.arange(-1, W / p + 1) + 0.5) * p if r <= x < W - r])
    ys = np.array([int(y) for y in oy + (np.arange(-1, H / p + 1) + 0.5) * p if r <= y < H - r])
    d = np.arange(-r, r + 1)
    patches = a[(ys[:, None] + d)[:, None, :, None], (xs[:, None] + d)[None, :, None, :]]
    print(f'  grid: {p:.2f}px cells -> {len(xs)}x{len(ys)}')
    return np.median(patches.reshape(len(ys), len(xs), -1, 3), axis=2).astype(np.int16)


def flood(mask, seeds):
    """Cells of `mask` 8-connected to any seed."""
    H, W = mask.shape
    hit = np.zeros_like(mask)
    stack = [s for s in seeds if mask[s]]
    for s in stack:
        hit[s] = True
    while stack:
        y, x = stack.pop()
        for ny in (y - 1, y, y + 1):
            for nx in (x - 1, x, x + 1):
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not hit[ny, nx]:
                    hit[ny, nx] = True
                    stack.append((ny, nx))
    return hit


def sprites(sheet, names):
    """Cut a row of sprites off flat magenta. Returns {name: (RGBA, box)}."""
    px = snap(load(sheet))
    magenta = np.minimum(px[..., 0], px[..., 2]) - px[..., 1]
    solid = magenta < 100  # magenta and magenta-tinted fringe become transparent
    left = solid.copy()
    parts = []
    while left.any():
        y, x = np.argwhere(left)[0]
        part = flood(left, [(y, x)])
        left &= ~part
        ys, xs = np.nonzero(part)
        parts.append((len(ys), [xs.min(), ys.min(), xs.max(), ys.max()], part))
    # Each sprite is one large piece; small detached bits (a twinkle, a petal)
    # join the nearest large piece, and lone JPEG specks are dropped.
    biggest = max(p[0] for p in parts)
    large = [p for p in parts if p[0] >= biggest / 10]
    for size, (x0, y0, x1, y1), part in parts:
        if size >= biggest / 10:
            continue
        def gap(p):
            bx0, by0, bx1, by1 = p[1]
            return max(bx0 - x1, x0 - bx1, by0 - y1, y0 - by1, 0)
        near = min(large, key=gap)
        if gap(near) <= 3:
            b = near[1]
            b[:] = [min(b[0], x0), min(b[1], y0), max(b[2], x1), max(b[3], y1)]
        else:
            solid &= ~part
    boxes = sorted(p[1] for p in large)
    if len(boxes) != len(names):
        sys.exit(f'{sheet}: found {len(boxes)} sprites, expected {len(names)} ({", ".join(names)})')
    rgba = np.dstack([px, np.where(solid, 255, 0)]).astype(np.int16)
    rgba[~solid, :3] = 0
    return {n: (rgba, b) for n, b in zip(names, boxes)}


def crop(rgba, box, frame=None):
    """Crop to box; with frame=(w, h), centre horizontally and sit on the bottom edge."""
    x0, y0, x1, y1 = box
    part = rgba[y0:y1 + 1, x0:x1 + 1]
    if frame is None:
        return part
    w, h = frame
    out = np.zeros((h, w, 4), np.int16)
    ph, pw = part.shape[:2]
    out[h - ph:, (w - pw) // 2:(w - pw) // 2 + pw] = part
    return out


def scenes():
    print('scenes')
    for i in range(6):
        im = Image.open(os.path.join(SRC, f'village-{i}.jpg')).convert('RGB')
        path = os.path.join(OUT, f'art/village-{i}.webp')
        im.resize(SCENE_SIZE, Image.LANCZOS).save(path, quality=86, method=6)
        print(f'  {path}  {os.path.getsize(path) // 1024} KB')


def hana_sheet():
    print('hana-sheet.jpg')
    cut = sprites('hana-sheet.jpg', HANA_SHEET)
    # The three faces share one frame so swapping expressions never shifts her.
    boxes = [cut[n][1] for n in HANA_FACES]
    frame = (max(b[2] - b[0] for b in boxes) + 1, max(b[3] - b[1] for b in boxes) + 1)
    for n in HANA_FACES:
        save(crop(*cut[n], frame), f'art/{n}.png')
    save(crop(*cut['torii']), 'art/torii.png')
    save(crop(*cut['tanabata']), 'art/tanabata.png', UPSCALE)


def ui_icons():
    print('ui-icons.jpg')
    cut = sprites('ui-icons.jpg', UI_SHEET)
    # Icons share a baseline and top line, so they keep their drawn proportions.
    top = min(b[1] for _, b in cut.values())
    bottom = max(b[3] for _, b in cut.values())
    icons = {}
    for n in UI_SHEET:
        rgba, (x0, _, x1, _) = cut[n]
        icons[n] = crop(rgba, (x0, top, x1, bottom))
        save(icons[n], f'art/ui/{n}.png', UPSCALE)
    t = icons['torii']
    fav = np.zeros((32, 32, 4), np.int16)
    h, w = t.shape[:2]
    fav[(32 - h) // 2:(32 - h) // 2 + h, (32 - w) // 2:(32 - w) // 2 + w] = t
    save(fav, 'icons/favicon-32.png')


def app_icon():
    print('app-icon.jpg')
    px = snap(load('app-icon.jpg'))
    n = min(px.shape[:2])
    px = px[:n, :n]
    s = np.add.outer(np.arange(n), np.arange(n))  # colour bands run along anti-diagonals

    def dist(a, c):
        return np.sqrt(((np.asarray(a, np.float32) - np.asarray(c, np.float32)) ** 2).sum(-1))

    # The rounded-off bottom corners are filled with a pale colour that no
    # band has down there.
    outside = np.zeros((n, n), bool)
    for y, x in ((n - 1, 0), (n - 1, n - 1)):
        outside |= flood(dist(px, px[y, x]) < 20, [(y, x)])
    print(f'  repainting {outside.sum()} corner pixels')
    # Band colour per diagonal: the most common colour on it, then flattened
    # into runs of near-equal colour.
    band = np.zeros((2 * n - 1, 3), np.int16)
    current = None
    for k in range(2 * n - 1):
        cells = px[(s == k) & ~outside]
        if len(cells):
            colours, counts = np.unique(cells, axis=0, return_counts=True)
            mode = colours[counts.argmax()]
            if current is None or dist(mode, current) > 20:
                current = mode
        band[k] = current
    edges = [k for k in range(1, 2 * n - 1) if (band[k] != band[k - 1]).any()]
    print(f'  bands change at diagonals {edges}')
    px = np.where(outside[..., None], band[s], px)

    pad = round(n * MASKABLE_PAD)
    N = n + 2 * pad
    S = np.clip(np.add.outer(np.arange(N), np.arange(N)) - 2 * pad, 0, 2 * n - 2)
    maskable = band[S]
    maskable[pad:pad + n, pad:pad + n] = px

    def icon(src, size, path):
        im = Image.fromarray(src.astype(np.uint8), 'RGB')
        big = im.resize((im.width * 5, im.height * 5), Image.NEAREST)  # crisp blocks first,
        big.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, path), optimize=True)  # then downscale
        print(f'  {OUT}/{path}  {size}x{size}  {os.path.getsize(os.path.join(OUT, path)) // 1024} KB')
    for size in (180, 192, 512):
        icon(px, size, f'icons/icon-{size}.png')
    icon(maskable, 512, 'icons/icon-maskable-512.png')


if __name__ == '__main__':
    scenes()
    hana_sheet()
    ui_icons()
    app_icon()
