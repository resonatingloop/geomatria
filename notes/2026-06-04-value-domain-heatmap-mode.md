# 2026-06-04 - value-domain heatmap mode

[M] After crash recovery, the next slice was the actual heatmap rather than only
manifest-loadable value-domain files.

[C] Implementation:

- Atlas dataset selection now keys by static manifest `file`, so clique exports
  and value-domain exports can coexist even when they share cipher and
  projection method.
- Value-domain files render through a MapLibre heatmap layer over every exported
  integer value.
- Phrase-bearing domain values also get small selectable occupancy markers, so
  phrase search and sidebar inspection still use the existing locus path.
- Sidebar/status labels distinguish domain values, projected loci, occupied
  values, and phrases instead of treating domain values as cliques.

[C] The sample available mode is currently:

```text
Satanic / nearest_10000_towns_hash_v1 / domain 1-2000
```

## follow-up

[M] Requested the remaining seven workbench-cipher domain datasets and numeric
search inside heatmap datasets.

[C] Added value-domain files and manifest entries for all eight workbench
ciphers over values `1..2000` using `nearest_10000_towns_hash_v1`. Heatmap-mode
search now treats the query as an exact integer value lookup; clique mode keeps
phrase-text search.
