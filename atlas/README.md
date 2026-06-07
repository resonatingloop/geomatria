# Geogematria Atlas v1b

Static 2D atlas for v0 geogematria GeoJSON exports.

## Run

```bash
npm install
npm run dev -- --port 5173
```

Open:

```text
http://127.0.0.1:5173/
```

## Static Data

The app loads a static manifest:

```text
/data/manifest.json
```

Each manifest entry points to one exported cipher + projection method pair:

```json
{
  "cipher": "QWER",
  "label": "QWER",
  "projection_method": "value_hash_v1",
  "projection_label": "value hash v1",
  "file": "/data/qwer.value_hash_v1.geojson"
}
```

Regenerate a cipher/projection file from the v0 CLI:

```bash
python3 ../geogematria.py export --cipher qwer --projection value_hash_v1 --format geojson > public/data/qwer.value_hash_v1.geojson
```

Generate a static value-domain export independent of phrase occupancy:

```bash
python3 ../geogematria.py export-domain --cipher satanic --projection nearest_10000_towns_hash_v1 --min 1 --max 2000 --format geojson > public/data/satanic.nearest_10000_towns_hash_v1.domain_1_2000.geojson
```

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

## v1b Boundary

This prototype renders projected loci. A clique is all phrases sharing the same
cipher + value. A projected locus is the latitude/longitude coordinate produced
by the selected projection method. Hash projections usually put one clique at a
locus; coarse grid projections may put multiple cliques at the same locus
because distinct values can collide visually at the same coordinate.
Nearest-town snapping may also put many distinct cliques at the same place
locus because different base coordinates can snap to the same gazetteer town.

The atlas does not merge collided cliques. It does not implement visual map
clustering, backend requests, live glossololary access, globe rendering, manual
placement, or live land/place lookup.

The UI has two static dataset modes:

- clique exports render projected loci as selectable markers
- value-domain exports render every exported integer value as a heatmap, with
  phrase-bearing values exposed as smaller selectable occupancy markers

The export remains stable as `projection` and `count`; the manifest also records
the selected projection method, and the atlas labels those as `projection method`
and `clique size`.

The map is locked to a flat 2D interaction model: pan, zoom, and marker
selection remain enabled; rotation, pitch, and repeated world copies are
disabled.
