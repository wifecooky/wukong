// ---------- painted backgrounds: 青绿山水 built stroke by stroke into offscreen layers ----------
const PAL = {
  ink: '#2b2118', qing: '#2c6b7c', qingL: '#5f97a0', lv: '#5f9878', lvL: '#9fc296', zhe: '#b07c4a', zheL: '#d8b07a',
};
const LAYERS = {};
// a layer holds world rect [x0,y0,w,h] painted at resolution r (px per world unit);
// calling it again with the same name stacks another pass on top; v: that pass drifts with the wind (units/s)
function layer(name, x0, y0, w, h, r, fn, v = 0) {
  const c = mk(Math.ceil(w * r), Math.ceil(h * r)), g = c.getContext('2d');
  g.scale(r, r); g.translate(-x0, -y0);
  fn(g);
  (LAYERS[name] ||= []).push({ c, x0, y0, w, h, r, v });
}
function bbox(d) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of d) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}
function inPoly(d, x, y) {
  let c = false;
  for (let i = 0, j = d.length - 1; i < d.length; j = i++) {
    const [xi, yi] = d[i], [xj, yj] = d[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function softDot(g, x, y, r, col, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, col.replace('A', a.toFixed(3))); gr.addColorStop(1, col.replace('A', '0'));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
// silk grain darkening whatever is already painted (never the empty parts of a layer)
function silk(g, x, y, w, h, a) {
  if (!SPR.grainA) {
    const src = SPR.grain, c = mk(src.width, src.height), gg = c.getContext('2d');
    const im = src.getContext('2d').getImageData(0, 0, src.width, src.height), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const k = clamp((248 - d[i]) / 110, 0, 1); d[i] = 70; d[i + 1] = 50; d[i + 2] = 30; d[i + 3] = k * 255; }
    gg.putImageData(im, 0, 0); SPR.grainA = c;
  }
  g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a;
  for (let yy = y; yy < y + h; yy += 360) for (let xx = x; xx < x + w; xx += 640) g.drawImage(SPR.grainA, xx, yy);
  g.restore();
}

// one mountain mass: mineral gradient, mottled washes, hemp-fibre texture strokes, moss dots, ink contour
function paintMount(g, pts, o) {
  const d = sampleCR(pts, true, o.per || 6), P = pathOf(d, true), b = bbox(d), r = rng(o.seed);
  const cols = o.cols || [PAL.qing, PAL.lv, PAL.zhe];
  g.save(); g.clip(P);
  const gr = g.createLinearGradient(0, b.y0, 0, b.y1);
  gr.addColorStop(0, cols[0]); gr.addColorStop(o.mid || .42, cols[1]); gr.addColorStop(1, cols[2]);
  g.fillStyle = gr; g.fillRect(b.x0 - 4, b.y0 - 4, b.w + 8, b.h + 8);
  // mottled mineral washes
  for (let i = 0; i < (o.blots || 40); i++) {
    const x = b.x0 + r() * b.w, y = b.y0 + r() * b.h, rr = (o.blotR || 60) * (.4 + r());
    softDot(g, x, y, rr, r() < .5 ? 'rgba(255,248,220,A)' : 'rgba(30,60,60,A)', .06 + r() * .08);
  }
  // shade side away from the light
  const lx = o.light || -1, sg = g.createLinearGradient(b.x0, 0, b.x1, 0);
  sg.addColorStop(lx < 0 ? 0 : 1, 'rgba(255,240,210,.18)'); sg.addColorStop(.55, 'rgba(0,0,0,0)'); sg.addColorStop(lx < 0 ? 1 : 0, 'rgba(20,40,50,.35)');
  g.fillStyle = sg; g.fillRect(b.x0, b.y0, b.w, b.h);
  // 披麻皴: long soft strokes following the slope
  const n = o.cun == null ? 160 : o.cun, L = o.cunL || 70, cw = o.cunW || 1.6;
  for (let i = 0; i < n; i++) {
    const x = b.x0 + r() * b.w, y = b.y0 + r() * b.h;
    if (!inPoly(d, x, y)) continue;
    const a0 = Math.PI / 2 + (o.cunA || 0) + (vnoise2(x * .004, y * .004) - .5) * 1.4, l = L * (.5 + r());
    const p = [[x, y]];
    for (let k = 1; k <= 3; k++) { const a = a0 + (r() - .5) * .5; p.push([p[k - 1][0] + Math.cos(a) * l / 3, p[k - 1][1] + Math.sin(a) * l / 3]); }
    g.globalAlpha = .18 + r() * .3;
    ink(g, sampleCR(p, false, 5), false, cw * (.6 + r() * .8), { col: o.cunCol || PAL.ink, shade: 0, seed: i + o.seed });
  }
  g.globalAlpha = 1;
  // 点苔: moss dots in clusters along ridges
  for (let i = 0; i < (o.moss || 30); i++) {
    const x = b.x0 + r() * b.w, y = b.y0 + r() * b.h * .8;
    if (!inPoly(d, x, y)) continue;
    for (let k = 0; k < 4 + r() * 6; k++) {
      g.fillStyle = r() < .7 ? 'rgba(30,48,34,.75)' : 'rgba(60,96,62,.8)';
      g.beginPath(); g.ellipse(x + (r() - .5) * 18, y + (r() - .5) * 8, 1.5 + r() * 2.5, 1 + r() * 1.6, r() * 3, 0, 7); g.fill();
    }
  }
  if (o.inner) o.inner(g, d, b, r);
  g.restore();
  if (o.lw !== 0) ink(g, d, true, o.lw || 3, { col: o.lineCol || PAL.ink, seed: o.seed, shade: 1.1 });
  return d;
}
// soft far range without contour
function farRange(g, y, amp, col, seed, x0 = -300, x1 = 2300, step = 40) {
  const p = [[x0, y + 600]];
  for (let x = x0; x <= x1; x += step) p.push([x, y - amp * fbm2(x * .0025 + seed, seed * 3.1, 4) * 1.6]);
  p.push([x1, y + 600]);
  const d = sampleCR(p, true, 3), P = pathOf(d, true);
  g.fillStyle = col; g.fill(P);
  return d;
}

// angular silhouettes: key points, each edge broken by midpoint displacement, corners eased once
function chaikin(p, it = 1) {
  for (let k = 0; k < it; k++) {
    const q = [], n = p.length;
    for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); }
    p = q;
  }
  return p;
}
function jag(a, b, depth, rough, r, out) {
  if (!depth) { out.push(b); return; }
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, off = (r() - .5) * 2 * rough * L;
  const m = [(a[0] + b[0]) / 2 - dy / L * off, (a[1] + b[1]) / 2 + dx / L * off];
  jag(a, m, depth - 1, rough * .7, r, out); jag(m, b, depth - 1, rough * .7, r, out);
}
function jagged(keys, r, depth = 2, rough = .12) {
  const out = [keys[0]];
  for (let i = 0; i < keys.length - 1; i++) jag(keys[i], keys[i + 1], depth, rough, r, out);
  return out;
}
// tall peak: steep cliffs, a blocky summit, a ledge step on the shade side
function fingerPeak(cx, base, top, w, seed, lean = 0) {
  const r = rng(seed), H = base - top, j = () => (r() - .5) * w * .08, L = u => lean * H * .12 * u;
  return jagged([
    [cx - w * .62, base], [cx - w * .52 + j(), base - H * .32], [cx - w * .4 + L(.6) + j(), base - H * .62], [cx - w * .3 + L(.9) + j(), top + H * .14],
    [cx - w * .16 + L(1), top + w * .06], [cx + L(1) + j(), top], [cx + w * .17 + L(1), top + w * .1],
    [cx + w * .26 + L(.95), top + H * .22], [cx + w * .4 + L(.85) + j(), top + H * .3 + j()], [cx + w * .44 + L(.6), base - H * .5], [cx + w * .55 + j(), base - H * .22], [cx + w * .64, base],
  ], r, 2, .1);
}
// a pine: twisting trunk, layered needle pads drawn as radiating fans
function pine(g, x, y, h, seed, o = {}) {
  const r = rng(seed), lean = o.lean || 0, far = o.far || 0;
  const trunk = [[x, y]];
  for (let k = 1; k <= 5; k++) trunk.push([x + lean * h * k / 5 + (r() - .5) * h * .08, y - h * k / 5]);
  const tw = h * .045;
  const L = [], R = [];
  trunk.forEach(([px, py], i) => { const w = tw * (1 - i / 6); L.push([px - w, py]); R.push([px + w, py]); });
  const td = sampleCR(L.concat(R.reverse()), true, 4);
  g.fillStyle = far ? o.col || '#3c4a40' : '#7a5236'; g.fill(pathOf(td, true));
  if (!far) {
    g.save(); g.clip(pathOf(td, true));
    for (let i = 0; i < 20; i++) { g.fillStyle = 'rgba(40,24,14,.45)'; g.beginPath(); g.ellipse(x + lean * h * (i / 20) + (r() - .5) * tw * 1.6, y - h * i / 20, tw * .5, tw * .2, 0, 0, 7); g.fill(); }
    g.restore();
    ink(g, td, true, Math.max(1, h * .008), { seed, shade: 1 });
  }
  const pads = o.pads || 6;
  for (let i = 0; i < pads; i++) {
    const u = .35 + .65 * i / (pads - 1), k = Math.min(4, Math.floor(u * 5)), p0 = mixp(trunk[k], trunk[Math.min(5, k + 1)], u * 5 - k);
    const side = i % 2 ? 1 : -1, reach = h * (.22 + r() * .18) * (1.1 - u * .5);
    const c = [p0[0] + side * reach, p0[1] - h * .02 * r()];
    if (!far) { ink(g, sampleCR([p0, mixp(p0, c, .5).map((v, j) => v - (j ? h * .03 : 0)), c], false, 5), false, Math.max(1, h * .012), { col: '#4a3222', seed: i }); }
    padFan(g, c[0], c[1], h * (.13 + r() * .05) * (1.15 - u * .3), seed * 7 + i, far, o.col);
  }
}
function padFan(g, x, y, s, seed, far, col) {
  const r = rng(seed), pad = [];
  for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI; pad.push([x + Math.cos(a) * s * (1.15 + (r() - .5) * .3), y + Math.sin(a) * s * (.42 + (r() - .5) * .14)]); }
  pad.push([x + s * .9, y + s * .2]); pad.push([x - s * .9, y + s * .22]);
  const d = sampleCR(pad, true, 4), P = pathOf(d, true);
  g.fillStyle = far ? col || '#33463c' : '#2a4636'; g.fill(P);
  if (far) return;
  g.save(); g.clip(P);
  softDot(g, x - s * .3, y - s * .25, s * .8, 'rgba(120,168,116,A)', .45);
  // needle fans: half wheels of fine strokes, each closed by a dark arc
  const nf = 3 + Math.floor(r() * 2);
  for (let f = 0; f < nf; f++) {
    const fx = x + (f - (nf - 1) / 2) * s * .55 + (r() - .5) * s * .1, fy = y + s * .18 + (r() - .5) * s * .08, R = s * (.42 + r() * .1);
    g.strokeStyle = 'rgba(150,190,130,.55)'; g.lineWidth = Math.max(.5, s * .018); g.beginPath();
    for (let k = 0; k <= 12; k++) { const a = Math.PI + k / 12 * Math.PI; g.moveTo(fx, fy); g.lineTo(fx + Math.cos(a) * R, fy + Math.sin(a) * R * .8); }
    g.stroke();
    g.strokeStyle = 'rgba(16,30,22,.8)'; g.lineWidth = Math.max(.6, s * .025); g.beginPath(); g.ellipse(fx, fy, R, R * .8, 0, Math.PI, Math.PI * 2); g.stroke();
  }
  g.restore();
  ink(g, d, true, Math.max(.8, s * .035), { col: '#18241b', seed, shade: .8 });
}

// gongbi cloud band: white wash body with a scalloped outline and curled heads
function cloudBand(g, x0, x1, y, h, seed, o = {}) {
  const r = rng(seed), top = [], n = Math.round((x1 - x0) / (o.lobe || 120));
  for (let i = 0; i <= n; i++) top.push([x0 + (x1 - x0) * i / n, y - h * (.3 + .7 * r()) * (i % 2 ? .7 : 1)]);
  const pts = [[x0, y + h], ...top, [x1, y + h]];
  const d = sampleCR(pts, true, 6), P = pathOf(d, true), b = bbox(d);
  g.save(); g.clip(P);
  const gr = g.createLinearGradient(0, b.y0, 0, b.y1);
  gr.addColorStop(0, o.top || '#fbf3e0'); gr.addColorStop(.5, o.mid || '#efe6d6'); gr.addColorStop(1, o.bot || 'rgba(214,214,206,0)');
  g.fillStyle = gr; g.fillRect(b.x0, b.y0, b.w, b.h);
  for (let i = 0; i < 30; i++) softDot(g, b.x0 + r() * b.w, b.y0 + r() * b.h * .6, 40 + r() * 70, 'rgba(160,170,190,A)', .08);
  g.restore();
  if (o.line !== false) {
    // scallop contour, top edge only, warm brown
    const edge = sampleCR(top, false, 8);
    g.globalAlpha = o.lineA || .8;
    ink(g, edge, false, o.lw || 1.8, { col: o.lineCol || '#9b7b55', shade: 0, seed });
    for (let i = 1; i < top.length - 1; i += 2) curl(g, top[i][0], top[i][1] + h * .18, h * .2, i % 4 ? 1 : -1, o.lineCol || '#9b7b55', o.lw || 1.8);
    g.globalAlpha = 1;
  }
  return d;
}
function curl(g, x, y, R, dir, col, lw) {
  const sp = [];
  for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + i * .55 * dir, q = R * (1 - i / 18); sp.push([x + Math.cos(a) * q, y + Math.sin(a) * q]); }
  ink(g, sampleCR(sp, false, 3), false, lw, { col, shade: 0, seed: x + y });
}

// earth: soft wash, dashes, moss, ink on the top edge only
function ground(g, top, y1, seed, o = {}) {
  const r = rng(seed), d = top.concat([[top[top.length - 1][0], y1], [top[0][0], y1]]), P = pathOf(d, true), b = bbox(d);
  const gr = g.createLinearGradient(0, b.y0, 0, b.y0 + 260);
  gr.addColorStop(0, o.c0 || '#8d9a5c'); gr.addColorStop(.35, o.c1 || '#a48d58'); gr.addColorStop(1, o.c2 || '#6f5a38');
  g.fillStyle = gr; g.fill(P);
  g.save(); g.clip(P);
  for (let i = 0; i < b.w / 40; i++) softDot(g, b.x0 + r() * b.w, b.y0 + r() * 260, 40 + r() * 90, r() < .5 ? 'rgba(255,240,200,A)' : 'rgba(40,50,30,A)', .06 + r() * .06);
  for (let i = 0; i < b.w / 6; i++) {
    const x = b.x0 + r() * b.w, y = b.y0 + r() * 300, l = 14 + r() * 26;
    if (!inPoly(d, x, y)) continue;
    g.globalAlpha = .12 + r() * .18;
    ink(g, [[x, y], [x + l * .5, y + 1 + r() * 2], [x + l, y + (r() - .5) * 3]], false, 1.2, { col: '#2a2a1c', shade: 0, seed: i });
  }
  g.globalAlpha = 1;
  g.restore();
  ink(g, sampleCR(top, false, 4), false, o.lw || 2.6, { col: '#221a12', seed, shade: 1, taper: true });
}
// rough stone block (boulders, ledges): cel planes + texture + ink
function rock(g, pts, seed, o = {}) {
  return paintMount(g, pts, Object.assign({ cols: ['#9fa38e', '#848a78', '#5e604f'], seed, cun: 40, cunL: 30, cunW: 1.2, moss: 6, blots: 12, blotR: 30, lw: 2.6, per: 3 }, o));
}
function rockPts(cx, cy, w, h, seed, flatBase = true) {
  const r = rng(seed), out = [], n = 9;
  for (let i = 0; i < n; i++) {
    const a = Math.PI + i / (n - 1) * Math.PI, j = .82 + r() * .3;
    out.push([cx + Math.cos(a) * w * j, cy + Math.sin(a) * h * j]);
  }
  if (flatBase) { out.push([cx + w, cy + h * .25]); out.push([cx - w, cy + h * .25]); }
  return out;
}

// ---------- 青绿 rock clumps: ochre ground, mineral blue/green cap, nested fold lines, moss on the brow ----------
const CAP = { qing: ['#245f78', '#3b8790'], lv: ['#3f7f62', '#6fa274'], pale: ['#5d8f98', '#8fb4a0'], dark: ['#1f4d5c', '#3b6e62'] };
function clumpPts(cx, by, w, h, seed) {
  const r = rng(seed), j = k => (r() - .5) * k;
  return jagged([
    [cx - w / 2, by], [cx - w * .46 + j(w * .06), by - h * (.45 + j(.2))], [cx - w * .3 + j(w * .08), by - h * (.86 + j(.1))],
    [cx - w * .08 + j(w * .1), by - h], [cx + w * .16 + j(w * .08), by - h * (.9 + j(.1))], [cx + w * .4 + j(w * .06), by - h * (.52 + j(.2))], [cx + w / 2, by],
  ], r, 2, .1);
}
// 石分三面: lit face, shade face split by a ridge, creases; mineral on the upper planes, ochre below
function paintClump(g, pts, seed, o = {}) {
  const d = chaikin(pts, 1), P = pathOf(d, true), b = bbox(d), r = rng(seed), lw = o.lw || 2.4, side = (o.light || -1) < 0 ? 1 : -1;
  let sm = d[0]; for (const p of d) if (p[1] < sm[1]) sm = p;
  const ridge = jagged([sm, [sm[0] + side * b.w * (.06 + r() * .1), sm[1] + b.h * .45], [sm[0] + side * b.w * (.12 + r() * .14), b.y1 + 4]], r, 3, .08);
  g.save(); g.clip(P);
  let gr = g.createLinearGradient(0, b.y0, 0, b.y1);
  gr.addColorStop(0, o.ochreT || '#c9a46a'); gr.addColorStop(1, o.ochreB || '#7f5434');
  g.fillStyle = gr; g.fillRect(b.x0 - 2, b.y0 - 2, b.w + 4, b.h + 4);
  const cap = o.cap || CAP[r() < .55 ? 'qing' : 'lv'], ck = o.capK == null ? .62 : o.capK;
  gr = g.createLinearGradient(0, b.y0, 0, b.y0 + b.h * ck);
  gr.addColorStop(0, cap[1]); gr.addColorStop(.4, cap[0]); gr.addColorStop(.75, cap[0] + 'aa'); gr.addColorStop(1, cap[0] + '00');
  g.fillStyle = gr; g.fillRect(b.x0 - 2, b.y0 - 2, b.w + 4, b.h * ck + 4);
  for (let i = 0; i < 6 + b.w * b.h / 9000; i++) softDot(g, b.x0 + r() * b.w, b.y0 + r() * b.h, b.w * (.08 + r() * .14), r() < .5 ? 'rgba(255,246,220,A)' : 'rgba(18,40,44,A)', .05 + r() * .07);
  // shade face beyond the ridge
  const far = side > 0 ? b.x1 + 20 : b.x0 - 20, sh = ridge.concat([[far, b.y1 + 20], [far, b.y0 - 20], [sm[0], b.y0 - 20]]);
  g.fillStyle = o.shadeCol || 'rgba(14,30,42,.3)'; g.fill(pathOf(sh, true));
  gr = g.createLinearGradient(sm[0], 0, sm[0] - side * b.w * .5, 0);
  gr.addColorStop(0, 'rgba(255,240,205,0)'); gr.addColorStop(1, 'rgba(255,240,205,.14)');
  g.fillStyle = gr; g.fillRect(b.x0, b.y0, b.w, b.h);
  // creases: from the ridge or the shoulders, down and outward, each with a shadow wedge on its far side
  const creases = [];
  for (let k = 0; k < (o.folds == null ? 3 : o.folds) + 1; k++) {
    const fromR = k % 2 === 0, s0 = fromR ? ridge[Math.floor(ridge.length * (.15 + r() * .5))] : d[Math.floor(d.length * (.12 + r() * .76))];
    const dir = fromR ? -side * (r() < .7 ? 1 : -1) : (s0[0] < sm[0] ? -1 : 1);
    const l = b.h * (.18 + r() * .3), e = [s0[0] + dir * l * (.25 + r() * .3), s0[1] + l];
    const c = jagged([[s0[0] + (fromR ? 0 : (sm[0] - s0[0]) * .1), s0[1] + (fromR ? 0 : 6)], e], r, 3, .1);
    creases.push(c);
    const off = c.map(([x, y]) => [x + dir * b.w * .05, y + b.h * .02]).reverse();
    g.fillStyle = 'rgba(14,30,40,.16)'; g.fill(pathOf(c.concat(off), true));
  }
  // 披麻 texture radiating down from the summit, thicker in the shade
  for (let i = 0; i < (o.cun == null ? b.w * b.h / 2200 : o.cun); i++) {
    const x = b.x0 + r() * b.w, y = b.y0 + b.h * (.08 + r() * .85);
    if (!inPoly(d, x, y)) continue;
    const a0 = clamp(Math.atan2(y - sm[1], x - sm[0]), Math.PI * .3, Math.PI * .7), l = b.h * (.06 + r() * .12), shd = (x - sm[0]) * side > 0;
    g.globalAlpha = (shd ? .22 : .12) + r() * .2;
    ink(g, sampleCR([[x, y], [x + Math.cos(a0) * l * .5 + (r() - .5) * 4, y + Math.sin(a0) * l * .5], [x + Math.cos(a0) * l, y + Math.sin(a0) * l]], false, 4), false, lw * .42, { col: '#2a2a20', shade: 0, seed: i + seed });
  }
  g.globalAlpha = .75;
  ink(g, ridge.slice(0, Math.floor(ridge.length * (.55 + r() * .3))), false, lw * .6, { col: o.foldCol || '#1d3836', shade: 0, seed, taper: true });
  for (const c of creases) ink(g, c, false, lw * .5, { col: o.foldCol || '#1d3836', shade: 0, seed: c[0][0], taper: true });
  g.globalAlpha = 1;
  // 点苔 along the brow and the ridge crest
  const n = d.length, spots = [];
  for (let i = 0; i < (o.moss == null ? 3 + b.w / 70 : o.moss); i++) {
    const p = r() < .7 ? d[Math.floor(n * (.15 + r() * .7))] : ridge[Math.floor(ridge.length * r() * .5)];
    if (p[1] > b.y0 + b.h * .7) continue;
    spots.push([p[0] + (sm[0] - p[0]) * .04, p[1] + 3 + r() * 5]);
  }
  for (const [x, y] of spots) for (let k = 0; k < 3 + r() * 5; k++) {
    g.fillStyle = r() < .75 ? 'rgba(22,34,26,.85)' : 'rgba(54,90,58,.9)';
    g.beginPath(); g.ellipse(x + (r() - .5) * Math.min(40, b.w * .07), y + (r() - .5) * 6, 1.6 + r() * 2.2, 1.2 + r() * 1.2, (r() - .5) * .6, 0, 7); g.fill();
  }
  if (o.inner) o.inner(g, d, b, r);
  g.restore();
  if (o.lw !== 0) ink(g, d, true, lw, { col: o.lineCol || '#221a12', seed, shade: 1.2 });
  return d;
}
// a peak: one tall body, then a few overlapping clumps folded over its lower slopes
function massif(g, cx, base, top, w, seed, o = {}) {
  const r = rng(seed), Hh = base - top, lean = o.lean || 0;
  const body = fingerPeak(cx, base, top, w, seed, lean);
  paintClump(g, body, seed * 17, Object.assign({ capK: .55, folds: 4 }, o, o.cap ? {} : { cap: CAP.qing }));
  const n = o.n == null ? 2 : o.n;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, cw = w * (.6 + r() * .4), ch = Math.min(Hh * (.16 + r() * .12), cw * .8);
    const x = cx + side * w * (.3 + r() * .35), y = base + ch * .1;
    paintClump(g, clumpPts(x, y, cw, ch, seed * 31 + i), seed * 13 + i, Object.assign({ capK: .5, folds: 2 }, o, { cap: r() < .5 ? CAP.lv : CAP.qing }));
  }
}
function rock(g, pts, seed, o = {}) { return paintClump(g, pts, seed, Object.assign({ folds: 2, capK: .5 }, o)); }

// ---------- 祥云 cloud heads: scalloped upper envelope of lobes, double contour, curls ----------
function cloudHead(g, x, y, s, seed, o = {}) {
  const r = rng(seed), nl = o.lobes || 4 + Math.floor(r() * 3), lobes = [];
  for (let i = 0; i < nl; i++) {
    const u = i / (nl - 1) * 2 - 1, R = s * (.36 + .18 * (1 - Math.abs(u)) + r() * .1);
    lobes.push([x + u * s * .95, y - s * .18 * (1 - u * u) - R * .2 + (r() - .5) * s * .1, R]);
  }
  const x0 = x - s * 1.35, x1 = x + s * 1.35, top = [];
  for (let px = x0; px <= x1; px += 3) {
    let yy = Infinity;
    for (const [lx, ly, R] of lobes) { const dx = px - lx; if (Math.abs(dx) < R) yy = Math.min(yy, ly - Math.sqrt(R * R - dx * dx)); }
    if (yy < Infinity) top.push([px, yy]);
  }
  if (top.length < 3) return;
  const yb = y + s * (o.depth || (o.fade ? .6 : .35)), xa = top[0][0], xz = top[top.length - 1][0], tk = o.fade ? s * .45 : 0;
  const d = top.concat([[xz - tk * .5, yb - s * .2], [xz - tk, yb], [xa + tk, yb], [xa + tk * .5, yb - s * .2]]), P = pathOf(d, true), b = bbox(d);
  const gr = g.createLinearGradient(0, b.y0, 0, yb);
  gr.addColorStop(0, o.top || '#fffaf0');
  if (o.fade) { gr.addColorStop(.35, 'rgba(244,238,226,.95)'); gr.addColorStop(.62, 'rgba(240,234,222,.35)'); gr.addColorStop(1, 'rgba(236,232,224,0)'); }
  else { gr.addColorStop(.55, o.mid || '#efe9df'); gr.addColorStop(1, o.bot || '#c9cdd2'); }
  g.fillStyle = gr; g.fill(P);
  // lobe undersides: a cool shadow under each scallop
  g.save(); g.clip(P);
  if (o.fade) { g.beginPath(); g.rect(x0, b.y0, x1 - x0, (yb - b.y0) * .4); g.clip(); }
  for (const [lx, ly, R] of lobes) softDot(g, lx, ly + R * .75, R * .9, o.shade || 'rgba(150,160,180,A)', .28);
  g.restore();
  const lc = o.lineCol || '#8d7558', lw = o.lw || Math.max(1.2, s * .025);
  g.globalAlpha = o.lineA == null ? .9 : o.lineA;
  ink(g, top, false, lw, { col: lc, shade: 0, seed, taper: true });
  for (const [lx, ly, R] of lobes) {
    // inner echo arc and a curl in the bigger lobes
    const arc = []; for (let a = -2.5; a <= -.6; a += .12) arc.push([lx + Math.cos(a) * R * .72, ly + Math.sin(a) * R * .72]);
    ink(g, arc, false, lw * .7, { col: lc, shade: 0, seed: lx });
    if (R > s * .45 && o.curls !== false) curl(g, lx + R * .05, ly + R * .05, R * .38, (lx > x) ? 1 : -1, lc, lw * .75);
  }
  g.globalAlpha = 1;
}
// a sea of cloud heads in rows, back to front
function cloudSea(g, x0, x1, y0, y1, seed, o = {}) {
  const r = rng(seed), rows = o.rows || 4;
  for (let j = 0; j < rows; j++) {
    const v = j / (rows - 1), y = lerp(y0, y1, v), s = (o.s0 || 60) + v * ((o.s1 || 140) - (o.s0 || 60)), step = s * 2.1;
    for (let x = x0 - r() * step; x < x1 + step; x += step * (.75 + r() * .4))
      cloudHead(g, x, y + (r() - .5) * s * .3, s * (.85 + r() * .3), seed * 100 + j * 37 + x, o);
    if (o.fill) { const gr = g.createLinearGradient(0, y + s * .2, 0, y + s * .2 + 200); gr.addColorStop(0, o.fill); gr.addColorStop(1, o.fill); g.fillStyle = gr; g.fillRect(x0 - 400, y + s * .3, x1 - x0 + 800, 600); }
  }
}
