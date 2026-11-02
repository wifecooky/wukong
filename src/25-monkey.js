// ---------- the Monkey King: a 2D bone rig, cel paint, follow-through chains ----------
const MK = {
  fur: { base: '#c99541', hi: '#e2b465', sh: '#8a5f2a' },
  face: { base: '#f4e2c2', hi: '#fff3dc', sh: '#c9a27a' },
  hand: { base: '#e6c08a', hi: '#f5d8a8', sh: '#b08a5a' },
  mask: { base: '#d24a36', hi: '#ec7650', sh: '#8f2a22' },
  gold: { base: '#dcae45', hi: '#f6d988', sh: '#9a6c2c' },
  shirt: { base: '#e7b53e', hi: '#f6d576', sh: '#a7742a' },
  trou: { base: '#b8382c', hi: '#d65a40', sh: '#7a2420' },
  kilt: { base: '#e3922f', hi: '#f4b85e', sh: '#a65a24' },
  boot: { base: '#2c2621', hi: '#544a40', sh: '#16120f' },
  sash: { base: '#c33a2c', hi: '#e2603f', sh: '#7f2420' },
  green: { base: '#3f8f70', hi: '#72b892', sh: '#245a4a' },
};
const up = (a, l = 1) => [Math.sin(a) * l, -Math.cos(a) * l];
const down = (a, l = 1) => [Math.sin(a) * l, Math.cos(a) * l];
const angLerp = (a, b, k) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

// pose parameters (radians); limbs: [far, near]
const POSE = {
  stand: { spine: .04, neck: 0, head: 0, sh: [-.15, .2], el: [.5, .4], hip: [-.12, .14], kn: [.06, -.04], tail: .9 },
  crouch: { spine: .55, neck: -.45, head: -.1, sh: [.5, .8], el: [.7, .9], hip: [1.3, 1.6], kn: [-2.2, -2.4], tail: .4 },
  leap: { spine: .25, neck: -.1, head: -.15, sh: [-1.1, 1.9], el: [.4, .25], hip: [.2, 1.3], kn: [-.3, -1.6], tail: .2 },
  tuck: { spine: .9, neck: -.3, head: -.2, sh: [1.2, 1.4], el: [1.6, 1.7], hip: [2.2, 2.4], kn: [-2.5, -2.6], tail: .1 },
  land: { spine: .35, neck: -.3, head: -.05, sh: [-.7, 1.3], el: [.4, .5], hip: [1.0, 1.5], kn: [-1.8, -2.1], tail: .6 },
  lookout: { spine: .08, neck: -.06, head: -.08, sh: [-.3, 2.6], el: [.3, 2.2], hip: [-.25, .35], kn: [.05, -.2], tail: 1.0,
    ik: [J => add(J.sh[0], [34, -6]), J => add(J.head, [32, -28])], bend: [1, 1], hand: [null, 1.8] },
  ride: { spine: .2, neck: -.05, head: -.05, sh: [-.2, 1.1], el: [.6, 1.3], hip: [.5, -.05], kn: [-1.0, -.1], tail: .5 },
};
function poseMix(a, b, k) {
  const o = {}, num = v => typeof v === 'number' || (Array.isArray(v) && v.every(x => typeof x === 'number'));
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key], y = b[key];
    o[key] = !num(x) || !num(y) ? (k < .5 ? x : y) : Array.isArray(x) ? x.map((v, i) => lerp(v, y[i], k)) : lerp(x, y, k);
  }
  return o;
}

// forward kinematics in figure units; pelvis at origin, facing +x, y down
const BONE = { chest: 74, neck: 10, head: 30, ua: 50, la: 46, th: 64, sn: 60 };
function fk(P) {
  const J = {}, sp = P.spine, B = BONE;
  J.pel = [0, 0];
  J.chest = up(sp, B.chest);
  J.neck = add(J.chest, up(sp + P.neck * .5, B.neck));
  J.head = add(J.neck, up(sp + P.neck, B.head));
  J.sh = [add(J.chest, up(sp - 1.4, 8)), add(J.chest, up(sp + 1.4, 8))];
  J.el = [], J.wr = [], J.hip = [[-7, -2], [8, 2]], J.kn = [], J.an = [];
  J.ua = [], J.la = [];
  for (let i = 0; i < 2; i++) {
    J.ua[i] = sp + P.sh[i]; J.la[i] = J.ua[i] + P.el[i];
    J.el[i] = add(J.sh[i], down(J.ua[i], B.ua)); J.wr[i] = add(J.el[i], down(J.la[i], B.la));
    const T = P.ik && P.ik[i] && (typeof P.ik[i] === 'function' ? P.ik[i](J) : P.ik[i]);
    if (T) ik2(J, i, T, P.bend ? P.bend[i] : 1);
    J.kn[i] = add(J.hip[i], down(P.hip[i], B.th)); J.an[i] = add(J.kn[i], down(P.hip[i] + P.kn[i], B.sn));
  }
  J.sn = [0, 1].map(i => P.hip[i] + P.kn[i]);
  J.ha = [0, 1].map(i => P.hand && P.hand[i] != null ? P.hand[i] : J.la[i]);
  return J;
}

// two-bone IK: put wrist i on target T; bend = +1 elbow down/out, -1 the other way
function ik2(J, i, T, bend) {
  const S = J.sh[i], a = BONE.ua, b = BONE.la, d = clamp(dist(S, T), Math.abs(a - b) + 1, a + b - .5);
  const base = ang(S, T), k = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const ea = base + k * bend;
  J.el[i] = add(S, [Math.cos(ea) * a, Math.sin(ea) * a]);
  J.wr[i] = add(S, mul(sub(T, S), d / (dist(S, T) || 1)));
  J.ua[i] = Math.atan2(J.el[i][0] - S[0], J.el[i][1] - S[1]);
  J.la[i] = Math.atan2(J.wr[i][0] - J.el[i][0], J.wr[i][1] - J.el[i][1]);
}
// a hanging chain (feather, scarf, tail): rest curve + wobble, dragged by the
// root's recent velocities (vh[0] = now, vh[k] = earlier) for follow-through
function chain(root, a0, n, L, curl, M, seed, o = {}) {
  const pts = [root]; let p = root;
  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) : 1, v = M.vh[Math.min(Math.round(u * (M.vh.length - 1)), M.vh.length - 1)];
    let a = a0 + curl * i + (o.wob || .12) * Math.sin(M.t * (o.w || 6) - i * .8 + seed) * (.3 + u);
    const sp = Math.hypot(v[0], v[1]);
    if (sp > 1) a = angLerp(a, Math.atan2(-v[0], v[1]), clamp(sp / (o.vk || 900), 0, .85) * (.25 + .75 * u));
    if (o.grav) a = angLerp(a, Math.PI, o.grav * u);
    p = add(p, up(a, L)); pts.push(p);
  }
  return pts;
}
// outline of a smooth tube along points with widths per point (round ends)
function tubePts(pts, ws, per = 5) {
  const d = sampleCR(pts, false, per), n = d.length, L = [], R = [];
  const wAt = u => { const x = u * (ws.length - 1), i = Math.min(Math.floor(x), ws.length - 2); return lerp(ws[i], ws[i + 1], x - i); };
  for (let i = 0; i < n; i++) {
    const a = d[Math.max(i - 1, 0)], b = d[Math.min(i + 1, n - 1)], an = Math.atan2(b[1] - a[1], b[0] - a[0]), w = wAt(i / (n - 1)) / 2;
    L.push([d[i][0] - Math.sin(an) * w, d[i][1] + Math.cos(an) * w]); R.push([d[i][0] + Math.sin(an) * w, d[i][1] - Math.cos(an) * w]);
  }
  const cap = (p, q, w) => { const an = ang(q, p); return [add(p, [Math.cos(an) * w * .5, Math.sin(an) * w * .5])]; };
  return L.concat(cap(d[n - 1], d[n - 2], ws[ws.length - 1]), R.reverse(), cap(d[0], d[1], ws[0]));
}
function fillInk(g, d, m, o = {}) {
  const P = pathOf(d, true);
  cel(g, P, m, o.sz || 10, o);
  if (o.lw !== 0) ink(g, d, true, o.lw || 2.2, { seed: o.seed || 5, col: o.col });
  return P;
}
// a tapering ribbon along points, optionally barred (pheasant feather)
function ribbon(g, pts, w0, w1, m, o = {}) {
  const d = sampleCR(pts, false, 4), n = d.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = d[Math.max(i - 1, 0)], b = d[Math.min(i + 1, n - 1)], an = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const u = i / (n - 1), w = lerp(w0, w1, u) * (o.belly ? 1 + .4 * Math.sin(u * Math.PI) : 1) / 2;
    L.push([d[i][0] - Math.sin(an) * w, d[i][1] + Math.cos(an) * w]); R.push([d[i][0] + Math.sin(an) * w, d[i][1] - Math.cos(an) * w]);
  }
  const poly = L.concat(R.slice().reverse()), P = pathOf(poly, true);
  g.fillStyle = m.base; g.fill(P);
  if (o.bars) {
    g.save(); g.clip(P); g.fillStyle = o.barCol;
    for (let i = 1; i < n - 1; i += o.bars * 2) {
      const j = Math.min(i + o.bars, n - 1);
      g.beginPath(); g.moveTo(L[i][0], L[i][1]); g.lineTo(L[j][0], L[j][1]); g.lineTo(R[j][0], R[j][1]); g.lineTo(R[i][0], R[i][1]); g.fill();
    }
    g.restore();
  }
  if (m.sh) { g.save(); g.clip(P); g.globalAlpha = .6; ink(g, R, false, (w0 + w1) * .2, { col: m.sh, shade: 0, taper: false }); g.restore(); }
  ink(g, poly, true, o.lw || 2, { col: o.col, shade: .5, seed: o.seed || 3 });
}

// ---- head: 3/4 facing +x, about 92 units tall ----
function mkHead(g, M) {
  const E = M.ex || {}, blink = E.blink || 0, lu = 2.4;
  // pheasant feathers sweep up and back from the crown
  for (let k = 0; k < 2; k++) {
    const pts = chain([-2 - k * 10, -50 + k * 2], .05 - k * .22, 12, 19, -.075 - k * .01, M, k * 2.1, { wob: .07, w: 3.5, vk: 1400 });
    ribbon(g, pts, 5.5, 1.6, { base: '#f1e6c8', sh: '#c2aa82' }, { bars: 2, barCol: '#4e3220', lw: 1.6, seed: 11 + k });
  }
  // far ear
  shape(g, ellipsePts(-36, 2, 10, 13, 12), MK.fur, { lw: lu, sz: 7 });
  shape(g, ellipsePts(-36, 3, 5, 7.5, 10), MK.hand, { lw: 0, shK: 0, hiK: 0 });
  // fur skull: round crown, three soft cheek tufts at the back and under the jaw
  shape(g, [[-4, -50], [22, -47], [40, -36], [46, -20], [44, 10], [36, 38], [22, 48], [6, 50], [-10, 48], [-20, 52], [-28, 44], [-40, 43], [-44, 32], [-52, 22], [-50, 8], [-48, -10], [-46, -30], [-30, -46]],
    MK.fur, { lw: lu * 1.1, sz: 22, seed: 21 });
  // bare face: brow to chin, the muzzle swelling forward under the nose
  shape(g, [[-10, -24], [4, -33], [24, -35], [42, -31], [51, -18], [52, -2], [55, 12], [58, 24], [54, 34], [42, 42], [26, 45], [10, 41], [-2, 32], [-10, 18], [-14, 0]], MK.face, { lw: lu * .85, sz: 12, shK: .4, seed: 23 });
  // red peach-heart over the eyes: dips between the brows, tip on the nose bridge
  shape(g, [[23, -24], [14, -33], [0, -32], [-9, -22], [-11, -6], [-6, 6], [8, 13], [22, 18], [31, 24], [39, 16], [49, 6], [52, -8], [49, -22], [40, -31], [30, -31]], MK.mask, { lw: 0, sz: 10, shK: .35, seed: 22 });
  // gold eye paint, no outline: reads as make-up, sweeping up at the outer corner
  const eyes = [[5, -9, 12, 7, 1], [37, -9, 8, 6.5, .8]];
  const alm = (x, y, rx, ry, k = 1) => [[x - rx * k, y + ry * .25 * k], [x - rx * .35 * k, y - ry * .85 * k], [x + rx * .55 * k, y - ry * 1.05 * k], [x + rx * 1.08 * k, y - ry * .75 * k], [x + rx * .6 * k, y + ry * .6 * k], [x - rx * .3 * k, y + ry * .75 * k]];
  for (const [x, y, rx, ry] of eyes) shape(g, [[x - rx * 1.45, y + ry * .5], [x - rx * .6, y - ry * 1.5], [x + rx * .7, y - ry * 1.75], [x + rx * 1.7, y - ry * 1.9], [x + rx * 1.3, y + ry * .2], [x + rx * .5, y + ry * 1.4], [x - rx * .6, y + ry * 1.3]], { base: '#f0c447', hi: '#fde596' }, { lw: 0, sz: 5, shK: .2, hiK: .6, seed: x });
  for (const [x, y, rx, ry, s] of eyes) {
    const d = sampleCR(alm(x, y, rx, ry), true, 5), P = pathOf(d, true);
    g.save(); g.clip(P);
    g.fillStyle = '#fbf4e2'; g.fill(P);
    const px = x + rx * .3 + (E.look ? E.look[0] * rx * .35 : 0), py = y - ry * .1 + (E.look ? E.look[1] * ry * .3 : 0);
    g.fillStyle = E.glow ? '#ffcf2e' : '#dca12a'; g.beginPath(); g.arc(px, py, ry * .82, 0, 7); g.fill();
    g.fillStyle = '#140c08'; g.beginPath(); g.arc(px + .6, py, ry * .4, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(px - ry * .3, py - ry * .32, ry * .16, 0, 7); g.fill();
    const lid = Math.max(blink, .08);
    g.fillStyle = '#f0c447'; g.fillRect(x - rx * 1.2, y - ry * 1.3, rx * 2.6, ry * 2.6 * lid);
    g.restore();
    // heavy upper lid line with a flick at the outer corner
    ink(g, sampleCR([[x - rx * 1.05, y + ry * .3], [x - rx * .35, y - ry * .9], [x + rx * .6, y - ry * 1.1], [x + rx * 1.15, y - ry * .8], [x + rx * 1.45, y - ry * 1.15]], false, 5), false, lu * 1.3 * s, { seed: x + 3 });
    ink(g, sampleCR([[x - rx * .5, y + ry * .75], [x + rx * .2, y + ry * .78], [x + rx * .7, y + ry * .55]], false, 4), false, lu * .5, { seed: x + 7 });
  }
  // brows: thick, sweeping up and out; anger pulls the inner ends down
  const br = (E.brow || 0) * 4;
  ink(g, sampleCR([[-14, -19], [-6, -26 + br * .3], [6, -29], [19, -24 + br]], false, 5), false, lu * 2, { seed: 31 });
  ink(g, sampleCR([[30, -23 + br], [39, -29], [50, -27]], false, 5), false, lu * 1.6, { seed: 32 });
  // muzzle crease, nostrils
  ink(g, sampleCR([[14, 24], [20, 33], [30, 38]], false, 4), false, lu * .55, { seed: 36 });
  g.fillStyle = INK.col;
  for (const [x, y] of [[44, 24], [50, 23]]) { g.beginPath(); g.ellipse(x, y, 2, 1.4, .3, 0, 7); g.fill(); }
  // mouth: a line with lifted corners; grin = a wide crescent of teeth; open = a round shout
  const mo = E.mouth === 'open' ? 1 : E.mouth === 'grin' ? .5 : 0;
  if (mo) {
    const mp = E.mouth === 'grin'
      ? [[24, 29], [38, 33], [54, 28], [52, 34], [44, 41], [34, 43], [27, 38]]
      : [[28, 32], [40, 32], [52, 30], [50, 38], [42, 45], [33, 44], [28, 38]];
    const d = sampleCR(mp, true, 4), P = pathOf(d, true);
    g.fillStyle = '#5a1712'; g.fill(P);
    g.save(); g.clip(P);
    g.fillStyle = '#c4473b'; g.beginPath(); g.ellipse(40, 46, 10, 5, 0, 0, 7); g.fill();
    g.fillStyle = '#f7f0e0'; g.beginPath(); g.moveTo(20, 24); g.lineTo(60, 24); g.lineTo(60, 32 + mo * 3); g.quadraticCurveTo(39, 38 + mo * 2, 20, 32); g.fill();
    g.restore();
    ink(g, d, true, lu * .75, { seed: 41 });
  } else ink(g, sampleCR([[25, 31], [30, 35], [40, 36], [50, 33], [54, 29]], false, 5), false, lu * .8, { seed: 41 });
  // golden crown band, ornament, red pompoms
  shape(g, [[-42, -26], [-18, -40], [12, -46], [36, -40], [46, -29], [40, -24], [12, -34], [-16, -30], [-40, -18]], MK.gold, { lw: lu * .8, sz: 5, seed: 51 });
  shape(g, [[6, -42], [9, -56], [14, -63], [19, -56], [22, -42]], MK.gold, { lw: lu * .7, sz: 4, seed: 52 });
  shape(g, ellipsePts(14, -40, 3.8, 3.4, 8), MK.mask, { lw: lu * .5, sz: 3 });
  for (const [x, y, r] of [[-4, -56, 7], [28, -52, 5.5]]) shape(g, ellipsePts(x + Math.sin(M.t * 7 + x) * 1.2, y, r, r, 10, 0, .25, x), MK.mask, { lw: lu * .7, sz: r * .6, seed: x + 60 });
  if (E.glow) for (const [x, y] of eyes) glow(g, x + 3, y, 30 * E.glow, 'rgba(255,214,90,A)', .85 * E.glow);
}

// ---- limbs and garments ----
function hand(g, w, a, r) {
  const f = (u, v) => add(w, add(down(a, u), down(a + Math.PI / 2, v)));
  shape(g, [f(-2, -r * .8), f(r * .9, -r * .95), f(r * 1.9, -r * .55), f(r * 2.1, r * .3), f(r * 1.4, r * .85), f(r * .9, r * 1.35), f(r * .4, r * 1.1), f(-2, r * .75)], MK.hand, { lw: 2, sz: 5, seed: w[0] });
  ink(g, sampleCR([f(r * .9, r * .5), f(r * 1.3, 0), f(r * 1.6, -r * .3)], false, 4), false, 1.2);
}
function boot(g, an) {
  const x = an[0], y = an[1];
  fillInk(g, sampleCR([[x - 11, y - 12], [x + 10, y - 11], [x + 16, y + 2], [x + 26, y + 6], [x + 34, y + 2], [x + 33, y + 12], [x + 6, y + 18], [x - 12, y + 15]], true, 4), MK.boot, { sz: 8, lw: 2.2, seed: x });
  ink(g, sampleCR([[x - 12, y + 12], [x + 8, y + 15], [x + 31, y + 10]], false, 4), false, 3.2, { col: '#efe4cc', shade: 0 });
}
function arm(g, J, i) {
  const s = J.sh[i], e = J.el[i], w = J.wr[i];
  fillInk(g, tubePts([s, e, w], [24, 19, 17]), MK.shirt, { seed: 70 + i });
  fillInk(g, tubePts([mixp(e, w, .74), w], [19, 19], 3), MK.sash, { seed: 74 + i, sz: 6 });
  hand(g, w, J.ha[i], 9);
}
function leg(g, J, i) {
  const h = J.hip[i], k = J.kn[i], a = J.an[i];
  fillInk(g, tubePts([h, mixp(h, k, .5), k, a], [30, 33, 26, 17]), MK.trou, { seed: 80 + i, sz: 12 });
  // wrapped shin binding
  const f = frame(k, a);
  for (let q = 0; q < 4; q++) ink(g, [f.p(.42 + q * .14, -9), f.p(.5 + q * .14, 9)], false, 1.5, { taper: false, seed: q + i * 9 });
  boot(g, a);
}
function torso(g, J, M) {
  const sp = M.P.spine, n = J.neck, ax = up(sp + Math.PI / 2, 1);
  const side = (p, k) => add(p, mul(ax, k));
  // shirt: broad shoulders tapering to the waist
  fillInk(g, sampleCR([side(J.pel, -20), side(mixp(J.pel, J.chest, .55), -21), side(J.chest, -22), side(n, -6), side(n, 8), side(J.chest, 22), side(mixp(J.pel, J.chest, .55), 22), side(J.pel, 20)], true, 4), MK.shirt, { sz: 14, lw: 2.4, seed: 90 });
  // red crossed collar
  ink(g, sampleCR([side(n, -8), mixp(n, J.pel, .3), side(mixp(n, J.pel, .58), 9)], false, 5), false, 6, { col: MK.sash.base, shade: 0, taper: false });
  ink(g, sampleCR([side(n, 9), side(mixp(n, J.pel, .35), 5)], false, 5), false, 1.8, {});
  // waist sash with knot tails
  const w0 = add(J.pel, up(sp, 20));
  fillInk(g, sampleCR([add(side(w0, -23), up(sp, 8)), add(side(w0, 23), up(sp, 8)), add(side(w0, 24), up(sp, -8)), add(side(w0, -23), up(sp, -8))], true, 3), MK.sash, { sz: 6, lw: 2, seed: 92 });
  ribbon(g, chain(side(w0, 8), Math.PI - .2, 4, 12, .04, M, 3, { grav: .5, vk: 700 }), 9, 6, MK.sash, { lw: 1.6 });
}
function kilt(g, J, M) {
  const sp = M.P.spine, ax = up(sp + Math.PI / 2, 1), side = (p, k) => add(p, mul(ax, k));
  // tiger-skin kilt over both thighs, its hem following the knees
  const hem = [], kn = J.kn.map(k => mixp(J.pel, k, .5)), lo = [add(side(J.pel, -30), [0, 40]), kn[0], kn[1], add(side(J.pel, 32), [4, 38])];
  lo.sort((p, q) => p[0] - q[0]);
  for (let q = 0; q <= 8; q++) { const u = q / 8, x = u * 3, j = Math.min(Math.floor(x), 2); hem.push(add(mixp(lo[j], lo[j + 1], x - j), [0, (q % 2) * 7])); }
  const P = fillInk(g, sampleCR([side(J.pel, -24), side(J.pel, 24)].concat(hem.reverse()), true, 3), MK.kilt, { sz: 10, lw: 2.2, seed: 93 });
  g.save(); g.clip(P);
  for (let q = 0; q < 6; q++) { const x = lo[0][0] + 6 + q * (lo[3][0] - lo[0][0]) / 6; ink(g, sampleCR([[x, 6], [x + 4, 20], [x - 2, 36]], false, 4), false, 4, { seed: 94 + q }); }
  g.restore();
}

// draw the whole monkey. M: {x,y,s,face,rot,P,ex,t,vh (world velocities, newest first),wind,staff}
function monkey(g, M) {
  const P = M.P, J = fk(P), f = M.face || 1, rot = M.rot || 0, cr = Math.cos(-rot), sr = Math.sin(-rot), wind = M.wind || [0, 0];
  // velocities into figure space (relative to the air)
  const L = { t: M.t, P, ex: M.ex, vh: (M.vh || [[0, 0]]).map(v => { const x = v[0] - wind[0], y = v[1] - wind[1]; return [(x * cr - y * sr) * f / M.s, (x * sr + y * cr) / M.s]; }) };
  g.save(); g.translate(M.x, M.y); g.rotate(rot); g.scale(f * M.s, M.s);
  // tail
  ribbon(g, chain([-16, 10], -1.2 - P.tail, 8, 17, .22, L, 9, { wob: .15, w: 3, vk: 1200 }), 10, 6, MK.fur, { lw: 2, belly: 1 });
  if (M.staffBack) M.staffBack(g, J);
  // green silk scarf: tails stream behind the back, knot at the throat
  for (let k = 0; k < 2; k++) ribbon(g, chain(add(J.neck, [-12, 8]), -2.1 - k * .35, 6, 16 - k * 2, -.08, L, 5 + k * 2, { wob: .3, w: 4 + k, grav: .2, vk: 500 }), 12, 6, MK.green, { lw: 1.7, seed: 7 + k });
  arm(g, J, 0); leg(g, J, 0); leg(g, J, 1);
  torso(g, J, L); kilt(g, J, L);
  fillInk(g, ellipsePts(J.neck[0] - 2, J.neck[1] + 6, 15, 8, 12, P.spine), MK.green, { sz: 5, lw: 2 });
  g.save(); g.translate(J.head[0], J.head[1]); g.rotate(P.spine + P.neck + P.head); g.scale(.9, .9); g.translate(4, -12);
  mkHead(g, L); g.restore();
  arm(g, J, 1);
  if (M.staff) M.staff(g, J);
  g.restore();
  return J;
}
// the head alone (pinned under the mountain)
function monkeyHead(g, x, y, s, rot, ex, t, vh, face = 1) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s * face, s);
  mkHead(g, { t, ex, vh: (vh || [[0, 0]]).map(v => [v[0] * face / s, v[1] / s]) });
  g.restore();
}
// the as-you-will gold-banded staff
function staff(g, a, b, w) {
  fillInk(g, tubePts([a, b], [w, w], 2), { base: '#3a2c22', hi: '#6a5440', sh: '#1d1612' }, { sz: 4, lw: 1.8 });
  for (const [u0, u1] of [[0, .13], [.87, 1]]) fillInk(g, tubePts([mixp(a, b, u0), mixp(a, b, u1)], [w * 1.2, w * 1.2], 2), MK.gold, { sz: 4, lw: 1.6 });
}
