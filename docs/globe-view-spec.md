# the mounted globe

status: accepted

role: accepted transition, not a claim of completed rendered verification.
owner: repository owner. accepted in conversation on 2026-09-08 with
“nice. approved!! implement away”. this records the reviewed draft's scope.
supersedes the flat-only presentation assumption, not coordinate generation,
privacy, or the existing [value constellation contract](value-constellation-spec.md).

## purpose and boundaries

a hand-turned world under glass: globe viewing in the full local and sanitized
public editions, for ordinary atlas browsing and value constellations.
preserve datasets, cipher values, coordinates, transform identifiers, local live
browsing, readouts, collision identities, markdown, public sanitization, and the
existing flat view. no glossololary changes or internal reads, new projection
algorithms, source snapshot changes, or changes to hermes's transform tests.
no new phrase calculator, routes, terrain, satellite provider, automatic spin,
new stored preference, or deployment.

## controls and appearance

- engraved `surface · flat / globe`, separate from `atlas / constellation`
  and coordinate-projection selectors. start flat; surface is session-only and
  shared across both workspaces.
- north-up, no camera roll or terrain tilt. drag/touch turns the earth; zoom
  controls remain. maximum zoom stays 10, using native globe presentation.
- `whole globe` fits the sphere with breathing room, retaining facing direction
  and the selected reading. flat constellation `show all` remains unchanged.
- constellation rows and atlas search bring their coordinate onto the facing
  hemisphere; programmatic motion respects reduced-motion preferences.
- surface switching does not clear readings, recalculate coordinates, or
  independently reload datasets.
- parchment geography/brass by day; existing dark geography against ink with
  restrained limb light and amber loci by night. use existing providers.
- faint geographic meridians/parallels turn with the earth; they are separate,
  non-selectable display geometry, absent from value data and exports. suppress
  the stationary square-grid overlay in globe mode. maintain readable labels,
  focus, mobile targets, and the accepted export controls. polar basemap gaps
  must not be presented as missing value data.

## visibility, state, and recovery

- markers, heatmap selection, and coordinate-attached plates cannot show or
  receive interaction through the earth. invisible controls leave the tab order;
  a focused control that becomes hidden hands focus to a visible ledger or
  navigation control. an open tray remains readable when its locus is hidden.
- all eight constellation addresses remain in the ledger and markdown, including
  the rear hemisphere. coincident addresses remain grouped without moving them.
  `whole globe` does not promise every landing is simultaneously visible.
- the same reading exports identical markdown in either surface. public
  occupancy stays unpublished, not inferred as zero.
- cameras are remembered separately for atlas/constellation and flat/globe,
  in memory. invalidate obsolete framing when its data changes. first globe
  entry starts at an overview facing the selected coordinate if available,
  otherwise the current geographic center. returning to atlas restores source,
  dataset, selection, tray, and the camera for the chosen surface.
- theme changes preserve surface and restore layers without duplicates. old
  style-load callbacks cannot replace newer state. clean up listeners, markers,
  observers, and pending camera work.
- globe-specific failure offers flat recovery without discarding the reading;
  total renderer unavailability is reported explicitly.

## change shape

| dimension | changed? | source of truth | proof |
|---|---|---|---|
| user-visible behavior | yes | this spec; presentation controls | rendered interactions |
| persisted state/schema | no | existing storage/export contracts | storage and serialization review |
| external/provider behavior | yes: tile requests vary; no new provider | existing basemaps | request inspection; public-subpath smoke |
| identifiers/secrets/privacy | no | snapshots and sanitizer | parity tests; public artifact scan |
| lifecycle states | yes | surface, camera, visibility, style loading | transition/cleanup tests |
| setup/operation/recovery | yes | pinned renderer and fallback | both builds; compatibility smoke |
| normative decisions | yes | optional globe replaces flat-only display | owner acceptance |
| cross-repository dependency | no | existing interfaces | scoped diff; hermes untouched |

## implementation by invariant

1. upgrade maplibre 4.7.1 to exact 5.24.0 and prove the flat baseline first;
   no v6 migration. test both editions, markers/popups, heatmaps, and pages build.
2. separate presentation/camera policy from coordinate generation; retain flat
   constraints and their tests. use the one existing map instance.
3. add globe navigation, framing, and explicit state restoration.
4. make visibility correct for rendering, picking, keyboard, and unchanged
   reading/export scope.
5. apply the globe graticule, aperture, day/night, and responsive treatment.
6. verify and reconcile this spec, checkpoint, operational instructions, and
   remaining limits. likely changes are atlas dependency files, map policy,
   main/constellation views, narrow visibility helpers, styles/tokens, and tests.
   no general frontend refactor.

## acceptance and verification

use known-coordinate frontend fixtures independently of transform research:
front/rear locations, antimeridian neighbors, near-pole and coincident points.
verify attachment, occlusion, picking, keyboard, surface/theme switching,
camera restoration, reduced motion, failure/recovery, and narrow portrait and
landscape in both editions. cast 1, 177, and 2000 under both existing methods;
coordinates and exports remain unchanged. ordinary heatmaps, local phrase/live
browsing, public integer search, and `/geomatria/` hosting remain functional.

from `atlas/`: `npm test`, `npm run build`, `npm run build:public`.
from the repo root: the complete python regression command and documentation
checks in [development](DEVELOPMENT.md). python verification does not modify or
replace hermes's experiments. report inherited documentation findings separately.

the approved defaults are flat startup, north-up globe, session-only surface,
and unchanged exports. compatibility and rendered interaction are implementation
gates. if 5.24.0 needs a scope expansion to meet them, stop and report the conflict.
browser automation previously failed before navigation; owner-rendered proof
may be necessary. passing builds alone cannot retire this spec.

references: [5.24.0 release](https://github.com/maplibre/maplibre-gl-js/releases/tag/v5.24.0),
[projection definitions](https://maplibre.org/maplibre-style-spec/types/#projectiondefinition).
