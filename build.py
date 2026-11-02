#!/usr/bin/env python3
"""Concatenate src/*.js into one self-contained HTML. Drawn in code, plus the painted key poses packed by art/pack.py."""
import glob, os

ROOT = os.path.dirname(os.path.abspath(__file__))
code = '\n'.join(open(p, encoding='utf-8').read() for p in sorted(glob.glob(os.path.join(ROOT, 'src', '*.js'))))
html = open(os.path.join(ROOT, 'template.html'), encoding='utf-8').read()
html = html.replace('/*__PLATES__*/\n', '').replace('/*__CODE__*/', code)
dst = os.path.join(ROOT, 'wukong.html')
open(dst, 'w', encoding='utf-8').write(html)
print(dst, round(len(html) / 1e3), 'KB')
