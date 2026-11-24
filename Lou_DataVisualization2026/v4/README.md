# Profil der Verluste · v4 – d3.js

Inhalt, Ablauf und Wireframe-Gestaltung sind gleich wie in v3. **Neu ist die Technik:** Die ganze Darstellung läuft über **d3.js v7**. Erstellt nach `PROMPT.md`, dem Prompt für die Kursvorgabe *«Prompt for an interactive prototype that runs on the web, based on d3.js»*.

**Öffnen:** Doppelklick auf `index.html`. d3 liegt lokal in `lib/`, es braucht also kein Internet.

## Dateien
| Datei | Inhalt |
|---|---|
| `PROMPT.md` | Der Prompt (englisch), nach dem v4 gebaut ist |
| `index.html` | Gerüst |
| `styles.css` | Wireframe-Stil (Graustufen + 1 Akzentfarbe), wie v3 |
| `data.js` | GLAMOS-Daten, Release 2025 |
| `core.js` | Daten aufbereiten, Kennzahlen, feste Skala (`d3.scaleLinear().clamp`), Zustand, Ereignisse (`d3.dispatch`) |
| `main.js` | Hauptansicht: Kopf, Spinnendiagramm, Minikarte, Detail, Zeitregler, Pop-up |
| `pages.js` | Navigation und Unterseiten: Karte, 5 Metrik-Seiten (Isotype + Rangliste), Info |
| `lib/d3.min.js` | d3.js 7.9 (ISC-Lizenz, siehe `lib/d3-LICENSE.txt`) |

## Wo d3 eingesetzt wird
- **Spinnendiagramm:**
  - `d3.lineRadial` mit `curveLinearClosed` und Skalen für Winkel und Radius.
  - Die Formen kommen über einen Join mit enter, update und exit.
  - Beim Wechsel des Zeitraums gleitet jede Form über `transition` mit `attrTween` (400 ms) von den alten zu den neuen Werten.
- **Zeitregler:**
  - `d3.scaleLinear` für die Jahre, `d3.drag` für die beiden Griffe, `d3.pointer` für Hover und Klick auf ein Einzeljahr.
  - Die Griffe rasten auf ganze Jahre ein.
- **Karten:**
  - `d3.polygonContains` für das Punktraster innerhalb der Schweiz, `d3.line` für den Umriss, Skalen für die Projektion.
  - Die Gletscher werden über Joins gezeichnet.
- **Listen, Pop-up, Rangliste, Isotype-Zeilen und Symbole:** alle über `selectAll().data().join()`.
- **Daten:** `d3.mean`, `d3.sum`, `d3.range`, `d3.sort`, `d3.extent`, `d3.bisectLeft`.
- **Zustand:** Eine Quelle für alle Ansichten. Ändert sich etwas, meldet `d3.dispatch` das (Daten, Auswahl, Fokus, Grösse), und jede Ansicht zeichnet sich über ihre Joins neu.

## Geprüft
Kontrollwerte Aletsch 2016–2025 wie in v1–v3: −1.47 m/J, Nährgebiet 46 % (3175 m), −0.33 %/J Fläche, −1.86 m/J Dicke, −35 m/J Rückzug. Im Test haben funktioniert:
- Griffe ziehen, Einzeljahr an und aus
- Auswahl im Pop-up, Entfernen über ×
- Karte anklicken
- Metrik-Seiten, Info
- Esc und Browser-Zurück

## Testaufgaben
Gleich wie in `../v3/README.md`.
