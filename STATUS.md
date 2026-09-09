# geogematria status

role: operational checkpoint. last verified: 2026-09-08.
update at a meaningful stopping point; this file owns evidence and active work,
not permanent intent or retrospective spec approval.

## export placement follow-up

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
result remains below. browser capture is still blocked before navigation, so
the new placement awaits an owner-rendered comparison, especially on narrow screens.
no commit, push, or deployment was performed for this follow-up.

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
keyboard, and individual clipboard/download failure paths. the newly relocated
controls need a fresh visual check.

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

the repair and its live-selector check are complete. the accepted constellation
slice is implemented with automated checks passing, but its rendered acceptance
checks remain open. use `constellation` in either running edition and follow
the smoke checklist above. no phrase calculator or deployment is authorized
by this slice. after a backend restart, use the explicit database path in
[development](docs/DEVELOPMENT.md); the inherited shell setting remains a known
configuration issue outside these changes.

## re-entry state

the static entry path in the [readme](README.md) needs no backend or database.
source datasets remain under `atlas/datasets/`; generated data and build outputs
are ignored. the live backend defaults to the migrated owner database and can
be overridden through `GEOGEMATRIA_GLOSSOLOLARY_DB`. neither entry point loads a
root `.env` itself. local `notes/` and `specs/` are ignored history, not required
reading for a fresh clone.
