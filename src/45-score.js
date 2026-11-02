// ---------- score: D-gong pentatonic, guzheng + dizi + drums, cut to the picture ----------
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const nf = s => { const m = /^([A-G])(#?)(\d)$/.exec(s); return 440 * 2 ** ((NOTE[m[1]] + (m[2] ? 1 : 0) + 12 * (+m[3] + 1) - 69) / 12); };
const BEAT = .6; // 100 bpm; the somersault whooshes already ride this grid

const zheng = (at, n, k = .32) => pluck(at, nf(n), k, .997, AU.mus, 3400);
// bamboo flute: sine body, soft octave, breath, delayed vibrato; o.from slides in, o.bright adds reed bite
function dizi(at, dur, n, k = .11, o = {}) {
  if (past(at)) return;
  const ac = AU.ac, f = nf(n), end = at + dur + .2;
  const g = ac.createGain(); env(g.gain, at, [[0, 0], [.05, k], [dur * .7, k * .85], [dur, k * .75], [dur + .18, 0]]);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.bright ? 5200 : 3600;
  lp.connect(g); out(g, .45, AU.mus);
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5.6;
  lg.gain.setValueAtTime(0, at); lg.gain.setValueAtTime(0, at + Math.min(.3, dur * .5)); lg.gain.linearRampToValueAtTime(f * .011, at + Math.min(.7, dur));
  lfo.connect(lg); lfo.start(at); lfo.stop(end);
  for (const [type, m, a] of [['sine', 1, 1], ['triangle', 2, .22], o.bright ? ['sawtooth', 1, .16] : null].filter(Boolean)) {
    const v = ac.createOscillator(); v.type = type;
    if (o.from) { v.frequency.setValueAtTime(nf(o.from) * m, at); v.frequency.exponentialRampToValueAtTime(f * m, at + .09); } else v.frequency.setValueAtTime(f * m, at);
    const vg = ac.createGain(); vg.gain.value = a; lg.connect(v.frequency);
    v.connect(vg); vg.connect(lp); v.start(at); v.stop(end);
  }
  noiseSrc(at, dur, 'bandpass', f * 2, 3, [[0, 0], [.04, k * .25], [dur, k * .12], [dur + .1, 0]], .3);
}
// bowed pad: detuned saws through a lowpass that opens from c0 to c1
function pad(at, dur, notes, k, c0, c1, atk = 1.2) {
  if (past(at)) return;
  const ac = AU.ac, lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = .7;
  lp.frequency.setValueAtTime(c0, at); lp.frequency.exponentialRampToValueAtTime(c1, at + dur);
  const g = ac.createGain(); env(g.gain, at, [[0, 0], [atk, k], [dur, k], [dur + .9, 0]]);
  lp.connect(g); out(g, .6, AU.mus);
  for (const n of notes) for (const c of [-6, 6]) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = nf(n); o.detune.value = c;
    o.connect(lp); o.start(at); o.stop(at + dur + 1);
  }
}
function bass(at, dur, n, k = .2) {
  tone(at, dur, 'triangle', nf(n), [[0, 0], [.01, k], [dur, k * .4], [dur + .08, 0]], .1, 0, AU.mus);
  tone(at, dur, 'sine', nf(n), [[0, 0], [.01, k * .8], [dur, k * .3], [dur + .08, 0]], 0, 0, AU.mus);
}
// tanggu: a tuned barrel drum, pitch falling
function drum(at, k = .5, f = 120) {
  tone(at, .4, 'sine', f, [[0, 0], [.004, k], [.38, 0]], .25, f * .45);
  noiseSrc(at, .07, 'lowpass', 1100, 1, [[0, 0], [.003, k * .35], [.06, 0]], .15);
}
function riser(at, dur, k) { noiseSrc(at, dur, 'bandpass', 300, 1.5, [[0, 0], [dur * .9, k], [dur, 0]], .4)?.frequency.exponentialRampToValueAtTime(5000, at + dur); }
// strum across the strings, up or down
const gliss = (at, notes, step, k = .22) => notes.forEach((n, i) => zheng(at + i * step, n, k));
const UP = ['D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'F#5', 'A5', 'B5', 'D6'];

// melody rows: [beat, note, beats long], placed on a grid that starts at t0
const play = (t0, rows, k, o) => rows.forEach(([b, n, l]) => dizi(t0 + b * BEAT, l * BEAT, n, k, o));
// the hero motif: answers the burst, climbs, comes home to D
const HERO = [[2, 'A4', .5], [2.5, 'D5', .5], [3, 'E5', 1], [4, 'F#5', 1.5], [5.5, 'E5', .5], [6, 'D5', 1], [7, 'A5', 1.8], [9, 'F#5', .5], [9.5, 'E5', .5], [10, 'D5', 1], [11, 'E5', 1]];
const HOME = [[1, 'A4', .5], [1.5, 'D5', .5], [2, 'E5', 1], [3, 'F#5', 1.5], [4.5, 'E5', .5], [5, 'D5', 1], [6, 'A5', 1.4], [7.5, 'F#5', .5], [8, 'E5', .5], [8.5, 'D5', .5], [9, 'E5', .5], [9.6, 'D5', 3.2]];
// sixteenth-note guzheng figures over one bar
const ARP = { D: ['D4', 'F#4', 'A4', 'D5'], B: ['B3', 'D4', 'F#4', 'B4'], A: ['A3', 'E4', 'A4', 'B4'], G: ['B3', 'D4', 'E4', 'A4'] };
function arps(t0, bars, k) { bars.forEach((c, i) => { for (let s = 0; s < 16; s++) zheng(t0 + (i * 4 + s / 4) * BEAT, ARP[c][s % 4], k * (s % 4 ? .7 : 1)); }); }
function bassBar(t0, i, roots) { const [a, b] = roots; for (const [q, n, l] of [[0, a, .9], [1.5, a, .4], [2, b, .9], [3, b, .9]]) bass(t0 + (i * 4 + q) * BEAT, l * BEAT, n); }

function score(T0) {
  const at = s => T0 + toFilm(s);
  // dawn (0–11.5): open fifth drone, a rolled chord, the flute wakes slowly
  pad(at(.3), 11.2, ['D2', 'A2', 'D3'], .035, 400, 900, 2.5);
  gliss(at(.8), ['D3', 'A3', 'D4', 'E4', 'A4'], .16, .3);
  play(at(2.4), [[0, 'A4', 2.3], [2.3, 'B4', .8], [3.1, 'D5', 2.7], [6, 'E5', 1], [7, 'D5', .8], [7.8, 'B4', 1], [8.8, 'A4', 3]], .1);
  for (const [s, n] of [[4.4, 'B3'], [4.6, 'E4'], [4.8, 'F#4'], [7.0, 'A3'], [7.2, 'D4'], [7.4, 'A4'], [9.4, 'E5'], [9.6, 'D4']]) zheng(at(s), n, .26);
  dizi(at(9.9), .45, 'F#4', .07); dizi(at(10.35), .5, 'E4', .06, { from: 'F#4' });
  // awakening (11.5–18): low drone tightens and opens, drums close in, the riser, then a breath of silence
  pad(at(11.6), 6.2, ['D2', 'A2', 'E3'], .05, 250, 2600, 1.5);
  for (let i = 0, s = 12.9; s < 17.8; i++, s += Math.max(.15, .6 - i * .035)) { drum(at(s), .28 + Math.min(.35, i * .012), 110); if (i % 2 === 0) bass(at(s), .25, 'D2', .12); }
  riser(at(15.8), 2.15, .28);
  dizi(at(16.9), .5, 'A5', .07, { from: 'E5', bright: 1 });
  // the burst (18.05–25.3): full band on the 100 bpm grid; the cut takes out the middle bar
  const C = 18.05;
  for (let b = 0; b < 12; b += 2) drum(at(C + b * BEAT), b ? .55 : .9, b ? 95 : 70);
  for (let b = 1; b < 12; b += 2) drum(at(C + b * BEAT + BEAT / 2), .22, 160);
  [['D2', 'A2'], ['B1', 'F#2'], ['A1', 'E2']].forEach((r, i) => bassBar(at(C), i, r));
  arps(at(C), ['D', 'B', 'A'], .18);
  pad(at(C), 4.8, ['D3', 'A3', 'D4', 'F#4'], .03, 900, 2600, .3);
  play(at(C), HERO, .12, { bright: 1 });
  // landing (25.45–30.3): hush, light plucks; the needle; a strum up as the staff grows; a roll as it spins; the plant
  const L = 25.45;
  pad(at(L + .3), 4.6, ['D2', 'A2'], .03, 500, 800, 1);
  for (const [b, n] of [[1, 'A3'], [1.5, 'D4'], [2, 'E4'], [3, 'A3'], [3.5, 'D4'], [4, 'F#4']]) zheng(at(L + b * BEAT), n, .2);
  gliss(at(28.3), UP, .045, .2);
  for (let s = 28.9, i = 0; s < 30.25; s += .075, i++) drum(at(s), .1 + i * .012, 150);
  drum(at(30.3), 1, 65); bass(at(30.3), 1.4, 'D2', .25);
  pad(at(30.3), 4.8, ['D3', 'F#3', 'A3', 'D4'], .04, 700, 1800, .15);
  dizi(at(30.3), 1.2, 'D5', .11, { from: 'A4', bright: 1 });
  // lookout (30.5–35.6): the flute alone over the wind; the grin answers with a skip down the strings
  play(at(31.6), [[0, 'A4', 1.4], [1.5, 'B4', .6], [2.1, 'D5', 1.8], [4.0, 'E5', .6], [4.6, 'D5', .6], [5.2, 'B4', 1.2]], .09);
  gliss(at(34.5), ['E5', 'D5', 'B4', 'A4', 'F#4'], .08, .22);
  // the cloud (35.6–37.45): drums pick up, a roll into the jump
  pad(at(35.6), 1.9, ['D2', 'A2', 'E3'], .035, 400, 2200, .6);
  for (const b of [0, 1, 2, 2.5, 3]) drum(at(35.9 + b * BEAT * .5), .3, 120);
  for (let s = 36.6, i = 0; s < 37.4; s += .066, i++) drum(at(s), .12 + i * .02, 140);
  // away (37.45–45): the hero motif comes home; drums at half time; ends on the gong
  const R = 37.45;
  for (const b of [0, 4, 8]) drum(at(R + b * BEAT), b ? .55 : .85, 75);
  [['D2', 'A2'], ['B1', 'F#2']].forEach((r, i) => bassBar(at(R), i, r));
  bass(at(R + 8 * BEAT), 3.5, 'D2', .2);
  arps(at(R), ['D', 'G'], .15);
  gliss(at(R + 9.6 * BEAT - .3), ['D4', 'F#4', 'A4', 'D5', 'F#5', 'A5'], .05, .18);
  pad(at(R), 7.4, ['D3', 'A3', 'D4', 'F#4', 'A4'], .035, 1200, 600, 1.5);
  play(at(R), HOME, .11, { bright: 1 });
}
