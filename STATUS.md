# geogematria status

role: operational checkpoint. last verified: 2026-09-09.
update at a meaningful stopping point; this file owns evidence and active work,
not permanent intent or retrospective spec approval.

## public heat-locus value discovery repaired

the owner reported a public santa maria heat locus labelled "3 values" with no
way to discover those integers, then explicitly requested the fix. read-only
reproduction found 43, 913 and 1677 in the sanitized snapshot, but zero entries
in the readout model: public phrase suppression fed the local phrase-bearing
visibility filter. markdown inherited that empty list.

public domain readouts now retain every numeric member, sorted ascending,
independently of phrase occupancy. selectable plate buttons appear directly
below export controls. selection retains the complete list, fills the aperture
and shows the selected value's geographic trace without closing the tray or
requesting a camera move. loading disables selection; the handler rejects stale
or other-locus keys. markdown includes all listed values before and after a
selection, while phrase strings/counts remain suppressed. local phrase-bearing
readouts retain their existing selected-plus-occupied scope.

verification: all 79 frontend tests pass, including five new model/actual-jsx
markup/callback checks. the old public-membership and export assertions failed
before the repair. full/public builds pass with public last. the sanitized
artifact still has 16 curated datasets and 32,000 unchanged coordinates/values;
all 20,536 loci retain their full numeric membership, including 1,474 shared
landings. santa maria's readout/markdown include all three integers. recursive
private-field and compiled live-fetch scans pass. both running edition urls
return html, javascript and their 80/16-entry manifests. python was not rerun
for this frontend-only repair; the existing chunk-size warning remains.

`frontend-design` reused the existing day/night plate-metal controls, with
wrapping 44px value buttons and visible keyboard focus. `manage-project-docs`
records the changed public readout/export scope and the regression smoke check.
browser access was retried but rejected its trusted-code dependency before
navigation; actual layout, focus, map/tray behavior and clipboard still need
owner-rendered verification. documentation checking retains five missing-status
findings in untouched ignored specs; whitespace checks pass.

full dev is restored at `http://127.0.0.1:5173/`; public preview serves sanitized
`atlas/dist/` at `http://127.0.0.1:5175/geomatria/`, while full dev staging has
restored `atlas/public/data/`. no source dataset, projection algorithm, backend,
dependency, database or research artifact changed. halton remains accepted but
unimplemented; its existing documentation edits were preserved. no commit,
push or pages deployment was performed. next: the public heat-locus smoke in
[development](docs/DEVELOPMENT.md#constellation-smoke-checks).

## halton equal-area spec accepted; implementation not started

on 2026-09-08 the owner answered "yes" to accepting the bounded halton handoff
as written. the governing [accepted spec](docs/halton-equal-area-spec.md) now
lives in the non-ignored documentation tree, with links from the readme and an
explicit later method-list amendment in the original constellation contract.
the ignored handoff remains unchanged as historical provenance. pre-edit head
was `0422103` (`add shadow to globe`) and the working tree was clean.

accepted scope: `halton_equal_area_v1`, numeric-only static 1–2000 datasets for
eight ciphers in local/public atlas and constellation, on flat/globe. equal
integers share a landing without merging cipher identities. the new python
method's range is exact positive integers through `9007199254740991`, not a
larger interface range. preserve all existing methods/defaults, source privacy,
exports and in-memory state; no live expansion, source database access, new
dependencies, research, commit or deployment. polar disclosure/rendering is an
explicit implementation acceptance gate.

`manage-project-docs` records acceptance separately from implementation and
retirement. this turn changes documentation only; no app code, datasets, tests,
services or research artifacts changed. numerical fixtures and original handoff
evidence are preserved, not newly executed. the documentation checker reports
five missing-status findings in untouched ignored specs: the previous four plus
`specs/RESEARCH_LAB_WORKFLOW.md`. none concerns the new accepted contract.
whitespace checks pass; application tests/builds were not rerun for this
documentation-only change.
next: owner implementation go-ahead, then the spec's ordered implementation and
verification gates. no unresolved scope decision remains.

## daylight globe relief

the owner confirmed the misleading warning is gone and accepted the day/night
globe appearance with screenshots, then approved a small daylight depth pass.
the globe now has a warm cast shadow below/right and a faint shaded rim. this
is decorative instrument lighting, not a sun-position or time-of-day model.

`atlas/src/globeRelief.js` follows the public camera geometry on renderer frames,
placing one inert, pointer-transparent circle directly after the canvas and
before its markers. the daylight/globe gate covers both editions and workspaces;
flat and night remove the decoration. offscreen limbs avoid oversized effects.
the effect reads camera state without changing it. main wiring, stylesheet and
daylight tokens complete the pass; data, exports, interactions, projection
algorithms, dependencies, backend and hermes's files are unchanged.

verification: all 74 frontend tests pass, including five new geometry/lifecycle
and styling guards. the native renderer's responsive silhouette fixtures also
check the decorative radius. full/public builds pass; public was built last.
the public artifact contains exactly 16 curated datasets with 32,000 unchanged
coordinates/cipher values, no scanned private fields and no live-manifest fetch.
both edition urls below return html, javascript and their 80/16-entry manifests.
the public preview uses `--mode public --base /geomatria/`; a first startup
without the explicit subpath served fallback html for assets and was corrected.
python was not rerun for this frontend-only decoration. the inherited chunk-size
warning and four documentation findings remain; `git diff --check` passes.

`shape-the-interface` keeps this to one visual hypothesis; `manage-project-docs`
records the proof boundary. browser access was retried but rejected its own
trusted-code path before navigation. shadow softness, stacking and motion still
need an owner-rendered comparison; cpu geometry and source guards are not that
proof. the wider globe interaction matrix also remains open, so the accepted
spec is not retired. next: reload daylight globe, try `whole globe` and zoom,
then share a screenshot. no commit, push or deployment was performed. full dev
is restored at `http://127.0.0.1:5173/`, public preview at
`http://127.0.0.1:5175/geomatria/`; the backend on 8000 was left untouched.

## globe camera warning repair (prior pass)

the owner's dark-theme full-atlas screenshot shows the globe, guide lines and
loci rendering alongside `globe rendering unavailable`. this is partial
rendered evidence, not full acceptance. the cause was reproduced without a
browser: the installed maplibre public `Map.setMinZoom(-12)` throws because its
lower bound is -2. surface setup succeeded before camera restoration hit that
invalid call, leaving the globe visible but its overview/restoration incomplete.
the catch-all then incorrectly described a renderer failure.

the camera controller now uses -2, adjusts the lens for small pole-facing
overviews within supported bounds, and remembers/restores the lens with each
surface camera. failed updates no longer claim an unavailable renderer; a
successful retry clears their warning. no data, export, projection algorithm,
backend, dependency version, or hermes files changed in this follow-up.

the prior test double and native transform fixtures allowed unsupported zoom
limits. the lifecycle double now delegates to the installed public setter;
the old implementation failed under that guard before the fix. native geometry
fixtures now also use -2. all 69 frontend tests pass, including three new guards
for public-api setup, lens restoration and truthful error/retry behavior.
full/public builds pass; the rebuilt public artifact has 16 curated files,
32,000 unchanged coordinates and no private fields in the scan. both running
edition urls below return html, script and their 80/16-entry manifests.
python was not rerun for this frontend-only repair; its previous 53-test result
is unchanged. chunk-size warnings and the four inherited documentation findings
remain; `git diff --check` passes.

`manage-project-docs` records the correction and narrows the earlier proof claim:
internal renderer geometry alone did not establish public-api compatibility.
the globe contract remains accepted, not retired. next: reload either local
edition, switch to globe, and try `whole globe`; confirm no warning, correct
overview framing and flat/globe camera restoration. the corrected rendered flow
is still unverified by the agent. no browser retry, commit, push or deployment
was performed in this follow-up; the backend on 8000 was left untouched.

## mounted globe implementation (prior pass)

the owner accepted the [mounted globe slice](docs/globe-view-spec.md) on
2026-09-08. implementation is in the working tree; rendered acceptance remains
open. both editions now offer `surface · flat / globe` in atlas and
constellation. flat stays the startup default. globe is north-up and manually
turned, with a `whole globe` overview, separate workspace/surface cameras,
day/night sky and geographic guide lines, rear-side control hiding, keyboard
focus handoff, and a flat recovery action. the constellation is parked rather
than unmounted when returning to atlas, retaining its reading and camera.

maplibre is pinned to 5.24.0. the upgrade-only flat baseline passed the original
53 frontend tests and both builds before globe work. an owner check of that
temporary baseline was requested, but no rendered result was established in
this turn. the final implementation uses one renderer; it does not modify
coordinate algorithms, source snapshots, python tests, backend/glossololary
code, or hermes's separate transform work. surface changes do not initiate a
dataset fetch, and exports retain their reading scope rather than hemisphere
scope. style requests are abortable and generation-tagged to prevent old
responses from applying a newer scene's presentation.

| check | result |
|---|---|
| frontend suite | 66 passed: original 53 plus 13 globe checks |
| complete python regression | 53 passed; temporary fixtures/injected sources, no new owner-database integration run |
| full and public production builds | passed; full 80/80, public 16/80; public built last |
| native renderer cpu fixtures | front/rear, dateline, near-pole, coincident, zoom-boundary and responsive silhouette checks passed |
| camera/lifecycle fixtures | four cameras, data invalidation, marker-free public framing, style races, queued focus, resize, reduced motion, cleanup and recovery passed |
| style specification validation | globe projection, sky and graticule layer passed against the pinned renderer's style dependency |
| public artifact scan | exactly 16 curated geojson files; 32,000 coordinates/cipher values match source; private fields and live-manifest fetch absent |
| full and `/geomatria/` preview http checks | html/assets/night style, 80/16 manifests, all 16 constellation requests per edition, and 1/177/2000 under both methods passed |
| markdown parity | six constellation readings match across full/public; unit checks preserve all eight addresses and public occupancy suppression across surfaces |
| existing live proxy | eight-entry manifest returned successfully; backend was not restarted or changed |
| documentation and whitespace | same four inherited spec-status findings; `git diff --check` passed |
| rendered browser interaction | unavailable: runtime rejected its own trusted-code path before navigation; no gpu, touch, screenshot, or visual-performance proof |

verification used node 26.7.0/npm 11.19.0 and python 3.12; the workflow's node 20
runtime was not separately executed. installation used a task-local npm cache
after the normal cache remained read-only even with escalation. no broad
dependency upgrades or audit fixes were applied. the existing chunk-size and
starlette/httpx warnings remain.

the current full dev server is at `http://127.0.0.1:5173/`; the public production
preview is at `http://127.0.0.1:5175/geomatria/`. the preview serves sanitized
`atlas/dist/`; full dev staging restored all 80 files in `atlas/public/data/`.
the existing backend on port 8000 was left alone. no commit, push, or deployment
was performed. the globe spec remains accepted, not retired: next is the owner
rendered check in [development](docs/DEVELOPMENT.md#globe-smoke-checks), beginning
with flat compatibility and a day/night globe constellation.

## export aesthetic follow-up (prior pass)

the owner accepted the relocated controls, then requested that they match the
atlas aesthetic. the shared copy/download pair now uses the existing plate
metal, bevel, and day/night tokens, monospaced labels, and decorative etched
glyphs. the controls stay beneath both readout headings in both editions.
handlers, export content, privacy rules, and loading are unchanged; focus
outlines and mobile 44px targets remain, with no new animation.

verification: 53 frontend tests and both builds pass (full 80/80, public 16/80).
a server-rendered markup check covers both scopes, enabled/disabled states,
text labels, hidden decorative glyphs, and the feedback region. calculated
enabled button-text contrast against the plate gradient stops is at least
7.99:1 by day and 12.04:1 by night; this is not rendered accessibility proof.
`git diff --check` passes; the documentation checker retains the four historical
spec-status findings. python was not rerun for this markup/css-only follow-up.
browser capture again failed before navigation with the trusted-code-path
rejection. the owner subsequently accepted the styling with day/night screenshots
of the ordinary readout; a complete narrow-screen check remains unverified.
no agent commit, push, or deployment was performed in that pass.

## export placement follow-up (prior pass)

the owner confirmed the original constellation appearance and markdown export,
then requested more discoverable export controls. copy/download now sit directly
below the heading in both constellation and ordinary locus readouts, in both
editions. the shared control row has a compact divider; empty feedback no longer
reserves a blank line. handlers, exported content, privacy rules, and data
loading are unchanged. this is a bounded presentation follow-up over `f68eaf7`.

verification: 53 frontend tests pass (including two placement guards), and a
server-rendered markup check confirms control order, initial disabled states,
and public phrase suppression. both builds pass. `git diff --check` passes;
the documentation checker retains the same four historical spec-status findings.
python was not rerun for this presentation-only pass; its previous 53-test
result remains below. browser capture was blocked before navigation. the owner
subsequently accepted the placement and committed it as `f9bf820`; a complete
narrow-screen check was not established. no agent commit, push, or deployment
was performed for that follow-up.

## original value constellation checkpoint

the owner accepted the [value constellation and markdown slice](docs/value-constellation-spec.md)
on 2026-09-08. the original implementation was subsequently committed by the
owner as `f68eaf7` and deployed through pages. a read-only check of workflow
run `34293255055` found success and a live javascript bundle matching the local
public build; the owner confirmed a hard refresh exposed the update. the spec
remains accepted, not retired: the full rendered checklist is not yet complete.

implemented: an independent numeric constellation view in both editions,
eight canonical ciphers, integers 1–2000, the two public-safe projections,
cached static lookups, stale-request protection, shared-coordinate entries,
and copy/download markdown for whole constellations and ordinary locus readouts.
local locus exports retain their visible saved phrases; constellation exports
are numeric-only, and public readouts/exports suppress private occupancy.
the map/readout components reuse existing theme tokens and the existing map;
no backend, source database, dependency, or projection algorithm changed.

| check | result |
|---|---|
| `npm test` | 51 passed, including 17 new data/export/privacy/lifecycle tests |
| complete python regression suite | 53 passed; required a task-local uv cache because the default cache remained read-only, including after escalation |
| full frontend build | passed; 80/80 datasets staged |
| public frontend build | passed; 16/80 datasets staged |
| real snapshot parity | 1, 177, and 2000 match source geometry across all eight ciphers and both projections in local and sanitized data |
| public artifact scan | exactly 16 geojson datasets; no phrase/count/occupancy fields found in their data or metadata |
| public preview under `/geogematria/` | html, manifest, all 16 dataset requests, constellation lookup, and markdown serialization passed |
| restored full dev server | html, 80-entry manifest, both constellation lookups and the existing eight-entry live manifest proxy passed |
| public readout server-render smoke | selected value and export controls render; populated private fixture phrases and false zero-occupancy wording are absent |
| automated browser retry | blocked before navigation by the same trusted-code-path rejection; no new rendered/browser interaction proof |
| documentation checker | four inherited missing spec-status findings; see historical limits below |
| `git diff --check` | passed |

the public snapshot groups total about 6.1 mb (hash scatter) and 13.6 mb
(town snapping) uncompressed. local gzip estimates are about 267 kb and 995 kb
respectively; these are not measurements of deployed transfer compression or
visitor latency. successful numeric indexes are cached after the first load.

the full dev server is available on `http://127.0.0.1:5173/`; the sanitized
production preview is available on `http://127.0.0.1:5175/geogematria/`.
the preview reads `atlas/dist/`, independently of full dev staging in
`atlas/public/data/`. the existing backend on port 8000 was left unchanged.
the owner's screenshot establishes the original dark-theme 137 hash-scatter
constellation appearance; markdown export is also owner-confirmed. see the
[smoke checklist](docs/DEVELOPMENT.md#constellation-smoke-checks) for remaining
coverage: both editions, other states/themes, narrow screens, fitting/restoration,
keyboard, and individual clipboard/download failure paths. the export placement
and subsequent day/night aesthetic pass are owner-accepted; wider rendered
coverage remains open.

## migration checkpoint (prior slice)

the migration repair followed the documentation bootstrap over source revision
`a57b897`; the owner subsequently committed them as `8c692c8`. the static atlas, installed cli, and
local live backend now work with the selected glossololary checkout at
`/home/resonatingloop/.projects/glossololary`.

| check | result |
|---|---|
| complete python suite in [development](docs/DEVELOPMENT.md) | 53 passed, including three new adapter regression tests |
| `npm test` from `atlas/` | 34 passed |
| `npm run build` from `atlas/` | passed; staged 80/80 datasets |
| `npm run build:public` from `atlas/` | passed; staged 16/80 datasets |
| `uv run --locked geogematria --help` | passed; console entry point is installed |
| `uv run --locked geogematria list-projections` | passed; seven projection methods |
| cli cipher registry and aq geojson export | passed using the migrated defaults; exported features match the live aq layer |
| real backend on loopback port 8017 | manifest and all eight allowlisted layer endpoints returned 200 |
| full atlas on port 5173 with backend on port 8000 | html, 80-entry static manifest, live manifest, and all eight live layers passed through the vite proxy after overriding the stale shell database path |
| automated browser smoke attempt | blocked before navigation by the browser plugin's trusted-code-path rejection; no agent-driven ui interaction was performed |
| manual live-selector check | owner confirmed “it works!” in response to the requested live-selector check; rendered confirmation is owner-reported |
| source database fingerprint before/after integration checks | unchanged |
| `uv build` and isolated wheel installation | source distribution and wheel built; cli help, backend import, and all four packaged gazetteers work outside the checkout |
| documentation checker | four inherited missing spec-status errors; no other findings |
| `git diff --check` | passed |

python tests use temporary fixtures or injected backend sources. separate
integration requests exercised the selected owner database through public
read-only adapters; only verification summaries were printed. glossololary's
tracked worktree remained clean. the earlier temporary backend on port 8017 was
stopped. the subsequent browser smoke attempt leaves the full atlas running at
`http://127.0.0.1:5173/` and the backend at `http://127.0.0.1:8000/` for manual
interaction. the backend process explicitly selects the migrated database.

the project environment uses python 3.12; the isolated wheel check also passed
on python 3.11. frontend verification used node 26.7.0 and npm 11.19.0. package
builds and the wheel environment were kept under a task-specific `/tmp/`
directory. the last production build left public output in `atlas/dist/`;
starting the full dev server subsequently restaged `atlas/public/data/` with
all 80 local datasets.

## repaired in this slice

- both adapters now default to `~/.projects/glossololary/glossololary.db`,
  derived from the user's home directory. the cli source default follows the
  same migrated checkout. existing explicit cli and backend overrides remain.
- the setuptools build declaration installs the console entry point and
  packages both the library and backend with explicit gazetteer resources.
  the uv lockfile records an editable project instead of a virtual project;
  locked dependency versions did not change.
- glossololary was reinstalled into geogematria's `.venv` from the migrated
  sibling checkout. both adapters use its public `read_only=True` option.
  regression tests cover absent sources, rejected writes, and unchanged live
  fixture reads.
- [development](docs/DEVELOPMENT.md) now documents the working setup and launch
  commands. use `uv sync --inexact` to preserve the separately installed local
  dependency.

historical bootstrap note: an exact sync removed eight undeclared packages,
including the stale glossololary editable registration. this repair restored
those eight package names through the selected editable install; resolved
versions include pillow 12.3.0 and pygments 2.21.0. glossololary remains an
explicit local install, outside geogematria's lockfile.

## known limits and deferred work

- all cli subcommands beyond help still initialize the glossololary adapter,
  including `list-projections`. use the direct library smoke check in
  [development](docs/DEVELOPMENT.md) when no source database is configured.
- local ignored `specs/` retains four files without lifecycle status:
  `SPEC_v0.md`, `SPEC_v1c.md`, `MAP_REFACTOR_SPEC.md`, and
  `spec-night-mode-coherence.md`. approval/completion was not reconstructed;
  their contents remain historical planning material. the checker scans ignored
  files too and reports these four errors.
- builds retain the javascript chunk-size warning. python backend tests retain
  the starlette/httpx deprecation warning.
- the inherited shell database override still points into the old `Github`
  checkout. the documented backend command corrects it per process; shell
  configuration was not inspected or changed.
- the live-selector flow and original constellation/export appearance have
  owner confirmation; the complete rendered smoke matrix remains open. automated browser setup
  rejected its own `browser-service.mjs`
  with `Trusted RPC dependency must resolve within a configured trusted code path`.
  the runtime never initialized, so automated browser coverage remains unavailable.

## active work and next useful action

completed slice: repair the migrated python integration and console entry point,
with read-only source access, packaging proof, and owner confirmation of the
live-selector flow. this was a directly authorized repair; no historical spec
was promoted to accepted or retired.

the repair and its live-selector check are complete. the constellation and
mounted globe slices are implemented with automated checks passing, but their
complete rendered acceptance checks remain open. begin with the globe checklist
and current preview addresses at the top of this checkpoint. the owner has
accepted the original constellation and both export visual follow-ups. no
phrase calculator or deployment is authorized by this slice. after a backend
restart, use the explicit database path in
[development](docs/DEVELOPMENT.md); the inherited shell setting remains a known
configuration issue outside these changes.

## re-entry state

the static entry path in the [readme](README.md) needs no backend or database.
source datasets remain under `atlas/datasets/`; generated data and build outputs
are ignored. the live backend defaults to the migrated owner database and can
be overridden through `GEOGEMATRIA_GLOSSOLOLARY_DB`. neither entry point loads a
root `.env` itself. local `notes/` and `specs/` are ignored history, not required
reading for a fresh clone.
