# geogematria atlas

role: operational/reference guide for frontend behavior and dataset semantics.
start at the [repository readme](../README.md), use [status](../STATUS.md) for
verified outcomes, and [development](../docs/DEVELOPMENT.md) for python setup,
configuration, and recovery. runtime claims below describe the implementation;
owner-confirmed rendered outcomes and the deployment checkpoint are recorded
in status. the export controls' new styling still needs a fresh visual check.

React/Vite atlas for geogematria static GeoJSON exports and v1c local live
cliquemap layers.

## Local Full Run

```bash
npm ci
npm run dev -- --port 5173 --strictPort
```

Open:

```text
http://127.0.0.1:5173/
```

The static atlas works without the Python backend. Before dev/build, the npm
scripts stage committed GeoJSON files from `datasets/` into generated
`public/data/`. `npm run dev` stages the full local dataset, including private
phrase occupancy fields.

## Public-Sanitized Run

Use this to test the friend-facing public atlas locally:

```bash
npm run dev:public -- --port 5175 --strictPort
```

Open the public-mode path:

```text
http://127.0.0.1:5175/
```

This stages only `datasets/curation.public.json`, strips private phrase and
occupancy fields from generated GeoJSON, hides the live source, and uses the
same relative asset base used by the Pages build. The same public artifact can
be served from a custom-domain root or from a project path such as
`/geogematria/`.
For v0, public hash-scatter value-domain maps use `webmercator_hash_v1` so
search results stay inside the Web Mercator map bounds.

## value constellation and markdown

both editions have an `atlas / constellation` view switch. constellation reads
the static snapshot manifest, even when ordinary local browsing was using the
live source. it does not calculate phrases or access the source database.

1. choose `constellation`, enter an integer from 1 to 2000, and press enter or
   `cast`. choose hash scatter or nearest 10,000 towns before casting.
2. read all eight cipher/value addresses. selecting a row highlights and
   centers its landing; selecting a marker highlights its ledger entry. shared
   locations retain all their entries under one labelled marker. `show all`
   reframes the constellation; escape clears its highlight.
3. use `copy markdown` or `download .md` directly beneath the constellation
   heading. the export contains numeric/geographic details only in both editions.
4. return to `atlas` to restore the previous browsing source, dataset,
   selection, tray state, and camera position.

the constellation uses a square, flat map aperture so a global spread can fit
without repeating the world. the ledger sits beside it on wide screens and
below it on narrow portrait screens. its temporary zoom-out limit is restored
on return to ordinary browsing. day/night uses the existing theme.

changing the input or projection clears the previous result and disables
export until another successful cast. failed loads have a retry action, and
late responses cannot replace a newer request. all eight matching datasets
must be present and valid; a partial constellation is an error, not a reading.
successful numeric indexes are cached in memory across visits to the view.
first use loads eight files for the selected projection; there is no extra
compact-index artifact or local-storage cache.

ordinary locus trays also offer copy/download markdown for `this locus`,
directly beneath the locus heading and before the detailed reading.
both readouts share plate-metal export keys with engraved-style labels and
decorative copy/download glyphs, using the existing day/night theme tokens.
exports share the readout's visibility rules: local domain readings include
phrase-bearing values plus an explicitly selected value, while local
cliquemaps include their displayed cliques. public readings omit phrase and
occupancy information, describing it as not published rather than zero.
neither exporter serializes raw dataset objects. coordinates are explicitly
latitude, longitude; per-entry base coordinates and snap details are included
when available. clipboard failure is reported, with download as an alternative.

the [accepted spec](../docs/value-constellation-spec.md) owns this slice's scope.
automated data/export/build checks pass. the owner has confirmed the original
constellation appearance, public update, markdown export, and export placement.
the subsequent export styling pass still awaits visual confirmation because
the browser runtime could not connect. see [status](../STATUS.md) for the
remaining smoke gates.

## Live Run

after the glossololary setup in [development](../docs/DEVELOPMENT.md), start
the local backend from the repo root:

```bash
GEOGEMATRIA_GLOSSOLOLARY_DB="$HOME/.projects/glossololary/glossololary.db" \
  uv run --locked --extra backend python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

the launch command explicitly selects the migrated database so an inherited
old path cannot override it. use another absolute path for a different location.
the adapter opens it through glossololary's public read-only interface.

then run the atlas dev server from `atlas/`:

```bash
npm run dev -- --port 5173
```

The Vite dev server proxies `/api` to `http://127.0.0.1:8000`. The live
provider fetches `/api/live-manifest` and then supported layer URLs such as
`/api/layers/cliquemap?cipher=aq&projection_method=value_hash_v1`.

Live support is intentionally narrow in v1c: local-only cliquemap layers for
the allowlisted workbench ciphers using `value_hash_v1`. Static manifest loading
remains the baseline behavior.

## Static Data

The app loads a static manifest:

```text
/data/manifest.json
```

The committed source of truth is `datasets/manifest.json` plus the GeoJSON files
under `datasets/`. `public/data/` is generated by `scripts/build-data.mjs` and
is ignored by git.

Each manifest entry points to one exported cipher + projection method pair:

```json
{
  "id": "qwer.value_hash_v1.cliquemap",
  "source": "static",
  "mode": "cliquemap",
  "render_mode": "cliquemap",
  "cipher": "QWER",
  "cipher_label": "QWER",
  "transform_family": "hash",
  "projection_method": "value_hash_v1",
  "projection_label": "value hash v1",
  "file": "/data/qwer.value_hash_v1.geojson"
}
```

regenerate exports from the repository root after configuring glossololary.
these commands replace the named source snapshots; review the result before
staging or committing it. the cli takes explicit paths and does not use the
backend's database environment variable.

```bash
uv run --locked python geogematria.py --db /absolute/path/to/glossololary.db --glossololary-src /absolute/path/to/glossololary/src export --cipher qwer --projection value_hash_v1 --format geojson > atlas/datasets/qwer.value_hash_v1.geojson
```

generate a static value-domain export with saved phrase occupancy overlaid:

```bash
uv run --locked python geogematria.py --db /absolute/path/to/glossololary.db --glossololary-src /absolute/path/to/glossololary/src export-domain --cipher satanic --projection nearest_10000_towns_hash_v1 --min 1 --max 2000 --format geojson > atlas/datasets/satanic.nearest_10000_towns_hash_v1.domain_1_2000.geojson
```

Public GitHub Pages builds run `npm run build:public`, which excludes the local
live source and copies only filenames listed in `datasets/curation.public.json`
into the static build output. Public datasets are sanitized during staging:
private phrase strings and occupancy fields are removed from the generated
GeoJSON before Vite copies it to `dist/`.

Value-domain exports project every integer in the requested range. Actual
phrases are overlaid only when glossololary has entries for that cipher/value.
Their collection metadata includes a `summary` with projected-locus density,
phrase/no-phrase counts, and snapped-place country/region counts when place
metadata exists.

The manifest currently includes value-domain heatmap datasets for the eight
workbench ciphers over values `1..2000` using `nearest_10000_towns_hash_v1`.
In heatmap mode, the search field expects an exact integer value instead of
phrase text.

The experimental place-snapping projections use only committed offline
gazetteers under `../geogematria/data/`. They never call live geocoding
services. Each starts from `webmercator_hash_v1`, snaps to the nearest
gazetteer place by haversine distance, and writes the original hash coordinate
plus snapped-place metadata into each GeoJSON feature.

Current snapped projections:

- `nearest_32_cities_hash_v1` uses `cities32.json`
- `nearest_1000_towns_hash_v1` uses `towns1000.geonames.json`
- `nearest_10000_towns_hash_v1` uses `towns10000.geonames.json`
- `nearest_50000_towns_hash_v1` uses `towns50000.geonames.json`

Expected feature shape:

```text
geometry.type: Point
geometry.coordinates: [longitude, latitude]
properties.cipher
properties.value
properties.projection
properties.projection_method
properties.count
properties.phrases
properties.base_coordinate        # place-snapping projections only
properties.snapped_place          # place-snapping projections only
```

Value-domain feature shape differs intentionally:

```text
properties.mode: value_domain
properties.cipher
properties.value
properties.projection
properties.projection_method
properties.phrase_count
properties.has_phrases
properties.phrases
properties.base_coordinate        # place-snapping projections only
properties.snapped_place          # place-snapping projections only
```

## Layer Semantics

This prototype renders projected loci. A clique is all phrases sharing the same
cipher + value. A projected locus is the latitude/longitude coordinate produced
by the selected projection method. Hash projections usually put one clique at a
locus; coarse grid projections may put multiple cliques at the same locus
because distinct values can collide visually at the same coordinate.
Nearest-town snapping may also put many distinct cliques at the same place
locus because different base coordinates can snap to the same gazetteer town.

The atlas does not merge collided cliques. It does not implement visual map
clustering, globe rendering, manual placement, public upload, guest lexicon
generation, or live land/place lookup.

ordinary local atlas browsing has two static dataset modes, alongside the
independent constellation view:

- clique exports render projected loci as selectable markers
- value-domain exports render every exported integer value as a heatmap, with
  phrase-bearing values exposed as smaller selectable occupancy markers

Public-sanitized value-domain datasets intentionally omit private phrase
occupancy, so they render as pure domain heat geometry without occupied markers.
The public curation keeps `webmercator_hash_v1` and
`nearest_10000_towns_hash_v1` value-domain maps; the full-range `value_hash_v1`
domain export remains available only in the full local dataset for now.

The export remains stable as `projection` and `count`; the manifest also records
the selected projection method, and the atlas labels those as `projection method`
and `clique size`.

The map is locked to a flat 2D interaction model: pan, zoom, and marker
selection remain enabled; rotation, pitch, and repeated world copies are
disabled.

## Checks

```bash
npm test
npm run build
npm run build:public
npm run dev:public -- --port 5175
```
