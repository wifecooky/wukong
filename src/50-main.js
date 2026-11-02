// ---------- main: paint the sets, run the film clock ----------
artLoad().then(function main() {
  initSprites();
  buildSets();
  const q = new URLSearchParams(location.search), fixed = q.has('t') ? parseFloat(q.get('t')) : null;
  let start = performance.now(), paused = false, pauseT = 0, lastF = -1, sound = false;
  const filmT = () => paused ? pauseT : (performance.now() - start) / 1000;
  window.__render = t => { render(t); lastF = -1; };
  if (fixed != null) { render(fixed); window.__ready = true; return; }
  window.__ready = true;
  const hint = document.getElementById('snd');
  cv.addEventListener('click', () => {
    if (sound) return; sound = true; if (hint) hint.style.display = 'none';
    start = performance.now(); auStart(0);
  });
  addEventListener('keydown', e => {
    const t = filmT();
    if (e.code === 'Space') { paused = !paused; if (paused) pauseT = t; else start = performance.now() - pauseT * 1000; e.preventDefault(); }
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { const nt = Math.max(0, t + (e.code === 'ArrowRight' ? 2 : -2)); if (paused) pauseT = nt; else start = performance.now() - nt * 1000; lastF = -1; }
  });
  (function loop() {
    const t = filmT(), f = Math.floor(t * 24);
    if (f !== lastF) { lastF = f; render(t % DUR); if (sound && !paused) auTick(t % DUR, Math.floor(t / DUR)); }
    requestAnimationFrame(loop);
  })();
});
