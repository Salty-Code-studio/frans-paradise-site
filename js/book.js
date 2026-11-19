// Booking quiz: every Book / Rent button opens a few quick questions and a wind calendar,
// then hands the visitor a ready-made WhatsApp message for Taty. Nothing is stored or sent by us.
// Wind: Open-Meteo forecast (free, no key), Sorobon / Lac Bay, knots, 9:00-18:00.
(() => {
  const PHONE = "5997850514";
  const LAT = 12.0975, LON = -68.2259;
  const API = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kn&timezone=America%2FKralendijk&forecast_days=16`;

  const RIDES = {
    windsurf: { name: "Windsurf", what: "a windsurf lesson", icon: "ph-wind" },
    wing: { name: "Wing foil", what: "a wing foil lesson", icon: "ph-paper-plane-tilt" },
    foil: { name: "Wind foil", what: "a wind foil lesson", icon: "ph-waves" },
    kids: { name: "Kids lesson", what: "a kids lesson", icon: "ph-smiley" },
    rent: { name: "Just ride", what: "", icon: "ph-surfboard" },
  };
  const LEVELS = [
    { k: "new", t: "Never tried it", s: "Starting from zero" },
    { k: "few", t: "Had a lesson or two", s: "I can stand up and sail a bit" },
    { k: "ride", t: "I can ride around", s: "Upwind, turns, maybe the harness" },
    { k: "adv", t: "I want to go further", s: "Planing, jibes, jumps, foiling" },
  ];
  // Suggested lesson per ride and level, with the wall prices
  const LESSON = {
    windsurf: { new: "Beginner windsurf, 2 hours, $50 pp", few: "Beginner windsurf, 2 hours, $50 pp", ride: "Advanced windsurf, 1 hour, $110 pp", adv: "Advanced windsurf, 1 hour, $110 pp" },
    wing: { new: "Beginner wing, 1 hour, $125 pp", few: "Wing foil, 1.5 hours, $145 pp", ride: "Wing foil, 1.5 hours, $145 pp", adv: "Private wing foil, 1 hour, $165 pp" },
    foil: { new: "Beginner wind foil, 2 hours, $125 pp", few: "Beginner wind foil, 2 hours, $125 pp", ride: "Advanced wind foil, 1 hour, $165 pp", adv: "Advanced wind foil, 1 hour, $165 pp" },
  };
  const AGES = [{ k: "7-9", t: "7 to 9 years" }, { k: "10-12", t: "10 to 12 years" }, { k: "13-16", t: "13 to 16 years" }, { k: "mixed", t: "Different ages" }];
  const GEAR = [
    { k: "Windsurf beginner set", s: "Big stable board, small sail" },
    { k: "Windsurf set", s: "Board and sail for your level" },
    { k: "Slalom set", s: "Fast boards for strong wind" },
    { k: "Wind foil and board", s: "Foil, board and sail" },
    { k: "Wing set", s: "Wing, foil board and foil" },
  ];
  const DAYS = [{ k: "1 hour", t: "1 hour" }, { k: "2 hours", t: "2 hours" }, { k: "half a day", t: "Half day" }, { k: "the whole day", t: "Full day" }];
  // Open 9:00 to 18:00: pick the hour you arrive
  const TIMES = [9, 10, 11, 12, 13, 14, 15, 16, 17].map(h => ({ k: `${h}:00`, t: `${h}:00`, h: [h] })).concat([{ k: "any", t: "Not sure", h: null }]);

  // Wind bands, same scale as the header forecast
  const band = kn => kn < 8 ? { t: "Light wind", c: "#9fb3b8" } : kn < 12 ? { t: "Perfect to learn", c: "#6ae6e0" }
    : kn < 16 ? { t: "Great for improvers", c: "#ffe234" } : kn < 22 ? { t: "Fun zone", c: "#f06a24" } : { t: "Experts only", c: "#ff6b57" };
  // How well a day's wind suits this rider: 2 good, 1 doable, 0 not ideal
  const fit = (ride, lvl, kn) => {
    const r = (lo, hi, lo2, hi2) => kn >= lo && kn <= hi ? 2 : kn >= lo2 && kn <= hi2 ? 1 : 0;
    if (ride === "kids") return r(5, 15, 3, 19);
    if (ride === "wing") return lvl === "new" ? r(13, 22, 11, 25) : r(13, 26, 10, 30);
    if (ride === "foil") return lvl === "new" || lvl === "few" ? r(10, 18, 8, 21) : r(10, 24, 8, 28);
    if (ride === "windsurf") return lvl === "new" ? r(6, 17, 4, 21) : lvl === "few" ? r(9, 19, 6, 23) : r(14, 30, 11, 34);
    return null;
  };
  const FIT = ["Not ideal", "Doable", "Good for you"];
  const compass = d => ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"][Math.round(d / 22.5) % 16];
  const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
  const vecDir = a => { let x = 0, y = 0; a.forEach(d => { x += Math.sin(d * Math.PI / 180); y += Math.cos(d * Math.PI / 180); }); return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360; };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fmt = (s, o) => new Date(s + "T12:00").toLocaleDateString("en-GB", o);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Wind data, fetched once on first open
  let wind = null, windP = null;
  const loadWind = () => windP ||= fetch(API).then(r => r.json()).then(d => {
    const h = d.hourly, out = {};
    h.time.forEach((t, i) => {
      const hr = +t.slice(11, 13); if (hr < 9 || hr > 17) return;
      const k = t.slice(0, 10), o = out[k] ||= { sp: {}, gu: [], di: [] };
      o.sp[hr] = h.wind_speed_10m[i]; o.gu.push(h.wind_gusts_10m[i]); o.di.push(h.wind_direction_10m[i]);
    });
    Object.values(out).forEach(o => { const v = Object.values(o.sp); o.kn = Math.round(avg(v)); o.gust = Math.round(Math.max(...o.gu)); o.dir = vecDir(o.di); });
    wind = out; return out;
  }).catch(() => { wind = {}; return wind; });

  // State
  let s = {}, flow = [], at = 0, back = null;
  const reset = () => { s = { model: null, ride: null, level: null, age: null, gear: null, days: null, people: null, date: null, time: null, name: "", note: "" }; };

  // Shell
  const dlg = document.createElement("dialog");
  dlg.className = "bk"; dlg.setAttribute("aria-label", "Book with Frans Paradise");
  dlg.innerHTML = `<div class="bk-card">
    <div class="bk-top"><button class="bk-ic bk-back" type="button" aria-label="Back"><i class="ph ph-arrow-left"></i></button>
      <div class="bk-bar" aria-hidden="true"><span></span></div>
      <button class="bk-ic bk-x" type="button" aria-label="Close"><i class="ph ph-x"></i></button></div>
    <div class="bk-body" aria-live="polite"></div></div>`;
  document.body.append(dlg);
  const body = dlg.querySelector(".bk-body"), bar = dlg.querySelector(".bk-bar span"), backBtn = dlg.querySelector(".bk-back");
  dlg.querySelector(".bk-x").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("close", () => { document.documentElement.classList.remove("bk-on"); if (back) back.focus?.(); });
  backBtn.addEventListener("click", () => { if (at > 0) { at--; render(); } });

  const steps = () => {
    const f = ["ride"];
    if (s.ride === "rent") { f.push("day", "days", "you"); return f; }
    if (s.ride === "kids") f.push("age"); else if (s.ride) f.push("level");
    f.push("people", "day", "you");
    return f;
  };
  const next = () => { flow = steps(); at = Math.min(at + 1, flow.length - 1); render(); };
  const chips = (list, cur, key, cls = "") => `<div class="bk-chips ${cls}">${list.map(o =>
    `<button type="button" class="bk-chip${cur === o.k ? " on" : ""}" data-k="${key}" data-v="${esc(o.k)}">${o.i ? `<i class="ph ${o.i}"></i>` : ""}<b>${esc(o.t || o.k)}</b>${o.s ? `<small>${esc(o.s)}</small>` : ""}</button>`).join("")}</div>`;
  const q = (h, p) => `<h2 class="bk-q">${h}</h2>${p ? `<p class="bk-p">${p}</p>` : ""}`;

  const views = {
    ride: () => q("What are you coming for?", "Gear is first come, first served on the beach. Lessons we plan with you.") + chips(Object.entries(RIDES).map(([k, r]) => ({ k, t: r.name, i: r.icon })), s.ride, "ride", "two"),
    level: () => q(`How much ${RIDES[s.ride].name.toLowerCase()} have you done?`, "So Taty can put you with the right instructor and gear.") + chips(LEVELS, s.level, "level"),
    age: () => q("How old are the kids?", "Kids lessons start from age 7.") + chips(AGES, s.age, "age", "two"),
    gear: () => q("What gear do you need?") + chips(GEAR, s.gear, "gear"),
    days: () => q("For how long?", "Coming back another day? Sort it out with Taty on the beach.") + chips(DAYS, s.days, "days", "two"),
    people: () => q(s.ride === "kids" ? "How many kids?" : "How many people?", s.ride === "rent" ? "" : "Groups are 5 people at most.") +
      chips(["1", "2", "3", "4", "5+"].map(k => ({ k })), s.people, "people", "row"),
    day: () => q(s.ride === "rent" ? "When are you coming?" : "Pick a day", "Each day shows the forecast wind on Lac Bay, 9:00 to 18:00.") + `<div class="bk-cal" data-cal><div class="bk-load">Loading the wind…</div></div><div class="bk-dayinfo" data-dayinfo></div>`,
    you: () => {
      const m = msg();
      return q("And your name?") + `<label class="bk-lab" for="bk-name">Name</label><input class="bk-in" id="bk-name" autocomplete="given-name" placeholder="Your first name" value="${esc(s.name)}">
        <div class="bk-lab">Your message</div><div class="bk-msg" data-msg>${esc(m)}</div>
        <a class="bk-go" data-send target="_blank" rel="noopener" href="https://wa.me/${PHONE}?text=${encodeURIComponent(m)}"><i class="ph ph-whatsapp-logo"></i>Send on WhatsApp</a>
        <p class="bk-fine">${s.ride === "rent" ? "No reservations on gear. Come down and pick what's free." : "Opens WhatsApp with this message ready."}</p>`;
    },
  };

  const msg = () => {
    const day = s.date ? fmt(s.date, { weekday: "long", day: "numeric", month: "long" }) : "soon";
    const when = s.time && s.time !== "any" ? ` around ${s.time}` : "";
    const me = s.name ? `${s.name} here. ` : "";
    if (s.ride === "rent" || !s.ride) return `What's up boys! ${me}I'm coming down on ${day}${when}${s.days ? ` for ${s.days}` : ""}. See you there 🤙`;
    const what = s.ride === "kids" ? `${s.people || "my"} kid${s.people === "1" ? "" : "s"} (${s.age ? AGES.find(a => a.k === s.age).t : "age?"})`
      : `${s.people && s.people !== "1" ? s.people + " of us" : "me"}, ${LEVELS.find(l => l.k === s.level)?.t.toLowerCase() || "any level"}`;
    return `What's up boys! ${me}Any space for a ${s.ride === "kids" ? "kids" : RIDES[s.ride].name.toLowerCase()} lesson on ${day}${when}? For ${what}. 🤙`;
  };

  const calendar = () => {
    const box = body.querySelector("[data-cal]"); if (!box) return;
    const today = new Date(); today.setHours(12);
    const start = new Date(today); start.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday of this week
    const cells = [];
    for (let i = 0; i < 21; i++) { const d = new Date(start); d.setDate(start.getDate() + i); cells.push(d); }
    const todayK = iso(today), hasWind = wind && Object.keys(wind).length;
    let html = `<div class="bk-wk">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => `<span>${d}</span>`).join("")}</div><div class="bk-grid">`;
    cells.forEach(d => {
      const k = iso(d), past = k < todayK, w = wind && wind[k], f = w ? fit(s.ride, s.level, w.kn) : null;
      const mon = d.getDate() === 1 ? `<em>${d.toLocaleDateString("en-GB", { month: "short" })}</em>` : "";
      html += `<button type="button" class="bk-day${s.date === k ? " on" : ""}${k === todayK ? " today" : ""}${f === 2 ? " fit" : ""}" data-date="${k}" ${past ? "disabled" : ""}
        ${w ? `style="--c:${band(w.kn).c}" aria-label="${fmt(k, { weekday: "long", day: "numeric", month: "long" })}, ${w.kn} knots${f != null ? ", " + FIT[f].toLowerCase() : ""}"` : ""}>
        <span class="n">${mon}${d.getDate()}</span>${w ? `<span class="kn">${w.kn}<small>kn</small></span><span class="arr" style="transform:rotate(${(w.dir + 180) % 360}deg)"></span>` : past ? "" : `<span class="kn none">·</span>`}</button>`;
    });
    html += `</div><div class="bk-key"><span><i style="--c:#6ae6e0"></i>Learn</span><span><i style="--c:#ffe234"></i>Improve</span><span><i style="--c:#f06a24"></i>Fun</span><span><i style="--c:#ff6b57"></i>Strong</span>${s.ride !== "rent" ? `<span class="g">Good for you</span>` : ""}</div>`;
    if (!hasWind) html += `<p class="bk-fine">Forecast not available right now. Pick any day and Taty will tell you about the wind.</p>`;
    box.innerHTML = html;
    dayInfo();
  };
  const dayInfo = () => {
    const box = body.querySelector("[data-dayinfo]"); if (!box) return;
    if (!s.date) { box.innerHTML = ""; return; }
    const w = wind && wind[s.date], f = w ? fit(s.ride, s.level, w.kn) : null, b = w && band(w.kn);
    const head = fmt(s.date, { weekday: "long", day: "numeric", month: "long" });
    const tm = TIMES.map(t => { const v = w && t.h ? t.h.map(h => w.sp[h]).filter(x => x != null) : []; return { ...t, s: v.length ? `${Math.round(avg(v))} kn` : t.k === "any" ? "Flexible" : "" }; });
    box.innerHTML = `<div class="bk-sel"><div><b>${head}</b>${w ? `<span>${w.kn} kn from ${compass(w.dir)}, gusts ${w.gust}. ${b.t}.</span>` : `<span>No forecast yet for this day.</span>`}</div>
      ${f != null ? `<em class="f${f}">${FIT[f]}</em>` : ""}</div>${q(s.ride === "rent" ? "What time will you be there?" : "What time suits you?")}${chips(tm, s.time, "time", "hours")}`;
  };

  const render = () => {
    flow = steps(); const id = flow[at];
    bar.style.width = `${((at + 1) / flow.length) * 100}%`;
    backBtn.style.visibility = at ? "visible" : "hidden";
    body.innerHTML = `<div class="bk-step">${views[id]()}</div>`;
    if (id === "day") { if (wind) calendar(); else loadWind().then(() => { if (flow[at] === "day") calendar(); }); }
    if (id === "you") {
      const n = body.querySelector("#bk-name"), out = body.querySelector("[data-msg]"), go = body.querySelector("[data-send]");
      const sync = () => { s.name = n.value.trim(); const m = msg(); out.textContent = m; go.href = `https://wa.me/${PHONE}?text=${encodeURIComponent(m)}`; };
      n.addEventListener("input", sync);
      setTimeout(() => { if (matchMedia("(hover:hover)").matches) n.focus(); }, 60);
    } else body.querySelector(".bk-chip.on, .bk-chip, .bk-day:not([disabled])")?.focus({ preventScroll: true });
    body.scrollTop = 0;
  };

  body.addEventListener("click", e => {
    const c = e.target.closest(".bk-chip"), d = e.target.closest(".bk-day");
    if (d && !d.disabled) { s.date = d.dataset.date; body.querySelectorAll(".bk-day").forEach(x => x.classList.toggle("on", x === d)); dayInfo();
      body.querySelector("[data-dayinfo]").scrollIntoView({ block: "nearest", behavior: "smooth" }); return; }
    if (!c) return;
    const k = c.dataset.k, v = c.dataset.v;
    if (k === "ride" && s.ride !== v) { s.level = s.age = s.gear = s.days = null; }
    s[k] = v; c.parentElement.querySelectorAll(".bk-chip").forEach(x => x.classList.toggle("on", x === c));
    setTimeout(next, 160);
  });

  const open = (preset = {}, from) => {
    reset(); Object.assign(s, preset); back = from; loadWind();
    flow = steps(); at = 0;
    // skip what the button already told us
    while (at < flow.length - 1 && s[{ ride: "ride", level: "level", age: "age", gear: "gear", days: "days" }[flow[at]]]) { at++; flow = steps(); }
    render(); document.documentElement.classList.add("bk-on");
    dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", "");
  };
  window.fpBook = open;

  // Read a button: which ride, level or gear it was about
  const read = a => {
    const t = ((a.dataset.wa || "") + " " + a.textContent + " " + (a.getAttribute("href") || "")).toLowerCase().replace(/%20/g, " ");
    if (/\brent\b|rent |coming/.test(t)) {
      const g = /wing set/.test(t) ? "Wing set" : /beginner set/.test(t) ? "Windsurf beginner set" : /slalom/.test(t) ? "Slalom set" : /wind foil/.test(t) ? "Wind foil and board" : /equipment set/.test(t) ? "Windsurf set" : null;
      return { ride: "rent", gear: g, model: a.dataset.model || null };
    }
    if (!/\bbook|plan /.test(t)) return null;
    const ride = /kids/.test(t) ? "kids" : /\bwing/.test(t) ? "wing" : /wind foil/.test(t) ? "foil" : /windsurf/.test(t) ? "windsurf" : null;
    const p = { ride };
    if (ride && ride !== "kids") { if (/intermediate/.test(t)) p.level = "ride"; else if (/advanced/.test(t)) p.level = "adv"; }
    if (/this wind/.test(t)) p.date = iso(new Date());
    return p;
  };
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href*="wa.me"]'); if (!a || dlg.contains(a) || e.metaKey || e.ctrlKey) return;
    const p = read(a); if (!p) return;
    e.preventDefault(); e.stopPropagation(); open(p, a);
  }, true);
})();
