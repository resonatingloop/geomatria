# geogematria offline gazetteers

These files are committed/static projection inputs. Runtime projection code reads
them from disk and does not call live geocoding services.

## `cities32.json`

Small hand-curated global city set for `nearest_32_cities_hash_v1`.

## `towns1000.geonames.json`, `towns10000.geonames.json`, `towns50000.geonames.json`

Top populated places selected from the GeoNames static `cities1000` dump,
sorted by descending population, then id for deterministic tie-breaking:

- `towns1000.geonames.json`: 1000 places
- `towns10000.geonames.json`: 10000 places
- `towns50000.geonames.json`: 50000 places

Source downloaded during prototyping:

```text
https://download.geonames.org/export/dump/cities1000.zip
```

GeoNames data is distributed under Creative Commons Attribution 4.0:

```text
https://www.geonames.org/
```
