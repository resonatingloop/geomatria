# geogematria development

role: operational procedures. last verified: 2026-09-08.
update when setup, validation, configuration, or generated-state handling changes.
actual outcomes and unverified paths belong in [status](../STATUS.md).

## static atlas

the pages workflow uses node 20; the bootstrap used node 26.7.0 and npm 11.19.0.
from the repository root:

```bash
cd atlas
npm ci
npm run dev:public -- --port 5175 --strictPort
```

open <http://127.0.0.1:5175/>. public staging selects 16 datasets from the
80-entry source manifest. the ui offers value-domain heatmaps, exact integer
search, and no live-source control. check the local server without rendering:

```bash
curl --fail --silent --output /dev/null http://127.0.0.1:5175/
curl --fail --silent http://127.0.0.1:5175/data/manifest.json
```

use `npm run dev -- --port 5173 --strictPort` for the full local atlas. this
includes phrase-bearing datasets and the optional live-source control.
the static provider works without a running backend.

from `atlas/`, build and validate with:

```bash
npm test
npm run build
npm run build:public
```

the builds share `dist/`; the last command leaves the public artifact there.
these commands build locally. the [pages workflow](../.github/workflows/pages.yml)
deploys on manual dispatch or an `atlas-v*` tag, checks the ref's relationship
to `main`, and builds in public mode. deployment evidence belongs in
[status](../STATUS.md); a local build does not publish new changes.

## constellation smoke checks

the accepted [value constellation slice](value-constellation-spec.md) is
frontend-only. `npm test` covers domain lookup, canonical cipher ordering,
cache/retry behavior, stale-result rejection, source/public coordinate parity,
collisions, scoped markdown, and public privacy suppression. it also imports
the staging sanitizer without restaging a running app.

after `npm run build:public`, a public preview can run alongside the full dev
server without staging collisions because preview reads `dist/`, not
`public/data/`. from `atlas/`:

```bash
npm run preview -- --mode public --port 5175 --strictPort --base /geomatria/
```

open `http://127.0.0.1:5175/geomatria/` for the subpath check. the full dev
server can then be restarted on 5173 using its usual command, which restores
full staging in `public/data/` without changing the sanitized preview artifact.
do not rebuild or run two staging commands simultaneously. stop the public
preview before a full build: both builds overwrite `dist/`, and a preview must
not accidentally serve the full phrase-bearing artifact. build public last,
then restart the preview before restaging full dev data.

rendered smoke in both editions:

- cast 1, 177, and 2000 under both projections; compare eight labelled rows
  and map landings. select a row and marker, then use show all and escape.
- change values/projections rapidly; invalid input must not leave an old
  reading or enabled export. test retry with an unavailable dataset.
- check day/night, keyboard focus, narrow portrait/landscape layouts, and
  return to an ordinary selected locus without losing its source or camera.
- copy and download a constellation and an ordinary locus. compare text;
  public output must not claim zero saved phrases or disclose occupancy.
- test clipboard denial with download still available. check ordinary heatmap
  integer search, local phrase search, live selection, and the public subpath.

build and http checks are not rendered proof. the last browser connection was
blocked before navigation; record owner/agent-rendered outcomes in status when
available. no public deployment is performed by these commands.

## globe smoke checks

the [mounted globe contract](globe-view-spec.md) adds presentation-only state.
`npm test` covers camera identity/invalidation, style generations, queued focus,
reduced motion, visibility/focus handoff, cleanup, style validity, and unchanged
exports. camera tests exercise the installed renderer's public `setMinZoom`
guard, which rejects values below -2; permissive internal transforms alone do
not prove public-api compatibility. test-only native maplibre transforms, using
that supported bound, check known-coordinate front/rear,
dateline, polar, coincident, and responsive silhouette fixtures. they do not
test gematria transform quality or replace hermes's separate experiments.
daylight relief tests check its radius against those native silhouettes, plus
resize/lens behavior, inert placement, cleanup and the day/globe styling gate;
they do not establish the rendered shadow's softness or stacking.

render in both the full local and public-subpath editions:

1. start flat. verify heatmap search, a local phrase/live selection, markers,
   attached plates, and trays after the renderer upgrade.
2. select `globe`; drag/touch, scroll, and zoom. check north-up, point attachment,
   limb clipping, heatmap picking, and the absence of rear-side ghost controls.
   tab through markers; turn a focused marker out of view and check its fallback.
   first entry and `whole globe` must complete without a view-update warning.
   check a small pole-facing overview and confirm returning to flat restores
   its original lens as well as its center and zoom.
3. cast 1, 177, and 2000 under both methods. choose near and far ledger entries;
   each must face the camera. `whole globe` keeps facing and selection while
   fitting the sphere. all eight entries remain exportable, even when hidden.
4. select an ordinary locus, open its tray, and alternate workspaces/surfaces.
   confirm source, dataset, selection, tray, current constellation, and each
   camera return. editing/casting new data must invalidate old framing.
5. rapidly alternate lamp and surface, including while the night style loads.
   the latest choice wins, guide layers do not duplicate, and heatmaps return.
   test a blocked basemap request and the visible recovery message.
6. compare the same markdown before and after changing surface. verify public
   occupancy suppression and local visible-phrase scope; globe occlusion must
   not reduce either reading's export scope.
7. inspect day/night at desktop, narrow portrait, and narrow landscape sizes;
   check header wrapping, ledger scrolling, 44px mobile globe controls, sphere
   margins, and basemap attribution. repeat programmatic focus with reduced
   motion enabled. no auto-spin should occur.
8. in daylight globe, inspect the warm cast below/right and subtle shaded rim.
   turn, zoom, resize, select a distant locus, and use `whole globe`, including
   a small pole-facing aperture. the effect must follow the limb without lag,
   leave markers/labels readable and controls clickable, and disappear in flat
   or night. repeat in constellation and both editions; check that no decorative
   element enters keyboard focus. inspect softness against the owner's baseline
   screenshots before calling this visual pass accepted.

browser capture was unavailable at the implementation checkpoint. keep this
rendered gate open until owner or working browser evidence covers it. do not
retire the spec from builds or cpu geometry checks alone.

## python setup

python 3.11 or newer and uv are required; verification used python 3.12.
from the repository root:

```bash
uv sync --inexact --locked --extra backend --extra test
uv run --locked geogematria --help
uv run --locked python -c 'from geogematria.projection import project_value; p = project_value("AQ", 177); print(p.projection_id); print(p.latitude, p.longitude)'
```

the projection smoke check returns:

```text
value_hash_v1
12.851504 20.991909
```

the projection smoke check imports only geogematria's projection library and
creates no database. setup installs the `geogematria` console script through the
declared setuptools build system. `python geogematria.py` remains a checkout
wrapper. the wheel includes the backend package and explicit gazetteer data.

after installing glossololary as described below, run the complete python suite:

```bash
uv run --locked --extra backend --extra test python -m unittest discover -s tests
```

adapter/cli tests require importable glossololary and construct temporary
fixture databases, including read-only and missing-source regression cases.
backend tests use injected sources and unavailable-source cases; they do not
establish real database connectivity. for a focused run independent of
glossololary, select the relevant test file:

```bash
uv run --locked --extra backend --extra test python -m unittest discover -s tests -p 'test_backend.py'
```

the other independent files are `test_projection.py`, `test_geojson.py`, and
`test_layers.py`. a subset does not replace the complete-suite gate.

if the default uv cache is unwritable, create a temporary cache directory and
set `UV_CACHE_DIR` to it for these commands. `--locked` prevents silently
rewriting the lockfile; `--inexact` preserves extra installed packages, including
an undeclared editable glossololary dependency. plain `uv sync` removes extras.

## glossololary integration

glossololary is not declared in this project's dependency manifest. a selected
local checkout must be installed or exposed before using database-backed paths.
the existing editable-install procedure is:

```bash
uv pip install --python .venv/bin/python -e ../glossololary
```

this was verified with sibling checkouts under `/home/resonatingloop/.projects`.
use an absolute checkout path if the repositories are elsewhere. both adapters
require the public `GlossololaryDB(path=..., read_only=True)` interface provided
by the selected checkout. source queries use its public lookup methods; missing
databases are not created. the integration check exercised all eight live layers
and a cli export, with the source database hash unchanged. glossololary source
files were not modified. future work still follows the
[cross-repository boundary](../AGENTS.md).

| entry point | configuration | behavior |
|---|---|---|
| cli | `--db` before the subcommand | selects the glossololary database |
| cli | `--glossololary-src` before the subcommand | prepends an existing source directory to the import path |
| backend | `GEOGEMATRIA_GLOSSOLOLARY_DB` | selects an existing database; glossololary must already be importable |
| atlas dev server | vite proxy configuration | forwards `/api` to `http://127.0.0.1:8000` |

both adapters default to `~/.projects/glossololary/glossololary.db`, derived from
the current user's home directory. the cli also defaults to that checkout's
`src/` directory. the migrated database location was verified in this workspace.
the cli does not read `GEOGEMATRIA_GLOSSOLOLARY_DB`. the backend does not load
`.env` files itself; supply its environment through shell tooling and keep
local configuration private.

once the dependency and database are selected, representative commands are:

```bash
uv run --locked geogematria ciphers
uv run --locked geogematria list-projections
uv run --locked geogematria locate 'example phrase' --cipher aq --json
uv run --locked geogematria export --cipher aq --projection value_hash_v1 --format geojson
```

`locate` requires a stored phrase/cipher value. all subcommands, including
`list-projections` and `export-domain`, initialize the adapter; value-domain
export overlays saved phrase occupancy. use the independent projection smoke
check above when no database is configured. to override the defaults, put
`--db /absolute/path/to/glossololary.db` and, if needed,
`--glossololary-src /absolute/path/to/glossololary/src` before the subcommand.

to run the backend from the repository root:

```bash
GEOGEMATRIA_GLOSSOLOLARY_DB="$HOME/.projects/glossololary/glossololary.db" \
  uv run --locked --extra backend python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

this sets the database path for the launched process. an inherited
`GEOGEMATRIA_GLOSSOLOLARY_DB` takes precedence over the code's migrated default;
the browser smoke attempt found this shell still exported the old `Github`
database path, causing 503 responses until the launch override above was applied.
the source of that shell setting was not inspected or edited. use another
absolute path in the command when intentionally selecting a different database.
then start the full atlas from `atlas/`. the backend exposes
`/api/live-manifest` and `/api/layers/cliquemap?cipher=aq&projection_method=value_hash_v1`.
the allowlist covers aq, synx, ordinal, qwer, nqwer, reduced, standard, and
satanic with `value_hash_v1` only. an available source returns eight manifest
entries; a missing database or unavailable adapter returns 503 with
`live source unavailable`. with an available source, unsupported layers return
404. bind this service to loopback for local use; it has no authentication.

## data and recovery

- glossololary owns phrase/value storage and migrations. geogematria calls
  public methods with read-only database handles and owns no second phrase store
  or migration procedure. migrations must be performed by glossololary itself.
  do not reset the source database to recover an atlas build.
- staging reads `atlas/datasets/` and replaces ignored `atlas/public/data/`;
  vite rebuilds ignored `atlas/dist/`. these generated outputs can be reproduced
  from the source snapshots. stop a dev server with ctrl-c before switching
  full/public mode, then rerun the intended npm command.
- public staging selects the allowlist and removes known phrase/occupancy
  fields. it does not alter source files or git history. schema changes require
  a fresh review of the staging filter.
- projection gazetteers are committed offline inputs. map rendering separately
  fetches day tiles from openstreetmap and night tiles, sprites, and glyphs from
  openfreemap. local dataset success does not prove basemap availability.
- the browser stores the theme under `geogematria-theme` in local storage.
- `--strictPort` reports a port conflict instead of choosing another port.
  stop the conflicting process or choose a different port explicitly.

## documentation checks

with the local `manage-project-docs` skill installed, from the repository root:

```bash
python3 /home/resonatingloop/.codex/skills/manage-project-docs/scripts/check_docset.py .
git diff --check
```

the checker is agent tooling outside this repository. it scans ignored markdown
too, so this workspace's four old specs produce missing status-line errors.
[status](../STATUS.md) records that inherited gap. preserve approval provenance;
do not assign `accepted` or `retired` just to pass a check. new specs should
declare a lifecycle, and shared continuity must not depend on ignored files.
