# geogematria

geogematria is a local geographic projection layer for glossololary.

glossololary remains the source of truth for phrase normalization, cipher
calculation, saved phrase/value data, and database ownership. geogematria does
not maintain a second phrase database and should not bypass glossololary public
interfaces.

## current status

This repository contains the migrated static atlas, static export CLI, offline
projection inputs, and the v1c local live cliquemap provider:

```text
backend/       local FastAPI server for live atlas layers
atlas/         React/Vite atlas with static and live providers
geogematria/   projection, GeoJSON, and live layer helpers
tests/         Python tests for projection/GeoJSON/adapter/backend behavior
specs/         project specs
notes/         dated design notes from the prototype
```

The atlas loads precomputed GeoJSON files from its static manifest and can also
request allowlisted live `value_hash_v1` cliquemap layers from the local
backend. Live layers are local-only and read glossololary through its public
interfaces.

## static exports

The CLI can inspect phrases/cliques, list ciphers/projections, and write static
GeoJSON exports:

```bash
uv run geogematria ciphers
uv run geogematria list-projections
uv run geogematria locate "example phrase" --cipher aq --json
uv run geogematria export --cipher aq --projection value_hash_v1 --format geojson
uv run geogematria export-domain --cipher aq --projection nearest_10000_towns_hash_v1 --min 1 --max 2000 --format geojson
```

Static atlas data lives in `atlas/public/data/` and is described by
`atlas/public/data/manifest.json`.

## local checks

Python tests:

```bash
uv run --extra backend --extra test python -m unittest discover -s tests
```

Atlas checks:

```bash
cd atlas
npm test
npm run build
```

Run these from `atlas/` after installing npm dependencies.

## glossololary dependency

For live layers, install or expose glossololary as a local editable dependency.
Production geogematria code must use glossololary public methods only. If a
needed public method is missing, add it in glossololary before consuming it here.

Local editable install:

```bash
uv pip install -e ../glossololary
```

## local backend

v1c exposes a local-only FastAPI backend for the allowlisted live cliquemap
layer:

```bash
uv run --extra backend uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

Configure the live-layer DB path locally before starting the backend:

```bash
export GEOGEMATRIA_GLOSSOLOLARY_DB=/path/to/glossololary.db
```

You can also put that value in a local `.env` for your shell tooling. `.env` is
ignored and should not be committed. The backend does not load `.env` files by
itself in v1c.

The atlas dev server proxies `/api` to `http://127.0.0.1:8000`.
