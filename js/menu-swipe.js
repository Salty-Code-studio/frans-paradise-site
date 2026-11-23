// Phone and tablet menu: swipe the open panel up to put it away
(() => {
  const nav = document.getElementById("nav");
  const menu = document.getElementById("menu");
  const btn = nav && nav.querySelector(".menu-btn");
  if (!nav || !menu || !btn) return;
  const small = matchMedia("(max-width:860px)");

  let y0 = 0, t0 = 0, dy = 0, drag = false;
  const reset = () => { menu.style.transition = ""; menu.style.transform = ""; menu.style.opacity = ""; };

  menu.addEventListener("touchstart", e => {
    if (!small.matches || !nav.classList.contains("open") || e.touches.length !== 1) return;
    y0 = e.touches[0].clientY; t0 = Date.now(); dy = 0; drag = true;
    menu.style.transition = "none";
  }, { passive: true });

  menu.addEventListener("touchmove", e => {
    if (!drag) return;
    dy = e.touches[0].clientY - y0;
    // Let a long menu scroll normally until it is scrolled to the bottom
    const canScroll = menu.scrollHeight > menu.clientHeight + 1 && menu.scrollTop + menu.clientHeight < menu.scrollHeight - 1;
    if (dy >= 0 || canScroll) { menu.style.transform = ""; menu.style.opacity = ""; return; }
    e.preventDefault();
    menu.style.transform = `translateY(${dy}px)`;
    menu.style.opacity = String(Math.max(0.3, 1 + dy / (menu.offsetHeight * 1.2)));
  }, { passive: false });

  const end = () => {
    if (!drag) return;
    drag = false;
    const fast = dy < -30 && Date.now() - t0 < 250;
    if (dy < -Math.min(90, menu.offsetHeight * 0.25) || fast) {
      menu.style.transition = "transform .22s ease-in, opacity .22s ease-in";
      menu.style.transform = "translateY(-100%)";
      menu.style.opacity = "0";
      setTimeout(() => { btn.click(); reset(); }, 220);
    } else {
      menu.style.transition = "transform .25s cubic-bezier(.2,.8,.2,1), opacity .25s";
      menu.style.transform = "";
      menu.style.opacity = "";
      setTimeout(reset, 260);
    }
  };
  menu.addEventListener("touchend", end);
  menu.addEventListener("touchcancel", end);
})();
