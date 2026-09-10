# geogematria

geogematria maps cipher-value pairs into geographic coordinates, static atlas
datasets, and local live layers. glossololary owns phrase normalization, cipher
calculation, saved phrase/value data, and the database; geogematria consumes its
public interfaces and does not maintain a second phrase database.

this is an experimental, multi-component atlas. the static frontend can run
independently of python and glossololary. see [status](STATUS.md) for the last
verified checkpoint, environment gaps, and next useful action.

## quickest successful use

from the repository root, with node and npm installed:

```bash
cd atlas
npm ci
npm run dev:public -- --port 5175 --strictPort
```

open <http://127.0.0.1:5175/>. staging should report
`target=public datasets=16/80`; the atlas offers curated value-domain heatmaps,
integer search, and a value constellation across eight ciphers. choose
`constellation`, enter `177`, and press `cast`. its readout and ordinary locus
readouts offer copy/download markdown. this mode needs no phrase database or backend.
`surface · globe` turns either view into a hand-turned, north-up globe; `flat`
returns to the existing map. `whole globe` restores the overview. surface changes
keep the reading and its export, including addresses on the far side.
the basemap uses external map tiles, so a fully rendered map needs network
access and a browser with webgl support.

for the full local atlas, run `npm run dev -- --port 5173 --strictPort` from
`atlas/` instead. it stages all datasets, including saved phrase and occupancy
fields. both modes use the same generated `atlas/public/data/` directory; stop
one before switching modes.

## other entry points

- [development](docs/DEVELOPMENT.md): python setup, projection smoke check,
  cli invocation, local backend, validation, and recovery.
- [atlas guide](atlas/README.md): dataset modes, manifest and feature shapes,
  projection semantics, and frontend interaction.

the installed cli is `uv run --locked geogematria`; the checkout wrapper
`uv run --locked python geogematria.py` also works. follow the development
setup to install glossololary from the sibling checkout. both adapters default
to `~/.projects/glossololary/glossololary.db` and open it through the public
read-only database interface. cli commands beyond help require that integration,
including `list-projections`.

## project and data map

```text
backend/          local live-layer http endpoints
atlas/            react/vite frontend, dataset sources, and staging script
geogematria/      projection library, geojson builders, and public-api adapters
geogematria/data/ committed offline gazetteers
tests/            python validation
docs/             operational procedures
```

`atlas/datasets/manifest.json` and its referenced geojson files own the static
snapshot inputs. `atlas/datasets/curation.public.json` selects the public
subset. staging regenerates ignored `atlas/public/data/`; builds regenerate
ignored `atlas/dist/`. public staging removes the defined phrase and occupancy
fields from generated files; source datasets retain their contents.

## documentation authority

| document | role | owns |
|---|---|---|
| [readme](README.md) | operational | front door, shortest use, and this authority map |
| [status](STATUS.md) | operational | dated evidence, gaps, and next useful action |
| [agent guide](AGENTS.md) | normative | collaboration scope, repository boundaries, and completion protocol |
| [claude entry point](CLAUDE.md) | routing | directs claude to the same agent guide |
| [development](docs/DEVELOPMENT.md) | operational | setup, commands, configuration, generated state, and recovery |
| [atlas guide](atlas/README.md) | operational/reference | implemented frontend behavior and dataset semantics |
| [gazetteer notes](geogematria/data/README.md) | reference | offline input provenance |
| [value constellation spec](docs/value-constellation-spec.md) | accepted transition | range, projections, export scope, and acceptance gates |
| [mounted globe spec](docs/globe-view-spec.md) | accepted transition | surface behavior, camera/visibility rules, and rendered acceptance gates |
| [halton equal-area spec](docs/halton-equal-area-spec.md) | accepted transition; not implemented | numeric-only method, shared landings, polar handling, and conformance gates |

local `specs/` and `notes/` contain earlier planning and historical material.
both directories are git-ignored and absent from a fresh clone. their existence
does not establish current approval or completion. the value constellation slice
was explicitly accepted on 2026-09-08 and is recorded in tracked documentation;
shared re-entry does not depend on ignored historical specs.
the halton equal-area handoff was accepted on 2026-09-08 and promoted into
`docs/halton-equal-area-spec.md`; its ignored source remains historical provenance.
that acceptance adds no runnable method yet and does not authorize research.
