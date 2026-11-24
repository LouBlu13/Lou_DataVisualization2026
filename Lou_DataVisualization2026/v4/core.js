/* Profil der Verluste · v4 (d3.js) – core.js
   Daten aufbereiten, Kennzahlen berechnen, feste Skala, Zustand. Keine Darstellung. */
(() => {
"use strict";
const D = window.GLAMOS;

/* ---------- Konstanten ---------- */
// Wireframe: Graustufen + EINE Akzentfarbe. Gletscher über Grauton × Linienmuster × Markerform unterscheiden.
const PAL = [
  { c: "#222222", dash: null, mk: "circle" },
  { c: "#222222", dash: "7 4", mk: "square" },
  { c: "#7A7A7A", dash: null, mk: "triangle" },
  { c: "#7A7A7A", dash: "7 4", mk: "diamond" },
  { c: "#222222", dash: "1.5 3.5", mk: "cross" }
];
const C = { ink: "#222222", muted: "#666666", faint: "#999999", line: "#CFCFCF", grid: "#E0E0E0", paper: "#FFFFFF", bg: "#F4F4F4", accent: "#2563EB", tint: "#DBE6FD" };
const KT = { VS: "Wallis", GR: "Graubünden", TI: "Tessin" };
const AX = ["Massenbilanz", "Gleichgewichtslinie", "Fläche", "Eisdicke", "Rückzug"];
const AXN = ["01", "02", "03", "04", "05"];
const SLUG = ["massenbilanz", "gleichgewichtslinie", "flaeche", "eisdicke", "rueckzug"];
const LAST = 2025, MAXSEL = 5;

// Markerformen als Pfad (eigene Formen, damit sie zu den Linienmustern passen)
const markerPath = (mk, x, y, r) => {
  switch (mk) {
    case "square": return `M${x - r} ${y - r}h${2 * r}v${2 * r}h${-2 * r}z`;
    case "triangle": return `M${x} ${y - r * 1.2}L${x + r * 1.1} ${y + r * .8}H${x - r * 1.1}z`;
    case "diamond": return `M${x} ${y - r * 1.3}L${x + r * 1.3} ${y}L${x} ${y + r * 1.3}L${x - r * 1.3} ${y}z`;
    case "cross": return `M${x - r} ${y - r}L${x + r} ${y + r}M${x + r} ${y - r}L${x - r} ${y + r}`;
    default: return `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  }
};
const swatch = (slot, w = 26) => { const p = PAL[slot]; return `<svg class="sw" width="${w}" height="12" viewBox="0 0 ${w} 12" aria-hidden="true"><path d="M1 6H${w - 1}" stroke="${p.c}" stroke-width="1.5" ${p.dash ? `stroke-dasharray="${p.dash}"` : ""} stroke-linecap="round"/><path d="${markerPath(p.mk, w / 2, 6, 3)}" fill="${p.mk === "cross" ? "none" : "#fff"}" stroke="${p.c}" stroke-width="1.5"/></svg>`; };
const tagId = slot => `G-0${slot + 1}`;
const sgn = (v, d) => (v < 0 ? "−" : v > 0 ? "+" : "") + Math.abs(v).toFixed(d);
const nf = (v, d = 0) => v.toLocaleString("de-CH", { maximumFractionDigits: d, minimumFractionDigits: d });

/* ---------- Daten aufbereiten ---------- */
// lineare Interpolation; nach dem letzten Punkt Trend über mind. 5 Jahre fortschreiben
const interp = (pts, y) => {
  if (pts.length === 1) return pts[0][1];
  const last = pts[pts.length - 1];
  if (y > last[0]) { const ref = [...pts].reverse().find(p => p[0] <= last[0] - 5) || pts[0]; return last[1] + (last[1] - ref[1]) / (last[0] - ref[0]) * (y - last[0]); }
  let i = d3.bisectLeft(pts.map(p => p[0]), y); if (i === 0) i = 1;
  const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (y - x0) / (x1 - x0);
};
const G = D.glaciers.map(g => {
  const mbY = new Map(g.mb.map(r => [r[0], { a: r[1], ela: r[2], aar: r[3], A: r[4] }]));
  const lenY = new Map(); // mehrjährige Längenmessungen gleichmässig auf die Jahre verteilen
  for (const [s, e, dl] of g.lc) { const n = Math.max(1, e - s); for (let y = e - n + 1; y <= e; y++) lenY.set(y, (lenY.get(y) || 0) + dl / n); }
  // Fläche aus der Massenbilanz ist treppenförmig → Stufenanfänge linear verbinden
  const areaMB = []; let prev = null;
  for (const r of g.mb) if (r[4] !== prev) { areaMB.push([r[0], r[4]]); prev = r[4]; }
  const lastMB = g.mb[g.mb.length - 1]; if (areaMB[areaMB.length - 1][0] !== lastMB[0]) areaMB.push([lastMB[0], lastMB[4]]);
  const surveyYears = new Set(g.vc.flatMap(r => [r[0], r[1]]));
  return { ...g, mbY, lenY, areaMB, surveyYears, first: d3.min(g.mb, r => r[0]) };
});
const byId = id => G.find(g => g.id === id);

function metrics(g, s, e) {
  const yrs = d3.range(s, e + 1).filter(y => g.mbY.has(y)).map(y => g.mbY.get(y));
  const lv = d3.range(s, e + 1).filter(y => g.lenY.has(y)).map(y => g.lenY.get(y));
  const areaAt = y => interp(g.areaMB, Math.max(g.areaMB[0][0], y));
  const n = e - s + 1, win = Math.max(n, 5);
  const areaPct = (areaAt(e) / areaAt(e - win) - 1) * 100 * n / win;
  const best = d3.sort(g.vc.filter(r => r[1] > r[0]), r => Math.abs(r[0] - (s - 1)) + Math.abs(r[1] - e), r => -(r[1] - r[0]))[0];
  return {
    mb: d3.mean(yrs, r => r.a) / 1000,
    aar: d3.mean(yrs, r => r.aar),
    ela: d3.mean(yrs, r => r.ela),
    len: lv.length ? d3.mean(lv) : null,
    area: areaPct,
    areaRate: areaPct / n,
    dh: best[4] / (best[1] - best[0]),
    est: { area: n < 5 || !(g.surveyYears.has(s - 1) && g.surveyYears.has(e)), dh: !(best[0] === s - 1 && best[1] === e) }
  };
}
// Feste Skala je Achse: alle 10-Jahres-Fenster aller 9 Gletscher; aussen = mehr Verlust
const lossOf = m => [-m.mb, -m.aar, -m.areaRate, -m.dh, m.len == null ? null : -m.len];
const SCALES = (() => {
  const vals = [[], [], [], [], []];
  for (const g of G) for (let s = g.first; s + 9 <= LAST; s++) lossOf(metrics(g, s, s + 9)).forEach((v, i) => { if (v != null && isFinite(v)) vals[i].push(v); });
  return vals.map(v => d3.scaleLinear().domain(d3.extent(v)).range([0.15, 1]).clamp(true));
})();

/* ---------- Zustand (eine Quelle für alle Ansichten) ---------- */
const S = { sel: [], s: 2016, e: 2025, single: null, hover: null, tap: null };
const addSel = (list, id) => { if (list.length >= MAXSEL || list.some(x => x.id === id)) return; const used = new Set(list.map(x => x.slot)); let slot = 0; while (used.has(slot)) slot++; list.push({ id, slot }); };
["B36-26", "B45-04", "A10g-05"].forEach(id => addSel(S.sel, id));
const slotOf = id => (S.sel.find(x => x.id === id) || {}).slot;
const focusId = () => S.hover || S.tap;
const span = () => [S.sel.length ? d3.max(S.sel, x => byId(x.id).first) : d3.min(G, g => g.first), LAST];
const period = () => S.single != null ? [S.single, S.single] : [S.s, S.e];
function clampPeriod() {
  const [Y1, Y2] = span();
  S.s = Math.max(Y1, Math.min(S.s, Y2)); S.e = Math.max(S.s, Math.min(S.e, Y2));
  if (S.single != null && S.single < Y1) S.single = Y1;
}
let DATA;
function compute() {
  const [s, e] = period();
  const M = new Map(G.map(g => [g.id, metrics(g, s, e)]));
  const N = new Map(G.map(g => [g.id, lossOf(M.get(g.id)).map((v, i) => v == null || !isFinite(v) ? 0.15 : SCALES[i](v))]));
  DATA = { M, N };
  return DATA;
}
compute();

// Ereignisse: Ansichten melden sich an und werden bei Änderungen neu gezeichnet
const bus = d3.dispatch("data", "focus", "selection", "resize");
function setSelection(sel) { S.sel = sel; if (!S.sel.some(x => x.id === S.tap)) S.tap = null; if (!S.sel.some(x => x.id === S.hover)) S.hover = null; clampPeriod(); compute(); bus.call("selection"); bus.call("data"); }
function toggleSel(id) {
  if (S.sel.some(x => x.id === id)) return setSelection(S.sel.filter(x => x.id !== id));
  if (S.sel.length >= MAXSEL) return CORE.toast("Fünf gewählt. Wähle zuerst einen ab.");
  const next = S.sel.map(x => ({ ...x })); addSel(next, id); setSelection(next);
}
function setPeriod(s, e, single = null) { S.s = s; S.e = e; S.single = single; compute(); bus.call("data"); }
function setFocus(hover, tap = S.tap) { if (hover === S.hover && tap === S.tap) return; S.hover = hover; S.tap = tap; bus.call("focus"); }

const CORE = window.CORE = { D, PAL, C, KT, AX, AXN, SLUG, LAST, MAXSEL, G, S, byId, metrics, interp, markerPath, swatch, tagId, sgn, nf,
  slotOf, focusId, span, period, addSel, clampPeriod, get DATA() { return DATA; }, compute, bus, setSelection, toggleSel, setPeriod, setFocus,
  go: hash => { if (location.hash !== hash) location.hash = hash; }, toast: () => {} };
// für Tests
window.__proto = { S, compute, metrics: (id, s, e) => metrics(byId(id), s, e), G };
})();
