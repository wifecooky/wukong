'use strict';
// ---------- core: math, noise, hand-inked line, cel fill ----------
const W = 1920, H = 1080, D2R = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lin = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
const easeIO = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeIn3 = t => t * t * t;
const easeOut3 = t => 1 - Math.pow(1 - t, 3);

function rng(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; }
function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
function fbm2(x, y, o = 4) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise2(x * f, y * f); a *= .5; f *= 2.03; } return s; }

function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Catmull-Rom sampled into dense points
function sampleCR(pts, closed, per = 8) {
  const n = pts.length, out = [];
  if (n < 2) return pts.slice();
  const get = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([
        .5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
      ]);
    }
  }
  if (!closed) out.push(pts[n - 1].slice());
  return out;
}
function pathOf(d, closed) {
  const p = new Path2D();
  p.moveTo(d[0][0], d[0][1]);
  for (let i = 1; i < d.length; i++) p.lineTo(d[i][0], d[i][1]);
  if (closed) p.closePath();
  return p;
}
function area(d) { let a = 0; for (let i = 0; i < d.length; i++) { const p = d[i], q = d[(i + 1) % d.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }

// Hand-inked line: a filled ribbon whose width breathes with pressure,
// tapers at the ends and thickens on the side turned away from the light.
const INK = { col: '#2a1c14', scale: 1 };
function ink(g, d, closed, w, o = {}) {
  const n = d.length; if (n < 2) return;
  const seed = o.seed || 1, sh = o.shade == null ? .9 : o.shade;
  const sgn = closed ? Math.sign(area(d)) || 1 : (o.side || 1);
  const L = [], R = [];
  w *= INK.scale;
  for (let i = 0; i < n; i++) {
    const a = d[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)], b = d[closed ? (i + 1) % n : Math.min(i + 1, n - 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    let ww = w * (.62 + .62 * vnoise(seed * 7.31 + i * .11));
    const nx = dy * sgn, ny = -dx * sgn; // outward normal
    ww *= 1 + sh * Math.max(0, nx * .5 + ny * .86);
    if (!closed && o.taper !== false) { const s = i / (n - 1); ww *= Math.min(1, .15 + s * 5, .15 + (1 - s) * 4); }
    L.push([d[i][0] - dy * ww / 2, d[i][1] + dx * ww / 2]);
    R.push([d[i][0] + dy * ww / 2, d[i][1] - dx * ww / 2]);
  }
  g.beginPath();
  if (closed) {
    g.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) g.lineTo(L[i][0], L[i][1]); g.closePath();
    g.moveTo(R[n - 1][0], R[n - 1][1]); for (let i = n - 2; i >= 0; i--) g.lineTo(R[i][0], R[i][1]); g.closePath();
  } else {
    g.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) g.lineTo(L[i][0], L[i][1]);
    for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]); g.closePath();
  }
  g.fillStyle = o.col || INK.col; g.fill('nonzero');
}
// quick polyline ink for small strokes
function inkPts(g, pts, w, o = {}) { ink(g, sampleCR(pts, false, o.per || 6), false, w, o); }

// Cel fill: base + hard highlight band on lit edge + hard shadow on far side.
// light comes from upper-left, so "away" is (+.6,+.8).
const SHADOW = '#8a84a0';
function cel(g, path, m, sz, o = {}) {
  const sk = o.shK == null ? 1 : o.shK, hk = o.hiK == null ? 1 : o.hiK;
  g.save();
  g.clip(path);
  g.fillStyle = m.base; g.fill(path);
  if (o.detail) o.detail(g);
  if (hk > 0) {
    const hp = new Path2D(); hp.rect(-1e5, -1e5, 2e5, 2e5);
    hp.addPath(path, new DOMMatrix().translate(sz * .16 * hk * .6, sz * .16 * hk * .8));
    g.globalAlpha = o.hiA == null ? .8 : o.hiA; g.fillStyle = m.hi; g.fill(hp, 'evenodd'); g.globalAlpha = 1;
  }
  if (sk > 0) {
    const sp = new Path2D(); sp.rect(-1e5, -1e5, 2e5, 2e5);
    sp.addPath(path, new DOMMatrix().translate(-sz * .6 * sk, -sz * .8 * sk));
    g.globalCompositeOperation = 'multiply'; g.fillStyle = o.shc || SHADOW; g.fill(sp, 'evenodd');
  }
  g.restore();
}

const MAT = {
  bronze: { base: '#9b7a4a', hi: '#d0a96a', sh: '#5d4b3e' },
  bronzeD: { base: '#7e6443', hi: '#ad8a58', sh: '#4a3d35' },
  verd: { base: '#6f9c86', hi: '#a3c6ab', sh: '#46705f' },
  verdD: { base: '#5a8574', hi: '#86ad95', sh: '#3a5d51' },
  red: { base: '#b5432c', hi: '#d86a45', sh: '#7a2b24' },
  gold: { base: '#d6a443', hi: '#f4d585', sh: '#9a6c2c' },
  iron: { base: '#4a4239', hi: '#6d6152', sh: '#2e2925' },
  moss: { base: '#7e8b3c', hi: '#adb45a', sh: '#4e5d2f' },
  soil: { base: '#6e5038', hi: '#8f6c4a', sh: '#46332a' },
  stone: { base: '#a39a86', hi: '#c9c0a8', sh: '#6f6a60' },
  bark: { base: '#6a5440', hi: '#8f7656', sh: '#43362c' },
  leaf: { base: '#5f7d3c', hi: '#89a356', sh: '#3a5229' },
};

// geometry helpers
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const mixp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
// map local (u along A->B in [0..1] of length, v perpendicular in units) to world
function frame(A, B) {
  const L = dist(A, B) || 1, ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
  return { L, ux, uy, p: (u, v) => [A[0] + ux * u * L - uy * v, A[1] + uy * u * L + ux * v], q: (u, v) => [A[0] + ux * u - uy * v, A[1] + uy * u + ux * v] };
}
// outline of a limb/armor segment between A and B
function segShape(A, B, wa, wb, o = {}) {
  const f = frame(A, B), bulge = o.bulge || 1.08, capA = o.capA == null ? .5 : o.capA, capB = o.capB == null ? .5 : o.capB;
  const pts = [];
  const k = 7;
  for (let i = 0; i <= k; i++) { const u = i / k, w = lerp(wa, wb, u) * (1 + (bulge - 1) * Math.sin(u * Math.PI)); pts.push(f.p(u, w / 2 + (o.jit ? (hash(i + o.jit) - .5) * o.jit * .002 * w : 0))); }
  // B cap
  pts.push(f.q(f.L + wb * capB * .55, wb * .22)); pts.push(f.q(f.L + wb * capB * .62, 0)); pts.push(f.q(f.L + wb * capB * .55, -wb * .22));
  for (let i = k; i >= 0; i--) { const u = i / k, w = lerp(wa, wb, u) * (1 + (bulge - 1) * Math.sin(u * Math.PI)); pts.push(f.p(u, -w / 2)); }
  pts.push(f.q(-wa * capA * .55, -wa * .22)); pts.push(f.q(-wa * capA * .62, 0)); pts.push(f.q(-wa * capA * .55, wa * .22));
  return pts;
}
function ellipsePts(cx, cy, rx, ry, n = 16, rot = 0, jit = 0, seed = 1) {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, j = 1 + (hash(seed * 13 + i) - .5) * jit;
    const x = Math.cos(a) * rx * j, y = Math.sin(a) * ry * j;
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}
// draw a closed shape: cel fill + ink outline
function shape(g, pts, m, o = {}) {
  const d = sampleCR(pts, true, o.per || 5);
  const P = pathOf(d, true);
  const sz = o.sz || 30;
  if (m) cel(g, P, m, sz, o);
  if (o.lw !== 0) ink(g, d, true, (o.lw || 2.4) * G.lu, { seed: o.seed || pts.length * 3.7, col: o.col });
  return P;
}
// "G" holds the current guardian drawing context (line unit etc.)
const G = { lu: 1, detail: 1 };
