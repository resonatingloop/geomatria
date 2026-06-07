# 2026-06-04 nearest-city snapping projection

[M] Requested an experimental static projection that snaps hash coordinates to
nearby towns without live geocoding, backend behavior, or clique-membership
changes.

[co] Decision:

- `nearest_32_cities_hash_v1`, `nearest_1000_towns_hash_v1`,
  `nearest_10000_towns_hash_v1`, and `nearest_50000_towns_hash_v1` are
  first-class projection methods in the existing registry.
- It computes a base coordinate with `webmercator_hash_v1`.
- It chooses the nearest committed gazetteer town using haversine distance.
- It returns the town coordinate as the projected locus.
- GeoJSON features keep clique identity as `cipher + value` and include
  `base_coordinate` plus `snapped_place` metadata.
- The atlas treats a snapped town as a projected locus that may contain multiple
  distinct cliques.

[C] Implementation note: the 32-city gazetteer is intentionally small and local
at `prototypes/geogematria/data/cities32.json`. The 1000-town gazetteer is a
static GeoNames-derived snapshot. The 10000-town and 50000-town variants use
the same source and deterministic population sort. These are static prototype
data, not a promise of global coverage.

[C] Scaling note: brute-force haversine scanning did not scale cleanly to the
50000-town export. The projection now builds a cached 3D k-d tree over unit
sphere coordinates and uses chord-distance nearest-neighbor search, which
preserves haversine nearest ordering while keeping static exports practical.
