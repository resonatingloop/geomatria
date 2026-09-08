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
to `main`, and builds in public mode. deployment state is unverified.

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
