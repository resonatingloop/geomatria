# spec: night mode coherence (lamp off)

## goal

unify the dark theme around one rule: IN NIGHT MODE, LIGHT COMES FROM THE
DATA. structure recedes (dim teal), signal emits (amber). the three current
sub-styles (celestial header, flat dark map, parchment-chromed popup) become
one continuous environment. light theme (lamp on) is untouched.

## context

- theming is driven by the LAMP toggle. all changes in this spec apply ONLY
  to the lamp-off state. if theme styling is not already routed through
  theme-scoped css variables / a theme class, STOP and report before
  restructuring anything.
- two accent families currently compete in night mode: teal/seafoam and
  amber/gold. this spec assigns them permanent roles rather than removing
  either.

## accent role assignment (applies to every item below)

- TEAL = structure: borders, hairlines, fieldset outlines, eyebrow labels,
  panel chrome, basemap boundaries. always dim — structure is never the
  brightest thing on screen.
- AMBER = signal: locus ids, values, phrase receipts, counts, the selected
  marker, CAST TRACE, active states.
- the title keeps its existing behavior: teal when static (instrument
  idle), orange/amber family when live. do not change it.
- implement as night-theme token values (e.g. --structure, --signal), then
  point elements at the tokens. do not hardcode per-element hex values.

## work items

### 1. basemap night style

- edit the night basemap style json (openfreemap/openmaptiles style), not
  css overlays. four adjustments:
  a. place/country label text: reduce brightness substantially. labels must
     be the DIMMEST legible layer, clearly quieter than landmasses.
  b. land fill: lift one notch so land/ocean separation is readable at
     world zoom.
  c. ocean/background color: shift toward the header band's navy family so
     header and map share a base hue (see item 5).
  d. admin boundaries: dim teal, low opacity.
- no changes to the light basemap style.

### 2. markers emit

- night mode only: sigil markers gain a faint glow, e.g.
  `filter: drop-shadow(0 0 4px <amber, low alpha>)` on the marker element,
  and raise marker opacity slightly from current night values.
- selected marker keeps its existing halo/pulse, recolored to the signal
  token if it isn't already.
- do not alter marker sizing, tiers, or positioning. do not touch
  light-theme marker styles.

### 3. popup chrome conversion

- night mode popup: remove the tan/parchment border frame. replace with
  the same dim teal hairline treatment the fieldsets use.
- popup text: locus id and phrase count use the signal token; labels use
  the structure token.
- layout, contents, and behavior unchanged.

### 4. night veil retune

- the selection-dim values are theme-specific. night mode:
  unselected marker opacity ~0.5 (vs the day value), and any basemap
  wash reduced to near-zero. the selected marker's glow differential does
  the focusing in the dark; opacity subtraction does it in daylight.
- expose both as theme-scoped variables so day/night tune independently.

### 5. one dark, not two

- the map container's surrounding chrome and the basemap ocean (item 1c)
  converge on the header's navy family so there is no visible hue seam at
  the header/map boundary.
- do not extend the starfield onto the map. the starfield is header
  atmosphere only.

### 6. bug: zoom control glyphs

- the +/− symbols are invisible in night mode (empty squares top-right).
  fix the glyph color so it contrasts with the control background in both
  themes. likely an inherited color, not a missing element — diagnose
  before redrawing anything.

## invariants

- light theme renders pixel-identical before and after. every change is
  gated behind the night theme scope.
- no behavior changes: lamp toggle, feed toggle, recast, popup, tray, and
  marker interactions work identically.
- no new dependencies. basemap changes live in the style json; ui changes
  live in theme tokens + existing selectors.
- marker sizing/tier logic untouched.

## verification

1. lamp on: diff against current light theme — no visual change anywhere.
2. lamp off, world zoom: landmasses readable, labels dimmer than land,
   markers faintly glowing, no hue seam under the header.
3. select a marker (night): popup shows teal hairline chrome, amber id;
   unselected markers dim to the night value but remain visible; selected
   marker glows.
4. open tray (night): labels read as structure (dim teal), values as
   signal (amber); receipt column amber.
5. toggle static→live (night): title shifts as before.
6. zoom +/− visible and working in both themes.
7. grep for hardcoded night-mode hex values outside the token definitions:
   zero hits.

## anti-patterns (do not)

- do not "harmonize" the light theme while touching shared selectors.
- do not introduce a third accent color or new gradients.
- do not restyle the tray layout — only recolor via tokens.
- do not replace the basemap or its provider; edit the existing style.
- do not add stars, particles, or animation to the map field.
