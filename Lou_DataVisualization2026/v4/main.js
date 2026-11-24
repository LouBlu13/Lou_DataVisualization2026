/* Profil der Verluste · v4 (d3.js) – main.js
   Hauptansicht: Kopf, Spinnendiagramm, Minikarte, Detail, Zeitregler, Pop-up. Alles über d3-Joins. */
(() => {
"use strict";
const K = window.CORE, { S, C, PAL, G, AX, AXN, SLUG, KT, MAXSEL } = K;
const stage = d3.select("#stage");

/* ---------- Toast ---------- */
let tt;
K.toast = msg => { const t = d3.select("#toast").text(msg).classed("show", true); clearTimeout(tt); tt = setTimeout(() => t.classed("show", false), 2200); };

/* ---------- Kopf: Gletscher im Vergleich ---------- */
function renderKopf() {
  const k = d3.select("#kopf");
  k.selectAll(".kopf-empty").data(S.sel.length ? [] : [0]).join("span").attr("class", "kopf-empty").text("Wähle Gletscher für den Vergleich").lower();
  k.selectAll(".chip").data(S.sel, d => d.id).join(
    enter => {
      const c = enter.append("div").attr("class", "chip").attr("tabindex", 0).attr("role", "button");
      c.append("span").attr("class", "tag-id");
      c.append("span").attr("class", "sw-h");
      c.append("span").attr("class", "tag-name");
      c.append("button").attr("class", "rm").html(`<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`);
      return c;
    })
    .attr("data-id", d => d.id)
    .attr("aria-label", d => `${K.byId(d.id).name}: Werte anzeigen`)
    .attr("aria-pressed", d => S.tap === d.id)
    .classed("is-tap", d => S.tap === d.id)
    .classed("is-dim", d => !!S.hover && S.hover !== d.id)
    .call(c => c.select(".tag-id").text(d => K.tagId(d.slot)))
    .call(c => c.select(".sw-h").html(d => K.swatch(d.slot)))
    .call(c => c.select(".tag-name").text(d => K.byId(d.id).short))
    .call(c => c.select(".rm").attr("aria-label", d => `${K.byId(d.id).short} entfernen`)
      .on("click", (ev, d) => { ev.stopPropagation(); K.toggleSel(d.id); }))
    .on("mouseenter", (ev, d) => K.setFocus(d.id))
    .on("mouseleave", () => K.setFocus(null))
    .on("click", (ev, d) => K.setFocus(S.hover, S.tap === d.id ? null : d.id))
    .on("keydown", (ev, d) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); K.setFocus(S.hover, S.tap === d.id ? null : d.id); } })
    .order();
  const full = S.sel.length >= MAXSEL;
  k.selectAll(".add").data([0]).join("button").attr("class", "add")
    .html(`<svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>${S.sel.length ? "Gletscher" : "Gletscher wählen"}`)
    .property("disabled", full).attr("title", full ? "Maximal 5 Gletscher" : null)
    .on("click", () => openPopup())
    .raise();
}

/* ---------- Spinnendiagramm ---------- */
const RC = { cx: 720, cy: 478, R: 225 };
const angle = d3.scaleLinear().domain([0, 5]).range([0, 2 * Math.PI]);         // Achse i → Winkel (0 = oben)
const radius = d3.scaleLinear().domain([0, 1]).range([0, RC.R]);              // normierter Wert → Radius
const ptXY = (v, i) => [RC.cx + radius(v) * Math.sin(angle(i)), RC.cy - radius(v) * Math.cos(angle(i))];
const radial = d3.lineRadial().angle((d, i) => angle(i)).radius(d => radius(d)).curve(d3.curveLinearClosed);
const radar = d3.select("#radar");
const gRadar = radar.append("g").attr("transform", `translate(${RC.cx},${RC.cy})`);
const gBase = gRadar.append("g"), gShapes = gRadar.append("g"), gMarks = radar.append("g"), gVals = radar.append("g");
// Raster: Ringe bei 0/25/50/75/100 % der festen Skala, Speichen, Skalenbeschriftung
gBase.selectAll("path.ring").data([0, .25, .5, .75, 1]).join("path").attr("class", "ring")
  .attr("d", t => radial(Array(5).fill(0.15 + 0.85 * t)))
  .attr("fill", "none").attr("stroke", t => t === 1 ? C.ink : C.line).attr("stroke-dasharray", t => t === 0 || t === 1 ? null : "2 4");
const spokes = gBase.selectAll("line.spoke").data(AX).join("line").attr("class", "spoke")
  .attr("x2", (d, i) => radius(1) * Math.sin(angle(i))).attr("y2", (d, i) => -radius(1) * Math.cos(angle(i))).attr("stroke", C.line);
gBase.selectAll("text.rs").data([[0, "0"], [.5, "50"], [1, "100"]]).join("text").attr("class", "rs")
  .attr("x", -6).attr("y", d => -radius(0.15 + 0.85 * d[0]) + 4).attr("text-anchor", "end").text(d => d[1]);
// Achsenbeschriftungen (HTML-Knöpfe, führen zur Metrik-Seite)
d3.select("#axes").selectAll("button").data(AX).join("button").attr("class", "axis-btn")
  .html((d, i) => `<span class="ax-n">${AXN[i]}</span>${d}<svg width="11" height="11" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 7l4-4M3.5 3H7v3.5" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>`)
  .attr("aria-label", d => `${d}: Detailseite öffnen`)
  .each(function (d, i) {
    const b = this, s = Math.sin(angle(i)), c = -Math.cos(angle(i)), [ox, oy] = ptXY(1.1, i);
    requestAnimationFrame(() => {
      const w = b.offsetWidth, h = b.offsetHeight;
      b.style.left = (Math.abs(s) < 0.2 ? ox - w / 2 : s > 0 ? ox : ox - w) + "px";
      b.style.top = (i === 0 ? oy - h : c > 0.5 ? oy - 2 : oy - h / 2) + "px";
    });
  })
  .on("mouseenter focus", (ev, d) => spokes.filter(x => x === d).attr("stroke", C.accent))
  .on("mouseleave blur", (ev, d) => spokes.filter(x => x === d).attr("stroke", C.line))
  .on("click", (ev, d) => K.go(`#metrik/${SLUG[AX.indexOf(d)]}`));

const prevVals = new Map(); // für die Übergänge: letzte gezeichnete Werte je Gletscher
function renderRadar(animate = true) {
  const rows = S.sel.map(it => ({ ...it, v: K.DATA.N.get(it.id), m: K.DATA.M.get(it.id) }));
  const f = K.focusId();
  const dur = animate && !matchMedia("(prefers-reduced-motion: reduce)").matches ? 400 : 0;
  // Formen: Join mit enter/update/exit, Übergang interpoliert die fünf Werte
  gShapes.selectAll("path.shape").data(rows, d => d.id).join(
    enter => enter.append("path").attr("class", "shape hit").attr("d", d => radial(Array(5).fill(0.15)))
      .on("mouseenter", (ev, d) => K.setFocus(d.id)).on("mouseleave", () => K.setFocus(null))
      .on("click", (ev, d) => K.setFocus(S.hover, S.tap === d.id ? null : d.id)),
    update => update,
    exit => exit.transition().duration(dur).attr("opacity", 0).remove())
    .attr("stroke", d => PAL[d.slot].c).attr("stroke-dasharray", d => PAL[d.slot].dash).attr("stroke-linejoin", "round")
    .transition().duration(dur).ease(d3.easeCubicOut)
    .attrTween("d", function (d) { const from = prevVals.get(d.id) || Array(5).fill(0.15), it = d3.interpolate(from, d.v); prevVals.set(d.id, d.v); return t => radial(it(t)); });
  for (const id of [...prevVals.keys()]) if (!rows.some(r => r.id === id)) prevVals.delete(id);
  // Marker: pro Gletscher 5 Ecken, hohl = geschätzt
  const marks = gMarks.selectAll("g.mk").data(rows, d => d.id).join("g").attr("class", "mk")
    .on("mouseenter", (ev, d) => K.setFocus(d.id)).on("mouseleave", () => K.setFocus(null))
    .on("click", (ev, d) => K.setFocus(S.hover, S.tap === d.id ? null : d.id));
  marks.selectAll("path").data(d => d.v.map((v, i) => ({ v, i, d }))).join("path").attr("class", "hit")
    .attr("stroke", p => PAL[p.d.slot].c).attr("stroke-width", 1.5)
    .attr("fill", p => (p.i === 2 && p.d.m.est.area) || (p.i === 3 && p.d.m.est.dh) || PAL[p.d.slot].mk === "cross" ? C.paper : PAL[p.d.slot].c)
    .transition().duration(dur).ease(d3.easeCubicOut)
    .attr("d", p => { const [x, y] = ptXY(p.v, p.i); return K.markerPath(PAL[p.d.slot].mk, x, y, 3.5); });
  renderFocus();
}
// Fokus (Hover/Antippen): Hervorhebung, Werte an den Punkten, Detail, Kopf, Minikarte
function renderFocus() {
  const f = K.focusId();
  gShapes.selectAll("path.shape")
    .attr("fill", d => d.id === f ? C.tint : "none").attr("fill-opacity", d => d.id === f ? .7 : 0)
    .attr("stroke-width", d => d.id === f ? 2.25 : 1.5)
    .attr("stroke-opacity", d => !S.hover || S.hover === d.id ? 1 : .25)
    .filter(d => d.id === f).raise();
  gMarks.selectAll("g.mk").attr("opacity", d => d.id === f ? 1 : !S.hover || S.hover === d.id ? .9 : .25).filter(d => d.id === f).raise();
  // Werte direkt am Profil (nahe am Rand nach innen)
  const fr = f && K.slotOf(f) != null ? [f] : [];
  const tx = m => [K.sgn(m.mb, 2) + " m", Math.round(m.aar) + " %", K.sgn(m.areaRate, 2) + " %", K.sgn(m.dh, 2) + " m", m.len == null ? "–" : K.sgn(m.len, 0) + " m"];
  gVals.selectAll("text.rv-t").data(fr.flatMap(id => K.DATA.N.get(id).map((k, i) => ({ k, i, t: tx(K.DATA.M.get(id))[i] }))), d => d.i).join("text").attr("class", "rv-t")
    .each(function (d) {
      const s = Math.sin(angle(d.i)), c = -Math.cos(angle(d.i)), o = d.k > 0.8 ? -14 : 12, [x, y] = ptXY(d.k, d.i), side = Math.abs(s) < .2 ? 0 : (o > 0 ? s : -s);
      d3.select(this).attr("x", x + s * o + (Math.abs(s) < .2 ? 10 : 0)).attr("y", y + c * o + 4).attr("text-anchor", side >= 0 ? "start" : "end").text(d.t);
    });
  renderKopf(); renderDetail(); renderMinimapFocus();
}

/* ---------- Minikarte ---------- */
const MS = 0.44, mx = d3.scaleLinear().domain([0, 360]).range([8, 8 + 360 * MS]), my = d3.scaleLinear().domain([0, 226]).range([14 + 226 * MS, 14]);
const mini = d3.select("#minimap-svg");
const inCH = (x, y) => d3.polygonContains(K.D.ch, [x, y]);
// Relief als Punktraster: Dichte der 168 Gletscher, gemittelt mit Gauss-Kern
const RASTER = (() => { const out = [], st = 4.4 / MS; for (let x = 0; x <= 360; x += st) for (let y = 0; y <= 230; y += st) { if (!inCH(x, y)) continue; const d = d3.sum(K.D.all, ([gx, gy]) => { const q = (gx - x) ** 2 + (gy - y) ** 2; return q < 1600 ? Math.exp(-q / 200) : 0; }); out.push([x, y, Math.min(1, d / 4)]); } return out; })();
mini.append("path").attr("d", d3.line().x(d => mx(d[0])).y(d => my(d[1]))(K.D.ch) + "Z").attr("fill", "#E4E4E4");
const gRaster = mini.append("g"), gPins = mini.append("g");
function renderMinimap() {
  const sel = S.sel.map(it => ({ ...it, g: K.byId(it.id) }));
  gRaster.selectAll("circle").data(RASTER).join("circle").attr("cx", d => mx(d[0])).attr("cy", d => my(d[1]))
    .attr("r", d => { const h = sel.find(it => Math.hypot(it.g.x - d[0], it.g.y - d[1]) < 28); return 0.7 + d[2] * 0.9 + (h ? 0.35 : 0); })
    .attr("fill", d => { const h = sel.find(it => Math.hypot(it.g.x - d[0], it.g.y - d[1]) < 28); return h ? PAL[h.slot].c : "#B5B5B5"; });
  gPins.selectAll("g.pin").data(sel, d => d.id).join(enter => { const g = enter.append("g").attr("class", "pin"); g.append("circle"); g.append("path").attr("class", "x"); g.append("path").attr("class", "m"); return g; })
    .each(function (d) {
      const x = mx(d.g.x), y = my(d.g.y), p = PAL[d.slot], g = d3.select(this);
      g.select("circle").attr("cx", x).attr("cy", y).attr("r", 5.5).attr("fill", "#fff").attr("stroke", p.c).attr("stroke-width", 1.2);
      g.select("path.x").attr("d", `M${x - 9} ${y}h5M${x + 4} ${y}h5M${x} ${y - 9}v5M${x} ${y + 4}v5`).attr("stroke", p.c);
      g.select("path.m").attr("d", K.markerPath(p.mk, x, y, 2)).attr("fill", p.mk === "cross" ? "none" : p.c).attr("stroke", p.c);
    });
  d3.select("#minimap-info").text("Karte öffnen");
}
function renderMinimapFocus() { const f = K.focusId(); gPins.selectAll("g.pin").attr("opacity", d => !f || d.id === f ? 1 : .4); }
d3.select("#minimap").on("click", () => K.go("#karte"));

/* ---------- Detail unten links ---------- */
function renderDetail() {
  const d = d3.select("#detail").property("hidden", false), id = K.focusId();
  if (!id || K.slotOf(id) == null) {
    d.attr("class", "detail is-intro").html(`<div class="note"><h1 class="n-title">Profil der Verluste</h1><p class="n-q">Welcher Schweizer Gletscher <mark>verliert am schnellsten</mark>? ${S.sel.length ? "Fahre über eine Form oder tippe einen Gletscher oben an, um seine Werte zu sehen." : "Wähle oben bis zu fünf Messgletscher."}</p></div>`);
    return;
  }
  const g = K.byId(id), m = K.DATA.M.get(id), slot = K.slotOf(id);
  const v = (n, u) => `${n}<small>${u}</small>`;
  const vals = [
    ["01 Massenbilanz", v(K.sgn(m.mb, 2), "m/J")],
    ["02 Gleichgewicht", v(Math.round(m.aar) + "%", "Nährg."), `Linie auf ${K.nf(Math.round(m.ela))} m ü. M.`],
    ["03 Fläche", v((m.est.area ? "≈" : "") + K.sgn(m.areaRate, 2), "%/J")],
    ["04 Eisdicke", v((m.est.dh ? "≈" : "") + K.sgn(m.dh, 2), "m/J")],
    ["05 Rückzug", m.len == null ? "–" : v(K.sgn(m.len, 0), "m/J")]
  ];
  d.attr("class", "detail").html(`<div class="badge"><div class="b-head"><span>Messgletscher · ${K.tagId(slot)}</span>${K.swatch(slot, 34)}<span>${KT[g.kt]}</span></div>
    <div class="b-main"><div class="b-txt"><h2 class="b-name">${g.short}</h2><span class="b-full">${g.name} · ${g.area.toFixed(1)} km²</span><dl class="b-vals"></dl></div></div></div>`);
  d.select(".b-vals").selectAll("div").data(vals).join("div").attr("title", x => x[2] || null).html(x => `<dt>${x[0]}</dt><dd>${x[1]}</dd>`);
}

/* ---------- Zeitregler ---------- */
const Z = { x0: 8, w: 425, base: 72, track: 41 };
const zs = d3.select("#zeit-svg");
const zx = d3.scaleLinear().range([Z.x0, Z.x0 + Z.w]);
let hoverYear = null, dragKey = null;
const yearAt = ev => { const [px] = d3.pointer(ev, zs.node()); return Math.round(Math.max(zx.domain()[0], Math.min(zx.domain()[1], zx.invert(px)))); }; // Einrasten auf ganze Jahre
function renderZeit() {
  const [Y1, Y2] = K.span(), [s, e] = K.period(), single = S.single != null;
  zx.domain([Y1, Y2]);
  d3.select("#zeit-kicker").text(single ? `Einzeljahr · Klick = ${S.s}–${S.e}` : `Zeitraum · ${e - s + 1} Jahre`);
  d3.select("#zeit-wert").text(single ? String(S.single) : `${s}–${e}`);
  const years = d3.range(Y1, Y2 + 1).map(y => {
    const sel = single && y === S.single, hov = y === hoverYear, inR = !single && y >= s && y <= e;
    return { y, sel, hov, inR, h: sel ? 30 : hov ? 16 : y % 10 === 0 ? 16 : y % 5 === 0 ? 10 : 6, w: sel ? 3 : hov ? 2 : 1 };
  });
  zs.selectAll("rect.tick").data(years, d => d.y).join("rect").attr("class", "tick")
    .attr("x", d => zx(d.y) - (d.w > 1 ? 1 : 0)).attr("y", d => Z.base - d.h).attr("width", d => d.w).attr("height", d => d.h)
    .attr("fill", d => d.sel || d.hov || d.inR ? C.ink : C.line);
  zs.selectAll("text.zt").data(d3.range(Math.ceil(Y1 / 10) * 10, Y2 + 1, 10)).join("text").attr("class", "zt")
    .attr("x", zx).attr("y", Z.base + 18).attr("text-anchor", "middle").attr("fill", C.muted).text(d => d);
  const lbl = zs.selectAll("g.hl").data(hoverYear != null && !dragKey && hoverYear !== S.single ? [hoverYear] : []).join(enter => { const g = enter.append("g").attr("class", "hl"); g.append("rect").attr("width", 38).attr("height", 18).attr("rx", 4).attr("fill", C.ink); g.append("text").attr("class", "zt").attr("fill", "#fff").attr("text-anchor", "middle"); return g; });
  lbl.select("rect").attr("x", d => zx(d) - 19).attr("y", Z.base - 36); lbl.select("text").attr("x", zx).attr("y", Z.base - 23).text(d => d);
  // Klickfläche für Einzeljahr und Hover
  zs.selectAll("rect.ticks-hit").data([0]).join("rect").attr("class", "ticks-hit").attr("x", Z.x0 - 4).attr("y", 46).attr("width", Z.w + 8).attr("height", 46).attr("fill", "transparent")
    .on("pointermove", ev => { const y = yearAt(ev); if (y !== hoverYear) { hoverYear = y; renderZeit(); } })
    .on("pointerleave", () => { hoverYear = null; renderZeit(); })
    .on("click", ev => { const y = yearAt(ev); K.setPeriod(S.s, S.e, S.single === y ? null : y); });
  zs.selectAll("rect.track").data([0]).join("rect").attr("class", "track").attr("x", Z.x0).attr("y", Z.track - .5).attr("width", Z.w).attr("height", 1).attr("fill", C.line);
  zs.selectAll("rect.range").data(single ? [] : [[s, e]]).join("rect").attr("class", "range").attr("x", d => zx(d[0])).attr("y", Z.track - 1).attr("width", d => Math.max(0, zx(d[1]) - zx(d[0]))).attr("height", 2).attr("fill", C.ink);
  // Griffe: einzeln ziehen (d3.drag), Pfeiltasten, verschwinden im Einzeljahr
  const hs = zs.selectAll("g.handle").data(single ? [] : [{ k: "s", y: s }, { k: "e", y: e }], d => d.k).join(enter => {
    const g = enter.append("g").attr("class", "handle").attr("tabindex", 0).attr("role", "slider");
    g.append("rect").attr("class", "halo").attr("fill", C.tint); g.append("rect").attr("class", "knob").attr("fill", "#fff").attr("stroke", C.ink).attr("stroke-width", 1.2);
    g.append("path").attr("class", "needle").attr("stroke", C.accent); g.append("circle").attr("class", "grab").attr("r", 18).attr("fill", "transparent");
    return g.call(d3.drag().container(zs.node())
      .on("start", (ev, d) => { dragKey = d.k; hoverYear = null; renderZeit(); })
      .on("drag", (ev, d) => { const y = Math.round(Math.max(zx.domain()[0], Math.min(zx.domain()[1], zx.invert(ev.x)))); const [ss, ee] = K.period(); const ns = d.k === "s" ? Math.min(y, ee) : ss, ne = d.k === "e" ? Math.max(y, ss) : ee; if (ns !== ss || ne !== ee) K.setPeriod(ns, ne); })
      .on("end", () => { dragKey = null; renderZeit(); }))
      .on("keydown", (ev, d) => { if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return; ev.preventDefault(); const [Y1b, Y2b] = K.span(), [ss, ee] = K.period(), dy = ev.key === "ArrowLeft" ? -1 : 1; if (d.k === "s") K.setPeriod(Math.max(Y1b, Math.min(ee, ss + dy)), ee); else K.setPeriod(ss, Math.min(Y2b, Math.max(ss, ee + dy))); });
  });
  hs.attr("aria-label", d => d.k === "s" ? "Beginn" : "Ende").attr("aria-valuenow", d => d.y).each(function (d) {
    const act = dragKey === d.k, r = act ? 8 : 6.5, x = zx(d.y), g = d3.select(this);
    g.select(".halo").attr("x", x - 13).attr("y", Z.track - 13).attr("width", 26).attr("height", 26).attr("opacity", act ? 1 : 0);
    g.select(".knob").attr("x", x - r).attr("y", Z.track - r).attr("width", 2 * r).attr("height", 2 * r);
    g.select(".needle").attr("d", `M${x} ${Z.track - r - 4}v${2 * r + 8}`);
    g.select(".grab").attr("cx", x).attr("cy", Z.track);
  });
}

/* ---------- Pop-up «Gletscher vergleichen» ---------- */
let draft = [];
const CHECK = `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5.2l2 2 4-4.4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function openPopup() { draft = S.sel.map(x => ({ ...x })); d3.select("#popup-search").property("value", ""); renderPopup(); d3.select("#popup-overlay").property("hidden", false); document.getElementById("popup-search").focus(); }
function closePopup() { d3.select("#popup-overlay").property("hidden", true); }
function renderPopup() {
  const q = d3.select("#popup-search").property("value").trim().toLowerCase(), full = draft.length >= MAXSEL;
  d3.select("#popup-count").text(`${draft.length} von ${MAXSEL} gewählt`);
  d3.select("#popup-full").property("hidden", !full);
  const rows = d3.sort(G, g => -g.area).filter(g => !q || [g.name, g.short, KT[g.kt]].some(t => t.toLowerCase().includes(q)));
  const toggle = g => { const it = draft.find(x => x.id === g.id); if (it) draft = draft.filter(x => x.id !== g.id); else if (!full) K.addSel(draft, g.id); renderPopup(); };
  d3.select("#popup-list").selectAll("li").data(rows, g => g.id).join("li")
    .attr("class", g => { const it = draft.find(x => x.id === g.id); return "pp-row" + (it ? " is-sel" : "") + (full && !it ? " is-off" : ""); })
    .attr("role", "checkbox").attr("aria-checked", g => !!draft.find(x => x.id === g.id)).attr("tabindex", g => full && !draft.find(x => x.id === g.id) ? -1 : 0)
    .html(g => { const it = draft.find(x => x.id === g.id); return `<span class="cb${it ? " on" : ""}">${it ? CHECK : ""}</span><span class="pp-id">${g.id}</span><span class="pp-name">${g.short}</span><span class="pp-sw">${it ? `<span class="tag-id">${K.tagId(it.slot)}</span>${K.swatch(it.slot)}` : ""}</span><span class="pp-kt">${KT[g.kt]}</span><span class="pp-area">${g.area.toFixed(1)} km²</span>`; })
    .on("click", (ev, g) => toggle(g))
    .on("keydown", (ev, g) => { if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); toggle(g); } });
}
d3.select("#popup-search").on("input", renderPopup);
d3.select("#popup-reset").on("click", () => { draft = []; renderPopup(); });
d3.select("#popup-apply").on("click", () => { closePopup(); K.setSelection(draft); });
d3.select("#popup-overlay").on("click", ev => { if (ev.target.id === "popup-overlay") closePopup(); });
d3.selectAll("[data-close]").on("click", closePopup);
K.openPopup = openPopup; K.closePopup = closePopup; K.popupOpen = () => !d3.select("#popup-overlay").property("hidden");

/* ---------- Hinweis ---------- */
const renderHint = () => d3.select(".hint").text(S.sel.length ? "Aussen = mehr Verlust (Massstab: alle neun Messgletscher seit Messbeginn). Hohle Marker = geschätzt." : "");

/* ---------- Bühne füllt das Fenster ---------- */
function fit() {
  const s = Math.min(innerWidth / 1440, innerHeight / 1024);
  stage.style("--s", s).style("--k", Math.max(1, 1 / s)).style("width", innerWidth / s + "px").style("height", innerHeight / s + "px");
  K.bus.call("resize");
}
K.bus.on("data.main", () => { renderZeit(); renderRadar(); });
K.bus.on("selection.main", () => { renderHint(); renderMinimap(); });
K.bus.on("focus.main", renderFocus);
d3.select(window).on("resize.main", fit);
fit(); renderHint(); renderMinimap(); renderZeit(); renderRadar();
})();
