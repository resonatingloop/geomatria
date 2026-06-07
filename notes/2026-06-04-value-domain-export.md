# 2026-06-04 value-domain export scope

[M] Requested heatmap-style static export for cipher/projection behavior across
an integer value range, independent of whether phrases exist in glossololary.

[co] Decision:

- Add `export-domain` to v0 CLI.
- Keep this static-export only; no backend and no live atlas request behavior.
- Keep clique membership unchanged. Phrases still come only from glossololary
  values exposed through the existing adapter boundary.
- Emit one GeoJSON point for every integer value in the requested range.
- Add `properties.mode = "value_domain"`.
- Use `phrase_count`, `has_phrases`, and `phrases` for optional database
  occupancy overlay.
- For snapping projections, carry the existing `base_coordinate` and
  `snapped_place` metadata through to each domain feature.
- Put summary data in collection metadata so the static file is self-reporting.

[C] Sample export:

```bash
python3 ../geogematria.py export-domain --cipher satanic --projection nearest_10000_towns_hash_v1 --min 1 --max 2000 --format geojson > public/data/satanic.nearest_10000_towns_hash_v1.domain_1_2000.geojson
```

[C] The sample range has 2000 domain values; 865 values have phrases and 1135 do
not in the current database snapshot.
