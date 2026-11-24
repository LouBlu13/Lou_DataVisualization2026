# Prompt – Interactive web prototype with d3.js

> Course brief: *"Prompt for an interactive prototype that runs on the web, based on d3.js."*
> v4 in this folder was built from exactly this prompt.

---

## ROLE
You are a senior front-end developer and data-visualisation designer. Build a **low-fidelity, fully interactive web prototype** for user testing. It is based on **d3.js v7** and has no build step.

## GOAL
A small website that lets non-experts compare how Swiss glaciers are losing ice and ask their own questions of the data: *"Which glacier is losing ice fastest? Has it accelerated? How much is that in everyday terms?"*
The prototype is used in user tests, so **the structure and interactions must work for real**, while the visual design stays deliberately rough.

## DATA (provided, do not invent)
`data.js` sets `window.GLAMOS` (source: GLAMOS – Glacier Monitoring Switzerland, Release 2025):
- `ch`: Swiss outline as `[x,y]` in km (offset from LV95 2'480'000 / 1'070'000; y points up)
- `all`: `[x,y]` positions of 168 glaciers (background points on maps)
- `glaciers[]` (9 monitoring glaciers with complete series): `{id, name, short, kt, x, y, area}` plus
  - `mb`: `[year, annual mass balance mm w.e., ELA m a.s.l., AAR %, area km²]`
  - `lc`: `[startYear, endYear, length change m]`
  - `vc`: `[startYear, endYear, areaStart km², areaEnd km², mean thickness change m]`

## METRICS (per selected period s–e)
1. **Mass balance**: mean annual value in m w.e. per year.
2. **Equilibrium line**: mean AAR in % (less = more loss). Show the ELA in m a.s.l. as secondary information.
3. **Area**: change in % per year. The area series from `mb` is stepped, so connect the steps linearly. For periods shorter than 5 years, use the pro-rated 5-year trend. Mark the value as estimated (≈) unless it lies on survey years.
4. **Ice thickness**: rate in m per year from the `vc` survey whose period best matches s–e. Mark it ≈ if the match is not exact.
5. **Retreat**: mean length change in m per year. Spread multi-year measurements evenly over their years.

**Fixed scale**: normalise each axis with `d3.scaleLinear().clamp(true)`. The domain is the minimum and maximum of that metric over **all 10-year windows of all 9 glaciers since records began**. The range is 0.15–1, and outward always means more loss. A shape should only grow when the loss really grows.

## SCREENS & COMPONENTS
Desktop only. The layout is a 1440 × 1024 stage, scaled to the window and anchored to the edges. Small text never renders below its design size.

**Main view**
- **Top centre, comparison:** up to 5 glaciers as chips. Each chip shows a tag G-01…G-05, a swatch of its line pattern, the short name and a remove ×. Clicking a chip pins (taps) the glacier. A "+ Glacier" button opens the picker.
- **Centre, radar chart (d3):** 5 axes with dashed rings at 0, 25, 50, 75 and 100 %.
  - Draw one closed shape per glacier with `d3.lineRadial().curve(d3.curveLinearClosed)`, using a data join with enter, update and exit.
  - Animate changes with a d3 transition of about 400 ms that interpolates the five values.
  - Draw marker shapes at the vertices; a hollow marker means the value is estimated.
  - The focused glacier (hover or pinned) gets the accent fill and its real values written next to the points. The other shapes fade only while hovering.
  - Axis labels are links to the metric pages.
- **Top left, minimap:** dot-raster relief of Switzerland with registration marks for the selected glaciers. The whole map opens the big map.
- **Bottom left, detail:** at start, a title plus the guiding question. When a glacier is focused, a box with its name, canton, area and the 5 values.
- **Bottom right, time slider:**
  - A `d3.scaleLinear` maps years onto the whole documented span of the selected glaciers.
  - Two handles are dragged independently with `d3.drag` and snap to whole years.
  - Clicking a tick selects a single year (handles disappear); clicking it again restores the range.
  - Hovering shows the year. Arrow keys move a focused handle.
- **Top right, info button:** "?" that expands to "Was zeige ich hier?" on hover.
- **Picker pop-up:** a table built with a d3 join (ID, name, tag, canton, area), with search, max 5, draft until "Übernehmen". Esc closes it.

**Sub-pages** (hash routing: `#karte`, `#metrik/<slug>`, `#info/<context>`; browser Back and Esc work)
- **Map:** Swiss outline, dot raster, all 168 glaciers as small squares. The 9 monitoring glaciers are registration marks that you can click to add or remove. Labels must not collide or leave the frame. A synced list sits beside the map. Include a scale bar.
- **Metric pages (5, with tabs):** an **Isotype** after Otto Neurath for the selected glaciers in the current period.
  - Everyday unit per metric: Olympic pool 2,500 m³ · Prime Tower 126 m · football pitch 7,140 m² · storey 3 m · 100 m sprint track.
  - Symbols are identical in size and grouped in fives. One symbol stands for k units, where k is a round number chosen so the longest row has at most 50 symbols.
  - A partial symbol shows the remainder; tall icons are cut from the bottom up. Outline-only symbols mean a gain.
  - Next to the Isotype, a ranking board of all 9 glaciers in the **same quantity** (number of units, physical value, status). Clicking a row adds or removes that glacier.
- **Info:** three boxes. The first explains the current context (radar, map or the current metric); the second is a glossary of the 5 metrics with links; the third is the project and the source.

## VISUAL RULES (low-fidelity wireframe)
- **Greys only, plus ONE accent colour (#2563EB), used only for interaction and focus:** links, axis links, selection, pinned glacier, focus values.
- System sans-serif, white boxes with 1 px grey borders, no shadows, no decoration.
- Glaciers are told apart without colour: dark vs mid grey × solid / dashed / dotted line × circle / square / triangle / diamond / cross marker × tag G-0n.
- WCAG AA contrast for text, visible keyboard focus, and `prefers-reduced-motion` respected.

## TECH
- Plain HTML, CSS and JS. d3.js v7 is bundled locally (`lib/d3.min.js`) so the prototype runs offline from `file://`.
- Use d3 idiomatically: `select`/`join` for every list, board, isotype row and SVG mark; scales; `lineRadial`; `transition`; `drag`; `pointer`.
- Files:
  - `index.html`
  - `styles.css`
  - `data.js`
  - `core.js`: data preparation, metrics, scale, state
  - `main.js`: main view
  - `pages.js`: routing and sub-pages
- Keep all state in one object. Every view re-renders from state through joins; no manual DOM bookkeeping.

## DON'T
- Don't invent data, labels or text content beyond placeholders clearly marked "Platzhalter".
- No second accent colour, no gradients, no chart junk.
- Don't use a dual axis. Don't encode glacier identity with colour alone.

## DELIVERABLE
A working folder that opens with a double click on `index.html`, plus a short README (in German) with how to open it, what works, and suggested user-test tasks.
