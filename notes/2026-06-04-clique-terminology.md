# 2026-06-04 - clique terminology

## decision

[M] Use `clique` for the atlas object shown on the map:

```text
cipher + value = locus
all phrases at that locus = clique
any two phrases in the clique = click
one phrase alone at the locus = singleton
```

## implementation note

[C] In frontend code and UI, use `clique` names such as `cliqueSize`,
`selectedClique`, and `projection method`. Avoid code-facing `click` nouns
because `click` is already a DOM event word.

The v0 GeoJSON export remains stable for now:

```text
properties.projection -> projection method
properties.count -> clique size
```
