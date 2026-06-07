# geogematria atlas dataset selector refactor spec

## goal

refactor the atlas controls so map datasets are organized by map mode, cipher, transform family, and dataset, instead of one long flat dropdown.

the atlas currently loads pre-generated geojson datasets. this refactor should make that data model explicit and prevent the dataset selector from becoming unmanageable as more heatmaps, cliquemaps, projection methods, and transform families are added.

## core idea

the selected dataset is the final geojson world to load.

the earlier controls are filters over the manifest.

control hierarchy:

```text
map mode
→ cipher
→ transform family
→ dataset
```

meaning:

```text
map mode = what kind of map this is
cipher = what number-world it uses
transform family = what kind of spatial logic generated it
dataset = which pre-generated geojson file to load
```

example:

```text
map mode: heatmap
cipher: standard
transform family: place snap
dataset: nearest 10k towns · values 1-2000
```

the dataset is not generated live by the frontend. it is an existing geojson file described by the manifest.

## current issue

the atlas now has multiple kinds of datasets:

* cliquemaps
* heatmaps
* value-domain maps
* future guest lexicon maps
* future temporal / stratigraphy maps

and multiple transform families:

* hash scatter
* grid / modular
* place snap
* curve / sequence
* fractal / ternary

a single flat selector will not scale because every cipher/function/mode/range pair can become a separate geojson dataset.

## non-goals for this pass

do not implement:

* live runtime geojson generation
* backend api layer
* database catalog for geojson files
* new projection methods
* new heatmap generation logic
* guest lexicon generator
* temporal stratigraphy mode
* public upload/share workflow

this pass is only about organizing existing and near-future static datasets in the atlas ui and manifest.

## definitions

### map mode

the kind of map being displayed.

initial supported modes:

```text
cliquemap
heatmap
```

future modes may include:

```text
value_domain
external_corpus
temporal_stratum
```

### cipher

the cipher id used to generate the dataset.

for now, geomatria/geogematria should continue using the core stable cipher set unless explicitly expanded later.

### transform family

a broad category describing the spatial logic used to produce the dataset.

initial families:

```text
hash
grid
place_snap
```

future families:

```text
curve
sequence
fractal
ternary
sphere
```

human-facing labels can be nicer:

```text
hash scatter
grid / modular
place snap
curve / sequence
fractal / ternary
sphere-aware
```

### dataset

the actual manifest entry and geojson file to load.

a dataset is a precomputed atlas-world, such as:

```text
aq.value_hash_v1.cliquemap.geojson
standard.nearest_10000_towns_hash_v1.heatmap_1_2000.geojson
```

## manifest schema

update manifest entries so each dataset explicitly declares its mode and transform family.

proposed manifest entry shape:

```json
{
  "id": "standard.nearest_10000_towns_hash_v1.heatmap_1_2000",
  "label": "nearest 10k towns · values 1-2000",
  "mode": "heatmap",
  "cipher": "standard",
  "cipher_label": "standard",
  "transform_family": "place_snap",
  "transform_family_label": "place snap",
  "projection_method": "nearest_10000_towns_hash_v1",
  "projection_label": "nearest 10k towns",
  "file": "/data/standard.nearest_10000_towns_hash_v1.heatmap_1_2000.geojson",
  "search_kind": "value",
  "value_range": [1, 2000]
}
```

for a cliquemap:

```json
{
  "id": "aq.value_hash_v1.cliquemap",
  "label": "value hash v1",
  "mode": "cliquemap",
  "cipher": "aq",
  "cipher_label": "aq",
  "transform_family": "hash",
  "transform_family_label": "hash scatter",
  "projection_method": "value_hash_v1",
  "projection_label": "value hash v1",
  "file": "/data/aq.value_hash_v1.cliquemap.geojson",
  "search_kind": "phrase"
}
```

## backwards compatibility

if existing manifest entries are missing `mode`, treat them as:

```text
mode = cliquemap
```

if existing manifest entries are missing `transform_family`, either infer it from known projection ids or assign:

```text
transform_family = unknown
```

do not silently break existing datasets.

## ui requirements

replace the current flat dataset selector with filtered controls.

recommended controls:

```text
map mode
cipher
transform family
dataset
```

behavior:

1. map mode selector shows only modes present in the manifest.
2. cipher selector shows only ciphers available for the selected mode.
3. transform family selector shows only transform families available for the selected mode + cipher.
4. dataset selector shows only datasets matching selected mode + cipher + transform family.
5. when an upstream selection changes, downstream selections should reset to the first available matching option.
6. if no dataset exists for a combination, show a clear empty state rather than a broken map.
7. the final selected dataset determines which geojson file is loaded.

## search behavior

search behavior must derive from the selected dataset’s `search_kind`.

### cliquemap

```text
search_kind: phrase
```

ui label:

```text
search phrases
```

placeholder examples:

```text
resonating loop
geogematria
```

behavior:

* search phrase text in the loaded dataset.
* selecting a result selects the containing clique or projected locus.

### heatmap

```text
search_kind: value
```

ui label:

```text
search values
```

placeholder examples:

```text
333
1-2000
```

behavior:

* search gematria values, not phrases.
* selecting a result selects the value/locus in the heatmap dataset.

future `search_kind` values may include:

```text
term
place
dataset
```

## map rendering behavior

rendering should be mode-aware.

### cliquemap

cliquemap behavior should preserve current semantics:

```text
clique = same cipher + same value
projected locus = coordinate where one or more cliques appear
```

marker styling should continue to reflect clique size or locus occupancy, depending on current implementation.

sidebar language should use:

```text
clique
singleton
projected locus
phrases
projection method
```

### heatmap

heatmap behavior should not use phrase-search or phrase-centric language.

marker/color styling should reflect heatmap intensity, such as:

```text
value count
domain value count
locus occupancy
```

depending on the dataset properties.

sidebar language should use:

```text
heatmap locus
values
value range
density
projection method
```

for place-snap heatmaps, also show snapped place metadata if present.

## selected dataset metadata display

the ui should make the selected world legible.

near the controls or status chips, show compact metadata such as:

```text
mode: heatmap
cipher: standard
family: place snap
dataset: nearest 10k towns · values 1-2000
```

or more compactly:

```text
heatmap · standard · place snap · nearest 10k towns · values 1-2000
```

## data model requirements

the frontend should not infer behavior from display labels.

behavior should come from manifest fields:

```text
mode
search_kind
transform_family
projection_method
value_range
file
```

labels are for humans. ids are for logic.

## file / code organization

likely frontend changes:

```text
web/frontend/src/atlasData.js
web/frontend/src/App.jsx
web/frontend/src/index.css
web/frontend/public/data/manifest.json
```

if selector logic becomes large, extract helper functions into a small module, such as:

```text
web/frontend/src/atlasManifest.js
```

possible helper functions:

```text
getAvailableModes(manifest)
getAvailableCiphers(manifest, mode)
getAvailableTransformFamilies(manifest, mode, cipher)
getAvailableDatasets(manifest, mode, cipher, transformFamily)
getDefaultDataset(manifest, filters)
normalizeManifestEntry(entry)
```

## acceptance criteria

this refactor is complete when:

1. atlas controls are organized as map mode, cipher, transform family, and dataset.
2. dataset options are filtered by the upstream selections.
3. cliquemap datasets use phrase search.
4. heatmap datasets use value search.
5. search labels/placeholders change based on dataset `search_kind`.
6. map/sidebar language changes appropriately for cliquemap vs heatmap.
7. existing cliquemap datasets still load correctly.
8. existing heatmap datasets still load correctly.
9. missing `mode` in old manifest entries falls back to `cliquemap`.
10. unknown or unsupported modes do not crash the app.
11. changing mode/cipher/family/dataset clears stale selection and search state.
12. no backend or live generation is introduced.
13. frontend is rebuilt after changes.

## test expectations

add or update tests for manifest/data logic if the project already has frontend tests.

minimum useful test coverage:

```text
manifest normalization:
  missing mode defaults to cliquemap

filtering:
  modes are derived from manifest
  ciphers are filtered by mode
  transform families are filtered by mode + cipher
  datasets are filtered by mode + cipher + family

search behavior:
  cliquemap -> phrase search
  heatmap -> value search

state behavior:
  changing upstream filters resets stale dataset/search/selection
```

if frontend test infrastructure is not currently present, keep the logic small and testable, and manually verify in browser.

## manual verification checklist

verify:

```text
select cliquemap -> aq -> hash -> value hash
  phrase search works
  clique sidebar language appears

select heatmap -> standard -> place snap -> nearest 10k towns values 1-2000
  value search works
  heatmap colors appear
  heatmap/sidebar language appears

switching from cliquemap to heatmap
  clears phrase search
  clears selected clique
  search label changes to value search

switching from heatmap to cliquemap
  clears value search
  clears selected heatmap locus
  search label changes to phrase search
```

## design principle

the atlas should browse a library of precomputed worlds without making the user scroll through every possible world in one flat list.

mode says what kind of map this is.

cipher says what number-world it uses.

transform family says what kind of spatial logic shaped it.

dataset says which bottled world to load.
