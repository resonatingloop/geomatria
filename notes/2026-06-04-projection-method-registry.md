# 2026-06-04 - projection method registry

## decision

[M] Projection methods are first-class registry entries parallel to ciphers.

Current methods:

```text
value_hash_v1
webmercator_hash_v1
modulo_grid_v1 experimental
```

## guardrail

[M] Projection method changes the world, not clique membership.

Same cipher + same value still defines the same clique. Projection only changes
where that clique appears. If `aq 306` contains eight phrases, those same eight
phrases remain together under `value_hash_v1`, `webmercator_hash_v1`, and
`modulo_grid_v1`; only the locus moves.

A projected locus is a latitude/longitude coordinate produced by a projection
method. Hash projections usually put one clique at a locus. Coarse grid
projections may put multiple cliques at one locus because distinct cipher values
can collide visually at the same coordinate.

## implementation note

[C] The v0 CLI accepts `--projection` on locate, cluster, path, export, and
export-path, and exposes `list-projections`. Static atlas exports are named:

```text
<cipher>.<projection_method>.geojson
```

The browser still reads only static files from `/data/`.
