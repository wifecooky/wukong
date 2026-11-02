// ---------- sound: synthesized, scheduled against the film clock ----------
const AU = { ac: null, next: 0, bus: null };
// ac: an OfflineAudioContext for rendering the track to a file, else a live one
function auInit(ac) {
  if (AU.ac && !ac) return;
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  AU.ac = ac; AU.zb = {};
  const comp = ac.createDynamicsCompressor(), master = ac.createGain(); master.gain.value = .8;
  comp.connect(master); master.connect(ac.destination);
  AU.bus = ac.createGain(); AU.bus.gain.value = .8; AU.bus.connect(comp);
  AU.mus = ac.createGain(); AU.mus.gain.value = .6; AU.mus.connect(AU.bus);
  // reverb: decaying noise impulse
  const len = ac.sampleRate * 3.2, ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6; }
  AU.rev = ac.createConvolver(); AU.rev.buffer = ir;
  const rg = ac.createGain(); rg.gain.value = .45; AU.rev.connect(rg); rg.connect(AU.bus);
  const nl = ac.sampleRate * 2; AU.noise = ac.createBuffer(1, nl, ac.sampleRate);
  const nd = AU.noise.getChannelData(0); for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
}
function out(node, wet = .3, bus = AU.bus) {
  const g = AU.ac.createGain(); g.gain.value = 1; node.connect(g); g.connect(bus);
  if (wet) { const w = AU.ac.createGain(); w.gain.value = wet; node.connect(w); w.connect(AU.rev); }
}
// cues before the click land in the past: skip them
const past = at => at < AU.ac.currentTime;
function env(param, at, pts) { param.setValueAtTime(pts[0][1], at); for (const [dt, v] of pts.slice(1)) param.linearRampToValueAtTime(v, at + dt); }
function noiseSrc(at, dur, type, f, q, pts, wet) {
  if (past(at)) return null;
  const ac = AU.ac, s = ac.createBufferSource(); s.buffer = AU.noise; s.loop = true;
  const bf = ac.createBiquadFilter(); bf.type = type; bf.frequency.value = f; bf.Q.value = q;
  const g = ac.createGain(); env(g.gain, at, pts);
  s.connect(bf); bf.connect(g); out(g, wet); s.start(at); s.stop(at + dur);
  return bf;
}
function tone(at, dur, type, f, pts, wet, f2, bus) {
  if (past(at)) return;
  const ac = AU.ac, o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, at);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + dur);
  const g = ac.createGain(); env(g.gain, at, pts); o.connect(g); out(g, wet, bus); o.start(at); o.stop(at + dur + .05);
}
// plucked string (Karplus-Strong) — a guqin/guzheng-like note; one buffer per pitch
function pluck(at, f, a = .5, dec = .996, bus, lpf = 2400) {
  if (past(at)) return;
  const ac = AU.ac, key = f.toFixed(2) + '|' + dec;
  let b = AU.zb[key];
  if (!b) {
    const n = Math.round(ac.sampleRate / f), len = ac.sampleRate * 3; b = AU.zb[key] = ac.createBuffer(1, len, ac.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    for (let i = n; i < len; i++) d[i] = dec * .5 * (d[i - n] + d[i - n + 1 < i ? i - n + 1 : i - n]);
  }
  const s = ac.createBufferSource(); s.buffer = b;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lpf;
  const g = ac.createGain(); g.gain.value = a;
  s.connect(lp); lp.connect(g); out(g, .5, bus); s.start(at);
}
function chirp(at, k) { // magpie chatter
  for (let i = 0; i < 4 + k; i++) noiseSrc(at + i * .07, .06, 'bandpass', 3200 + 600 * Math.sin(i * 2.1), 9, [[0, 0], [.01, .25], [.05, 0]], .25);
}
function thud(at, k) { tone(at, .9, 'sine', 70, [[0, 0], [.01, .9 * k], [.8, 0]], .3, 32); noiseSrc(at, .5, 'lowpass', 300, 1, [[0, 0], [.01, .6 * k], [.45, 0]], .4); }
// Peking-opera percussion: gong (big or small), clapper, cymbal
function gong(at, f, k, dur = 3) { for (const [m, a] of [[1, 1], [1.48, .5], [2.07, .35], [2.62, .2]]) tone(at, dur, 'sine', f * m, [[0, 0], [.01, .3 * k * a], [dur, 0]], .5, f * m * (f > 500 ? .93 : 1.02)); }
function clap(at, k = 1) { noiseSrc(at, .08, 'bandpass', 1900, 7, [[0, 0], [.004, .9 * k], [.07, 0]], .2); tone(at, .06, 'sine', 1150, [[0, 0], [.003, .25 * k], [.06, 0]], .1); }
function cymbal(at, k, dur = 1.2) { noiseSrc(at, dur, 'highpass', 5200, .5, [[0, 0], [.005, .5 * k], [dur, 0]], .4); }
function whoosh(at, dur, f0, f1, k) { noiseSrc(at, dur, 'bandpass', f0, 1.2, [[0, 0], [dur * .4, .5 * k], [dur, 0]], .3)?.frequency.exponentialRampToValueAtTime(f1, at + dur); }
function chime(at, f, k = .12) { tone(at, 1.6, 'sine', f, [[0, 0], [.01, k], [1.6, 0]], .7); tone(at, 1.2, 'sine', f * 1.5, [[0, 0], [.01, k * .4], [1.2, 0]], .7); }
// small debris: random clicks of grit and pebbles
function pebbles(at, dur, n, k, seed) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { const q = r(); noiseSrc(at + r() * dur, .05, 'bandpass', 1400 + q * 3200, 5, [[0, 0], [.003, k * (.4 + .6 * r())], [.045, 0]], .25); }
}
// metallic ring of the staff
function shing(at, k) {
  noiseSrc(at, .6, 'highpass', 6500, .7, [[0, 0], [.01, k * .5], [.6, 0]], .5);
  for (const [f, a] of [[2380, 1], [3570, .5], [5210, .3]]) tone(at, 1.4, 'sine', f, [[0, 0], [.005, k * .14 * a], [1.4, 0]], .6, f * 1.01);
}
// sparkle of the eyes lighting up
function shimmer(at, dur, k, seed) {
  const r = rng(seed);
  for (let i = 0; i < 14; i++) { const t = at + r() * dur, f = 2400 + r() * 3200; tone(t, .5, 'sine', f, [[0, 0], [.01, k], [.5, 0]], .8); }
}
function puffSnd(at, k) { noiseSrc(at, .7, 'lowpass', 700, .7, [[0, 0], [.06, k], [.7, 0]], .4); }
// a falling leaf: faint dry grains
function rustle(at, dur, k, seed) {
  const r = rng(seed);
  for (let s = 0; s < dur; s += .12 + r() * .1) noiseSrc(at + s, .08, 'bandpass', 3500 + r() * 2500, 2, [[0, 0], [.02, k], [.08, 0]], .3);
}
// film cues (seconds) → sound events
function cues(T0) {
  const at = s => T0 + toFilm(s);
  noiseSrc(at(0), DUR, 'bandpass', 500, .6, [[0, 0], [3, .12], [DUR - 2, .12], [DUR, 0]], .2); // wind bed
  score(T0);
  chirp(at(2.6), 2); chirp(at(4.1), 1); chirp(at(42.8), 2);
  rustle(at(6.2), 3.2, .05, 3); clap(at(9.4), .12); // the leaf drifts down, lands on his nose
  whoosh(at(10.45), .4, 600, 2400, .5); // blows the leaf off
  // the eyes burn; the clapper starts slow and speeds up
  chime(at(11.9), 880); shimmer(at(11.9), 1.1, .035, 5); gong(at(12.3), 820, .5, 1.2);
  pebbles(at(12.9), 1.8, 28, .22, 7); pebbles(at(13.8), .8, 16, .3, 8); // grit runs off the rock, the cracks open
  for (let i = 0, s = 12.6; s < 18; i++, s += Math.max(.09, .42 - i * .03)) clap(at(s), .5 + Math.min(.5, i * .03));
  noiseSrc(at(12.9), 5.2, 'lowpass', 110, 1, [[0, 0], [1.5, .5], [5, .8], [5.2, 0]], .3); // rumble
  for (const s of [13.2, 14.1, 15.0, 16.0]) thud(at(s), .6);
  // the seal peels and flies
  for (let i = 0; i < 10; i++) noiseSrc(at(16 + i * .2), .15, 'bandpass', 2600 + 400 * Math.sin(i * 1.7), 4, [[0, 0], [.02, .12], [.15, 0]], .2);
  pebbles(at(15.6), .8, 14, .25, 11); cymbal(at(16.9), .6); whoosh(at(16.9), .8, 800, 3000, .45);
  // the mountain bursts
  thud(at(18.05), 1.8); gong(at(18.05), 140, 1.2, 4.5); cymbal(at(18.05), 1, 2.4);
  noiseSrc(at(18.05), 2.6, 'lowpass', 500, 1, [[0, 0], [.05, .9], [2.5, 0]], .6);
  for (let i = 0; i < 14; i++) noiseSrc(at(18.3 + i * .09), .2, 'bandpass', 1400 + i * 160, 3, [[0, 0], [.02, .2], [.2, 0]], .2);
  whoosh(at(18.55), 1.3, 500, 3200, 1);
  // somersaults: one whoosh per turn, clapper underneath
  for (let s = 23.15; s < 24.6; s += .75) whoosh(at(s), .5, 400, 1600, .6);
  for (let s = 23.15; s < 24.9; s += .375) clap(at(s), .35);
  // lands, plucks the needle, the staff grows and spins
  thud(at(25.45), 1.1); gong(at(25.5), 900, .6, 1); pebbles(at(25.5), .5, 9, .22, 13);
  chime(at(27.75), 1320);
  tone(at(28.3), .6, 'triangle', 180, [[0, 0], [.05, .2], [.6, 0]], .5, 720); shing(at(28.75), .5);
  for (let s = 28.9; s < 29.9; s += .2) whoosh(at(s), .2, 700, 1400, .5);
  thud(at(30.3), 1.2); gong(at(30.3), 150, .9, 3.5); cymbal(at(30.3), .7);
  noiseSrc(at(30.5), 3.6, 'bandpass', 700, .8, [[0, 0], [1.4, .16], [3.6, 0]], .3); // wind gust on the crag
  chime(at(32.0), 880, .1);
  gong(at(34.5), 860, .5, 1);
  // the cloud: in, the leap, away
  whoosh(at(35.9), .9, 2400, 500, .7);
  whoosh(at(36.95), .45, 600, 1600, .5);
  whoosh(at(37.45), 1.2, 400, 2000, .8); puffSnd(at(37.45), .35);
  whoosh(at(38.3), 2.6, 1800, 350, .45);
  chime(at(41.6), 1760, .08);
  gong(at(43.2), 130, .45, 2.5);
}
function auStart(filmT) {
  auInit();
  if (AU.ac.state === 'suspended') AU.ac.resume();
  AU.base = AU.ac.currentTime - filmT;
  AU.scheduled = -1;
}
function auTick(filmT, loopN) {
  if (!AU.ac || AU.scheduled === loopN) return;
  AU.scheduled = loopN;
  cues(AU.ac.currentTime - filmT);
}
