# 2026-06-02 - placed-word and adapter decisions

## origins

[M] Maria identified the major project shift: geogematria should be an adapter
for glossololary, not a standalone cipher engine.

[co] The working name and frame grew out of the spatial-gematria conversation:
words gain physicality by being placed, while glossololary remains the source
of lexical/cipher truth.

## decisions

- geogematria reads phrase/value data from glossololary.
- glossololary remains the canonical owner of phrase normalization, stored
  values, cipher definitions, and future cipher expansion.
- [M] Placed-word/manual-coordinate modeling is deferred to v1. v0 should focus
  on deterministic projection from existing glossololary phrase/value data.
- timestamp, altitude, tags, notes, and physical lat/lon belong to that v1
  placed-word scope unless clearly separated from deterministic cipher
  projection.
- the model should allow multiple ciphers, but the proof of concept may build
  one selected cipher first.
- the map displays one selected cipher at a time.
- [M] Physical placement coordinates and deterministic projection coordinates
  should remain separate in v0. Analysis of their relation is deferred to v1
  scoping.

## next implementation question

The first technical step is adapter reconnaissance against the actual
glossololary sqlite schema and code. That requires a specific invitation out of
the lane into the glossololary workspace or a copied schema/database sample
inside the studio.
