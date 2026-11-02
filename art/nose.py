#!/usr/bin/env python3
"""Move the nostrils: the painted pair sat on the cheek edge and read as moles.
Paint them out with the skin around them, then draw a pair just under the red heart's tip.
usage: nose.py name ...   (edits art/poses/<name>.png in place)"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DROP, GAP, RX, RY = 13, 11, 4.6, 3.4   # px below the tip, half spacing, nostril radii

def dots(rgb, a, skin):
    lum = rgb @ [.3, .59, .11]
    lab, _ = ndimage.label((lum < 110) & (a > 200))
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        m = lab == i; n = m[sl].sum()
        if not 8 <= n <= 500 or max(m[sl].shape) > 30: continue
        y0, x0 = sl[0].start - 6, sl[1].start - 6
        if skin[y0:sl[0].stop + 6, x0:sl[1].stop + 6].mean() >= .55: out.append(m)
    return out

for k in sys.argv[1:]:
    p = os.path.join(ROOT, 'art', 'poses', f'{k}.png')
    im = np.asarray(Image.open(p).convert('RGBA')).astype(np.float32)
    rgb, a = im[..., :3], im[..., 3]
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    skin = (R > 215) & (G > 190) & (B > 160) & (a > 200)
    red = (R > 160) & (G < 110) & (B < 90) & (a > 200)
    found = dots(rgb, a, skin)
    ink = np.median(np.concatenate([rgb[m] for m in found]), 0)
    # the old pair's slope gives the head's tilt; a lone dot means level
    cs = sorted(ndimage.center_of_mass(m)[::-1] for m in found)
    tilt = np.arctan2(cs[-1][1] - cs[0][1], cs[-1][0] - cs[0][0]) if len(cs) > 1 else 0.
    # paint out: each dot plus a margin, filled with the median skin of its ring, feathered
    for m in found:
        core = ndimage.binary_dilation(m, iterations=3)
        ring = ndimage.binary_dilation(core, iterations=6) & ~core & skin
        w = ndimage.gaussian_filter(core.astype(np.float32), 1.2)[..., None]
        rgb[:] = rgb * (1 - w) + np.median(rgb[ring], 0) * w
    # new pair under the heart's tip
    rl, rn = ndimage.label(red); big = np.argmax(ndimage.sum(red, rl, range(1, rn + 1))) + 1
    ys, xs = np.where(rl == big); tx, ty = xs[ys == ys.max()].mean(), ys.max()
    c, s = np.cos(tilt), np.sin(tilt)
    yy, xx = np.mgrid[0:rgb.shape[0], 0:rgb.shape[1]].astype(np.float32)
    cov = np.zeros(a.shape, np.float32)
    for side in (-1, 1):
        cx, cy = tx + side * GAP * c, ty + DROP + side * GAP * s
        u, v = (xx - cx) * c + (yy - cy) * s, -(xx - cx) * s + (yy - cy) * c
        d = np.sqrt((u / RX) ** 2 + (v / RY) ** 2)
        cov = np.maximum(cov, np.clip((1 - d) * min(RX, RY) + .5, 0, 1))
    rgb[:] = rgb * (1 - cov[..., None]) + ink * cov[..., None]
    Image.fromarray(np.dstack([rgb, a]).clip(0, 255).astype(np.uint8), 'RGBA').save(p)
    print(k, 'removed', len(found), 'tip', (round(tx), int(ty)), 'tilt %.0f deg' % np.degrees(tilt))
