// ---------- effects: birds, debris, ink-wash puffs, mist, fire, trail, light ----------

// ---- prerendered ink-wash sprites (wet edge + granulation) ----
const SPR = {};
function washSprite(seed, size, col, edge, soft) {
  const c = mk(size, size), g = c.getContext('2d'), im = g.createImageData(size, size), d = im.data;
  const [r0, g0, b0] = col, ox = seed * 13.7, oy = seed * 7.1, h = size / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x - h) / h, dy = (y - h) / h, rr = Math.hypot(dx, dy);
    const n = fbm2(x / size * 3.2 + ox, y / size * 3.2 + oy, 5);
    const f = 1 - rr * 1.15 + (n - .5) * 1.1;
    let a = sstep(0, soft, f);
    // wet edge: pigment collects at the border of the wash
    const e = Math.exp(-((f - .04) ** 2) / .0035) * edge;
    const gr = fbm2(x * .9 + ox, y * .9 + oy, 2); // granulation
    a = clamp(a * (.55 + .45 * gr) + e * .6, 0, 1);
    const k = (y * size + x) * 4, dk = 1 - e * .35;
    d[k] = r0 * dk; d[k + 1] = g0 * dk; d[k + 2] = b0 * dk; d[k + 3] = a * 255;
  }
  g.putImageData(im, 0, 0);
  return c;
}
function initSprites() {
  SPR.dust = [0, 1, 2, 3].map(i => washSprite(11 + i, 256, [178, 152, 116], .6, .6));
  SPR.mist = [0, 1, 2].map(i => washSprite(41 + i, 256, [214, 222, 226], .15, .9));
  SPR.cloud = [0, 1, 2, 3].map(i => washSprite(61 + i, 256, [246, 236, 210], .5, .45));
  // silk / paper grain, static
  const gw = 640, gh = 360, gc = mk(gw, gh), gg = gc.getContext('2d'), im = gg.createImageData(gw, gh), dd = im.data;
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const n = fbm2(x * .08, y * .08, 3), weave = (Math.sin(x * 2.1) * .5 + .5) * (Math.sin(y * 2.3 + x * .02) * .5 + .5);
    const v = 236 + (n - .5) * 30 - weave * 10, k = (y * gw + x) * 4;
    dd[k] = v; dd[k + 1] = v - 6; dd[k + 2] = v - 18; dd[k + 3] = 255;
  }
  gg.putImageData(im, 0, 0);
  SPR.grain = gc;
}

// ---- magpie (喜鹊): black-and-white with blue sheen, long tail ----
const MAG = { blk: '#1e2128', blu: '#2e4a6e', wht: '#f1ede2', ink: '#14100c' };
function magpie(g, x, y, s, pose, face, wing, look = 0) {
  // local units: body length ~100; face = +1 looks right
  g.save(); g.translate(x, y); g.scale(s * face, s);
  const lw = 1.4 / s;
  const fill = (pts, col, closed = true, per = 4) => { const d = sampleCR(pts, true, per); g.fillStyle = col; g.fill(pathOf(d, true)); ink(g, d, true, lw * 1.6, { seed: pts.length, col: MAG.ink, shade: .6 }); };
  if (pose === 'perch') {
    fill([[-24, 4], [-60, 30], [-112, 62], [-118, 58], [-70, 20], [-30, -6]], MAG.blu); // tail
    fill([[-34, -4], [-10, -22], [24, -24], [40, -12], [34, 10], [8, 22], [-24, 16]], MAG.blk); // body
    fill([[0, 4], [24, -6], [34, 8], [10, 20], [-6, 16]], MAG.wht); // belly
    fill([[-30, -10], [-4, -18], [20, -14], [8, 2], [-20, 4], [-44, 8]], MAG.blu); // folded wing
    fill([[-18, -10], [4, -12], [-2, -4], [-22, -2]], MAG.wht); // scapular
    const hx = 40 + look * 2, hy = -22 - look * 6;
    fill([[hx - 14, hy + 6], [hx - 8, hy - 12], [hx + 8, hy - 12], [hx + 14, hy], [hx + 6, hy + 10]], MAG.blk); // head
    fill([[hx + 12, hy - 4], [hx + 30, hy - 1 - look * 4], [hx + 12, hy + 3]], '#2b2620', true, 2); // beak
    g.fillStyle = '#fff'; g.beginPath(); g.arc(hx + 5, hy - 4, 2.2, 0, 7); g.fill();
    g.strokeStyle = MAG.ink; g.lineWidth = lw * 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(4, 20); g.lineTo(2, 34); g.lineTo(10, 36); g.moveTo(14, 18); g.lineTo(14, 34); g.lineTo(22, 35); g.stroke();
  } else {
    // flight: 4 wing drawings  0 up, 1 mid, 2 down, 3 mid-forward
    const wy = [-62, -14, 40, -30][wing], wx = [-6, 4, 0, 12][wing];
    fill([[-24, 0], [-70, 6], [-118, 14], [-118, 6], [-70, -4], [-28, -8]], MAG.blu);
    fill([[-14, 6], [-2, -2], [2, wy * .3], [wx - 10, wy], [wx + 20, wy * .95], [26, -6]], MAG.blk); // far wing
    fill([[-32, -2], [-6, -14], [24, -14], [42, -6], [34, 8], [0, 12], [-26, 8]], MAG.blk);
    fill([[0, 2], [26, -4], [32, 6], [4, 10]], MAG.wht);
    fill([[-8, -6], [10, -8], [wx + 6, wy * 1.2 - 4], [wx + 30, wy * 1.15], [22, -4]], MAG.blu); // near wing
    fill([[wx + 12, wy * .8], [wx + 26, wy * 1.1], [wx + 30, wy * 1.1 + 6], [wx + 14, wy * .8 + 8]], MAG.wht); // primaries patch
    fill([[36, -10], [44, -20], [56, -16], [58, -8], [46, -2]], MAG.blk);
    fill([[56, -12], [72, -10], [56, -6]], '#2b2620', true, 2);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(50, -13, 2, 0, 7); g.fill();
  }
  g.restore();
}
// distant ink bird silhouette, 4 flap drawings
function inkBird(g, x, y, s, ph, face = 1, col = '#2a2420') {
  const wy = [-1, -.3, .55, -.15][ph], tip = [.75, 1, .9, .95][ph];
  g.save(); g.translate(x, y); g.scale(s * face, s);
  const d = sampleCR([[-1.1 * tip, wy - .1], [-.5, wy * .35 - .12], [-.12, -.05], [0, -.12], [.18, -.06], [.12, .06], [-.1, .08], [.5, wy * .35 - .02], [1.05 * tip, wy + .05], [.5, wy * .35 - .2], [.1, -.08]], true, 3);
  g.fillStyle = col; g.fill(pathOf(d, true));
  g.restore();
}

// ---- falling leaves spiralling down through light ----
const LEAFCOL = [{ base: '#d9a441', hi: '#f2cf7a' }, { base: '#b8562e', hi: '#e08a52' }, { base: '#7d9440', hi: '#a9bd62' }, { base: '#c97f35', hi: '#eab06a' }];
function leaf(g, x, y, s, rot, flip, ci, seed) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, Math.max(.12, Math.abs(flip)));
  const m = LEAFCOL[ci % LEAFCOL.length], L = s;
  const pts = [[-L * .5, 0], [-L * .1, -L * .3], [L * .35, -L * .2], [L * .55, 0], [L * .35, L * .2], [-L * .1, L * .3]];
  const d = sampleCR(pts, true, 3), P = pathOf(d, true);
  g.fillStyle = flip < 0 ? m.base : m.hi; g.fill(P);
  ink(g, d, true, Math.max(.7, s * .05), { seed, shade: .4 });
  g.strokeStyle = 'rgba(40,28,18,.7)'; g.lineWidth = Math.max(.5, s * .03); g.beginPath(); g.moveTo(-L * .55, 0); g.lineTo(L * .45, 0); g.stroke();
  g.restore();
}
// analytic leaf: spawned at t0 from (x0,y0), drifts down with flutter
function leafAt(t, L) {
  const a = t - L.t0; if (a < 0) return null;
  const x = L.x0 + L.vx * a + Math.sin(a * L.w + L.ph) * L.amp;
  const y = L.y0 + L.vy * a + Math.cos(a * L.w * 2 + L.ph) * L.amp * .25;
  return { x, y, rot: Math.sin(a * L.w + L.ph) * .9 + L.r0, flip: Math.cos(a * L.w * 1.3 + L.ph) };
}

// ---- ink-wash dust bloom ----
function puff(g, x, y, r, a, k, rot = 0, sq = 1) {
  if (a <= 0 || r <= 0) return;
  g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(1, sq); g.rotate(rot);
  const s = SPR.dust[k % 4]; g.drawImage(s, -r, -r, r * 2, r * 2); g.restore();
}
// bloom: expands fast then slows (easeOut), fades late
function bloom(g, x, y, t, t0, R, seed, a0 = .85) {
  const a = t - t0; if (a < 0 || a > 3.2) return;
  const r = rng(seed);
  for (let i = 0; i < 9; i++) {
    const ang = r() * 6.28, d = R * (.3 + r() * .8), grow = easeOut3(Math.min(1, a / (1.4 + r())));
    const px = x + Math.cos(ang) * d * grow * 1.4, py = y - Math.abs(Math.sin(ang)) * d * grow * .45 - a * R * .1;
    puff(g, px, py, R * (.3 + r() * .35) * (.4 + grow * .9), a0 * .6 * (1 - sstep(.7, 3.2, a)), Math.floor(r() * 4), r() * 6, .6);
  }
}

// ---- cloud curls (gongbi style) for shockwave and trail ----
function cloudCurl(g, x, y, r, a, seed, lineCol = 'rgba(176,128,60,A)') {
  if (a <= 0) return;
  const rr = rng(seed);
  g.save(); g.globalAlpha = a;
  g.drawImage(SPR.cloud[Math.floor(rr() * 4)], x - r, y - r * .75, r * 2, r * 1.5);
  g.restore();
  // scalloped gold contour with spiral heads
  const n = 4 + Math.floor(rr() * 3), pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, ax = x - r * .7 + t * r * 1.4, ay = y - Math.sin(t * Math.PI) * r * .42 + (rr() - .5) * r * .1;
    pts.push([ax, ay]);
  }
  g.save(); g.globalAlpha = a;
  ink(g, sampleCR(pts, false, 6), false, Math.max(1.2, r * .028), { col: lineCol.replace('A', '1'), shade: 0, seed });
  const sx = pts[0][0], sy = pts[0][1], dir = rr() < .5 ? 1 : -1, sp = [];
  for (let i = 0; i < 14; i++) { const a2 = i * .6 * dir + Math.PI, q = r * .16 * (1 - i / 16); sp.push([sx + r * .14 + Math.cos(a2) * q, sy + Math.sin(a2) * q]); }
  ink(g, sampleCR(sp, false, 4), false, Math.max(1, r * .022), { col: lineCol.replace('A', '1'), shade: 0, seed: seed + 3 });
  g.restore();
}

// ---- mist band: drifting wash sprites ----
function mistBand(g, y0, h, t, a, seed, n = 9, tint) {
  if (a <= 0) return;
  const r = rng(seed);
  g.save();
  for (let i = 0; i < n; i++) {
    const w = 500 + r() * 600, sp = 6 + r() * 10, x = ((r() * (W + w) + t * sp) % (W + w)) - w * .5, y = y0 + (r() - .5) * h;
    g.globalAlpha = a * (.4 + r() * .5);
    g.drawImage(SPR.mist[i % 3], x - w / 2, y - w * .18, w, w * .36);
  }
  g.restore();
}

// ---- light shafts (screen) ----
function rays(g, sx, sy, angs, len, a, col = '255,214,140') {
  if (a <= 0) return;
  g.save(); g.globalCompositeOperation = 'screen';
  for (const [an, wd, k] of angs) {
    const x1 = sx + Math.cos(an - wd) * len, y1 = sy + Math.sin(an - wd) * len, x2 = sx + Math.cos(an + wd) * len, y2 = sy + Math.sin(an + wd) * len;
    const gr = g.createLinearGradient(sx, sy, (x1 + x2) / 2, (y1 + y2) / 2);
    gr.addColorStop(0, `rgba(${col},${(a * k).toFixed(3)})`); gr.addColorStop(.6, `rgba(${col},${(a * k * .4).toFixed(3)})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(sx, sy); g.lineTo(x1, y1); g.lineTo(x2, y2); g.closePath(); g.fill();
  }
  g.restore();
}

// ---- flames for the wind-and-fire wheels: 4 drawings on twos ----
function flameTongue(g, base, dirA, len, wid, seed, k) {
  const r = rng(seed * 31 + k * 7);
  const c = Math.cos(dirA), s = Math.sin(dirA), P = (u, v) => [base[0] + c * u - s * v, base[1] + s * u + c * v];
  const curl = (r() - .5) * .5;
  const outer = [P(0, -wid), P(len * .35, -wid * (1.1 + r() * .3)), P(len * .7, -wid * .5 + curl * wid * 2), P(len * (1 + r() * .15), curl * wid * 3), P(len * .62, wid * .6 + curl * wid), P(len * .3, wid * (1 + r() * .3)), P(0, wid)];
  const d = sampleCR(outer, true, 4);
  g.fillStyle = '#c8392a'; g.fill(pathOf(d, true));
  const inner = [P(len * .02, -wid * .6), P(len * .35, -wid * .62), P(len * .66, curl * wid * 1.6), P(len * .35, wid * .6), P(len * .02, wid * .55)];
  g.fillStyle = '#f0a43a'; g.fill(pathOf(sampleCR(inner, true, 4), true));
  const core = [P(0, -wid * .3), P(len * .3, -wid * .2), P(len * .4, 0), P(len * .3, wid * .22), P(0, wid * .3)];
  g.fillStyle = '#fff1c4'; g.fill(pathOf(sampleCR(core, true, 3), true));
  ink(g, d, true, Math.max(1.2, wid * .07), { col: '#6e1d14', shade: .3, seed: seed + k });
}
function wheelFire(g, c, rad, amt, t12, dirA, spin, seed, jet = 0) {
  if (amt <= 0) return;
  const k = Math.floor(t12) % 4, n = 14;
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.283 + spin;
    const base = [c[0] + Math.cos(a) * rad * .95, c[1] + Math.sin(a) * rad * .95];
    // tongues stream away from motion: blend radial with the jet direction
    const radial = a, j = jet * .85;
    const dir = Math.atan2(Math.sin(radial) * (1 - j) + Math.sin(dirA) * j, Math.cos(radial) * (1 - j) + Math.cos(dirA) * j);
    const len = rad * (.35 + hash(i * 3.1 + k) * .35) * amt * (1 + jet * 1.4 * (.5 + .5 * Math.cos(a - dirA)));
    flameTongue(g, base, dir, len, rad * .12 * Math.sqrt(amt), seed + i, k);
  }
}

// ---- vermilion and gold trail ----
// pts: array of [x,y,age]; newest last
function trail(g, pts, w0, fade) {
  if (pts.length < 3) return;
  const n = pts.length;
  const ribbon = (wk, col, a) => {
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a0 = pts[Math.max(0, i - 1)], b0 = pts[Math.min(n - 1, i + 1)];
      let dx = b0[0] - a0[0], dy = b0[1] - a0[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const u = i / (n - 1);
      const w = w0 * wk * (.25 + .75 * Math.sin(Math.min(1, u * 1.15) * Math.PI * .5)) * (1 + .18 * Math.sin(i * .7 + pts[i][2] * 3)) * (1 - pts[i][2] * .08);
      L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
    }
    const d = L.concat(R.reverse());
    g.save(); g.globalAlpha = a; g.fillStyle = col; g.fill(pathOf(d, true)); g.restore();
    return d;
  };
  const A = 1 - fade;
  if (A <= 0) return;
  ribbon(1.9, 'rgba(240,196,110,.35)', A);
  const mid = ribbon(1, '#c6402b', A);
  ribbon(.42, '#f6cf6c', A);
  ribbon(.14, '#fff4d6', A);
  g.save(); g.globalAlpha = A * .8; ink(g, mid, true, Math.max(1, w0 * .07), { col: '#6a2416', shade: 0, seed: 5 }); g.restore();
}

// ---- grass tufts (ink stroke clusters) ----
function grassTuft(g, x, y, h, seed, sway, col = '#5e6b2c') {
  const r = rng(seed), n = 6 + Math.floor(r() * 6);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (r() - .5) * 1.3, l = h * (.5 + r() * .6), bend = (r() - .5) * .6 + sway;
    const p0 = [x + (r() - .5) * h * .3, y], p1 = [p0[0] + Math.cos(a) * l * .5, p0[1] + Math.sin(a) * l * .5], p2 = [p0[0] + Math.cos(a + bend) * l, p0[1] + Math.sin(a + bend) * l];
    ink(g, sampleCR([p0, p1, p2], false, 5), false, Math.max(1.2, h * .045), { col: i % 3 ? col : '#3d4a22', shade: 0, seed: seed + i });
  }
}
function glow(g, x, y, r, col, a) {
  if (a <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, col.replace('A', (a).toFixed(3)));
  gr.addColorStop(.35, col.replace('A', (a * .45).toFixed(3)));
  gr.addColorStop(1, col.replace('A', '0'));
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}

