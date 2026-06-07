# 2026-06-04 - v1a static atlas start

## decision

[M] v1 is split into constrained increments:

- v1a: static atlas proof
- v1b: usable atlas
- v1c: live app

[M] v1a must stay small: Vite + React + MapLibre, no backend, no live
glossololary access, no globe, no visual map clustering, no manual placement
model, no alternate projections.

## implementation note

[C] v1a starts as `prototypes/atlas-v1a/`. It loads a v0-exported
FeatureCollection from `/data/qwer.geojson` and renders GeoJSON Point features
as clickable MapLibre markers.

The feature contract follows the v0 CLI export shape:

```text
geometry.coordinates: [longitude, latitude]
properties: cipher, value, projection, count, phrases
```

The initial UI kept "gematria cluster" wording for same cipher + same value and
avoided MapLibre visual clustering.
