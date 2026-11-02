// ---------- shots: camera over painted layers, characters, light, timeline ----------
// the edit: shots and sound are timed in story seconds; each [from, length] span is cut out of the film
const CUTS = [[20.45, 2.4]]; // one bar of the burst: the empty mountain after he's gone, the slow start of the flight
const DUR = CUTS.reduce((d, c) => d - c[1], 45), BARS = 132;
const toStory = t => CUTS.reduce((s, [a, d]) => s >= a ? s + d : s, t);
// story → film seconds; a cue inside a cut lands at -Infinity, so past() drops it
function toFilm(s) {
  let o = s;
  for (const [a, d] of CUTS) { if (s >= a + d) o -= d; else if (s >= a) return -Infinity; }
  return o;
}
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const stepT = (t, f) => Math.floor(t * f + 1e-4) / f;
const mv = (t, t0, t1, f = easeIO) => f(lin(t0, t1, stepT(t, 24)));

// camera: x,y = world point at screen centre, z = zoom; layers move by parallax k
const camK = (c, k) => ({ x: W / 2 + (c.x - W / 2) * k, y: H / 2 + (c.y - H / 2) * k, z: 1 + (c.z - 1) * k });
const camLerp = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u) });
function withCam(g, c, k = 1) {
  const q = camK(c, k);
  g.setTransform(q.z, 0, 0, q.z, W / 2 - q.x * q.z + (c.sx || 0), H / 2 - q.y * q.z + (c.sy || 0));
}
// seconds from the middle of the current shot: drifting passes sit at rest mid-shot, so they never run off their edges
let WIND_T = 0;
function drawLayer(name, c, k = 1) {
  ctx.save(); withCam(ctx, c, k); ctx.imageSmoothingQuality = 'high';
  for (const L of LAYERS[name]) ctx.drawImage(L.c, L.x0 + L.v * WIND_T, L.y0, L.w, L.h);
  ctx.restore();
}
const toScr = (c, p, k = 1) => { const q = camK(c, k); return [(p[0] - q.x) * q.z + W / 2 + (c.sx || 0), (p[1] - q.y) * q.z + H / 2 + (c.sy || 0)]; };

// film grade: warm paper tone, vignette, letterbox
function grade() {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95);
  v.addColorStop(0, 'rgba(60,40,20,0)'); v.addColorStop(1, 'rgba(50,32,18,.32)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, BARS); ctx.fillRect(0, H - BARS, W, BARS);
  ctx.restore();
}

// ---- sets: layer name, parallax factor ----
const SETS = {
  range: ['r_sky', .3, 'r_far', .5, 'r_peaks', .8, 'r_sea', .9, 'r_fg', 1.2],
  foot: ['f_back', 1, 'f_front', 1],
  footC: ['f_backC', 1, 'f_frontC', 1],
  peak: ['p_all', 1],
  ledge: ['l_sky', .3, 'l_far', .6, 'l_crag', 1],
};
function drawSet(name, c) { const s = SETS[name]; for (let i = 0; i < s.length; i += 2) drawLayer(s[i], c, s[i + 1]); }

// ---- timeline helpers ----
const T12 = t => stepT(t, 12);
function onCam(c, k, fn) { ctx.save(); withCam(ctx, c, k); fn(ctx); ctx.restore(); }
// camera shake, new offset every 24fps frame
function shake(c, t, amp) {
  const f = Math.floor(t * 24 + 1e-4);
  return Object.assign({}, c, { sx: (hash(f * 1.37) - .5) * 2 * amp, sy: (hash(f * 2.91 + 5) - .5) * 2 * amp });
}
// velocities of a moving point, newest first (drives the follow-through chains)
function vhOf(pos, t, n = 6) {
  const dt = 1 / 12, o = [];
  for (let k = 0; k < n; k++) { const a = pos(t - k * dt), b = pos(t - (k + 1) * dt); o.push([(a[0] - b[0]) / dt, (a[1] - b[1]) / dt]); }
  return o;
}
function birds(c, t, k, starts, vx, s) {
  const tt = T12(t);
  onCam(c, k, g => starts.forEach(([x, y], i) => inkBird(g, x + tt * vx, y + Math.sin(tt * 1.3 + i) * 10, s * (1 - i * .15), Math.floor(tt * 6 + i * 1.7) % 4, 1, '#3a302a')));
}
// gold light leaking through cracks
function cracks(g, lines, a, w) {
  if (a <= 0) return;
  for (const L of lines) {
    g.save(); g.globalAlpha = a; g.shadowColor = 'rgba(255,190,80,.9)'; g.shadowBlur = w * 5;
    ink(g, L, false, w, { col: '#ffe6a0', shade: 0, seed: L[0][0] }); g.restore();
  }
}

// S1 0–6: the five-finger mountain at dawn
function s1(t) {
  const c = camLerp({ x: 960, y: 600, z: 1 }, { x: 1060, y: 640, z: 1.15 }, mv(t, 0, 6));
  drawLayer('r_sky', c, .3); drawLayer('r_far', c, .5);
  mistBand(ctx, 700, 140, t, .35, 3);
  drawLayer('r_peaks', c, .8);
  birds(c, t, .6, [[180, 430], [250, 465], [120, 500]], 70, 14);
  drawLayer('r_sea', c, .9); mistBand(ctx, 930, 120, t * 1.4, .4, 8);
  drawLayer('r_fg', c, 1.2);
}

// S2 6–11.5: under the mountain, asleep; a leaf lands on his nose; the eyes open
const LEAF = { a: [1190, 300], b: [982, 680] };
// the painted head in the crack, pinned by the nose so the leaf lands on it whatever the face;
// each change of face snaps with a small squash
const HEAD = { at: [640, 598], xy: [985, 676], s: 1.05, eyes: [[465, 480], [600, 475]] };
function crackHead(g, keys, tt, rot) {
  let q = keys[0]; for (const r of keys) if (tt >= r[0]) q = r;
  const a = tt - q[0];
  artPose(g, q[1], HEAD.xy[0], HEAD.xy[1], { at: HEAD.at, s: HEAD.s, rot, sq: .06 * Math.cos(a * 22) * Math.exp(-a * 9) + .008 * Math.sin(tt * 3) });
}
// a sprite px of the crack head in world space
const headXY = (px, py, rot) => {
  const k = ART_S * HEAD.s, dx = (px - HEAD.at[0]) * k, dy = (py - HEAD.at[1]) * k, c = Math.cos(rot), s = Math.sin(rot);
  return [HEAD.xy[0] + dx * c - dy * s, HEAD.xy[1] + dx * s + dy * c];
};
function s2(t) {
  const tt = T12(t), c = camLerp({ x: 960, y: 560, z: 1 }, { x: 905, y: 615, z: 1.22 }, mv(t, 6, 11.5));
  drawLayer('f_back', c);
  onCam(c, 1, g => {
    crackHead(g, [[6, 'head_sleep'], [9.7, 'head_wake'], [10.45, 'head_puff'], [10.9, 'head_alert']], tt, 0);
    const a = tt - 6.2, D = 3.2;
    if (a <= 0) return;
    let x, y, rot, flip;
    if (a < D) { const u = a / D; x = lerp(LEAF.a[0], LEAF.b[0], u) + Math.sin(a * 2.4) * 70 * (1 - u); y = lerp(LEAF.a[1], LEAF.b[1], u); rot = Math.sin(a * 2.4) * .9 + .4; flip = Math.cos(a * 3.1); }
    else if (tt < 10.5) { [x, y] = LEAF.b; rot = .45; flip = .45; }
    else { const q = tt - 10.5; x = LEAF.b[0] + q * 420; y = LEAF.b[1] - q * 560 + q * q * 140; rot = .45 + q * 9; flip = Math.cos(q * 11); }
    leaf(g, x, y, 34, rot, flip, 0, 9);
  });
  drawLayer('f_front', c);
}

// S3 11.5–15: close: the eyes burn gold, he grins, the rock starts to give
function s3(t) {
  const tt = T12(t), base = camLerp({ x: 890, y: 640, z: 2.3 }, { x: 900, y: 650, z: 2.45 }, mv(t, 11.5, 15));
  const c = shake(base, t, 7 * sstep(12.9, 14.6, t));
  drawLayer('f_backC', c);
  const strain = sstep(12.9, 13.2, tt), jit = strain * (hash(Math.floor(tt * 12) * 3.3) - .5) * .06;
  onCam(c, 1, g => {
    crackHead(g, [[11.5, 'head_alert'], [12.3, 'head_sly'], [12.9, 'head_fierce']], tt, jit);
    const lit = sstep(11.9, 12.5, tt);
    for (const [px, py] of HEAD.eyes) { const e = headXY(px, py, jit); glow(g, e[0], e[1], 50, 'rgba(255,190,50,A)', .5 * lit); glow(g, e[0], e[1], 16, 'rgba(255,245,200,A)', .8 * lit); }
    const r = rng(77);
    for (let i = 0; i < 16; i++) {
      const t0 = 12.9 + r() * 1.8, a = tt - t0, x = 720 + r() * 380, y0 = 566 + Math.abs(x - 960) * .1, rs = r();
      if (a < 0 || a > 1.2) continue;
      const y = y0 + a * a * 520;
      puff(g, x, y, 10 + rs * 10 + a * 14, .5 * (1 - a / 1.2), i, 0, .7);
      chunk(g, x + 4, y + 4, 2.4 + rs * 2.2, a * 8, i + 1);
    }
  });
  drawLayer('f_frontC', c);
  onCam(c, 1, g => cracks(g, [[[700, 606], [735, 590], [752, 596], [790, 568]], [[1120, 572], [1160, 590], [1178, 584], [1215, 618]], [[905, 556], [930, 549], [948, 556]]], sstep(13.8, 14.6, tt), 3.6));
}

// S4 15–18: the seal on the summit trembles, peels and flies off
function s4(t) {
  const tt = T12(t), base = camLerp({ x: 960, y: 560, z: 1 }, { x: 960, y: 520, z: 1.22 }, mv(t, 15, 18));
  const c = shake(base, t, 2 + 8 * sstep(15.5, 17, t));
  drawLayer('p_all', c);
  const lit = sstep(16.6, 17.4, tt);
  onCam(c, 1, g => {
    cracks(g, [[[960, 600], [930, 650], [948, 700], [910, 760]], [[985, 610], [1030, 660], [1020, 720]], [[940, 590], [880, 610], [840, 600]]], sstep(15.6, 16.4, tt), 2.4);
    glow(g, SEAL.x, SEAL.y + 60, 280 * lit + 1, 'rgba(255,210,110,A)', .9 * lit);
    const fly = tt - 16.9;
    if (fly < 0) {
      const tr = sstep(15.2, 15.8, tt), jit = (hash(Math.floor(tt * 12) * 7.7) - .5) * .05 * tr;
      talisman(g, SEAL.x, SEAL.y + 40, 1.25, jit, .05 * tr, tt * 9, sstep(16.0, 16.85, tt));
    } else talisman(g, SEAL.x + fly * 420 + Math.sin(fly * 5) * 40, SEAL.y + 40 - fly * 560, 1.25 * (1 - fly * .3), fly * 2.4, .6, tt * 9, 1 - sstep(0, .4, fly));
  });
  if (lit > 0) { const S = toScr(c, [SEAL.x, SEAL.y + 40]); rays(ctx, S[0], S[1], [[-1.57, .05, 1], [-1.2, .04, .8], [-1.95, .04, .8], [-.9, .03, .6], [-2.25, .03, .6]], 1300, .55 * lit); }
}

// S5 18–20.45: the mountain bursts; a streak of gold shoots out
const BURST = [1110, 880];
const s5path = t => { const a = Math.max(0, t - 18.55); return [BURST[0] + a * 560 + Math.sin(a * 3) * 60, BURST[1] - 40 - a * 1150 + a * a * 330]; };
function s5(t) {
  const tt = T12(t), base = camLerp({ x: 1110, y: 640, z: 1.12 }, { x: 1100, y: 600, z: 1.04 }, mv(t, 18, 20.45));
  const c = shake(base, t, 22 * sstep(18.05, 18.2, t) * (1 - sstep(18.3, 20.4, t)));
  drawLayer('r_sky', c, .3); drawLayer('r_far', c, .5);
  const e = sstep(18.05, 18.4, tt) * (1 - sstep(19.2, 20.4, tt)), S = toScr(c, [BURST[0], BURST[1] - 40], .8);
  rays(ctx, S[0], S[1], [[-1.57, .06, 1], [-1.25, .05, .8], [-1.9, .05, .8], [-.95, .04, .6], [-2.2, .04, .6], [-.65, .03, .4], [-2.5, .03, .4]], 1500, .7 * e);
  drawLayer('r_peaks', c, .8);
  onCam(c, .8, g => {
    glow(g, BURST[0], BURST[1] - 40, 420 * (.4 + .6 * e), 'rgba(255,214,120,A)', .9 * e);
    bloom(g, BURST[0], BURST[1], tt, 18.25, 200, 31, .9);
    bloom(g, BURST[0] - 130, BURST[1] + 30, tt, 18.4, 150, 32, .8);
    debris(g, tt, 18.25, [BURST[0], BURST[1] - 60], 26, 1100, 41, 20);
    if (tt >= 18.6) {
      for (let q = 18.6; q < tt - .05; q += .12) { const p = s5path(q), a = tt - q; cloudCurl(g, p[0] - 10, p[1] + 20, 34 + a * 40, .85 * (1 - sstep(.4, 1.4, a)), 90 + Math.round(q * 10)); }
      const pts = []; for (let k = 4; k >= 0; k--) { const q = tt - k / 24; if (q >= 18.55) { const p = s5path(q); pts.push([p[0], p[1], k / 4]); } }
      trail(g, pts, 12, 0);
      const p = s5path(tt); if (p[1] > -300) artPose(g, 'tuck', p[0], p[1], { c: 1, s: .5, rot: (tt - 18.55) * 14 });
    }
  });
  drawLayer('r_sea', c, .9); drawLayer('r_fg', c, 1.2);
  const fl = 1 - sstep(18.0, 18.2, t);
  if (fl > 0) { ctx.fillStyle = `rgba(255,240,205,${(fl * .9).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
}

// S6 22.85–25: somersaulting across the open sky
const s6path = t => { const a = t - 22.85; return [-260 + a * 1140, 780 - Math.sin(clamp(a / 2.1, 0, 1) * Math.PI) * 430 - a * 65]; };
function s6(t) {
  const tt = T12(t), pc = s6path(stepT(t, 24)), p0 = s6path(tt);
  const c = { x: 960 + (pc[0] - 960) * .12, y: 540 + (pc[1] - 540) * .1, z: 1 };
  drawLayer('l_sky', c, .3); mistBand(ctx, 620, 160, t * 3, .3, 21);
  drawLayer('l_far', c, .6);
  onCam(c, 1, g => {
    for (let i = 0; i < 7; i++) { const ti = 22.95 + i * .26, a = tt - ti; if (a < 0) continue; const p = s6path(ti); cloudCurl(g, p[0] - 20, p[1] + 30, 60 + a * 50, .9 * (1 - sstep(.3, 1.6, a)), 50 + i); }
    const pts = []; for (let k = 12; k >= 0; k--) { const q = tt - k / 24; if (q >= 22.85) { const p = s6path(q); pts.push([p[0], p[1], k / 12]); } }
    trail(g, pts, 22, 0);
    // stretched out along the flight, two tucked somersaults, stretched again; each switch snaps with a squash
    const a = tt - 22.85, v = vhOf(s6path, tt, 1)[0], dir = Math.atan2(v[1], v[0]);
    const spin = easeIO(clamp((a - .3) / 1.5, 0, 1)), tuck = a >= .3 && a < 1.8;
    const sw = a < .3 ? a : tuck ? a - .3 : a - 1.8;
    artPose(g, tuck ? 'tuck' : 'dive', p0[0], p0[1], { c: 1, s: 1.25, rot: dir + spin * Math.PI * 4, sq: (tuck ? .15 : -.1) * Math.cos(sw * 22) * Math.exp(-sw * 9) });
  });
}

// S7 25–30.5: lands on the crag, plucks the needle from behind his ear, it grows into the staff.
// Painted key poses held on twos and snapped between; each snap lands with a squash that settles.
const LAND = [800, 748];
const S7P = [[25.45, 'land', .2], [26.5, 'stand', -.06], [27.4, 'reach', .05], [28.25, 'present', -.08], [30.3, 'plant', .12]];
function s7staff(g, tt, x, y) {
  if (tt < 28.25 || tt >= 30.3) return;
  const h = artAt('fist', x, y), u = easeOut3(clamp((tt - 28.3) / .5, 0, 1)), L = lerp(14, 420, u), w = lerp(2.4, 9, u);
  let th = Math.PI / 2;
  if (tt >= 28.9) th += easeIO(clamp((tt - 28.9) / 1.0, 0, 1)) * Math.PI * 5;
  const seg = a => { const d = [Math.cos(a) * L / 2, Math.sin(a) * L / 2]; return [sub(h, d), add(h, d)]; };
  if (tt >= 28.9 && tt < 29.9) for (const k of [2, 1]) { g.globalAlpha = .18 * (3 - k); const [a, b] = seg(th - k * .45); staff(g, a, b, w); }
  g.globalAlpha = 1;
  const [a, b] = seg(th); staff(g, a, b, w);
  if (u < 1) for (const p of [a, b]) glint(g, p[0], p[1], 22, 1 - u);
}
function s7(t) {
  const tt = T12(t), base = camLerp({ x: 820, y: 610, z: 1.3 }, { x: 815, y: 615, z: 1.38 }, mv(t, 25, 30.5));
  const c = shake(base, t, 6 * sstep(25.45, 25.5, t) * (1 - sstep(25.5, 25.9, t)));
  drawLayer('l_sky', c, .3); drawLayer('l_far', c, .6); drawLayer('l_crag', c, 1);
  onCam(c, 1, g => {
    const [x, y] = LAND;
    if (tt < 25.45) {
      const u = clamp((tt - 25) / .45, 0, 1);
      artPose(g, 'tuck', lerp(380, x, u), lerp(140, y - 120, u * u), { c: 1, rot: -(1 - u) * 6.28 });
    } else {
      let k = S7P[0]; for (const q of S7P) if (tt >= q[0]) k = q;
      const a = tt - k[0], sq = k[2] * Math.cos(a * 22) * Math.exp(-a * 9) + .012 * Math.sin(tt * 4);
      s7staff(g, tt, x, y);
      artPose(g, k[1], x, y, { sq });
      // planted: the staff stands in front of him, butt on the rock, and the fist closes back over it
      if (k[1] === 'plant') { const f = artAt('foot', x, y), h = artAt('grip', x, y); staff(g, f, add(f, mul(sub(h, f), 420 / dist(h, f))), 9); artPose(g, 'plant', x, y, { sq, patch: [305, 452, 30] }); }
      if (tt >= 27.75 && tt < 28.25) { const n = artAt('needle', x, y); glint(g, n[0], n[1], 26 * (1 - sstep(27.75, 28.2, tt)) + 4, 1); }
    }
    bloom(g, x, y + 4, tt, 25.45, 60, 12, .8);
    debris(g, tt, 25.45, [x + 10, y - 4], 7, 320, 61, 5);
  });
}

// S8 30.5–34: closer: shading his eyes, staff across the shoulders, the wind in his feathers
function s8(t) {
  const tt = T12(t), c = camLerp({ x: 840, y: 600, z: 1.8 }, { x: 850, y: 590, z: 1.9 }, mv(t, 30.5, 34));
  drawLayer('l_sky', c, .3); drawLayer('l_far', c, .6); drawLayer('l_crag', c, 1);
  const fl = sstep(32.0, 32.3, tt) * (1 - sstep(32.6, 33.0, tt));
  onCam(c, 1, g => {
    const [x, y] = LAND, a = tt - 32.0, sq = .012 * Math.sin(tt * 4) + (a > 0 ? .06 * Math.cos(a * 22) * Math.exp(-a * 9) : 0);
    artPose(g, 'lookout', x, y, { sq });
    const f = artAt('lookFoot', x, y), h = artAt('look', x, y);
    staff(g, f, add(f, mul(sub(h, f), 420 / dist(h, f))), 9);
    artPose(g, 'lookout', x, y, { sq, patch: [370, 372, 34] });
    const e = artAt('eye', x, y); glint(g, e[0], e[1], 30, fl);
  });
  mistBand(ctx, 860, 120, -t * 6, .35, 33);
}

// S9a 34–35.6: close on the face: the grin
function s9a(t) {
  const tt = T12(t), c = { x: 1250, y: 330, z: 1.25 }, s = lerp(3.2, 3.4, mv(t, 34, 35.6));
  drawLayer('l_sky', c, .3); drawLayer('l_far', c, .6);
  const grin = tt >= 34.5, a = grin ? tt - 34.5 : tt - 34;
  artPose(ctx, grin ? 'bustgrin' : 'bust', 1300, 680, { s, at: grin ? [446, 490] : [600, 495], sq: (grin ? .1 : 0) * Math.cos(a * 22) * Math.exp(-a * 9) + .01 * Math.sin(tt * 4) });
}

// S9b 35.6–38: the somersault cloud swoops in; he jumps on
function s9ride(g, x, y, o) {
  const h = artAt('rideFist', x, y, o), d = [-.57 * (o.fx ?? 1), -.82], L = 420 * (o.s || 1);
  staff(g, sub(h, mul(d, L * .3)), add(h, mul(d, L * .7)), 9 * (o.s || 1));
  artPose(g, 'ride', x, y, o);
}
const KS = 95;
function kintoPos(t) {
  if (t < 36.8) { const u = easeOut3(clamp((t - 35.9) / .9, 0, 1)); return [lerp(2200, 1060, u), lerp(420, 800, u)]; }
  const q = Math.max(0, t - 37.45);
  return [1060 - q * q * 1000, 800 + Math.sin((t - 36.8) * 2.6) * 6 - q * q * 1100];
}
const S9P = [[35.6, 'stand', 0], [36.6, 'crouch', .18], [36.95, 'tuck', -.1], [37.4, 'ride', .22], [37.7, 'ride', .08]];
// where his feet are
function s9foot(t) {
  const k = kintoPos(t), on = [k[0] - 10, k[1] - KS * .35];
  if (t < 36.95) return LAND;
  const u = clamp((t - 36.95) / .45, 0, 1);
  return t < 37.4 ? [lerp(LAND[0], on[0], u), lerp(LAND[1], on[1], u) - Math.sin(u * Math.PI) * 200] : on;
}
function s9b(t) {
  const tt = T12(t), c = camLerp({ x: 900, y: 600, z: 1.2 }, { x: 960, y: 580, z: 1.15 }, mv(t, 35.6, 38));
  drawLayer('l_sky', c, .3); drawLayer('l_far', c, .6); drawLayer('l_crag', c, 1);
  onCam(c, 1, g => {
    const p = s9foot(tt), k = kintoPos(tt);
    let q = S9P[0]; for (const r of S9P) if (tt >= r[0]) q = r;
    const a = tt - q[0], sq = q[2] * Math.cos(a * 22) * Math.exp(-a * 9) + .012 * Math.sin(tt * 4);
    if (q[1] === 'tuck') {
      // in the air: one forward somersault about his middle, feet down again for the landing
      const A = ART.tuck, m = [(A.foot[0] - A.w / 2) * ART_S, (A.foot[1] - A.h / 2) * ART_S];
      g.save(); g.translate(p[0], p[1] - 120); g.rotate(easeIO(clamp((tt - 36.95) / .45, 0, 1)) * Math.PI * 2);
      artSling(g, 'tuck', m[0], m[1]); artPose(g, 'tuck', m[0], m[1], { sq }); g.restore();
    } else if (q[1] === 'ride') {
      // lands facing the way he jumped, then flips round to face the sun: the width passes through zero
      s9ride(g, p[0], p[1], { fx: Math.cos(Math.PI * clamp((tt - 37.6) / .17, 0, 1)), sq });
    }
    else { artSling(g, q[1], p[0], p[1]); artPose(g, q[1], p[0], p[1], { sq }); }
    if (tt >= 35.9) kinto(g, k[0], k[1], KS, tt, -1);
  });
}

// S10 38–45: away on the cloud toward the sun; the wide land again
function s10(t) {
  const tt = T12(t), c = camLerp({ x: 1010, y: 600, z: 1.12 }, { x: 960, y: 560, z: 1 }, mv(t, 38, 45));
  drawLayer('r_sky', c, .3); drawLayer('r_far', c, .5); drawLayer('r_peaks', c, .8);
  birds(c, t - 41, .6, [[-200, 420], [-140, 450], [-260, 470]], 80, 13);
  drawLayer('r_sea', c, .9);
  const sun = toScr(c, [430, 610], .3), A = [1640, 800];
  const at = q => { const u = clamp((q - 38) / 3.6, 0, 1), v = (1 - Math.pow(.08, u)) / .92; return { s: Math.pow(.08, u), p: [lerp(A[0], sun[0], v), lerp(A[1], sun[1], v) - Math.sin(v * Math.PI) * 140] }; };
  for (let i = 8; i >= 1; i--) {
    const q = tt - i * .18; if (q < 38) continue;
    const r = at(q); cloudCurl(ctx, r.p[0] + 60 * r.s, r.p[1] + 40 * r.s, 70 * r.s * (1 + i * .12), .8 * (1 - i / 9) * (1 - sstep(41, 42.5, tt)), 70 + i);
  }
  const r = at(tt);
  if (tt < 41.6) {
    s9ride(ctx, r.p[0], r.p[1] - KS * .35 * r.s, { fx: -1, s: r.s, sq: .012 * Math.sin(tt * 4) });
    kinto(ctx, r.p[0] + 10 * r.s, r.p[1], KS * r.s, tt, 1);
  }
  glint(ctx, sun[0], sun[1], 40, sstep(41.4, 41.6, tt) * (1 - sstep(41.7, 42.4, tt)));
  mistBand(ctx, 930, 120, t * 1.4, .4, 8);
  drawLayer('r_fg', c, 1.2);
}

const SHOTS = [[0, s1], [6, s2], [11.5, s3], [15, s4], [18, s5], [22.85, s6], [25, s7], [30.5, s8], [34, s9a], [35.6, s9b], [38, s10]];
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (t >= 100) { sheet(t); return; }
  t = toStory(t);
  let i = SHOTS.length - 1; while (SHOTS[i][0] > t) i--;
  WIND_T = t - (SHOTS[i][0] + (SHOTS[i + 1] ? SHOTS[i + 1][0] : toStory(DUR))) / 2;
  SHOTS[i][1](t);
  const f = Math.max(1 - t / .6, sstep(44.2, 45, t));
  if (f > 0) { ctx.fillStyle = `rgba(0,0,0,${f.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  grade();
}

// model sheet (temporary): t >= 100
function sheet(t) {
  ctx.fillStyle = '#e9dcc0'; ctx.fillRect(0, 0, W, H);
  const k = Math.floor(t) - 100;
  const holdStaff = (g, J) => staff(g, add(J.wr[0], [46, 10]), add(J.sh[0], [-150, -34]), 9);
  if (k === 0) {
    const ps = ['stand', 'crouch', 'leap', 'tuck', 'land'];
    ps.forEach((n, i) => monkey(ctx, { x: 220 + i * 370, y: 640, s: 1.7, P: POSE[n], t, vh: [[0, 0]] }));
  } else if (k === 1) {
    monkey(ctx, { x: 360, y: 640, s: 2, P: POSE.lookout, t, vh: [[0, 0]], staffBack: holdStaff });
    monkey(ctx, { x: 900, y: 640, s: 2, P: POSE.ride, t, vh: [[900, -200], [900, -200], [600, 0]] });
    monkeyHead(ctx, 1450, 420, 2.4, 0, { mouth: 'grin' }, t);
    monkeyHead(ctx, 1450, 820, 2.4, 0, { mouth: 'open', brow: 1, glow: 1 }, t);
  } else {
    monkeyHead(ctx, 960, 560, 5.5, 0, { mouth: 'grin', look: [.3, 0] }, t);
  }
}
