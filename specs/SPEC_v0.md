# geogematria spec draft

## project summary

geogematria is a projection layer for glossololary.

glossololary already owns the canonical phrase database, normalization rules, cipher engine, sqlite storage, cipher values, and phrase path logic. geogematria should not duplicate or reimplement that database. instead, geogematria reads existing phrase/cipher/value data from glossololary and maps cipher-value pairs to deterministic geographic coordinates.

database access must follow the glossololary database contract:

```text
geogematria cli
→ geogematria adapter
→ GlossololaryDB public methods
→ resolve_cipher where cipher args are involved
→ glossololary database
```

geogematria must not open SQLite connections, issue raw SQL, call
`GlossololaryDB._connection()`, or manually resolve cipher aliases. if a needed
lookup is not exposed by a public `GlossololaryDB` method, add or propose that
method inside glossololary instead of tunneling around the class.

the core concept:

> a phrase does not have one true location.
> a phrase moves through cipher-worlds.
> each cipher gives the phrase a different coordinate.

geogematria should support both:

1. **cluster mode**: for a selected cipher, all phrases with the same cipher value occupy the same coordinate.
2. **path mode**: for a selected phrase, its values across all available ciphers become a path across the globe.

## project relationship to glossololary

glossololary remains the source of truth for:

* raw phrases
* canonical phrases
* deduplication
* cipher definitions
* cipher values
* existing phrase path logic
* sqlite database storage for phrase/value data

geogematria owns:

* deterministic value-to-coordinate projection
* projection versioning
* derived geo-location caching
* geojson export
* atlas/globe visualization preparation
* cli commands for geographic lookup, cluster lookup, and path export
* placed-word metadata that belongs to the geographic layer rather than the
  cipher layer

geogematria must not maintain a second phrase/value database.

## core ontology

the intended data flow is:

```text
raw phrase
→ canonical phrase
→ cipher values from glossololary
→ cipher + value
→ deterministic projection
→ latitude/longitude
→ cluster or path output
```

important distinction:

* deduplication happens at the phrase level.
* clustering happens at the cipher-value level.

example:

```text
"reverse-oracle"
"reverse oracle"
"reverse_oracle"
" reverse oracle\n"
```

should all resolve to the same canonical phrase, assuming glossololary already treats them as equivalent.

but two different canonical phrases with the same value in the same cipher should remain distinct entries that occupy the same coordinate.

### placed words

placed words are deferred to v1. v0 focuses on deterministic cipher projection
from existing glossololary phrase/value data.

future minimum record:

```yaml
text: reverse oracle
latitude: 35.1983
longitude: -111.6513
```

future optional metadata:

```yaml
timestamp: 2026-06-02T20:14:00-07:00
tags: [manual, omen]
note: optional human note about why this placement belongs here
```

v1 scoping notes:

* text may be a word or phrase, following glossololary normalization and
  canonicalization rules.
* coordinates are required.
* timestamp should be retained as metadata, even if it does not affect
  projection.
* altitude should be explored after the first placed-word pass.
* the same text may appear in more than one physical place.
* map views display one selected cipher at a time.
* physical placement coordinates and deterministic projection coordinates should
  be separate concepts. do not analyze, score, or interpret the relation
  between those two points until v1 scoping.

## version plan

### v0: cli projection layer

goal: prove the geographic projection engine using existing glossololary data.

v0 should include:

* cli commands
* deterministic projection from `cipher:value` to lat/lon
* projection versioning
* read access to existing glossololary sqlite data
* optional derived coordinate cache table
* cluster lookup by cipher/value
* phrase lookup by phrase/cipher
* phrase path lookup across all ciphers
* geojson export for future map use
* stable cipher names from glossololary

v0 should not include:

* web ui
* 2d map
* 3d globe
* leylines
* alternate projection aesthetics
* duplicate phrase/value storage
* manual placed-word persistence
* physical-coordinate input or analysis

### v1: 2d atlas

goal: create a browser-based atlas of cipher clusters.

v1 should include:

* one cipher view at a time
* map display
* clickable points/clusters
* phrase search
* cipher selector
* marker size or density based on number of co-located phrases
* geojson endpoint or static geojson export
* phrase cluster popup showing all phrases at that cipher-value location

suggested stack:

```text
backend: python + fastapi
database: existing glossololary sqlite database
frontend: vite + react
mapping: maplibre gl
data format: geojson
```

v1 should remain 2d. do not begin with the globe.

### v2: 3d globe / cosmogram

goal: represent phrase paths and cipher clusters on a globe.

v2 should include:

* 3d globe rendering
* selected phrase as glowing point or path
* phrase itinerary across all ciphers
* cluster satellites or labels
* mode switch between cluster mode and path mode
* optional cipher overlays
* export/import support for larger phrase databases
* projection mode selector

possible 3d stacks:

```text
three.js
react-three-fiber
deck.gl
```

cesium may be considered later, but is probably too heavy for the first globe version.

## projection design

the default projection should be deterministic and stable.

projection should be based on:

```text
cipher + ":" + value
```

not the phrase itself.

example seed:

```text
aq:100
```

this seed should be hashed using sha256. the hash should then be split into chunks and scaled into latitude and longitude.

properties required:

* same cipher + same value always produces the same coordinate
* different cipher + same value should produce a different coordinate
* all equivalent phrases under the same cipher should share the same coordinate
* coordinates should remain stable across runs
* projection algorithm must be versioned

initial projection id:

```text
value_hash_v1
```

conceptual algorithm:

```text
seed = sha256(f"{cipher}:{value}")
lat_raw = first chunk of hash
lon_raw = second chunk of hash
latitude = scale lat_raw to [-90, 90]
longitude = scale lon_raw to [-180, 180]
```

future projection modes should be possible but not implemented in v0.

reserved future projection ids:

```text
modulo_grid_v1
spiral_v1
leyline_v1
```

these should be treated as later aesthetic or experimental projections. do not implement them yet.

## database design

preferred approach: add a derived geo table to the existing glossololary sqlite database.

geogematria should store only derived projection results.

proposed table:

```sql
create table if not exists geo_locations (
    cipher text not null,
    value integer not null,
    projection_id text not null,
    latitude real not null,
    longitude real not null,
    created_at text not null default current_timestamp,
    primary key (cipher, value, projection_id)
);
```

this table is a cache, not a source of truth.

the phrase/value data remains owned by glossololary.

if modifying the glossololary database directly is undesirable, use a sidecar sqlite database, but still do not duplicate phrase/value rows.

## cli requirements

the cli should support these commands in v0.

### locate

locate a phrase under a selected cipher.

```bash
python3 geogematria.py locate "reverse oracle" --cipher aq
```

expected output:

```text
phrase: reverse oracle
canonical: reverse oracle
cipher: aq
value: 177
projection: value_hash_v1
latitude: 12.345678
longitude: -98.765432
co-located entries:
  reverse oracle
  [other phrases with same aq value]
```

### cluster

show all phrases at a given cipher-value location.

```bash
python3 geogematria.py cluster --cipher aq --value 100
```

expected output:

```text
cipher: aq
value: 100
projection: value_hash_v1
latitude: 33.123456
longitude: -112.123456
entries:
  goblin
  vexatrice
  [other equivalent phrases]
```

### path

show a phrase’s route across all available ciphers.

```bash
python3 geogematria.py path "reverse oracle"
```

expected output:

```text
phrase: reverse oracle
canonical: reverse oracle

stops:
  aq:
    value: 177
    latitude: 12.345678
    longitude: -98.765432

  qwerty:
    value: 214
    latitude: -41.991200
    longitude: 10.302100
```

### export cipher atlas

export all projected clusters for a selected cipher.

```bash
python3 geogematria.py export --cipher aq --format geojson
```

geojson feature shape:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-112.0712, 33.4484]
  },
  "properties": {
    "cipher": "aq",
    "value": 100,
    "projection": "value_hash_v1",
    "count": 7,
    "phrases": ["goblin", "vexatrice"]
  }
}
```

### export phrase path

export a phrase path across all ciphers.

```bash
python3 geogematria.py export-path "reverse oracle" --format geojson
```

geojson feature shape:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [-112.0712, 33.4484],
      [10.3021, -41.9912],
      [88.1209, 19.2211]
    ]
  },
  "properties": {
    "phrase": "reverse oracle",
    "projection": "value_hash_v1",
    "stops": [
      {"cipher": "aq", "value": 177},
      {"cipher": "qwerty", "value": 214}
    ]
  }
}
```

## module design

proposed structure:

```text
geogematria/
  __init__.py
  cli.py
  projection.py
  geo_cache.py
  geojson.py
  glossololary_adapter.py
  models.py
  errors.py
tests/
  test_projection.py
  test_geojson.py
  test_glossololary_adapter.py
```

### projection.py

responsible for:

* projection registry
* `value_hash_v1`
* stable lat/lon calculation
* projection id validation

should expose something like:

```python
project_value(cipher: str, value: int, projection_id: str = "value_hash_v1") -> GeoPoint
```

### glossololary_adapter.py

responsible for reading from existing glossololary data.

the adapter must be a thin wrapper over `GlossololaryDB` public methods. it
must not issue direct SQLite queries.

should expose functions like:

```python
get_phrase(phrase: str) -> PhraseRecord
get_value(canonical_phrase: str, cipher: str) -> CipherValue
get_cluster(cipher: str, value: int) -> list[PhraseRecord]
get_path(canonical_phrase: str) -> list[CipherValue]
list_ciphers() -> list[CipherRecord]
```

implementation should inspect and adapt to the existing glossololary schema.

do not duplicate cipher calculations unless absolutely necessary. prefer stored values from glossololary.

### geo_cache.py

responsible for:

* creating `geo_locations` table if needed
* checking whether a coordinate already exists
* calculating and storing derived coordinate when missing
* returning cached projected coordinates

### geojson.py

responsible for:

* feature collections for cipher atlas mode
* linestring export for phrase path mode
* stable property shape for frontend use

### cli.py

responsible for:

* parsing commands
* calling adapter/projection/cache layers
* formatting text output
* writing geojson output when requested

## acceptance criteria for v0

v0 is complete when:

1. the program can locate a known phrase from the existing glossololary database under a selected cipher.
2. the program can return the same coordinate every time for the same `cipher:value` pair.
3. two different phrases with the same cipher value return the same coordinate under that cipher.
4. the same numeric value under two different ciphers returns different coordinates.
5. the program can list all co-located phrases for a given cipher/value.
6. the program can return a phrase path across all available ciphers.
7. the program can export a selected cipher atlas as geojson.
8. the program can export a selected phrase path as geojson.
9. no duplicate phrase/value database is created.
10. projection algorithms are versioned, beginning with `value_hash_v1`.

## non-goals for v0

do not implement:

* web frontend
* map rendering
* globe rendering
* user accounts
* remote sync
* complex gis features
* postgis
* alternate projection modes
* aesthetic leyline rendering
* live editing of glossololary phrases unless already supported by glossololary
* new cipher engine logic beyond what is needed to read existing values

## design principle

geogematria should be deterministic before it is beautiful.

the cli is the bone altar. the atlas comes after. the globe comes after the atlas.

the project should remain operationally sober and metaphysically playful:

> glossololary is the lexicon.
> geogematria is the earth-interface.
> a word is an address only after it consents to a cipher.
