#!/usr/bin/env python3
"""Cut a 3x2 pose sheet on flat magenta into trimmed RGBA sprites.
usage: cut.py sheet.png outdir name1 .. name6   (row-major; '-' skips a cell)"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, out, names = sys.argv[1], sys.argv[2], sys.argv[3:]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W = im.shape[:2]
R, G, B = im[..., 0], im[..., 1], im[..., 2]
m = np.minimum(R, B) - G                      # how magenta a pixel is
a = 1 - np.clip((m - 60) / 90, 0, 1)
# despill: pull the magenta cast out of soft edges
k = np.clip(np.minimum(R, B) - G, 0, None) * (1 - a)
rgb = np.stack([R - k, G, B - k], -1).clip(0, 255)
lab, n = ndimage.label(a > .5)
cells = {}
for i, c in enumerate(ndimage.center_of_mass(a > .5, lab, range(1, n + 1)), 1):
    cells.setdefault((int(c[0] // (H / 2)), int(c[1] // (W / 3))), []).append(i)
os.makedirs(out, exist_ok=True)
for idx, name in enumerate(names):
    if name == '-': continue
    keep = np.isin(lab, cells.get((idx // 3, idx % 3), []))
    keep = ndimage.binary_dilation(keep, iterations=3)
    al = a * keep
    al[al < .04] = 0
    ys, xs = np.where(al > 0)
    y0, y1, x0, x1 = ys.min() - 2, ys.max() + 3, xs.min() - 2, xs.max() + 3
    px = np.dstack([rgb, al * 255])[y0:y1, x0:x1].astype(np.uint8)
    Image.fromarray(px, 'RGBA').save(f'{out}/{name}.png')
    print(name, px.shape[1], 'x', px.shape[0], 'at', x0, y0)
