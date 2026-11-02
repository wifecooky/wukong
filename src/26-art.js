// ---------- painted key poses: ART bitmaps drawn foot-anchored; the staff still comes from code ----------
const ARTIMG = {};
const artLoad = () => Promise.all(Object.entries(ART).map(([k, a]) => new Promise(ok => {
  const im = new Image(); im.onload = im.onerror = ok; im.src = a.src; ARTIMG[k] = im;
})));
const ART_S = .435; // world units per sprite px
// sprite-px points the staff hangs on: the needle pinch, the fists, the front foot
const ART_PT = {
  needle: ['reach', 520, 182], fist: ['present', 818, 280], grip: ['plant', 305, 452], foot: ['plant', 600, 915],
  look: ['lookout', 370, 372], lookFoot: ['lookout', 580, 816], eye: ['lookout', 469, 190], rideFist: ['ride', 392, 290],
};
// staff slung across the back: [sprite px centre, unit axis pointing to the lower end]
const ART_SLING = { stand: [300, 430, .45, .89], crouch: [330, 420, .8, .6], dive: [500, 200, -.99, .12], tuck: [480, 260, .25, .97] };
// o.s: scale; o.fx: -1 mirrors about the anchor; o.c: pivot on the sprite centre, o.at: on that sprite px;
// o.sq: squash (+) / stretch (-), volume kept; o.patch: [px, py, r] redraws only that disc,
// so a fist can close over something drawn on top
function artPose(g, k, x, y, o = {}) {
  const a = ART[k], s = ART_S * (o.s || 1), sq = o.sq || 0, [ax, ay] = o.at || (o.c ? [a.w / 2, a.h / 2] : a.foot);
  g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.scale(s * (1 + sq * .6) * (o.fx ?? 1), s * (1 - sq));
  if (o.patch) { const [px, py, r] = o.patch; g.beginPath(); g.arc(px - ax, py - ay, r, 0, Math.PI * 2); g.clip(); }
  g.drawImage(ARTIMG[k], -ax, -ay); g.restore();
}
// a sprite px in world space, for a sprite drawn foot-anchored at x,y with the same o.s / o.fx
const artXY = (k, px, py, x, y, o = {}) => { const a = ART[k], s = ART_S * (o.s || 1); return [x + (px - a.foot[0]) * s * (o.fx ?? 1), y + (py - a.foot[1]) * s]; };
const artAt = (n, x, y, o) => artXY(...ART_PT[n], x, y, o);
// the slung staff, drawn before the sprite so the body covers it
function artSling(g, k, x, y, o = {}) {
  const [cx, cy, ux, uy] = ART_SLING[k], c = artXY(k, cx, cy, x, y, o), d = [ux * (o.fx ?? 1), uy], L = 210 * (o.s || 1);
  staff(g, sub(c, mul(d, L)), add(c, mul(d, L)), 9 * (o.s || 1));
}
