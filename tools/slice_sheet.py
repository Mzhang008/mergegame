"""Cut the 21 item icons out of the 3x7 item sheet.

The sheet has a checkerboard painted into its pixels (not real alpha), with
smeared bands and painted drop shadows. Three background detectors are
computed and the best one is chosen per item:

  A  neutral-grey flood fill from the border (+ enclosed two-tone pockets).
     Cleanest edges, but leaks into light, bluish-white glaze.
  B  checker fingerprint (blue cast) + opposite tone one square away.
     Keeps white glaze and steam intact; leaves fringes in tight gaps.
  C  like B but compares brightness ratios, so painted shadows (which scale
     both tones) are removed. Can eat bluish-grey item parts.

Usage: slice_sheet.py SHEET OUTDIR [SIZE]
Writes OUTDIR/r{row}c{col}.png (square, 256-colour palette PNG with alpha)
for rows 0-2, cols 0-6.

Sheet rows map to chains: row 0 = food, row 1 = sakura, row 2 = tea, and
column N is tier N+1 -- except food, where the game swaps sheet columns 4
and 5 (sake set is tier 5, feast table tier 6) so each tier looks bigger
than the last. Install with:
    for t in 1..7: food-t <- r0c{0,1,2,3,5,4,6}[t-1], sakura-t <- r1c{t-1},
                   tea-t <- r2c{t-1}   (into prototype/art/items/)
"""
import sys
from collections import deque
import numpy as np
from PIL import Image

src, outdir = sys.argv[1], sys.argv[2]
SIZE = int(sys.argv[3]) if len(sys.argv) > 3 else 160

# Per-item detector choice, picked by inspecting all three on light and
# dark backgrounds. Unlisted items use A.
METHOD = {
    (0, 4): 'C', (0, 5): 'A|B', (0, 6): 'C',
    (2, 1): 'A|B', (2, 2): 'C',
}
# Fraction of the item height (from the top) that holds painted steam.
STEAM_BAND = {(2, 1): 0.28}

img = Image.open(src).convert('RGB')
a = np.asarray(img).astype(np.float32)
H, W, _ = a.shape
lum = a.mean(2)
chroma = a.max(2) - a.min(2)
BR = a[..., 2] - a[..., 0]

band = a[0:40, 0:300]
blum = lum[0:40, 0:300]
thr = (blum.min() + blum.max()) / 2
DARK = band[blum < thr].mean(0)
LIGHT = band[blum >= thr].mean(0)
LD, LL = DARK.mean(), LIGHT.mean()
RATIO = LL / LD


def shift(m, dy, dx):
    out = np.zeros_like(m)
    ys = slice(max(dy, 0), H + min(dy, 0)); yd = slice(max(-dy, 0), H + min(-dy, 0))
    xs = slice(max(dx, 0), W + min(dx, 0)); xd = slice(max(-dx, 0), W + min(-dx, 0))
    out[yd, xd] = m[ys, xs]
    return out


def dilate(m, r=1):
    for _ in range(r):
        m = m | shift(m, 1, 0) | shift(m, -1, 0) | shift(m, 0, 1) | shift(m, 0, -1)
    return m


def flood(passable, seeds_mask):
    out = seeds_mask & passable
    q = deque(zip(*np.nonzero(out)))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < H and 0 <= nx < W and passable[ny, nx] and not out[ny, nx]:
                out[ny, nx] = True
                q.append((ny, nx))
    return out


def components(mask):
    lab = np.zeros(mask.shape, np.int32)
    sizes = {}
    n = 0
    h, w = mask.shape
    for y0 in range(h):
        for x0 in range(w):
            if mask[y0, x0] and not lab[y0, x0]:
                n += 1
                dq = deque([(y0, x0)]); lab[y0, x0] = n; c = 0
                while dq:
                    y, x = dq.popleft(); c += 1
                    for ny in (y - 1, y, y + 1):
                        for nx in (x - 1, x, x + 1):
                            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                                lab[ny, nx] = n; dq.append((ny, nx))
                sizes[n] = c
    return lab, sizes


# --- A: neutral flood fill from the border -------------------------------
lenient = (chroma < 24) & (lum > LD - 22) & (lum < LL + 22)
border = np.zeros((H, W), bool)
border[0, :] = border[-1, :] = border[:, 0] = border[:, -1] = True
bgA = flood(lenient, border)
d_dark = np.linalg.norm(a - DARK, axis=2)
d_light = np.linalg.norm(a - LIGHT, axis=2)
pockets, psizes = components(lenient & ~bgA)
for k, n in psizes.items():
    if n >= 50:
        sel = pockets == k
        if (d_dark[sel] < 26).mean() > 0.25 and (d_light[sel] < 26).mean() > 0.25:
            bgA |= sel

# --- B: fingerprint + opposite tone one square away ----------------------
sigB = (BR >= 3) & (BR <= 15) & (chroma <= 16)
tone_d = sigB & (np.abs(lum - LD) < 20)
tone_l = sigB & (np.abs(lum - LL) < 20)
opp = np.zeros((H, W), np.int8)
for dy, dx in ((0, 12), (0, -12), (12, 0), (-12, 0)):
    opp += (tone_d & shift(tone_l, dy, dx)) | (tone_l & shift(tone_d, dy, dx))
bgB = opp >= 2
for _ in range(4):
    bgB |= dilate(bgB) & sigB
halo = (chroma <= 22) & (lum > 45) & (lum < LL + 15) & (BR >= -2)
bgB |= dilate(bgB) & halo

# --- C: shadow-aware ratio test + gated flood -----------------------------
sigC = (BR >= 2) & (BR <= 15) & (chroma <= 16) & (lum >= 50) & (lum <= LL + 15)
evidence = np.zeros((H, W), np.int8)
for dy, dx in ((0, 12), (0, -12), (12, 0), (-12, 0)):
    q_sig = shift(sigC, dy, dx)
    q_lum = shift(lum, dy, dx)
    r = np.where(q_lum > 0, lum / np.maximum(q_lum, 1), 0)
    alt = ((r > RATIO * 0.82) & (r < RATIO * 1.2)) | ((r > 1 / (RATIO * 1.2)) & (r < 1 / (RATIO * 0.82)))
    evidence += (sigC & q_sig & alt).astype(np.int8)
seeds = evidence >= 2
bgC = flood(sigC & ((evidence >= 1) | dilate(seeds, 2)), seeds)
for _ in range(2):
    bgC |= dilate(bgC) & halo

FG = {'A': ~bgA, 'B': ~bgB, 'C': ~bgC}
FG['A|B'] = FG['A'] | FG['B']

# --- Layout from mask A ---------------------------------------------------
fgA = FG['A'].copy()
lab, sizes = components(fgA)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
drop = [k for k, v in sizes.items() if v < 40 or (k in edge and v < 1500)]
fgA[np.isin(lab, drop)] = False


def runs_of(occ, merge_gap):
    runs = []; start = None
    for i, v in enumerate(occ):
        if v and start is None: start = i
        if not v and start is not None: runs.append([start, i]); start = None
    if start is not None: runs.append([start, len(occ)])
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < merge_gap: merged[-1][1] = r[1]
        else: merged.append(r)
    return merged


def fit(runs, n, profile=None):
    while profile is not None and len(runs) < n:
        k = max(range(len(runs)), key=lambda i: runs[i][1] - runs[i][0])
        r0, r1 = runs[k]
        m0 = r0 + (r1 - r0) // 10; m1 = r1 - (r1 - r0) // 10
        cut = m0 + int(np.argmin(profile[m0:m1]))
        runs[k:k + 1] = [[r0, cut], [cut + 1, r1]]
    while len(runs) > n:
        gaps = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]
        k = int(np.argmin(gaps)); runs[k] = [runs[k][0], runs[k + 1][1]]; del runs[k + 1]
    return runs


rows = fit(runs_of(fgA.sum(1) > 0, 18), 3)
cells = []
for r, (y0, y1) in enumerate(rows):
    prof = fgA[y0:y1].sum(0)
    for c, (x0, x1) in enumerate(fit(runs_of(prof > 0, 6), 7, prof)):
        cells.append((r, c, x0, y0, x1, y1))

rgb = np.asarray(img)
for (r, c, x0, y0, x1, y1) in cells:
    m = FG[METHOD.get((r, c), 'A')][y0:y1, x0:x1].copy()
    # Keep the item, drop specks: components under 2% of the largest go.
    clab, csz = components(m)
    if csz:
        biggest = max(csz.values())
        keep = [k for k, v in csz.items() if v >= max(40, 0.02 * biggest)]
        m = np.isin(clab, keep)
    method = METHOD.get((r, c), 'A')
    alpha = (m * 255).astype(np.uint8)
    cell_rgb = rgb[y0:y1, x0:x1].copy()
    if '|' in method:
        # Union items: pinholes are glaze highlights that matched a checker
        # tone, not real gaps. Fill enclosed holes under 600 px.
        hh, ww = m.shape
        outside = np.zeros_like(m)
        dq = deque()
        for yb in range(hh):
            for xb in (0, ww - 1):
                if not m[yb, xb] and not outside[yb, xb]:
                    outside[yb, xb] = True; dq.append((yb, xb))
        for xb in range(ww):
            for yb in (0, hh - 1):
                if not m[yb, xb] and not outside[yb, xb]:
                    outside[yb, xb] = True; dq.append((yb, xb))
        while dq:
            yb, xb = dq.popleft()
            for ny, nx in ((yb - 1, xb), (yb + 1, xb), (yb, xb - 1), (yb, xb + 1)):
                if 0 <= ny < hh and 0 <= nx < ww and not m[ny, nx] and not outside[ny, nx]:
                    outside[ny, nx] = True; dq.append((ny, nx))
        hlab, hsz = components(~m & ~outside)
        small_holes = [k for k, v in hsz.items() if v < 600]
        m = m | np.isin(hlab, small_holes)
        alpha = (m * 255).astype(np.uint8)
        # Close small notches along light glaze edges (radius 2).
        closed = m.copy()
        for _ in range(2):
            closed = closed | np.roll(closed, 1, 0) | np.roll(closed, -1, 0) | np.roll(closed, 1, 1) | np.roll(closed, -1, 1)
        for _ in range(2):
            closed = closed & np.roll(closed, 1, 0) & np.roll(closed, -1, 0) & np.roll(closed, 1, 1) & np.roll(closed, -1, 1)
        m = m | closed
        alpha = (m * 255).astype(np.uint8)
        # Painted steam: neutral pixels in the item's top band become soft
        # translucent white instead of opaque grey blocks.
        yy0 = np.nonzero(m.any(1))[0]
        top, bottom = yy0.min(), yy0.max()
        steam_band = np.zeros_like(m)
        steam_band[top:top + int((bottom - top) * STEAM_BAND.get((r, c), 0))] = True
        sel = m & steam_band & (chroma[y0:y1, x0:x1] < 30)
        cell_rgb[sel] = (255, 255, 255)
        alpha[sel] = 140
    yy, xx = np.nonzero(m)
    by0, by1, bx0, bx1 = yy.min(), yy.max() + 1, xx.min(), xx.max() + 1
    crop_rgb = cell_rgb[by0:by1, bx0:bx1]
    crop_a = alpha[by0:by1, bx0:bx1]
    crop = Image.fromarray(np.dstack([crop_rgb, crop_a]), 'RGBA')
    w, h = crop.size
    side = int(max(w, h) * 1.06) + 2
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(crop, ((side - w) // 2, (side - h) // 2))
    icon = canvas.convert('RGBa').resize((SIZE, SIZE), Image.LANCZOS).convert('RGBA')
    icon.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE) \
        .save(f'{outdir}/r{r}c{c}.png', optimize=True)
    print(f'r{r}c{c} method={METHOD.get((r, c), "A")} item={w}x{h}')
