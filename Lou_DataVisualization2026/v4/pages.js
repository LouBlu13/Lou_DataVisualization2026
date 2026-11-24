/* Profil der Verluste · v4 (d3.js) – pages.js
   Navigation (#karte, #metrik/<name>, #info/<kontext>) und Unterseiten: Karte, Isotype-Metriken, Info. */
(() => {
"use strict";
const K = window.CORE, { S, C, PAL, G, KT, AXN, MAXSEL, LAST } = K;
const page = d3.select("#page");
const FONT = "system-ui, -apple-system, Segoe UI, Arial, sans-serif";
let hl = null;

/* ---------- Metriken: Erklärung, Alltagsgrösse, Berechnung ---------- */
const big = v => { const a = Math.abs(v); return a >= 1e9 ? K.nf(v / 1e9, 1) + " Mrd." : a >= 1e6 ? K.nf(v / 1e6, 1) + " Mio." : a >= 1000 ? K.nf(Number(v.toPrecision(3))) : K.nf(v, a < 10 ? 1 : 0); };
const count = n => n >= 1000 ? K.nf(Number(n.toPrecision(3))) : n >= 10 ? K.nf(Math.round(n)) : K.nf(n, 1);
const META = [
  { slug: "massenbilanz", name: "Massenbilanz", lead: "Wie viel Eis ein Gletscher in einem Jahr gewinnt oder verliert, verteilt als Wasserschicht über seine ganze Fläche. Unter null heisst: Er schmilzt.",
    icon: "pool", unit: 2500, one: "Olympiabecken", many: "Olympiabecken", ref: "Ein olympisches Schwimmbecken fasst 2'500 m³ Wasser (50 × 25 × 2 m).",
    calc: (g, s, e) => ({ v: d3.sum(d3.range(s, e + 1), y => { const r = g.mbY.get(y); return r ? -r.a / 1000 * r.A * 1e6 : 0; }) }),
    sub: (r, n) => `${big(Math.abs(r.v))} m³ Wasser ${r.v >= 0 ? "verloren" : "gewonnen"}${n > 1 ? `, rund ${K.nf(Number((Math.abs(r.v) / 2500 / n).toPrecision(2)))} Becken pro Jahr` : ""}`,
    phys: r => `${big(r.v)} m³` },
  { slug: "gleichgewichtslinie", name: "Gleichgewichtslinie", lead: "Die Höhe, bis zu der im Sommer Schnee liegen bleibt. Steigt sie, schrumpft das Gebiet, das den Gletscher nährt. Im Profil zählt dieser Anteil.",
    icon: "tower", unit: 126, one: "Prime Tower", many: "Prime Tower", ref: "Der Prime Tower in Zürich ist 126 m hoch.",
    calc: (g, s, e, Y1) => {
      const avg = (a, b) => d3.mean(d3.range(a, b + 1).map(y => g.mbY.get(y)).filter(Boolean), r => r.ela);
      const r0 = avg(Y1, Math.min(Y1 + 9, LAST)), r1 = avg(s, e);
      return { v: r0 == null || r1 == null ? null : r1 - r0, ela: r1 }; // ohne Messung im Vergleichsjahrzehnt kein Vergleich
    },
    sub: (r, n, Y1) => r.v == null ? `Keine Messung ${Y1}–${Y1 + 9}, kein Vergleich möglich` : `Schneegrenze ${r.v >= 0 ? "höher" : "tiefer"} als ${Y1}–${Y1 + 9}, heute ${K.nf(Math.round(r.ela))} m ü. M.`,
    phys: r => r.v == null ? "–" : `${K.sgn(r.v, 0)} m` },
  { slug: "flaeche", name: "Fläche", lead: "Wie viel Land das Eis bedeckt, gemessen am ersten Jahr. So lassen sich grosse und kleine Gletscher vergleichen. Zwischen zwei Vermessungen ist der Wert geschätzt.",
    icon: "field", unit: 7140, one: "Fussballfeld", many: "Fussballfelder", ref: "Ein Fussballfeld misst 105 × 68 m, also 7'140 m².", est: m => m.est.area,
    calc: (g, s, e) => { const at = y => K.interp(g.areaMB, Math.max(g.areaMB[0][0], y)); return { v: (at(s - 1) - at(e)) * 1e6 }; },
    sub: r => `${K.nf(Math.abs(r.v) / 1e6, 2)} km² Eis ${r.v >= 0 ? "verschwunden" : "dazugekommen"}`,
    phys: r => `${K.nf(r.v / 1e6, 2)} km²` },
  { slug: "eisdicke", name: "Eisdicke", lead: "Um wie viel das Eis im Mittel dünner wird. Gemessen durch den Vergleich von Höhenmodellen aus verschiedenen Jahren.",
    icon: "storey", unit: 3, one: "Stockwerk", many: "Stockwerke", ref: "Ein Stockwerk misst rund 3 m.", est: m => m.est.dh,
    calc: (g, s, e, Y1, m) => ({ v: -m.dh * (e - s + 1) }),
    sub: r => `Eis im Mittel ${K.nf(Math.abs(r.v), 1)} m ${r.v >= 0 ? "dünner" : "dicker"}`,
    phys: r => `${K.nf(r.v, 1)} m` },
  { slug: "rueckzug", name: "Rückzug", lead: "Wie weit sich die Gletscherzunge zurückzieht, aufsummiert über den gewählten Zeitraum.",
    icon: "track", unit: 100, one: "100-Meter-Bahn", many: "100-Meter-Bahnen", ref: "Eine Sprintbahn misst 100 m.",
    calc: (g, s, e) => { const ys = d3.range(s, e + 1).filter(y => g.lenY.has(y)); return { v: ys.length ? -d3.sum(ys, y => g.lenY.get(y)) : null }; },
    sub: r => r.v == null ? "Keine Längenmessung im Zeitraum" : `Zunge ${K.nf(Math.abs(r.v))} m ${r.v >= 0 ? "zurückgewichen" : "vorgestossen"}`,
    phys: r => r.v == null ? "–" : `${K.nf(r.v)} m` }
];
// Isotype-Piktogramme (Umriss; Zuwachs gestrichelt). v = hohes Symbol → wird von unten angeschnitten
const ICON = {
  pool: { w: 28, h: 18, draw: (f, o) => `<rect x=".75" y=".75" width="26.5" height="16.5" rx="2" fill="#fff" stroke="${f}" stroke-width="1.25"${o ? ' stroke-dasharray="2 2"' : ""}/>${o ? "" : `<path d="M4 6h20M4 9h20M4 12h20" stroke="${f}" stroke-width=".75" stroke-dasharray="2.5 2"/>`}` },
  field: { w: 28, h: 18, draw: (f, o) => `<rect x=".75" y=".75" width="26.5" height="16.5" fill="#fff" stroke="${f}" stroke-width="1.25"${o ? ' stroke-dasharray="2 2"' : ""}/>${o ? "" : `<g fill="none" stroke="${f}" stroke-width=".75"><path d="M14 1v16"/><circle cx="14" cy="9" r="3.2"/><path d="M1 5.5h3.5v7H1M27 5.5h-3.5v7H27"/></g>`}` },
  storey: { w: 22, h: 20, v: true, draw: (f, o) => `<rect x=".75" y=".75" width="20.5" height="18.5" fill="#fff" stroke="${f}" stroke-width="1.25"${o ? ' stroke-dasharray="2 2"' : ""}/>${o ? "" : `<g fill="none" stroke="${f}" stroke-width=".75"><rect x="4" y="6" width="3.5" height="6.5"/><rect x="9.25" y="6" width="3.5" height="6.5"/><rect x="14.5" y="6" width="3.5" height="6.5"/></g>`}` },
  tower: { w: 13, h: 34, v: true, draw: (f, o) => `<path d="M1.75 33.25h9.5L10.25.75h-7.5z" fill="#fff" stroke="${f}" stroke-width="1.25"${o ? ' stroke-dasharray="2 2"' : ""}/>${o ? "" : `<path d="M3 6h7M3 11h7M3 16h7M3 21h7M3 26h7" stroke="${f}" stroke-width=".75"/>`}` },
  track: { w: 32, h: 14, draw: (f, o) => `<rect x=".75" y=".75" width="30.5" height="12.5" fill="#fff" stroke="${f}" stroke-width="1.25"${o ? ' stroke-dasharray="2 2"' : ""}/>${o ? "" : `<path d="M3 4.9h22M3 9.1h22" stroke="${f}" stroke-width=".75" stroke-dasharray="2.5 2"/><path d="M27.5 1v12" stroke="${f}" stroke-width="1.25"/>`}` }
};
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 1e4, 2e4, 5e4, 1e5, 2e5, 5e5, 1e6];
const SC = 1.3;

/* ---------- Navigation ---------- */
const stack = [location.hash];
const route = () => { const [p, q] = location.hash.replace(/^#/, "").split("/"); return { p: p || "", q: q || "" }; };
const back = () => { if (stack.length > 1) history.back(); else location.hash = ""; };
d3.select(window).on("hashchange.pages", () => {
  if (stack.length > 1 && stack[stack.length - 2] === location.hash) stack.pop(); else stack.push(location.hash);
  hl = null; K.setFocus(null); render();
});
d3.select(document).on("keydown.pages", ev => { if (ev.key !== "Escape") return; if (K.popupOpen()) K.closePopup(); else if (route().p) back(); });
d3.select("#info-btn").on("click", () => { const r = route(); if (r.p === "info") back(); else K.go(r.p === "karte" ? "#info/karte" : r.p === "metrik" ? `#info/${r.q}` : "#info"); });

function frame(title, lead, chap) {
  page.html("");
  const top = page.append("header").attr("class", "pg-top");
  top.append("button").attr("class", "pg-back").attr("aria-label", "Zurück").on("click", back)
    .html(`<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Vergleich`);
  const t = top.append("div").attr("class", "pg-title");
  if (chap) t.append("span").attr("class", "chap").text(chap);
  t.append("h1").text(title);
  if (lead) t.append("p").attr("class", "pg-lead").text(lead);
  return { top, body: page.append("div").attr("class", "pg-body") };
}
const isSel = id => K.slotOf(id) != null;

/* ---------- Seite: grosse Karte ---------- */
let RASTER2 = null;
const raster = () => RASTER2 || (RASTER2 = d3.range(0, 361, 4.5).flatMap(x => d3.range(0, 231, 4.5).map(y => [x, y]))
  .filter(p => d3.polygonContains(K.D.ch, p))
  .map(([x, y]) => [x, y, Math.min(1, d3.sum(K.D.all, ([gx, gy]) => { const q = (gx - x) ** 2 + (gy - y) ** 2; return q < 1600 ? Math.exp(-q / 200) : 0; }) / 4)]));
function renderKarte() {
  const { body } = frame("Alle Gletscher der Schweiz", "Nur die neun Messgletscher haben Daten zu allen fünf Metriken. Klicke einen an, um ihn zu vergleichen.", "Karte");
  body.style("grid-template-columns", "1fr calc(430px * var(--k, 1))");
  const box = body.append("section").attr("class", "pcard map-card"), side = body.append("section").attr("class", "pcard side-card");
  const tip = box.append("div").attr("class", "tip").property("hidden", true);
  const W = box.node().clientWidth, H = box.node().clientHeight - 28;
  const k = Math.min((W - 40) / 360, (H - 40) / 230);
  const X = d3.scaleLinear().domain([0, 360]).range([(W - 360 * k) / 2, (W + 360 * k) / 2]);
  const Y = d3.scaleLinear().domain([0, 230]).range([(H + 230 * k) / 2, (H - 230 * k) / 2]);
  const svg = box.insert("svg", ":first-child").attr("class", "map-svg").attr("width", W).attr("height", H);
  svg.append("path").attr("d", d3.line().x(d => X(d[0])).y(d => Y(d[1]))(K.D.ch) + "Z").attr("fill", "#E9E9E9").attr("stroke", C.line);
  svg.append("g").selectAll("circle").data(raster()).join("circle").attr("cx", d => X(d[0])).attr("cy", d => Y(d[1])).attr("r", d => 0.8 + d[2] * 1.4).attr("fill", d => d[2] > 0.05 ? "#B5B5B5" : "#DADADA");
  const showTip = (x, y, html) => tip.html(html).property("hidden", false).style("left", Math.min(x + 16, W - 250) + "px").style("top", Math.max(y - 24, 8) + "px");
  const hideTip = () => tip.property("hidden", true);
  // weitere Gletscher ohne vollständige Messreihen
  svg.append("g").selectAll("rect").data(K.D.all.filter(([x, y]) => !G.some(g => Math.hypot(g.x - x, g.y - y) < 1))).join("rect")
    .attr("class", "other").attr("x", d => X(d[0]) - 2).attr("y", d => Y(d[1]) - 2).attr("width", 4).attr("height", 4).attr("fill", C.muted)
    .on("mouseenter", (ev, d) => showTip(X(d[0]), Y(d[1]), "<b>Gletscher ohne Messreihe</b><em>Nicht vergleichbar</em>")).on("mouseleave", hideTip);
  // Beschriftungen ohne Überlappung und innerhalb des Rahmens; Gewählte bekommen zuerst Platz
  const KK = parseFloat(getComputedStyle(document.getElementById("stage")).getPropertyValue("--k")) || 1;
  const boxes = [], LP = new Map();
  d3.sort(G, g => -isSel(g.id), g => -g.area).forEach(g => {
    const x = X(g.x), y = Y(g.y), w = (g.short.length + (isSel(g.id) ? 5 : 0)) * 7.2 * KK;
    const opts = [[x + 14, y + 4, "start", x + 14], [x - 14, y + 4, "end", x - 14 - w], [x, y + 26, "middle", x - w / 2], [x, y - 20, "middle", x - w / 2]];
    let pick = opts[0];
    for (const o of opts) { const b = [o[3] - 2, o[1] - 12, o[3] + w + 2, o[1] + 4]; if (b[0] < 4 || b[2] > W - 4) continue; if (!boxes.some(q => b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1])) { boxes.push(b); pick = o; break; } }
    LP.set(g.id, pick);
  });
  const mg = svg.append("g").selectAll("g.mg").data(d3.sort(G, g => isSel(g.id)), g => g.id).join("g").attr("class", "mg").attr("data-id", g => g.id)
    .attr("tabindex", 0).attr("role", "checkbox").attr("aria-checked", g => isSel(g.id)).attr("aria-label", g => g.name)
    .each(function (g) {
      const x = X(g.x), y = Y(g.y), p = isSel(g.id) ? PAL[K.slotOf(g.id)] : null, col = p ? p.c : C.ink, sel = d3.select(this);
      sel.append("circle").attr("cx", x).attr("cy", y).attr("r", p ? 9 : 6).attr("fill", "#fff").attr("stroke", col).attr("stroke-width", 1.25);
      sel.append("path").attr("d", `M${x - 14} ${y}h${p ? 4 : 6}M${x + 14} ${y}h${p ? -4 : -6}M${x} ${y - 14}v${p ? 4 : 6}M${x} ${y + 14}v${p ? -4 : -6}`).attr("stroke", col);
      if (p) sel.append("path").attr("d", K.markerPath(p.mk, x, y, 3.5)).attr("fill", p.mk === "cross" ? "none" : col).attr("stroke", col).attr("stroke-width", 1.5);
      const [lx, ly, la] = LP.get(g.id);
      sel.append("text").attr("x", lx).attr("y", ly).attr("text-anchor", la).attr("font-family", FONT).style("font-size", "calc(12px*var(--k,1))")
        .attr("fill", p ? C.ink : C.muted).attr("paint-order", "stroke").attr("stroke", "#F4F4F4").attr("stroke-width", 4).attr("stroke-linejoin", "round")
        .text((p ? K.tagId(K.slotOf(g.id)) + " " : "") + g.short);
    })
    .on("mouseenter", (ev, g) => { showTip(X(g.x), Y(g.y), `<b>${g.name}</b><em>${KT[g.kt]}, ${g.area.toFixed(1)} km²</em>`); hl = g.id; mark(); })
    .on("mouseleave", () => { hideTip(); hl = null; mark(); })
    .on("click", (ev, g) => K.toggleSel(g.id))
    .on("keydown", (ev, g) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); K.toggleSel(g.id); } });
  // Massstab
  const L = 50 * k, sb = svg.append("g");
  sb.append("path").attr("d", `M${W - 12 - L} ${H - 8}v6h${L}v-6`).attr("fill", "none").attr("stroke", C.ink);
  sb.append("text").attr("x", W - 12).attr("y", H - 14).attr("text-anchor", "end").attr("font-family", FONT).style("font-size", "calc(12px*var(--k,1))").attr("fill", C.muted).text("50 km");
  box.append("p").attr("class", "map-legend").html(`<span class="lg-pin"></span>Im Vergleich <span class="lg-ring"></span>Messgletscher <span class="lg-dot"></span>Weitere Gletscher ohne vollständige Daten`);
  // Liste daneben
  side.append("h2").attr("class", "pg-h").html(`Messgletscher<span>${S.sel.length} von ${MAXSEL}</span>`);
  const rows = side.append("ul").attr("class", "pp-list side-list").selectAll("li").data(d3.sort(G, g => -g.area), g => g.id).join("li")
    .attr("class", g => "pp-row" + (isSel(g.id) ? " is-sel" : "") + (!isSel(g.id) && S.sel.length >= MAXSEL ? " is-off" : ""))
    .attr("role", "checkbox").attr("aria-checked", g => isSel(g.id)).attr("tabindex", 0)
    .html(g => { const s = K.slotOf(g.id); return `<span class="cb${s != null ? " on" : ""}">${s != null ? `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5.2l2 2 4-4.4" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ""}</span><span class="pp-id">${g.id}</span><span class="pp-name">${g.short}</span><span class="pp-sw">${s != null ? `<span class="tag-id">${K.tagId(s)}</span>${K.swatch(s)}` : ""}</span><span class="pp-area">${g.area.toFixed(1)} km²</span>`; })
    .on("click", (ev, g) => K.toggleSel(g.id))
    .on("keydown", (ev, g) => { if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); K.toggleSel(g.id); } })
    .on("mouseenter", (ev, g) => { hl = g.id; mark(); }).on("mouseleave", () => { hl = null; mark(); });
  function mark() { rows.classed("is-hl", g => g.id === hl); mg.classed("is-hl", g => g.id === hl); }
}

/* ---------- Seite: Metrik – Isotype (nach Otto Neurath) + Rangliste ---------- */
function renderMetrik(slug) {
  const i = Math.max(0, META.findIndex(m => m.slug === slug)), M = META[i];
  const { top, body } = frame(M.name, M.lead, `${AXN[i]} — ${M.name}`);
  top.append("nav").attr("class", "pg-tabs").attr("aria-label", "Metriken").selectAll("button").data(META).join("button")
    .attr("class", m => "pg-tab" + (m === M ? " is-on" : "")).attr("aria-current", m => m === M ? "page" : null).text(m => m.name)
    .on("click", (ev, m) => K.go(`#metrik/${m.slug}`));
  body.style("grid-template-columns", "1fr calc(430px * var(--k, 1))");
  const left = body.append("div").attr("class", "pg-col"), right = body.append("section").attr("class", "pcard rank-card");
  const [s, e] = K.period(), [Y1] = K.span(), single = S.single != null, n = e - s + 1;
  const leg = left.append("div").attr("class", "pg-legend");
  leg.append("button").attr("class", "add").property("disabled", S.sel.length >= MAXSEL).on("click", K.openPopup)
    .html(`<svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>Gletscher`);
  leg.append("button").attr("class", "pg-period").attr("title", "Zeitraum im Vergleich ändern").on("click", () => K.go(""))
    .html(`${single ? "Einzeljahr" : "Zeitraum"} <b>${single ? S.single : `${s}–${e}`}</b>`);

  // Isotype für die gewählten Gletscher
  const box = left.append("section").attr("class", "pcard iso"), I = ICON[M.icon];
  const rows = S.sel.map(it => { const g = K.byId(it.id), m = K.DATA.M.get(it.id); return { it, g, m, r: M.calc(g, s, e, Y1, m) }; });
  if (!rows.length) box.append("p").attr("class", "empty").text("Wähle oben einen Gletscher, um seinen Verlust in Alltagsgrössen zu sehen.");
  else {
    const kStep = STEPS.find(st => (d3.max(rows, x => Math.abs(x.r.v || 0)) || 1e-9) / (M.unit * st) <= 50) || STEPS[STEPS.length - 1];
    const per = M.unit * kStep;
    const sym = (col, frac = 1, gain = false) => {
      const id = "c" + Math.random().toString(36).slice(2, 8), clip = I.v ? `<rect y="${(I.h * (1 - frac)).toFixed(1)}" width="${I.w}" height="${(I.h * frac).toFixed(1)}"/>` : `<rect width="${(I.w * frac).toFixed(1)}" height="${I.h}"/>`;
      return `<svg class="sym" width="${I.w * SC}" height="${I.h * SC}" viewBox="0 0 ${I.w} ${I.h}" aria-hidden="true">${frac < 1 ? `<clipPath id="${id}">${clip}</clipPath>` : ""}<g${frac < 1 ? ` clip-path="url(#${id})"` : ""}>${I.draw(col, gain)}</g></svg>`;
    };
    box.append("div").attr("class", "iso-key").html(`<span class="key-l">Legende</span>${sym(C.ink)}<span class="key-v">= ${kStep === 1 ? "1 " + M.one : K.nf(kStep) + " " + M.many}</span><span class="key-ref">${M.ref}</span>`);
    const list = box.append("div").attr("class", "iso-list");
    const row = list.selectAll("div.iso-row").data(rows, x => x.it.id).join("div").attr("class", "iso-row").attr("data-sid", x => x.it.id)
      .on("mouseenter", (ev, x) => setHl(x.it.id)).on("mouseleave", () => setHl(null));
    const lab = row.append("div").attr("class", "iso-lab");
    lab.append("span").attr("class", "iso-name").html(x => `<span class="tag-id">${K.tagId(x.it.slot)}</span>${K.swatch(x.it.slot)}${x.g.short}`);
    lab.filter(x => x.r.v != null).append("span").attr("class", "iso-val").html(x => { const u = Math.abs(x.r.v) / M.unit; return `${M.est && M.est(x.m) ? "≈ " : ""}${count(u)} <small>${u === 1 ? M.one : M.many}</small>`; });
    lab.append("span").attr("class", "iso-sub").text(x => M.sub(x.r, n, Y1));
    // Symbole als Datenreihe: ganze Symbole + angeschnittener Rest
    row.append("div").attr("class", "iso-syms").selectAll("span").data(x => {
      if (x.r.v == null) return [];
      const c = Math.abs(x.r.v) / per, whole = Math.floor(c), rest = c - whole, out = d3.range(whole).map(() => 1);
      if (rest >= 0.05 || (!whole && c > 0)) out.push(Math.max(rest, 0.12));
      return out.map(f => ({ f, col: PAL[x.it.slot].c, gain: x.r.v < 0 }));
    }).join("span").attr("class", "sym-w").html(d => sym(d.col, d.f, d.gain));
    row.attr("aria-label", x => `${x.g.name}: ${M.sub(x.r, n, Y1)}`);
    // Fünfergruppen; so viele Gruppen pro Zeile, wie Platz haben
    const groupW = 5 * (I.w * SC + 4) + 8, cols = Math.max(1, Math.min(5, Math.floor((list.node().clientWidth - 292 + 8) / groupW)));
    list.selectAll(".iso-syms").style("max-width", cols * groupW + "px");
    if (rows.some(x => x.r.v < 0)) box.append("p").attr("class", "pg-note").text("Umrandete Symbole stehen für einen Zuwachs.");
  }

  // Rangliste aller neun Messgletscher in derselben Grösse
  const all = d3.sort(G.map(g => ({ g, r: M.calc(g, s, e, Y1, K.DATA.M.get(g.id)) })), x => -(x.r.v ?? -Infinity));
  right.append("h2").attr("class", "pg-h").html(`Alle Messgletscher<span>${M.many}</span>`);
  const board = right.append("ol").attr("class", "board").attr("aria-label", "Alle neun Messgletscher, grösster Verlust zuerst");
  board.append("li").attr("class", "bd-head").html(`<span>Nr</span><span>Gletscher</span><span>Anzahl ↓</span><span>Wert</span><span>Status</span>`);
  board.selectAll("li.rk").data(all, x => x.g.id).join("li")
    .attr("class", x => "rk" + (isSel(x.g.id) ? " is-sel" : "") + (!isSel(x.g.id) && S.sel.length >= MAXSEL ? " is-off" : "")).attr("data-sid", x => x.g.id)
    .attr("title", x => isSel(x.g.id) ? "Aus dem Vergleich entfernen" : S.sel.length >= MAXSEL ? "Fünf gewählt" : "Zum Vergleich hinzufügen")
    .html((x, j) => { const s2 = K.slotOf(x.g.id), v = x.r.v; return `<span class="rk-n">${String(j + 1).padStart(2, "0")}</span><span class="rk-name">${x.g.short}</span><span class="rk-c">${v == null ? "–" : (v < 0 ? "+" : "") + count(Math.abs(v) / M.unit)}</span><span class="rk-v">${M.phys(x.r)}</span><span class="rk-s">${s2 != null ? K.tagId(s2) + K.swatch(s2, 20) : "—"}</span>`; })
    .on("click", (ev, x) => K.toggleSel(x.g.id))
    .on("mouseenter", (ev, x) => setHl(x.g.id)).on("mouseleave", () => setHl(null));
}
function setHl(id) {
  hl = id;
  page.selectAll(".rk[data-sid]").classed("is-hl", function () { return this.dataset.sid === id; });
  page.selectAll(".iso-row[data-sid]").classed("is-dim", function () { return !!id && this.dataset.sid !== id; });
}

/* ---------- Seite: Info ---------- */
function renderInfo(from) {
  const { body } = frame("Was zeige ich hier?", null, "Info");
  body.style("grid-template-columns", "1fr 1fr 1fr");
  const M = META.find(m => m.slug === from);
  const ctx = M ? `<h2>${M.name}</h2><p>${M.lead}</p><p>Jedes Symbol steht für eine Alltagsgrösse. Mehr Symbole heisst mehr Verlust, ein angeschnittenes Symbol zeigt den Rest. Die Rangliste vergleicht alle neun Messgletscher.</p>`
    : from === "karte" ? `<h2>Die Karte</h2><ol><li>Jeder Punkt ist ein Gletscher.</li><li>Nur die neun Messgletscher haben Daten zu allen fünf Metriken.</li><li>Ein Klick auf einen Messgletscher fügt ihn zum Vergleich hinzu.</li></ol>`
    : `<h2>Das Profil</h2><ol><li>Jede Achse ist eine Metrik.</li><li><mark>Je weiter aussen, desto grösser der Verlust</mark> im Vergleich der neun Messgletscher.</li><li>Ein Klick auf eine Achse zeigt die Metrik im Detail.</li><li>Unten rechts wählst du den Zeitraum. Ein Klick auf ein Jahr zeigt nur dieses Jahr.</li></ol>`;
  body.append("section").attr("class", "pcard info-card").html(ctx);
  const glos = body.append("section").attr("class", "pcard info-card");
  glos.append("h2").text("Die fünf Metriken");
  const dl = glos.append("dl").attr("class", "ip-glos");
  META.forEach(m => {
    dl.append("dt").attr("class", m.slug === from ? "is-on" : null).text(m.name);
    const dd = dl.append("dd").text(m.lead + " ");
    if (m.slug !== from) dd.append("button").attr("class", "link-btn").text("Ansehen").on("click", () => K.go(`#metrik/${m.slug}`));
  });
  body.append("section").attr("class", "pcard info-card").html(`<h2>Profil der Verluste</h2>
    <p>Platzhalter: Worum es auf dieser Website geht. Was man hier entdecken kann. Woher die Daten stammen. Welcher Zeitraum gezeigt wird. Was die Daten nicht zeigen. In welchem Rahmen das Projekt entstanden ist. Wer es gestaltet hat.</p>
    <p class="src">Daten: GLAMOS – Glacier Monitoring Switzerland, Release 2025. ${G.length} Messgletscher, Messreihen ${d3.min(G, g => g.first)}–${LAST}. Visualisierung mit d3.js.</p>`);
}

/* ---------- Rendern ---------- */
function render() {
  const r = route();
  d3.select("#info-btn").attr("aria-expanded", r.p === "info");
  if (!r.p) { page.property("hidden", true).html(""); return; }
  page.property("hidden", false);
  if (r.p === "karte") renderKarte();
  else if (r.p === "info") renderInfo(r.q);
  else if (r.p === "metrik") renderMetrik(r.q);
  else location.hash = "";
}
const rerender = () => { if (!page.property("hidden")) render(); };
K.bus.on("data.pages", rerender); K.bus.on("selection.pages", rerender); K.bus.on("resize.pages", rerender);
render();
})();
