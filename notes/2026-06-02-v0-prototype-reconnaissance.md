# 2026-06-02 - v0 prototype reconnaissance

## schema read

[M] Correction: geogematria must follow the glossololary database contract.
`GlossololaryDB` is the only permitted database interface.

[C] The v0 prototype adapter was revised to avoid direct SQLite access and to
call public `GlossololaryDB` methods instead.

Relevant source-of-truth table:

```text
entries(
  text,
  normalized_text,
  cipher,
  value,
  ...
)
```

The adapter only needs `text`, `normalized_text`, `cipher`, and `value` for v0,
but those fields must arrive through public methods, not direct SQL.

## stable cipher names

[C] Current stable identifiers come from `glossololary.ciphers.get_active_ciphers()`:

```text
AQ
Synx
QWER
nQWER
Ordinal
Reduced
Standard
Satanic
```

Aliases should resolve through `glossololary.ciphers.resolve_cipher()` when the
glossololary source path is available. The important example is `qwerty` ->
`QWER`.

## prototype status

[C] Prototype lives at:

```text
codex_studio/projects/geogematria/prototypes/
```

Implemented:

- thin glossololary adapter over public `GlossololaryDB` methods
- `value_hash_v1` projection
- `locate`, `cluster`, `path`, `export`, `export-path`, and `ciphers` CLI commands
- GeoJSON cluster and path builders
- stdlib `unittest` coverage for deterministic projection, GeoJSON shape, and
  adapter behavior

Contract correction:

- no runtime `sqlite3` import in geogematria
- no raw SQL in geogematria
- no `GlossololaryDB._connection()` calls from geogematria
- cipher arguments resolve through glossololary `resolve_cipher`
- current prototype uses existing public methods: `find_by_text`,
  `find_by_value`, and `all_entries`

Follow-up for promotion:

- add narrower public `GlossololaryDB` methods in glossololary, such as
  `get_value_for_phrase`, `get_cluster_for_cipher_value`,
  `get_path_for_phrase`, `get_clusters_for_cipher`, and `list_ciphers`, then
  switch the adapter from broad `all_entries` use to those narrower methods.

Deferred:

- placed-word/manual-coordinate model
- cache tables
- map UI
- globe UI
- alternate projection modes
