// Shared behaviour for the subpages
(() => {
  // WhatsApp links carry their own prefilled message
  document.querySelectorAll("[data-wa]").forEach(a => {
    a.href = "https://wa.me/5997850514?text=" + encodeURIComponent(a.dataset.wa);
  });

  // Header: frosted once scrolled, menu on phones
  const nav = document.getElementById("nav");
  if (nav) {
    const f = () => nav.classList.toggle("scrolled", scrollY > 10);
    addEventListener("scroll", f, { passive: true }); f();
    const btn = nav.querySelector(".menu-btn");
    btn?.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
      btn.innerHTML = open ? '<i class="ph ph-x"></i>' : '<i class="ph ph-list"></i>';
    });
  }

  // Reveal sections as they come into view
  const els = document.querySelectorAll(".rv");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    els.forEach(el => io.observe(el));
  } else els.forEach(el => el.classList.add("in"));
  // Safety net: never leave a section invisible if the observer misses it (fast jumps, anchors, hidden tabs)
  const sweep = () => els.forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add("in"); });
  addEventListener("scroll", sweep, { passive: true }); addEventListener("load", sweep); setTimeout(() => els.forEach(el => el.classList.add("in")), 3000);
})();
