// Video loops: every loop is exactly 3.2 s at normal speed (the short wing clip goes back and forth twice). One shared clock keeps them
// in step, so they all turn around at the same moment. They only play while on screen.
(() => {
  const LEN = 3.2;
  const vids = [...document.querySelectorAll("video.sport-v, video.shack-v")];
  if (!vids.length) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { vids.forEach(v => { v.removeAttribute("autoplay"); v.pause(); }); return; }
  const clock = () => (performance.now() / 1000) % LEN;
  // signed distance from the clock, wrapped to (-LEN/2, LEN/2]
  const drift = v => { let d = v.currentTime - clock(); if (d > LEN / 2) d -= LEN; if (d <= -LEN / 2) d += LEN; return d; };
  const snap = v => { if (v.readyState >= 1) v.currentTime = clock(); };
  const nudge = v => { if (v.paused || v.seeking || v.readyState < 2) return; const d = drift(v);
    if (Math.abs(d) > 0.4) { snap(v); v.playbackRate = 1; } else v.playbackRate = Math.max(.9, Math.min(1.1, 1 - d * .5)); };
  const visible = new Set();
  const start = v => { snap(v); v.play().catch(() => {}); };
  vids.forEach(v => { v.loop = true; v.removeAttribute("autoplay"); v.preload = "auto";
    v.addEventListener("loadedmetadata", () => { if (visible.has(v)) start(v); }, { once: true }); });
  const io = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { visible.add(v); start(v); } else { visible.delete(v); v.pause(); }
  }), { threshold: .2 });
  vids.forEach(v => io.observe(v));
  setInterval(() => visible.forEach(nudge), 500);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) visible.forEach(start); });
})();
