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
PYTHONPATH=. python3 -m unittest discover -s tests
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
