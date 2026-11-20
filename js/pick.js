// Custom pickers: swaps the browser's own select menus and date picker for ones in the site's style.
// The native field stays in the page (hidden) and keeps the value, so forms and scripts work as before.
// The date picker shows the forecast wind per day when the booking script is loaded.
(() => {
  const css = `
.pk{position:relative}
.pk-native{position:absolute!important;opacity:0!important;pointer-events:none!important;width:1px!important;height:1px!important;inset:auto!important}
.pk-btn{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;text-align:left;cursor:pointer;-webkit-appearance:none;appearance:none}
.pk-btn span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pk-btn>i{font-size:15px;flex:none;transition:transform .2s;position:static!important;transform:none;color:currentColor!important;opacity:.7}
.pk.open .pk-btn>i{transform:rotate(180deg)}
.pk-pop{position:fixed;z-index:60;overflow:auto;background:#fff;color:#111;border-radius:14px;padding:6px;
  box-shadow:0 24px 60px rgba(5,20,24,.22),0 0 0 1px rgba(5,20,24,.06);animation:pk-in .18s cubic-bezier(.2,.8,.2,1);font-family:"DM Sans",system-ui,sans-serif}
.pk-pop i{position:static!important;transform:none!important;left:auto!important;top:auto!important;color:inherit!important;font-size:inherit}
.pk-key i{display:inline-block}
.pk-pop[hidden]{display:none}
@keyframes pk-in{from{opacity:0;transform:translateY(-6px)}}
.pk-opt{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;min-height:44px;padding:0 12px;border:0;border-radius:9px;background:none;
  font:500 15px "DM Sans",system-ui,sans-serif;color:#111;text-align:left;cursor:pointer;white-space:nowrap}
.pk-opt:hover,.pk-opt:focus-visible{background:#eef5f6;outline:none}
.pk-opt[aria-selected="true"]{font-weight:700}
.pk-opt[aria-selected="true"]::after{content:"";width:8px;height:8px;border-radius:50%;background:#0e7c86;flex:none}
.pk-cal{width:304px;padding:10px}
.pk-head{display:flex;align-items:center;justify-content:space-between;padding:2px 2px 10px}
.pk-head b{font:800 15px "Montserrat",system-ui,sans-serif}
.pk-nav{width:34px;height:34px;border:0;border-radius:999px;background:#eef5f6;color:#111;cursor:pointer;display:grid;place-items:center;font-size:16px}
.pk-nav:disabled{opacity:.3;cursor:default}
.pk-wk,.pk-days{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.pk-wk span{font:700 11px "DM Sans",sans-serif;color:#5a6266;text-align:center;padding-bottom:4px}
.pk-day{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;height:46px;border:0;border-radius:9px;background:none;cursor:pointer;
  font:600 14px "DM Sans",sans-serif;color:#111;overflow:hidden}
.pk-day small{font:700 10px "DM Sans",sans-serif;color:#5a6266;line-height:1.1}
.pk-day::after{content:"";position:absolute;left:8px;right:8px;bottom:4px;height:3px;border-radius:3px;background:var(--c,transparent)}
.pk-day:hover:not(:disabled),.pk-day:focus-visible{background:#eef5f6;outline:none}
.pk-day:disabled{color:#c3ccd0;cursor:default}
.pk-day.out{visibility:hidden}
.pk-day.today{box-shadow:inset 0 0 0 1.5px #d6e0e3}
.pk-day.on{background:#111;color:#fff}.pk-day.on small{color:rgba(255,255,255,.75)}
.pk-key{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:10px;padding:8px 2px 0;border-top:1px solid #e3eaee;font-size:12px;color:#5a6266}
.pk-key span{display:inline-flex;align-items:center;gap:5px}.pk-key i{width:12px;height:3px;border-radius:3px;background:var(--c)}
@media (max-width:420px){.pk-cal{width:min(304px,calc(100vw - 32px))}}`;
  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);

  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const nice = v => new Date(v + "T12:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let openOne = null;
  const closeAll = () => openOne && openOne();

  const upgrade = el => {
    const isDate = el.type === "date";
    const cs = getComputedStyle(el);
    const wrap = document.createElement("div"); wrap.className = "pk";
    el.parentNode.insertBefore(wrap, el); wrap.append(el);
    const btn = document.createElement("button"); btn.type = "button"; btn.className = "pk-btn";
    // keep the page's own look for the field
    ["height", "minHeight", "borderRadius", "padding", "font", "color", "backgroundColor", "border", "boxShadow", "letterSpacing"].forEach(p => btn.style[p] = cs[p]);
    btn.setAttribute("aria-haspopup", isDate ? "dialog" : "listbox"); btn.setAttribute("aria-expanded", "false");
    const lab = el.id && document.querySelector(`label[for="${el.id}"]`) || el.closest("label");
    const labText = lab ? [...lab.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join("").trim() || lab.textContent.trim() : "";
    const pop = document.createElement("div"); pop.className = "pk-pop" + (isDate ? " pk-cal" : ""); pop.hidden = true;
    pop.setAttribute("role", isDate ? "dialog" : "listbox"); if (labText) pop.setAttribute("aria-label", labText);
    wrap.append(btn); document.body.append(pop); // on body: fixed position can't be thrown off by a parent's blur or transform
    el.classList.add("pk-native"); el.tabIndex = -1; el.setAttribute("aria-hidden", "true");
    if (el.id && lab && lab.htmlFor) { lab.htmlFor = ""; lab.addEventListener("click", e => { e.preventDefault(); btn.focus(); }); }

    const show = () => {
      const t = isDate ? (el.value ? nice(el.value) : "Pick a day") : (el.selectedOptions[0]?.text || "");
      btn.innerHTML = `<span>${esc(t)}</span><i class="ph ph-caret-down" aria-hidden="true"></i>`;
      btn.setAttribute("aria-label", `${labText}${labText ? ": " : ""}${t}`);
    };
    const set = v => { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); show(); close(true); };

    let month = null, wind = null;
    const renderDate = () => {
      const min = el.min || iso(new Date()), sel = el.value || min;
      if (!month) { const d = new Date(sel + "T12:00"); month = new Date(d.getFullYear(), d.getMonth(), 1, 12); }
      const first = new Date(month), y = first.getFullYear(), m = first.getMonth();
      const lead = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
      const minM = new Date(min + "T12:00"); const canBack = y > minM.getFullYear() || m > minM.getMonth();
      let h = `<div class="pk-head"><button type="button" class="pk-nav" data-nav="-1" aria-label="Previous month" ${canBack ? "" : "disabled"}><i class="ph ph-caret-left"></i></button>
        <b>${first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</b>
        <button type="button" class="pk-nav" data-nav="1" aria-label="Next month"><i class="ph ph-caret-right"></i></button></div>
        <div class="pk-wk">${["M", "T", "W", "T", "F", "S", "S"].map(d => `<span>${d}</span>`).join("")}</div><div class="pk-days">`;
      for (let i = 0; i < lead; i++) h += `<button type="button" class="pk-day out" tabindex="-1" aria-hidden="true"></button>`;
      const today = iso(new Date());
      for (let d = 1; d <= days; d++) {
        const k = iso(new Date(y, m, d, 12)), w = wind && wind[k], past = k < min;
        h += `<button type="button" class="pk-day${k === el.value ? " on" : ""}${k === today ? " today" : ""}" data-v="${k}" ${past ? "disabled" : ""}
          ${w && !past ? `style="--c:${w.c}"` : ""} aria-label="${new Date(k + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}${w ? `, ${w.kn} knots` : ""}">${d}${w && !past ? `<small>${w.kn} kn</small>` : ""}</button>`;
      }
      h += `</div>`;
      if (wind && Object.keys(wind).length) h += `<div class="pk-key"><span><i style="--c:#6ae6e0"></i>Learn</span><span><i style="--c:#ffe234"></i>Improve</span><span><i style="--c:#f06a24"></i>Fun</span><span><i style="--c:#ff6b57"></i>Strong</span></div>`;
      pop.innerHTML = h;
    };
    const renderList = () => {
      pop.innerHTML = [...el.options].map(o => `<button type="button" class="pk-opt" role="option" data-v="${esc(o.value)}" aria-selected="${o.selected}">${esc(o.text)}</button>`).join("");
    };
    const focusIn = () => (pop.querySelector('[aria-selected="true"], .pk-day.on') || pop.querySelector(".pk-opt, .pk-day:not(:disabled):not(.out)"))?.focus({ preventScroll: true });
    const close = refocus => {
      if (pop.hidden) return; pop.hidden = true; wrap.classList.remove("open"); btn.setAttribute("aria-expanded", "false");
      if (openOne === closeFn) openOne = null; if (refocus) btn.focus();
    };
    const closeFn = () => close(false);
    // Fixed to the screen so no section can clip it; opens below, or above when there's no room
    const place = () => {
      if (pop.hidden) return;
      const b = btn.getBoundingClientRect(), vw = document.documentElement.clientWidth;
      pop.style.minWidth = b.width + "px"; pop.style.maxHeight = ""; pop.style.top = "0px"; pop.style.left = "0px";
      const w = pop.offsetWidth, h = pop.offsetHeight, below = innerHeight - b.bottom - 16, above = b.top - 16;
      const up = h > below && above > below;
      pop.style.left = Math.max(8, Math.min(b.left, vw - w - 8)) + "px";
      pop.style.top = (up ? Math.max(8, b.top - 8 - Math.min(h, above)) : b.bottom + 8) + "px";
      pop.style.maxHeight = (up ? above : below) + "px";
    };
    addEventListener("scroll", place, { passive: true, capture: true }); addEventListener("resize", place);
    const open = () => {
      closeAll();
      if (isDate) { month = null; renderDate(); if (window.fpWindDays && !wind) window.fpWindDays().then(w => { wind = w; if (!pop.hidden) { renderDate(); place(); focusIn(); } }); }
      else renderList();
      pop.hidden = false; wrap.classList.add("open"); btn.setAttribute("aria-expanded", "true"); openOne = closeFn;
      place(); focusIn();
    };
    btn.addEventListener("click", () => pop.hidden ? open() : close(true));
    pop.addEventListener("click", e => {
      const n = e.target.closest("[data-nav]");
      if (n) { month.setMonth(month.getMonth() + +n.dataset.nav); renderDate(); place(); pop.querySelector(`[data-nav="${n.dataset.nav}"]`)?.focus({ preventScroll: true }); return; }
      const o = e.target.closest("[data-v]"); if (o && !o.disabled) set(o.dataset.v);
    });
    pop.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); close(true); return; }
      const items = [...pop.querySelectorAll(isDate ? ".pk-day:not(:disabled):not(.out)" : ".pk-opt")], i = items.indexOf(document.activeElement);
      const step = { ArrowDown: isDate ? 7 : 1, ArrowUp: isDate ? -7 : -1, ArrowRight: isDate ? 1 : 0, ArrowLeft: isDate ? -1 : 0 }[e.key];
      if (step && i > -1) { e.preventDefault(); items[Math.max(0, Math.min(items.length - 1, i + step))].focus(); }
    });
    const out = e => { const t = e.relatedTarget; if (t && !wrap.contains(t) && !pop.contains(t)) close(false); };
    wrap.addEventListener("focusout", out); pop.addEventListener("focusout", out);
    el.addEventListener("change", show);
    new MutationObserver(show).observe(el, { childList: true });
    show();
  };

  document.addEventListener("click", e => { if (openOne && !e.target.closest(".pk, .pk-pop")) closeAll(); });
  const run = () => document.querySelectorAll("select, input[type=date]").forEach(el => { if (!el.closest(".pk, dialog")) upgrade(el); });
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", run) : run();
})();
