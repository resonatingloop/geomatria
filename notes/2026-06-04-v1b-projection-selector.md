# 2026-06-04 - v1b projection selector

## decision

[M] Add projection method selection beside cipher selection. The static manifest
now represents cipher + `projection_method` pairs instead of cipher-only files.

## implementation note

[C] Static export filenames include the projection method:

```text
qwer.value_hash_v1.geojson
aq.value_hash_v1.geojson
```

The sidebar continues to label the selected feature's method as `projection
method`. The atlas remains static: no backend, no live glossololary reads, and
no new projection implementation in this slice.
