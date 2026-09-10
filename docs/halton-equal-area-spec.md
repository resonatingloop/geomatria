# halton equal-area map integration

status: accepted

role: accepted transition; not implemented, retired, or a research report.
owner: repository owner. accepted in conversation on 2026-09-08: the owner
answered "yes" to "shall we accept this bounded slice as written?"
this records spec acceptance only; implementation has not been requested in
this turn. no existing projection is replaced.

this is the governing, version-control-eligible spec, promoted from the local
ignored `specs/HALTON_EQUAL_AREA_HANDOFF.md`. the original handoff is preserved
unchanged as provenance; shared continuity does not require that local copy.
its formula, conformance vectors, bounds, non-goals and acceptance criteria are
carried forward. numerical evidence below belongs to the original handoff and
was not rerun during this acceptance-only documentation change.

## 1. Intent and scope

Add the exact pilot's Halton equal-area coordinate rule as another map method.
The owner's primary interest is the intrinsic destination and its significant
exoteric/esoteric geography and history. Cross-transform process families are
only a possible future line of inquiry. This handoff makes no claim that Halton
is better, more meaningful, validated by correspondences, or a research winner.

**accepted bounded implementation slice:**

- Register `halton_equal_area_v1`, labelled `Halton equal-area (experimental)`.
- Make it selectable in ordinary static value-domain browsing and numeric
  constellation, in full local and public editions, on both flat and globe.
- Retain the existing UI's integer range **1–2000** and eight canonical cipher
  identities. Use Python-generated numeric-only snapshots, not another browser
  coordinate implementation or live source dependency.
- Support positive safe integers through `9007199254740991` in the new Python
  method, with explicit rejection outside that range. This is the accepted
  integration limit, **not the pilot's public input contract**. `100333343` is
  a formula/library fixture, not a request to expand the UI or research it.
- Keep defaults, other methods, saved phrase semantics, and live browsing intact.
  Selection persistence remains in-memory as described below; no new storage.

Non-goals: no 1000-value/all-cipher research run; no destination research,
new conclusions, corpus export, source/private database or credential access,
Glossololary changes, phrase calculation, imported dossiers, phrase-correspondence
reviewer, geocoding, snapping, cipher salting, sequence tuning, routes, deployment,
or new dependencies. Adding Halton live cliquemaps or phrase-bearing static
snapshots is **not** part of the accepted numeric-only first slice. Do not
silently enable it across the live API just because it is in the library registry.

## 2. Authority and inspected checkout

read first: [agent instructions](../AGENTS.md), [readme](../README.md),
[status](../STATUS.md), [development](DEVELOPMENT.md), and
[atlas guide](../atlas/README.md). parent `.projects/AGENTS.md` limits work to
this project; `CLAUDE.md` routes to the same agent guide.

this accepted transition extends only the method list/new-projection exclusion
in the [value constellation contract](value-constellation-spec.md), adding
`halton_equal_area_v1`. its original approval remains historical truth.
the 1–2000 interface range, eight cipher identities, numeric-only privacy,
exports and in-memory persistence rules remain unchanged. the
[mounted globe contract](globe-view-spec.md) continues to govern surface behavior.

acceptance checkpoint: head `0422103` (`add shadow to globe`); the working tree
was clean before these documentation edits. the earlier dirty-file inventory
below describes the original handoff, not the present checkout.

### historical checkout recorded by the original handoff

Observed HEAD: `67bbd68909a462f86796da16e7cb777c832a1d85`.
The inspected **working tree**, not HEAD alone, includes uncommitted globe work.
At preflight the following were already dirty:

- Modified: `README.md`, `STATUS.md`, `atlas/README.md`, `atlas/package-lock.json`,
  `atlas/package.json`, `atlas/src/ConstellationView.jsx`, `atlas/src/main.jsx`,
  `atlas/src/styles.css`, `atlas/src/tokens.css`, `docs/DEVELOPMENT.md`.
- Untracked: `atlas/src/globeRelief.js`, `atlas/src/mapPresentation.js`,
  `atlas/tests/globeRelief.test.mjs`, `atlas/tests/mapPresentation.test.mjs`,
  `atlas/tests/nativeGlobe.test.mjs`, `docs/globe-view-spec.md`.

Recheck status and actual diffs before implementing; preserve other sessions'
work. Do not reset, clean, stage, commit, overwrite their files wholesale, or
replace the globe integration with an older flat-only version. Some lower
sections of `atlas/README.md` still say no globe/flat-only, contradicting its
new mounted-globe section and current code. Use the current implementation and
accepted globe contract; reconcile stale prose only in the authorized next slice.
`STATUS.md` also records inherited documentation findings and incomplete rendered
globe acceptance; this spec does not close those gates.

### Numerical provenance (read-only local sources)

Pilot root: `/home/resonatingloop/.hermes/experiments/geogematria-aq-pilot-001`.

| Source | What it establishes |
|---|---|
| Pilot `src/projections.py:4–25` | Exact floating-point radical inverse, candidate dispatch, AQ/range gate, SHA baseline |
| Pilot `tests/test_halton.py` | Rational digit fixtures and primitive invalid-input checks |
| Pilot `tests/test_candidate.py` | AQ-only 1–1000 wrapper contract, direct indexing, rejected ciphers/values |
| Pilot `tests/test_projections.py` | Existing baseline comparison test and AQ-case fixture; inspected, not run in this handoff |
| Repo `geogematria/projection.py:123–184` | Production byte contract, dispatch, six-decimal `GeoPoint` |
| Repo `tests/test_projection.py` | Existing registry/default, determinism, bounds and cipher separation checks |

SHA-256 fingerprints captured with tools:

- Pilot `src/projections.py`:
  `f00a98a4aad32f6656a457a49e4afd1cf70e57abeea6e5566a807d8a51426ae6`
- Production `geogematria/projection.py`:
  `a05c30035dbd5c18bef429432005ea96709066097a8ced3bcc8a69afeb72d83e`

The pilot is provenance/oracle material only. Do not make deployed code import
an absolute experiment path or depend on experiment packets, reports, or runtimes.

## 3. Exact pilot coordinate contract

For integer `n` with base-`b` digits `d_k` (least significant first), define
`phi_b(n) = sum(d_k / b**(k+1))`.

The actual pilot's floating implementation begins `result = 0.0`,
`fraction = 1.0 / base`, repeatedly applies `n, digit = divmod(n, base)`, adds
`digit * fraction`, then divides `fraction` by `base`. Preserve that operation
order when reproducing pilot full-precision outputs; do not round intermediates.

- **Index:** `n = value`, directly. Not sorted corpus rank, not `n-1`, not `n+1`.
- **Longitude:** `360 * phi_2(n) - 180`, degrees.
- **Latitude:** `degrees(asin(2 * phi_3(n) - 1))`.
- Bases are **2 for longitude, 3 for latitude**. No swap.
- Offsets are only the stated `-180` longitude and `-1` inside the sine argument.
  No seed, burn-in, scrambling, rotation, jitter, digit permutation, cipher offset,
  rescaling to Web Mercator, or nearest-place step.
- Equal-area sphere conversion means sine of latitude varies linearly with the
  base-3 fraction. It does not guarantee any individual destination's usefulness
  or an exactly balanced finite set. This changes both sequence and latitude
  conversion versus the pilot's SHA baseline; do not isolate a causal winner.
- Pilot tuples are **(latitude, longitude)**, returned at full floating precision.
  GeoJSON and MapLibre inputs are **[longitude, latitude]**.

### pilot gate versus accepted production gate

Actual `project(cipher, n, candidate)` accepts only exact cipher `'AQ'`,
`type(n) is int`, `1 <= n <= 1000`, candidate `'a'` or `'b'`. Candidate `'b'`
is Halton. `True`, floats, strings, zero, negatives, 1001, `'aq'`, and `'QWER'`
are rejected. The primitive `radical_inverse` accepts positive Python integers
without the wrapper's upper bound and bases that are exact integers >= 2.

The coordinate formula itself contains **no cipher input**. The pilot did not
expose multi-cipher Halton. Under the accepted multi-cipher integration, equal
integers have equal coordinates across AQ, Synx, QWER, nQWER, Ordinal, Reduced,
Standard, and Satanic. This extends the gate, not the mathematics. Preserve each
cipher/value identity and its independent phrase occupancy; a shared landing
is not a merged clique. Do not hash a cipher into Halton to produce eight distinct
pins. Unknown-cipher policy remains with the caller's existing registry/adapter;
do not add global cipher normalization to `project_value`.

Accepted Halton-specific library gate: exact Python `int`, not `bool`, in
`1..9007199254740991`; reject all other values with a clear `ValueError`.
Do not impose this new validation on old methods. The UI remains 1–2000 and
must continue rejecting 2001 and `100333343`, even though their formula/library
coordinates can be tested. Enlarging UI range or adding on-demand arithmetic
would be a separately accepted change, not an incidental fix to its parser.

### Rounding and geometry

Port the formula into the Python projection layer and use the existing
`round(latitude, 6)` / `round(longitude, 6)` return boundary. The pilot itself
does not round. Thus “exact pilot” means its algorithm and pre-round result,
with the established production six-decimal boundary applied afterward.
Use `GeoPoint(projection_id='halton_equal_area_v1', metadata=None)`; no fabricated
`base_coordinate` or `snapped_place` metadata. Keep both `projection` and
`projection_method` feature properties consistent with the selected method.

Python rounding is nearest/ties-to-even on the floating value. Do not substitute
JavaScript `Math.round` or rounded decimal intermediates. In particular:
`38.3203125 -> 38.320312` (n=729), and
`-146.6015625 -> -146.601562` (n=1000).
At the accepted safe-integer upper bound, raw longitude is
`179.99999999999994` and rounds to `180.000000`; allow the existing closed
geographic bounds. Do not wrap it to -180 in the authoritative stored geometry.
No promise of unique six-decimal landings over a huge domain is made.

## 4. Production SHA is an invariant, not a replacement target

Keep `PROJECTION_ID = 'value_hash_v1'`, existing registry order/defaults, and
all existing method outputs unchanged. Its seed is precisely
`f'{cipher}:{value}'.encode('utf-8')`: case-sensitive cipher, colon, decimal
value, no spaces/newline or normalization. SHA-256 digest bytes 0–7, big-endian,
feed latitude; bytes 8–15, big-endian, feed longitude. Divide by `(1 << 64) - 1`,
not `2**64`. Scale linearly to [-90,90] and [-180,180], then round to six decimals.
`webmercator_hash_v1` instead uses linear latitude bounds ±85.051129; do not
convert either hash method to equal-area. Existing snapped methods continue
using their Web Mercator hash base and existing gazetteers.

The frontend's current `hash scatter` constellation option is
`webmercator_hash_v1`, **not** the pilot candidate-a `value_hash_v1` baseline.
Keep those labels/provenance distinct. Existing live normalization in
`geogematria/layers.py` canonicalizes `aq` to `AQ` before calling the projection;
this does not mean the low-level hash function is case-insensitive.

Tool-verified `value_hash_v1` fixtures, latitude then longitude:

| Cipher | n | Latitude | Longitude |
|---|---:|---:|---:|
| AQ | 100 | 50.718302 | 61.755048 |
| AQ | 177 | 12.851504 | 20.991909 |
| AQ | 333 | 28.789220 | 33.079093 |
| aq | 333 | -2.062039 | -123.927956 |
| AQ | 343 | 29.846532 | -69.596651 |
| Synx | 100 | -18.492220 | 125.700280 |

`SHA256(b'AQ:333')` =
`a8f1d5d63b78f8ac9785dd75aecd3d5ac294970b45b703ffe43945d67612718e`.
`SHA256(b'aq:333')` =
`7d113c0ecd82da8d27df9aaa518ecb1cbd5ea4f96fd7e358fa9617eb69127415`.

## 5. Halton conformance vectors

These were calculated during this handoff using the existing pilot primitive
and independently expressed exact rational digit expansions, comparing both
coordinate results after Python six-decimal rounding. For rows <=1000 the
actual AQ candidate-b wrapper was also checked. Later rows are explicitly
**formula extensions**, not successful pilot-wrapper calls.

| n | phi_2(n) | phi_3(n) | Latitude | Longitude |
|---:|---:|---:|---:|---:|
| 1 | 1/2 | 1/3 | -19.471221 | 0.000000 |
| 2 | 1/4 | 2/3 | 19.471221 | -90.000000 |
| 3 | 3/4 | 1/9 | -51.057559 | 90.000000 |
| 4 | 1/8 | 4/9 | -6.379370 | -135.000000 |
| 5 | 5/8 | 7/9 | 33.748989 | 45.000000 |
| 100 | 19/128 | 100/243 | -10.192432 | -126.562500 |
| 177 | 141/256 | 65/243 | -27.711554 | 18.281250 |
| 333 | 357/512 | 31/729 | -66.198910 | 71.015625 |
| 343 | 469/512 | 301/729 | -10.032761 | 149.765625 |
| 729 | 621/1024 | 1/2187 | -87.549463 | 38.320312 |
| 1000 | 95/1024 | 760/2187 | -17.757201 | -146.601562 |
| 1001 | 607/1024 | 1489/2187 | 21.203571 | 33.398438 |
| 1999 | 1951/2048 | 791/2187 | -16.059453 | 162.949219 |
| 2000 | 95/2048 | 1520/2187 | 22.956491 | -163.300781 |
| 2001 | 1119/2048 | 305/2187 | -46.143645 | 16.699219 |
| 100333343 | 130513661/134217728 | 96395663/129140163 | 29.530337 | 170.064918 |
| 9007199254740991 | 9007199254740991/9007199254740992 | 8276363889102517/16677181699666569 | -0.427575 | 180.000000 |

Selected raw pilot-formula results:
100 -> (-10.192431575371714, -126.5625);
333 -> (-66.19890977615933, 71.015625);
343 -> (-10.032760910004036, 149.765625);
100333343 -> (29.5303373121456, 170.0649181008339).

## 6. Actual integration seams and recommended changes

### Python and static assets

- `geogematria/projection.py`: add one `ProjectionMethod` with `experimental=True`
  and an explicit Halton dispatch branch; otherwise the current final `else`
  sends a newly registered method to `_hash_projection`. Registry-only work is
  therefore incorrect. Preserve old branches and byte/rounding behavior.
- `geogematria/models.py` already has `GeoPoint`, `Cluster`, and `DomainValue`.
  `geogematria/geojson.py` owns `cluster_feature`, `domain_feature`,
  `domain_collection`, and `[longitude, latitude]` serialization. No new schema
  or source database is needed for numeric domain points.
- `geogematria/cli.py` already passes projection IDs through `locate`, `cluster`,
  `phrase_path`, `atlas`, and `value_domain`. Its ordinary commands construct an
  adapter (even `list-projections`); `export-domain` reads occupancy through the
  adapter. **Do not run that command against an owner database to generate this
  numeric-only slice.** Use a bounded deterministic snapshot-generation path
  that imports only projection/models/GeoJSON code; choose and document any new
  script path in the implementation session, rather than assuming one exists.
- Static source-of-truth files are `atlas/datasets/manifest.json` and referenced
  `atlas/datasets/*.geojson`, not `atlas/public/data/` or `atlas/dist/`.
  Accepted new filenames follow the validator's existing convention:
  `<lowercase-cipher>.halton_equal_area_v1.domain_1_2000.geojson`.
  Add one complete numeric-only domain dataset per canonical cipher. This is
  deterministic build material, not an all-cipher research run or phrase export.
- Explicit manifest fields: `cipher` and `label` in canonical case,
  `cipher_label`, `mode: 'value_domain'`, `mode_label`, `render_mode: 'heatmap'`,
  `search_kind: 'value'`, `transform_family: 'sequence'`,
  `transform_family_label: 'curve / sequence'`, the new `projection_method`,
  human label/description, `dataset_label`, `min_value: 1`, `max_value: 2000`,
  and `file: '/data/<filename>'`. Give new entries stable unique `id`s for
  constellation entry provenance; do not rename existing IDs/files.
- For numeric-only assets explicitly set `occupancy_public: false` on collection
  metadata **and** manifest entries, and omit phrase/count/occupancy summary
  fields rather than inventing zero saved phrases. If using `domain_collection`
  with empty fixture phrase lists, strip those synthetic occupancy fields before
  writing the numeric assets. Inspect recursive metadata, not just features.
- Add the new filenames to `atlas/datasets/curation.public.json` for public
  availability. `atlas/scripts/build-data.mjs` stages only allowlisted files
  for public builds, strips defined private fields, and marks occupancy hidden.
  Preserve that boundary and all existing SHA snapshots. Verify generated file
  counts from manifests in code; do not retain old hard-coded totals as truth.

### Ordinary atlas UI

`atlas/src/main.jsx` holds source, mode, cipher, transform-family, and dataset-file
selection. `applyDatasetSelection` and `selectDefaultDataset` use
`atlas/src/atlasManifest.js` helpers. Controls are currently labelled
`projection` (dataset mode), `cipher register`, `lineage` (family), and
`source plate` (dataset). Halton belongs under the existing sequence lineage and
its source plate, **not** the `surface · flat / globe` toggle.

`inferTransformFamily` only recognizes nearest/grid/hash IDs; supply `sequence`
explicitly in the manifest (or add a narrowly tested inference rule). Do not
leave Halton under `unknown`. Preserve startup defaults by appending new entries
without reordering old ones. On cipher changes, preserve a selected Halton
method/family if the destination cipher has a matching dataset; current code
passes only mode/cipher and would reset to its first family. When unavailable
(e.g. live source or phrase/cliquemap mode), fall back to a real supported choice
and display that actual selection—never silently compute SHA under a Halton label.

Dataset fetches use an `isMounted` cleanup gate; selection changes clear locus,
feature, tray, and search. Preserve stale-response protection and disable old
reading/export interactions while loading. The current effect leaves old atlas
geometry until a replacement arrives; for method switches ensure it cannot be
mistaken for the new method (clear or visibly gate it). Rebuild geometry-derived
loci, heatmap, search indices, markers, and readout from the new dataset, not an
in-place mutation of the old collection. Numeric-only local Halton should have
heat geometry and searchable integer loci, not fabricated occupancy markers.

### Constellation, readouts, exports, and caches

- `atlas/src/constellationData.js`: `CONSTELLATION_PROJECTIONS` is a hardcoded
  two-option list; add the new ID/label. `constellationDatasets` requires exactly
  one static 1–2000 dataset for each of the eight canonical ciphers;
  `datasetIndex` validates all 2000 unique integer entries per file. Keep those
  checks and the current numeric-only field allowlist.
- `createConstellationLoader` caches promises/indexes by resolved file URL,
  cipher, and projection method. Failed loads are evicted. New filenames/IDs
  prevent cache contamination; no cipher-specific geometry salt is needed.
  Keep identity fields in each index even though all Halton coordinates agree.
  This cache is module-memory, not persistent storage; rebuilding an existing
  URL in a running session requires explicit invalidation or a reload. Do not
  claim manifest retry currently purges successful cached indexes.
- `createConstellationRequest` supplies generation-based invalidation and
  loading/ready/error/retry states. `ConstellationView.jsx` invalidates on input,
  method, and manifest changes and disables export without a successful result.
  Keep a newly selected method uncast until the user presses cast; retain input,
  but clear old result/highlight. Keep retry and incomplete-dataset errors.
- `groupConstellationEntries` groups by projection/longitude/latitude, retaining
  all entries. Halton's eight equal-integer entries should show **eight addresses,
  one landing**. `ConstellationView.jsx` already labels shared pins and keeps
  eight ledger rows. Test the longer combined pin label, keyboard selection of
  every row, marker selection, narrow layouts, and identical-coordinate framing.
  Do not jitter points or discard seven cipher identities.
- `atlasData.js` builds ordinary locus/feature keys including projection and
  coordinate/identity details. `readoutModel.js`, `ProjectedLocusReadout.jsx`,
  `ReadoutTray.jsx`, `locusPlateReading.js`, and `markdownExport.js` are display
  consumers, not places to recalculate geometry. `MarkdownActions.jsx` remains
  the shared copy/download control. Readout and export must agree on the method,
  rounded coordinates, cipher/value, source, and unavailable occupancy.

### Persistence and all view transitions

Current projection/dataset/constellation selections are React in-memory state;
only lamp/theme uses `localStorage` in `main.jsx`. Preserve this distinction.
Do not add projection storage, migrate stored records, change defaults after
reload, or imply a database migration. Retain the current reading and method
when parking/re-entering constellation; it is hidden, not unmounted. Ordinary
atlas source/dataset/selection/tray state stays independent of constellation's
method. Source switching currently uses supported-manifest defaults rather than
remembering a separate dataset per source; do not promise otherwise.

`mapPresentation.js` owns one MapLibre renderer, workspace/surface cameras, and
`enter(workspace, identity, ...)`. `main.jsx` passes the atlas collection as
identity; constellation passes `state.result`. New method/data means a new
identity, invalidating obsolete framing in both surfaces. Returning to unchanged
data restores each camera. Surface/theme changes must not compute new
coordinates, fetch datasets, clear a reading, or alter markdown. Keep globe
rear-side markers hidden/inert while preserving all ledger/export entries,
focus recovery, reduced-motion behavior, north-up controls, and whole-globe
framing. Leave unrelated `globeRelief.js` decoration intact.

**Polar acceptance is material:** Halton n=729 is at latitude -87.549463,
beyond the flat Web Mercator latitude bound. Do not clamp stored/exported
Halton coordinates to ±85.051129. The flat renderer cannot provide an exact
polar landing there: retain an accurate ledger/readout, disclose the flat-surface
limit when applicable, and offer the existing globe control for the landing.
Test actual polar focus/rendering on the pinned MapLibre 5.24.0; a globe toggle
alone is not proof that renderer heatmap/marker behavior is correct. Any
presentation-only clipping must not alter the authoritative point or exports.

### Live/backend boundary

`geogematria/layers.py` currently allowlists only `LIVE_PROJECTION_METHOD =
'value_hash_v1'`; its manifest and layer validation share that restriction.
`backend/app.py` exposes `/api/live-manifest` and `/api/layers/cliquemap` with
injected-source test seams. Keep live defaults and supported methods unchanged
for this first slice; a Halton live request must remain unsupported, not fall
through to SHA. Constellation still uses static snapshots even when ordinary
atlas was browsing live. Any later live expansion must update manifest,
allowlisting, labels, URLs and error handling together, and use public read-only
Glossololary interfaces only.

## 7. Change-shape matrix

| Dimension | Changed? | Source of truth | Proof required next session |
|---|---|---|---|
| User-visible behavior | Yes | This spec's selection/shared-landing/polar rules | Both editions and both surfaces rendered |
| Persisted state/schema | Yes: new static assets; no browser/DB schema | Dataset manifest + numeric assets | Completeness/privacy scans; storage review |
| External/provider-visible behavior | Yes: new static requests only | Loader + curation/stager | Public subpath fetches; no new services/live calls |
| Identifiers/secrets/privacy | Yes: new method/dataset IDs; privacy invariant | Registry, manifest, explicit numeric output | Identity/case tests; no private fields |
| Lifecycle/terminal states | Yes: new method transitions; same state model | React request gates and map presentation | Race/retry/selection/camera tests |
| Setup/operation/recovery | No new dependencies; staged contents change | Existing npm scripts and development guide | Full/public builds and safe restoration |
| Normative contract/decision | Yes: method list and accepted library gate | Owner acceptance recorded above | Acceptance recorded; implementation proof remains open |
| Cross-repository dependency | No | Existing public-interface boundary | No Glossololary/experiment runtime dependency |

## 8. Ordered implementation and acceptance gates

1. scope acceptance is recorded above, including multi-cipher same-location
   semantics, library range, UI range, no live/phrase assets, and no new storage.
   obtain the owner's implementation go-ahead before starting code work.
   re-read the current working tree and coordinate ownership with overlapping work.
2. Add failing projection tests for the table, validation boundaries, metadata,
   registry dispatch, repeatability, and unchanged SHA fixtures. Implement only
   the new branch and explicit six-decimal boundary. Test upper-bound+1 rejection,
   zero/negative/bool/float/string rejection, and all canonical cipher identities.
3. Produce reproducible numeric-only static assets with the new method and
   manifest/curation entries. Verify each domain is exactly 1–2000 once; no
   fabricated saved-phrase data. Compare generated geometry to Python fixtures;
   keep existing datasets unchanged, not regenerated from a different corpus.
4. Wire selectors and supported fallback/preservation, constellation option,
   in-memory state transitions, exports, and polar disclosure. Extend tests in
   existing `atlas/tests/atlasData.test.mjs`, `constellation.test.mjs`,
   `markdownExport.test.mjs`, `mapPresentation.test.mjs`, and
   `nativeGlobe.test.mjs` as appropriate; do not treat source-string guards as
   rendered interaction proof.
5. Exercise switching SHA -> Halton -> SHA under slow/out-of-order loads,
   input edit while loading, retry, invalid input, manifest replacement, source
   changes, and both workspaces. No old pin/readout/export may carry a new label.
   The old SHA coordinates must return unchanged. Test 1, 100, 177, 333, 343,
   729, 1000, and 2000; test UI rejection at 0/2001 and the literal `100333343`.
6. Render full and public-subpath editions: normal search, shared landing,
   eight-row access, copy/download parity, day/night, flat/globe, far-side focus,
   polar landing, narrow portrait/landscape, keyboard and reduced motion.
   Public output must not include private fields or report zero occupancy.
7. Reconcile the accepted method-list transition and operational docs/status in
   that later authorized implementation. Report test/build and rendered evidence
   separately; leave honest remaining gates open. No commit or deployment unless
   separately requested.

### Validation commands for the next implementation session (not run here)

From the repository root:

```bash
uv run --locked --extra backend --extra test python -m unittest discover -s tests -p 'test_projection.py'
uv run --locked --extra backend --extra test python -m unittest discover -s tests -p 'test_geojson.py'
uv run --locked --extra backend --extra test python -m unittest discover -s tests -p 'test_layers.py'
uv run --locked --extra backend --extra test python -m unittest discover -s tests -p 'test_backend.py'
uv run --locked --extra backend --extra test python -m unittest discover -s tests
python3 /home/resonatingloop/.codex/skills/manage-project-docs/scripts/check_docset.py .
git diff --check
```

From `atlas/`:

```bash
npm test
npm run build
npm run build:public
```

Complete-suite tests use temporary fixture databases/injected sources, not owner
source DB connectivity proof; no real source read is needed for this slice.
Do not run two staging/build commands simultaneously. Both builds share `dist/`,
and dev staging shares `public/data/`. Follow `docs/DEVELOPMENT.md`: stop public
preview before a full build, build public last, verify the sanitized artifact,
then restore full dev staging only if needed without replacing the public
preview's artifact. Artifact scans and counts must follow the actual new manifest,
not assume the old 80/16 totals. No need to start/restart the backend for Halton.

### historical checks executed for the original handoff

- Read-only pilot primitive/formula calculation at the 17 table values versus
  exact `fractions.Fraction` digit expansions: all six-decimal coordinate
  comparisons passed; AQ candidate-b wrapper results checked for table values
  within its actual domain. No domain sweep or research run was launched.
- Eight pilot-wrapper invalid-input checks passed: AQ with 0, -1, 1001, True,
  1.5, or `'1'`; and lowercase `aq` or `QWER` with 1.
- Ran `PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover -s tests -p
  test_halton.py` from the pilot root: **1 test passed**.
- Called existing production `project_value` for the six SHA fixtures above
  and calculated their seed digests. Captured the two source fingerprints.
- Inspected instructions, status, source code, manifest/curation metadata and
  existing tests. Did not read owner/source databases, credentials, or dossiers;
  did not run backend connectivity, app builds, full suites, or browser checks.

No implementation tests for the new method can be claimed: it is not installed.
the original handoff reported no numerical lookup blocker. the owner has now
accepted the production range/cipher/UI availability choices. implementation
has not started; actual polar/browser behavior remains a verification risk.
