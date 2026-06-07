# geogematria

geogematria is a local geographic projection layer for glossololary.

glossololary remains the source of truth for phrase normalization, cipher
calculation, saved phrase/value data, and database ownership. geogematria does
not maintain a second phrase database and should not bypass glossololary public
interfaces.

## current status

This repository currently contains the migrated static prototype:

```text
atlas/         React/Vite static atlas
geogematria/   projection and GeoJSON helpers
tests/         Python tests for projection/GeoJSON/adapter behavior
specs/         project specs
notes/         dated design notes from the prototype
```

The static atlas loads precomputed GeoJSON files from its manifest. v1c will add
a local FastAPI backend and live provider, but static manifest/GeoJSON loading
must remain available.

## local checks

Python prototype tests:

```bash
uv run --extra backend --extra test python -m unittest discover -s tests
```

Static atlas checks:

```bash
cd atlas
npm test
npm run build
```

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
