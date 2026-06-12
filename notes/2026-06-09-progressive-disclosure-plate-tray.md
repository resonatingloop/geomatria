# 2026-06-09 — progressive disclosure: locus plate + readout tray

## why

The atlas reserved a permanent right column (`.side-panel`) holding both search
results and the locus inspector. That space existed before any contact with the
data. This slice removes the reserved column so information is *summoned* on
demand, giving the map full-width priority by default.

## spatial model

```
top         calibration rail + aperture results dropdown
field       map (full-width)
bottom-left LocusPlate (acquired reading)
right       ReadoutTray (slide-out + faint scrim)
```

Disclosure flow:

```
type in phrase/value aperture
  -> aperture results dropdown opens under the field (indexed slips)
  -> choose a slip -> pan + select locus
    -> LocusPlate appears bottom-left (compact reading)
      -> "open tray" -> ReadoutTray slides from right edge (faint scrim)
        -> close tray -> plate remains
clear (plate x / Esc) -> plate + tray gone, locus deselected
```

## decisions (confirmed with user)

- aperture results: dropdown anchored under the aperture field, indexed slips.
- locus plate: bottom-left, map full-width.
- readout tray: pulls from the right edge, ~400px, overlay (no map reflow),
  faint scrim dimming the map behind it.
- structure: split into 3 component files now.
- Esc is two-stage: tray open -> close tray; else selected -> clear selection.
- map click-to-clear: out of scope this slice (core clear = plate x + Esc).

## implementation

State in `App` (`main.jsx`): add `trayOpen`. Handlers `openTray`, `closeTray`
(plate remains), `clearSelection` (nulls selection + closes tray; existing
`selectedLocusKey` effect repaints marker opacity so the marker deselects).
Esc keydown effect + scrim click -> closeTray / clearSelection.

New files:

- `ProjectedLocusReadout.jsx` — full dossier (was `LocusPanel` inner content);
  `CliqueCard` + shared helpers (`cliqueTitle`, `heatLocusTitle`,
  `visibleDomainCliques`, `formatSnapDistanceSummary`) move here and are
  exported. Reuses existing `.locus-card` CSS.
- `ReadoutTray.jsx` — right-edge slide-out shell: scrim + panel + close,
  renders `<ProjectedLocusReadout>`.
- `LocusPlate.jsx` — compact bottom-left token: etched micro-label, big readout,
  clique badge, phrase count, coordinates, open-tray action, clear (x).
  Handles single-clique / collision / heat-locus variants.

Search: keep `SearchResults`, re-home its render into the header `.search-control`
as an absolutely positioned dropdown (already returns null on empty query),
restyled as indexed slips. `onSelect` unchanged.

CSS/tokens: `.atlas-workspace` -> single column; remove `.side-panel`; new
`.aperture-results`, `.locus-plate`, `.readout-tray(+__scrim)` rules; new
plate/tray/scrim tokens for both day and dark.

## verification

- `npm run build` clean.
- Manual on 127.0.0.1:5173, day + dark: aperture dropdown -> slip -> plate ->
  open tray (+scrim) -> close (plate remains) -> clear (x/Esc, marker
  deselects). Exercise a collision locus and a heat-mode dataset.

## out of scope

map background click-to-clear; further search relocation beyond the dropdown.

## follow-up: readout-tray visual arc (2026-06-09, same day)

After the structural slice landed, did several visual integration passes on the
ReadoutTray + readout plate (CSS/tokens, presentation only — no behavior/data
change):

- tray shell -> pulled-out **glass instrument drawer**: inset from the screen
  edges (not a full-height slab), hugs its content height, sheer/frosted surface
  with backdrop blur (day frosted, dark near-clear), thin matched ochre/green
  edge (`--tray-edge`), engraved title rail with a rail-tie tick.
- flattened the russian-doll nesting: one **mounted readout plate** (`.locus-card`)
  holds flat sections; phrases are quiet numbered **ledger rows** (not boxed
  buttons); collisions/heat = quiet expandable ledger groups; value shown once.
- plates shifted parchment -> **aged-brass / dark-bronze instrument plate**:
  matte warm gradient, beveled metal edge (`--plate-bevel-hi/-lo`), engraved
  labels (`--plate-emboss`), etched rim, corner rivets. Formal version on the
  tray plate (`.locus-card`), lighter version on the floating plate
  (`.locus-plate` via `--plate-surface-soft`).

### deferred "more hardware" ideas (revisit with fresh eyes)
Keep restrained — antique survey hardware, not steampunk. Candidates:
- faint **stamped registration line** etched along the plate's bottom edge
  (e.g. mono projection method or a `N · ###` index).
- **corner brackets** as an alternative/companion to the rivets.
- very low-opacity **brushed-metal grain** on the plate surface.
Also still open from earlier: aperture dropdown auto-collapse-on-select (left
persistent on purpose for now); whether the plate should hide/offset while the
tray overlaps it.
