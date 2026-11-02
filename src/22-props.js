// ---------- props: the Buddha's seal, flying rock, the somersault cloud, a glint ----------

// the seal: yellow paper hanging from its top edge, red brush marks (no legible text).
// peel folds the lower part up over a hinge; wave/ph make it flutter in flight.
function talisman(g, x, y, s, rot, wave, ph, peel) {
  const Wd = 30, Ht = 118, hinge = 1 - .55 * peel, th = peel * 2.6;
  const P = (u, v) => {
    const b = Math.sin(u * 3.4 + ph) * wave * u;
    let px = v * Wd * (1 - .3 * Math.abs(b)) + b * 30, py = u * Ht;
    if (u > hinge) { const d = (u - hinge) * Ht; py = hinge * Ht + d * Math.cos(th); px += d * Math.sin(th) * .35; }
    return [px, py];
  };
  const quad = (u0, u1) => { const o = []; for (let i = 0; i <= 8; i++) o.push(P(lerp(u0, u1, i / 8), -1)); for (let i = 8; i >= 0; i--) o.push(P(lerp(u0, u1, i / 8), 1)); return o; };
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  const front = quad(0, hinge), FP = pathOf(front, true);
  const gr = g.createLinearGradient(0, 0, 0, Ht);
  gr.addColorStop(0, '#f0d27a'); gr.addColorStop(1, '#e2b85a');
  g.fillStyle = gr; g.fill(FP);
  g.save(); g.clip(FP);
  const red = '#b5281e', mark = (pts, w) => inkPts(g, pts.map(([u, v]) => P(u, v)), w, { col: red, shade: 0, seed: pts.length * 7 + w });
  // a ring with a swirl, a long wavering stroke, three hooks, a square stamp
  const ring = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * 6.6; ring.push([.13 + Math.sin(a) * .07, Math.cos(a) * .55]); }
  mark(ring, 2.6);
  mark([[.1, -.2], [.13, .15], [.16, -.1]], 1.8);
  mark([[.26, .05], [.4, -.15], [.55, .12], [.7, -.1], [.86, .05]], 3.4);
  for (const u of [.42, .58, .74]) mark([[u, -.6], [u - .02, -.15], [u + .03, .1]], 2);
  g.fillStyle = red; g.globalAlpha = .85; const st = [P(.88, -.4), P(.88, .4), P(.96, .4), P(.96, -.4)];
  g.beginPath(); st.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.fill(); g.globalAlpha = 1;
  g.restore();
  ink(g, sampleCR(front, true, 2), true, 1.6, { col: '#7a5420', shade: .2, seed: 3 });
  if (peel > 0) {
    const flap = quad(hinge, 1), BP = pathOf(flap, true);
    g.fillStyle = Math.cos(th) < 0 ? '#d4b46e' : '#e2b85a'; g.fill(BP);
    ink(g, sampleCR(flap, true, 2), true, 1.6, { col: '#7a5420', shade: .2, seed: 4 });
  }
  g.restore();
}

// a chunk of flying rock
const ROCKM = { base: '#4f7d6c', hi: '#8fb39a', sh: '#2c4c45' };
function chunk(g, x, y, r, rot, seed) {
  shape(g, ellipsePts(x, y, r, r * .72, 6, rot, .55, seed), seed % 3 ? ROCKM : { base: '#a58a62', hi: '#cdb48a', sh: '#6b5640' }, { lw: Math.max(1.2, r * .09), sz: r * .7, seed });
}
// debris burst: n chunks from O at t0, ballistic, stepped on twos
function debris(g, t, t0, O, n, sp, seed, rmax = 18) {
  const a = stepT(t, 12) - t0; if (a < 0 || a > 3) return;
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const an = -Math.PI / 2 + (r() - .5) * 2.2, v = sp * (.35 + r() * .75), rr = rmax * (.3 + r() * .7), spin = (r() - .5) * 12;
    const x = O[0] + Math.cos(an) * v * a, y = O[1] + Math.sin(an) * v * a + 700 * a * a;
    chunk(g, x, y, rr, spin * a, seed + i);
  }
}

// the somersault cloud: a tight five-lobe head with curls streaming behind
function kinto(g, x, y, s, t, face, seed = 5) {
  g.save(); g.translate(x, y); g.scale(face, 1);
  for (let k = 2; k >= 0; k--) {
    const bx = -s * (1.25 + k * .62), by = s * (.12 + k * .06) + Math.sin(t * 3 + k) * s * .05;
    cloudCurl(g, bx, by, s * (.62 - k * .14), .95 - k * .25, seed + k * 3, 'rgba(176,122,58,A)');
  }
  // body: a scalloped oval, big lobes on top, small ones underneath
  const N = 9, body = [];
  for (let i = 0; i < N * 6; i++) {
    const a = i / (N * 6) * Math.PI * 2, b = Math.abs(Math.sin(a * N / 2)), k = Math.sin(a) > 0 ? .07 : .15;
    body.push([Math.cos(a) * s * (1 + k * b), Math.sin(a) * s * .42 * (1 + k * 1.8 * b)]);
  }
  shape(g, body, { base: '#f6edd6', hi: '#fffdf6', sh: '#dccaa0' }, { lw: Math.max(1.4, s * .026), sz: s * .25, seed, col: '#a8743a', per: 4 });
  for (const [cx, cy, r, d] of [[-.38, -.02, .17, 1], [.22, .04, .14, -1], [-.02, -.2, .1, 1]]) {
    const sp = []; for (let i = 0; i <= 22; i++) { const u = i / 22, an = d * u * 9.5; sp.push([s * cx + Math.cos(an) * s * r * (1 - u * .85), s * cy + Math.sin(an) * s * r * (1 - u * .85) * .7]); }
    inkPts(g, sp, Math.max(1, s * .02), { col: '#b08040', shade: 0, seed: seed + d });
  }
  g.restore();
}

// four-point star glint
function glint(g, x, y, r, a) {
  if (a <= 0) return;
  glow(g, x, y, r * 2.2, 'rgba(255,220,120,A)', a * .8);
  g.save(); g.globalAlpha = a; g.fillStyle = '#fff8dc'; g.beginPath();
  for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2, q = i % 2 ? r * .14 : r; g.lineTo(x + Math.cos(an) * q, y + Math.sin(an) * q); }
  g.fill(); g.restore();
}
