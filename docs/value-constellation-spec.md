# value constellation and markdown export

status: accepted

role: accepted transition, not a claim of completed rendered verification.
owner: repository owner. accepted in conversation on 2026-09-08 with
“spec accepted. good to implement!” supersedes: none.
stored here because the legacy `specs/` directory is ignored; shared continuity
must not depend on that local history.

## subsequent accepted transition

on 2026-09-08 the owner accepted the [halton equal-area slice](halton-equal-area-spec.md).
it extends the original two-method list and new-projection exclusion below with
`halton_equal_area_v1`; all other scope boundaries remain unchanged. this is a
later accepted transition, not a rewrite of the original approval or a claim
that the third method is implemented. its own spec owns the additional proof.

## public heat-locus repair

on 2026-09-09 the owner directly approved repairing undiscoverable public
integers at a shared heat locus. every public domain value at that locus is
visible and selectable regardless of private phrase occupancy; selecting one
does not hide its siblings. locus markdown follows that complete numeric list.
phrase/occupancy suppression and local selected-plus-phrase-bearing visibility
remain unchanged. this repairs ordinary locus discovery, not constellation or
projection mathematics; it does not start the accepted halton implementation.

## context and scope

the atlas previously displayed one cipher dataset at a time. its static
snapshots already contain all eight workbench ciphers over integers 1–2000.
the approved slice adds a value constellation and markdown export to both
the full local and sanitized public editions.

in scope:

- an independent constellation view, accepting exact integers 1–2000, with
  all eight canonical workbench ciphers and the same two projection choices
  in both editions: `webmercator_hash_v1` and `nearest_10000_towns_hash_v1`.
- static snapshot lookups only, clearly labelled, with cached successful
  loads and explicit invalid/loading/ready/error/retry behavior.
- labelled markers and eight readout entries. coincident locations retain
  every cipher/value identity; coordinates are not nudged or joined by a route.
- selection and show-all framing, keyboard use, day/night themes, narrow
  screens, and restoration of ordinary browsing state when leaving the view.
- copy and download markdown for this locus or the whole constellation.
  locus export follows the shared readout's visible scope. constellation is
  numeric/geographic only in both editions. public occupancy is unknown/not
  published, never inferred as zero from sanitized data.

out of scope: arbitrary phrase calculation, phrase constellations, new ciphers,
new projections, expanded integer ranges, png export, new persistence, database
access/changes, backend changes, external services, or deployment.

## governing decisions and change shape

[agent instructions](../AGENTS.md) govern scope and repository boundaries.
the source manifest and snapshots remain authoritative for geometry; public
curation and staging retain their existing privacy boundary. the new export
surface uses explicit fields rather than serializing raw source objects.

| dimension | changed? | source of truth | proof |
|---|---|---|---|
| user-visible behavior | yes | this slice; view/readout models | unit tests and rendered checks |
| persisted state or schema | downloads only; no app schema change | markdown serializer | export fixtures; storage review |
| external/provider behavior | additional static requests; no new service | served manifest and loader | request and subpath checks |
| identifiers, secrets, privacy | new export surface; existing boundary preserved | explicit export fields and public sanitization | exclusion tests and artifact scan |
| lifecycle states | yes | constellation request and selection state | invalidation, failure, retry tests |
| setup/operation | no new requirements | existing npm scripts | both builds |
| normative decisions | yes: range, projections, export scopes | owner-accepted slice | acceptance review |
| cross-repository dependency | no | existing snapshot interfaces | scoped diff review |

## implementation by invariant

1. discover exactly one matching domain dataset per cipher, validate complete
   indexes, and retain only numeric/geographic fields.
2. isolate constellation requests and selections from ordinary browsing;
   invalidate stale results and disable export until the current result is ready.
3. render shared-location markers and the full ledger on the existing map.
4. share locus visibility logic between display and explicit markdown
   serializers; handle clipboard failure and downloadable utf-8 output.
5. verify geometry, state transitions, privacy, exports, both build targets,
   and rendered behavior; reconcile operational documentation and status.

## acceptance and verification

- 1, 177, and 2000 yield eight entries matching source coordinates under both
  projections. invalid inputs, corrupt/missing/duplicate data, and failed
  requests never become an apparently complete reading.
- changing input or projection prevents old requests from replacing newer
  readings. coincident locations retain all entries.
- copy/download contain the same reading, escaped as markdown, with explicit
  coordinate order, projection, source, and available per-entry snap details.
- no hidden records or public occupancy leakage; ordinary heatmaps, phrase
  search, live browsing, and locus selection remain functional.
- keyboard, selection, show-all, day/night, narrow-screen, clipboard, and
  download checks pass in both editions, including the public subpath shape.
- `npm test`, `npm run build`, `npm run build:public`, the python regression
  suite, documentation checks, and `git diff --check` are reconciled in status.
  inherited documentation errors are reported rather than changing old approvals.

## risks and remaining gates

first use loads eight existing snapshots; successful numeric indexes are cached
in memory. public network performance depends on hosting compression and the
visitor's connection. no generated compact index is introduced in this slice.

the browser runtime previously rejected its own trusted-code path. automated
build/data proof does not replace rendered verification; keep this spec accepted
until the remaining rendered checks in [status](../STATUS.md) are satisfied.
there are no unresolved scope questions.
