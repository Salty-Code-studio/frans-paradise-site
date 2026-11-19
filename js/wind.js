// Wind on Lac Bay: adds a live-wind pill to the header and a drop-down forecast panel.
// Data: Open-Meteo forecast (free, no key), Sorobon / Lac Bay, knots.
(() => {
  const nav = document.getElementById("nav"), cta = nav && nav.querySelector(".nav-cta");
  if (!nav || !cta) return;
  const LAT = 12.0975, LON = -68.2259;
  const API = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kn&timezone=America%2FKralendijk&forecast_days=7`;
  const compass = d => ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round(d / 22.5) % 16];
  // Bands for a school: what the wind means for a lesson at Frans Paradise
  const band = kn => kn < 8 ? { k: "light", t: "Light wind", c: "#9fb3b8", say: "Light and glassy. Kids and first-timers can still play; ask us about the day." }
    : kn < 12 ? { k: "learn", t: "Perfect to learn", c: "#6ae6e0", say: "Light, steady breeze on flat water. Ideal for a first windsurf lesson." }
    : kn < 16 ? { k: "improve", t: "Great for improvers", c: "#ffe234", say: "Enough to hook in. Harness, footstraps and first planing runs." }
    : kn < 22 ? { k: "fun", t: "Fun zone", c: "#f06a24", say: "Trade winds are on. Planing, wing foil and foiling weather." }
    : { k: "expert", t: "Experts only", c: "#ff6b57", say: "Strong and punchy. Small sails, advanced riders, rescue boat ready." };
  const arrow = '<svg class="arr" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2l5 18-5-4-5 4z"/></svg>';
  const caret = '<svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

  const btn = document.createElement("button");
  btn.className = "wind-btn"; btn.type = "button";
  btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "wind-panel");
  btn.setAttribute("aria-label", "Wind on Lac Bay now. Open forecast");
  btn.innerHTML = `<span class="live" aria-hidden="true"></span>${arrow}<span class="kn">--<small>kn</small></span>${caret}`;
  cta.prepend(btn);
  // a copy for the phone menu
  const menu = nav.querySelector("ul"), li = document.createElement("li"), btn2 = btn.cloneNode(true);
  li.className = "wind-li"; li.appendChild(btn2); if (menu) menu.prepend(li);
  const pills = [btn, btn2];

  const ticks = Array.from({ length: 24 }, (_, i) => { const a = i * 15; if (a % 90 === 0) return ""; const r = (a - 90) * Math.PI / 180;
    return `<line class="tick" x1="${50 + 40 * Math.cos(r)}" y1="${50 + 40 * Math.sin(r)}" x2="${50 + 45 * Math.cos(r)}" y2="${50 + 45 * Math.sin(r)}"/>`; }).join("");
  const panel = document.createElement("div");
  panel.className = "wind-panel"; panel.id = "wind-panel"; panel.setAttribute("role", "region"); panel.setAttribute("aria-label", "Wind forecast for Lac Bay");
  panel.innerHTML = `<div class="inner"><div class="wf-body">
    <div class="wf-head"><span class="wf-title">Wind on Lac Bay</span><span class="wf-loc"><i class="ph ph-map-pin"></i>Sorobon, Bonaire</span><span class="wf-status" data-w="status">Loading…</span></div>
    <div class="wf-row">
      <div class="wf-tile wf-now">
        <svg class="wf-compass" viewBox="0 0 100 100" aria-hidden="true"><circle class="ring" cx="50" cy="50" r="46"/>${ticks}
          <text x="50" y="12">N</text><text x="89" y="50">E</text><text x="50" y="89">S</text><text x="11" y="50">W</text>
          <path class="needle" d="M50 50 L45 56 L50 14 L55 56 Z"/><circle class="hub" cx="50" cy="50" r="3.5"/></svg>
        <div><div class="wf-speed"><span data-w="kn">--</span><small>kn</small></div>
          <div class="wf-dir">From <b data-w="from">--</b> · <span data-w="temp">--</span>°C</div>
          <div class="wf-gust">Gusting to <span data-w="gust">--</span> kn</div>
          <div class="wf-verdict" data-w="verdict">--</div></div>
      </div>
      <div class="wf-tile wf-chart"><h4>Today, 9:00 to 18:00</h4><svg data-w="chart" viewBox="0 0 600 200" role="img" aria-label="Wind speed through the day"></svg></div>
    </div>
    <p class="wf-remark" data-w="remark"></p>
    <div class="wf-days" data-w="days"></div>
    <div class="wf-foot"><span>Daily figure = average 10:00–18:00. Forecast by Open-Meteo, so check with us on the beach.</span>
      <a class="btn" data-w="book" href="https://wa.me/5997850514">Book for this wind</a></div>
  </div></div>`;
  nav.after(panel);
  const scrim = document.createElement("div"); scrim.className = "wf-scrim"; panel.after(scrim);
  const $ = k => panel.querySelector(`[data-w="${k}"]`);

  const place = () => panel.style.setProperty("--wf-top", nav.getBoundingClientRect().bottom + "px");
  const toggle = open => { if (open) nav.classList.remove("open"); place(); panel.classList.toggle("open", open); scrim.classList.toggle("on", open);
    document.documentElement.classList.toggle("wf-on", open); pills.forEach(b => b.setAttribute("aria-expanded", open)); };
  pills.forEach(b => b.addEventListener("click", () => toggle(!panel.classList.contains("open"))));
  scrim.addEventListener("click", () => toggle(false));
  addEventListener("keydown", e => { if (e.key === "Escape") toggle(false); });
  addEventListener("resize", place);

  const chart = (times, sp) => {
    const W = 600, H = 200, L = 28, R = 8, T = 22, B = 170, n = sp.length, top = Math.max(25, Math.ceil(Math.max(...sp) / 5) * 5);
    const bw = (W - L - R) / n, y = v => B - v / top * (B - T);
    let g = '<g class="grid">'; for (let v = 0; v <= top; v += 5) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`; g += '</g><g class="axis">';
    for (let v = 0; v <= top; v += 10) g += `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    sp.forEach((v, i) => { const x = L + i * bw, c = band(v).c;
      g += `<rect class="bar" x="${x + bw * .18}" y="${y(v)}" width="${bw * .64}" height="${B - y(v)}" rx="5" fill="${c}"/>`;
      g += `<text class="val" x="${x + bw / 2}" y="${y(v) - 6}">${Math.round(v)}</text>`;
      if (i % 2 === 0) g += `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${times[i].slice(11, 16)}</text>`; });
    $("chart").innerHTML = g + "</g>";
  };

  fetch(API).then(r => r.json()).then(d => {
    const c = d.current, kn = c.wind_speed_10m, b = band(kn);
    pills.forEach(p => { p.querySelector(".kn").innerHTML = `${Math.round(kn)}<small>kn</small>`;
      p.querySelector(".arr").style.transform = `rotate(${(c.wind_direction_10m + 180) % 360}deg)`;
      p.setAttribute("aria-label", `Wind on Lac Bay: ${Math.round(kn)} knots from ${compass(c.wind_direction_10m)}. Open forecast`); });
    $("kn").textContent = Math.round(kn); $("gust").textContent = Math.round(c.wind_gusts_10m);
    $("from").textContent = compass(c.wind_direction_10m); $("temp").textContent = Math.round(c.temperature_2m);
    $("verdict").textContent = b.t; $("verdict").style.setProperty("--wf-c", b.c); $("remark").textContent = b.say;
    panel.querySelector(".needle").style.transform = `rotate(${(c.wind_direction_10m + 180) % 360}deg)`;
    $("status").textContent = "Live · updated " + c.time.slice(11, 16);
    $("book").href = "https://wa.me/5997850514?text=" + encodeURIComponent(`Hi! The wind on Lac Bay is about ${Math.round(kn)} kn. Can I book a lesson?`);
    const h = d.hourly, today = c.time.slice(0, 10), idx = h.time.map((t, i) => i).filter(i => h.time[i].startsWith(today) && +h.time[i].slice(11, 13) >= 9 && +h.time[i].slice(11, 13) <= 18);
    const use = idx.length ? idx : h.time.map((t, i) => i).slice(0, 10);
    chart(use.map(i => h.time[i]), use.map(i => h.wind_speed_10m[i]));
    const days = {}; h.time.forEach((t, i) => { const hr = +t.slice(11, 13); if (hr >= 10 && hr <= 18) (days[t.slice(0, 10)] ||= []).push(h.wind_speed_10m[i]); });
    $("days").innerHTML = Object.entries(days).slice(0, 7).map(([day, a]) => {
      const k = Math.round(a.reduce((s, v) => s + v, 0) / a.length), bb = band(k);
      const name = day === today ? "Today" : new Date(day + "T12:00").toLocaleDateString("en-US", { weekday: "short" });
      return `<div class="wf-day" style="--wf-c:${bb.c}"><div class="d">${name}</div><div class="k">${k}<em>kn</em></div><div class="bar"><span style="width:${Math.min(100, k / 28 * 100)}%"></span></div><div class="r">${bb.t}</div></div>`;
    }).join("");
  }).catch(() => { pills.forEach(p => p.querySelector(".kn").innerHTML = "Wind"); $("status").textContent = "Forecast unavailable"; $("remark").textContent = "We couldn't load the forecast. Message us and we'll tell you how the wind is."; });
})();

/* Footer Instagram block: split-flap follower counter, after arxongomperts.com */
(()=>{const flips=document.querySelectorAll('[data-ig-flip]');if(!flips.length)return;
 const paint=(el,n)=>{const str=String(n);el.innerHTML=[...str].map(c=>`<span class="fd"><b>${c}</b><i></i></span>`).join('');el.setAttribute('aria-label',`${n} followers`)};
 flips.forEach(el=>paint(el,+el.dataset.value||0));
 if(!('IntersectionObserver' in window))return;
 flips.forEach(el=>{const io=new IntersectionObserver(es=>{if(!es[0].isIntersecting)return;io.disconnect();
  [...el.children].forEach((d,k)=>setTimeout(()=>{d.querySelector('i').textContent='0';d.classList.remove('flip');void d.offsetWidth;d.classList.add('flip')},k*90))},{threshold:.6});io.observe(el)})})();
