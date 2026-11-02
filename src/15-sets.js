// ---------- sets: each is a stack of painted layers in one world (1920x1080 at rest) ----------
function skyGrad(g, x0, y0, w, h, stops) {
  const gr = g.createLinearGradient(0, y0, 0, y0 + h);
  for (const [u, c] of stops) gr.addColorStop(u, c);
  g.fillStyle = gr; g.fillRect(x0, y0, w, h);
}
// soft horizontal cloud washes for the sky
function streaks(g, seed, n, box, col) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = box[0] + r() * box[2], y = box[1] + r() * box[3], w = 200 + r() * 460, h = 8 + r() * 18;
    g.save(); g.translate(x, y); g.scale(w / h, 1);
    softDot(g, 0, 0, h, col, .5 + r() * .4);
    g.restore();
  }
}

// --- the five-finger mountain at dawn ---
const RANGE_PEAKS = [[1470, 930, 430, 230, 31, .6], [1290, 930, 250, 250, 32, .25], [760, 930, 520, 250, 35, -.9], [1110, 930, 180, 290, 33, .05], [935, 930, 280, 260, 34, -.3]];
function buildRange() {
  const X = -320, Y = -160, Wd = 2560, Hd = 1400;
  layer('r_sky', X, Y, Wd, Hd, .6, g => {
    skyGrad(g, X, Y, Wd, Hd, [[0, '#4f6c7c'], [.28, '#8ea39c'], [.46, '#dcc08a'], [.55, '#f4d49a'], [.7, '#f6dfb2'], [1, '#efd9b0']]);
    softDot(g, 430, 610, 560, 'rgba(255,226,160,A)', .55);
    softDot(g, 430, 610, 170, 'rgba(255,246,214,A)', .9);
    g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(430, 610, 44, 0, 7); g.fill();
    silk(g, X, Y, Wd, Hd, .3);
  });
  layer('r_sky', X, Y, Wd, Hd, .6, g => {
    streaks(g, 4, 14, [-200, 120, 2300, 320], 'rgba(250,224,180,A)');
    streaks(g, 5, 8, [-200, 430, 1300, 140], 'rgba(255,236,196,A)');
  }, -14);
  layer('r_far', X, 300, Wd, 900, .8, g => {
    farRange(g, 660, 110, 'rgba(122,150,156,.5)', 1.3, X, X + Wd);
    const gr = g.createLinearGradient(0, 600, 0, 760); gr.addColorStop(0, 'rgba(246,222,176,0)'); gr.addColorStop(1, 'rgba(246,222,176,.7)');
    g.fillStyle = gr; g.fillRect(X, 560, Wd, 300);
    farRange(g, 720, 80, 'rgba(88,124,130,.72)', 2.7, X, X + Wd, 30);
    const g2 = g.createLinearGradient(0, 680, 0, 820); g2.addColorStop(0, 'rgba(240,226,196,0)'); g2.addColorStop(1, 'rgba(240,226,196,.85)');
    g.fillStyle = g2; g.fillRect(X, 640, Wd, 400);
    silk(g, X, 300, Wd, 900, .4);
  });
  layer('r_peaks', 560, 120, 1120, 940, 1.2, g => {
    for (let i = 0; i < 4; i++) paintClump(g, clumpPts(700 + i * 300, 980, 420, 300, 300 + i), 300 + i, { cap: CAP.lv });
    for (const [cx, base, top, w, seed, lean] of RANGE_PEAKS) massif(g, cx, base, top, w, seed, { lean, lw: 2.6 });
    silk(g, 560, 120, 1120, 940, .4);
  });
  layer('r_sea', X, 640, Wd, 560, 1, g => {
    cloudSea(g, X, X + Wd, 830, 980, 7, { rows: 3, s0: 70, s1: 150, fill: '#e9e4da' });
    silk(g, X, 640, Wd, 560, .35);
  }, -30);
  layer('r_fg', X, 340, Wd, 960, 1.1, g => {
    rock(g, [[-320, 1300], [-300, 960], [-180, 880], [-20, 870], [120, 930], [240, 1010], [330, 1300]], 41, { cap: CAP.dark, capK: .45 });
    pine(g, 110, 960, 520, 42, { lean: .35, pads: 7 });
    rock(g, [[1700, 1300], [1750, 990], [1860, 930], [2040, 950], [2240, 1300]], 43, { cap: CAP.dark, capK: .45 });
    pine(g, 1880, 960, 430, 44, { lean: -.4, pads: 6 });
    silk(g, X, 340, Wd, 960, .35);
  });
}

// --- foot of the mountain: the rock that has held him for five hundred years ---
const FOOT = { head: [880, 640], hs: 2.3 };
function footBack(g) {
  skyGrad(g, -200, -100, 2320, 1300, [[0, '#93a9a4'], [.4, '#e4cf9c'], [.62, '#f3dcac'], [1, '#d9c69c']]);
  softDot(g, 1560, 480, 640, 'rgba(255,236,190,A)', .55);
  for (let i = 0; i < 4; i++) massif(g, 1320 + i * 190, 900, 420 + (i % 2) * 130, 170, 90 + i, { cap: CAP.pale, lw: 1.6, cun: 4, moss: 2, folds: 1, ochreT: '#c8b48a', ochreB: '#a99876' });
  const mg = g.createLinearGradient(0, 500, 0, 900); mg.addColorStop(0, 'rgba(243,226,186,0)'); mg.addColorStop(1, 'rgba(243,226,186,.8)');
  g.fillStyle = mg; g.fillRect(1100, 380, 1100, 560);
  // the crevice: a low slot under the cliffs
  const gap = sampleCR([[540, 720], [640, 610], [790, 566], [960, 552], [1140, 576], [1270, 650], [1310, 780], [1250, 880], [560, 880]], true, 4);
  g.fillStyle = '#211a14'; g.fill(pathOf(gap, true));
  g.save(); g.clip(pathOf(gap, true)); softDot(g, 900, 860, 300, 'rgba(110,82,52,A)', .6); g.restore();
  // the cliffs of the five-finger mountain bearing down; their undersides are the lip of the slot
  const r = rng(601), J = k => jagged(k, r, 2, .07);
  paintClump(g, J([[640, 600], [700, 420], [860, 230], [1010, 110], [1130, 150], [1240, 300], [1400, 420], [1460, 600], [1290, 640], [1140, 572], [960, 548], [790, 562]]),
    601, { lw: 4, folds: 4, cap: CAP.qing, capK: .6, cun: 200, moss: 18, light: 1 });
  paintClump(g, J([[-260, 880], [-180, 520], [20, 330], [190, 210], [300, 190], [430, 280], [580, 420], [720, 540], [800, 600], [690, 620], [560, 700], [420, 772], [200, 830]]),
    602, { lw: 4, folds: 4, cap: CAP.qing, capK: .6, cun: 200, moss: 18 });
  paintClump(g, J([[1280, 650], [1380, 470], [1520, 400], [1640, 450], [1760, 600], [1820, 860], [1300, 860]]), 603, { lw: 3.6, cap: CAP.lv, folds: 2 });
  paintClump(g, clumpPts(260, 900, 640, 230, 620), 620, { lw: 3.6, cap: CAP.lv });
  ground(g, [[-260, 872], [200, 852], [520, 870], [760, 858], [1100, 866], [1400, 846], [1800, 862], [2200, 850]], 1300, 62, { c0: '#93945a', c1: '#a8895a' });
  silk(g, -200, -100, 2320, 1300, .45);
}
function footFront(g) {
  // stones pinning the shoulders, the overhang lip, grass
  rock(g, clumpPts(690, 980, 290, 250, 63), 63, { cap: CAP.lv });
  rock(g, clumpPts(1085, 990, 220, 210, 64), 64, { cap: CAP.qing });
  const r = rng(66);
  for (let i = 0; i < 22; i++) grassTuft(g, 560 + r() * 680, 800 + r() * 50, 26 + r() * 26, 600 + i, (r() - .5) * .3);
  for (let i = 0; i < 12; i++) grassTuft(g, 640 + r() * 540, 560 + r() * 30 - Math.abs(r() - .5) * 40, 14 + r() * 14, 700 + i, (r() - .5) * .3, '#6b7a33');
  for (let i = 0; i < 40; i++) grassTuft(g, -100 + r() * 2100, 980 + r() * 120, 50 + r() * 50, 800 + i, (r() - .5) * .3, '#55642a');
  for (let i = 0; i < 14; i++) {
    const x = 520 + r() * 900, y = 840 + r() * 200;
    g.fillStyle = r() < .5 ? '#ece0c4' : '#cf7b5c';
    for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; g.beginPath(); g.ellipse(x + Math.cos(a) * 4, y + Math.sin(a) * 3, 3.2, 2.2, a, 0, 7); g.fill(); }
    g.fillStyle = '#d6a43a'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill();
  }
  silk(g, 400, 380, 1600, 900, .35);
}
function buildFoot() {
  layer('f_back', -200, -100, 2320, 1300, 1.1, footBack);
  layer('f_front', 400, 380, 1600, 900, 1.1, footFront);
  layer('f_backC', 440, 380, 900, 520, 2.4, footBack);
  layer('f_frontC', 440, 380, 900, 520, 2.4, footFront);
}

// --- the top of the middle finger, where the seal is pasted ---
const SEAL = { x: 960, y: 560 };
function buildPeakTop() {
  layer('p_all', -200, -100, 2320, 1300, 1.5, g => {
    skyGrad(g, -200, -100, 2320, 1300, [[0, '#67869a'], [.5, '#c9c4a2'], [.75, '#f2d8a4'], [1, '#f6e2b8']]);
    streaks(g, 11, 12, [-200, 80, 2300, 520], 'rgba(252,230,190,A)');
    softDot(g, 260, 820, 700, 'rgba(255,228,170,A)', .6);
    massif(g, 230, 1250, 700, 300, 12, { cap: CAP.pale, lean: -.3, lw: 2 });
    massif(g, 1720, 1250, 640, 330, 13, { cap: CAP.pale, lean: .3, lw: 2 });
    silk(g, -200, -100, 2320, 1300, .45);
  });
  layer('p_all', -200, -100, 2320, 1300, 1.5, g => {
    cloudSea(g, -200, 2120, 1000, 1080, 14, { rows: 2, s0: 60, s1: 90, fill: '#ebe5da' });
    silk(g, -200, -100, 2320, 1300, .45);
  }, -30);
  layer('p_all', -200, -100, 2320, 1300, 1.5, g => {
    // the summit itself: big clumps under the seal
    paintClump(g, clumpPts(960, 1400, 900, 860, 15), 15, { cap: CAP.qing, lw: 4.5, folds: 4, cun: 140, moss: 18,
      inner: g => { pine(g, 600, 640, 150, 16, { lean: -.5, pads: 5 }); pine(g, 1330, 700, 120, 17, { lean: .5, pads: 4 }); } });
    paintClump(g, clumpPts(560, 1300, 520, 520, 18), 18, { cap: CAP.lv, lw: 4 });
    paintClump(g, clumpPts(1400, 1300, 540, 480, 19), 19, { cap: CAP.lv, lw: 4 });
    silk(g, -200, -100, 2320, 1300, .45);
  });
}

// --- a high crag above the sea of cloud; the sky opens to the upper right ---
const CRAG = { x: 760, y: 742 };
function buildLedge() {
  const X = -360, Y = -240, Wd = 2640, Hd = 1560;
  layer('l_sky', X, Y, Wd, Hd, .7, g => {
    skyGrad(g, X, Y, Wd, Hd, [[0, '#4a687e'], [.3, '#86a0a2'], [.55, '#e6cd96'], [.75, '#f6dfb0'], [1, '#ecdcb8']]);
    softDot(g, 1500, 200, 560, 'rgba(255,240,200,A)', .85);
    silk(g, X, Y, Wd, Hd, .45);
  });
  layer('l_sky', X, Y, Wd, Hd, .7, g => {
    streaks(g, 21, 10, [X, 0, Wd, 500], 'rgba(255,238,200,A)');
    for (const [x, y, sz] of [[900, 420, 70], [1080, 440, 90], [1700, 330, 80], [1860, 360, 60], [2080, 470, 95]]) cloudHead(g, x, y, sz, x, { fade: true, lineA: .7 });
    silk(g, X, Y, Wd, Hd, .45);
  }, -22);
  layer('l_far', X, 500, Wd, 900, .9, g => {
    for (const [cx, base, top, w, seed, lean] of RANGE_PEAKS) massif(g, cx * .55 + 1100, base * .55 + 520, top * .55 + 520, w * .55, seed, { lean, cap: CAP.pale, lw: 1.4, cun: 6, moss: 2, folds: 1 });
    silk(g, X, 500, Wd, 900, .35);
  });
  layer('l_far', X, 500, Wd, 900, .9, g => {
    cloudSea(g, X, X + Wd, 1000, 1100, 28, { rows: 3, s0: 45, s1: 80, fill: '#e9e4da' });
    silk(g, X, 500, Wd, 900, .35);
  }, -34);
  layer('l_crag', X, 420, 1900, 980, 1.2, g => {
    paintClump(g, clumpPts(560, 1400, 520, 600, 81), 81, { cap: CAP.lv, lw: 3.6 });
    paintClump(g, [[300, 1400], [420, 960], [520, 820], [640, 768], [780, 742], [900, 760], [990, 840], [1040, 1000], [1120, 1400]], 80, { cap: CAP.qing, lw: 4, folds: 3 });
    pine(g, 470, 900, 300, 82, { lean: -.6, pads: 6 });
    const r = rng(83);
    for (let i = 0; i < 14; i++) grassTuft(g, 620 + r() * 330, 752 + r() * 24, 18 + r() * 16, 900 + i, (r() - .5) * .4);
    silk(g, X, 420, 1900, 980, .35);
  });
}
function buildSets() { buildRange(); buildFoot(); buildPeakTop(); buildLedge(); }
