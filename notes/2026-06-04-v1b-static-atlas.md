# 2026-06-04 - v1b static atlas

## decision

[M] v1b remains static and restrained:

- load real v0-exported GeoJSON
- add a cipher selector over multiple exported files
- add phrase search within the selected cipher
- use one selection path for marker clicks and search results
- keep the sidebar as the main information surface

## implementation note

[C] v1b uses `public/data/manifest.json` to list static cipher exports. The
browser reads only static files under `/data/`; it does not read glossololary,
open a database, call `_connection()`, use raw SQL, or add a backend.

Search results are phrase matches. Selecting a phrase match selects its clique
and flies the map to that marker.

## interaction hardening

[C] The atlas should feel like a 2D map, not a globe. MapLibre rotation, pitch,
compass controls, keyboard rotation, and repeated world copies are disabled
while preserving pan, zoom, marker selection, and search-to-clique zoom.
