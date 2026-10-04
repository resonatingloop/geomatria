# private spatial relations and saved studies

status: accepted

role: accepted implementation transition, not completed functionality.
owner: repository owner (Maria). created: 2026-10-03. supersedes: none.

The owner accepted this written spec and authorized implementation on 2026-10-03:
"approved. cleared to implement". This follows approval of the seven design
decision areas and the earlier documentation-only authorization. Implementation
must pass the ordered desktop gates below before the broader workspace is built.
Acceptance does not establish completion or authorize launcher changes, commits,
deployment, unrelated Halton work, or source-catalogue writes.
This tracked document is authoritative for the proposed slice; ignored `specs/`
and conversational history are not required to recover it.

## 1. purpose and approved slice

Geography becomes an operation, not only a destination for a cipher value:

- **Distance reading:** two phrase/value addresses produce a shortest surface
  distance; its whole-mile value becomes an address for direct exact clicks.
- **Resonance chamber:** a snapped place gathers distinct values from a declared
  numeric domain; their direct clicks are encountered together without merging
  the member values or claiming that geographic proximity proves meaning.
- **Saved study:** keep either reading, its evidence, and annotations without
  committing to a route or adding anything to the phrase catalogue.

The first release is a dedicated private geogematria desktop instrument, with
Tauri v2 as the leading shell subject to the renderer and process gates below.
Reuse the React/Vite atlas and its flat/globe presentation. Do not add a workspace
to the Glossololary GUI or require an export round-trip to use the instrument.
The localhost atlas remains a supported geographic discovery surface. V1 relations
gestures live in the desktop's embedded private atlas; a separate browser-to-desktop
handoff is not required by this slice. The public website remains the existing
sanitized static atlas.

One selected cipher is measured or excavated at a time. Preserve a readings
collection and explicit cipher identity so a later multi-cipher field does not
require replacing the study envelope. Each chamber also has one selected cipher.

Out of scope:

- Cipherings, neighbours, cross-system families, and every lookup other than
  direct exact clicks. These are possible later slices, not hidden background
  requests, empty tabs, or promised capabilities in this release.
- Multi-cipher distance fields, automatic recurrence analysis, significance
  scores, semantic models, destination research, and statistical corroboration.
- Spatial walking, route persistence, automatic traversal, and writing geographic
  edges into Glossololary Paths. Preserve future warrants, not a partial walker.
- New ciphers/projections, Halton implementation or live expansion, arbitrary
  phrase calculation, source-catalogue edits, database migrations, remote sync,
  telemetry, public study publication, or Windows/mobile support.
- Replacing existing static exports, public constellation range, live cliquemap
  defaults, globe behavior, or the separate accepted Halton transition.

## 2. authority and inspected starting state

[Agent instructions](../AGENTS.md) govern authorization and repository boundaries.
[Development](DEVELOPMENT.md), [atlas guide](../atlas/README.md),
[value constellation](value-constellation-spec.md), [mounted globe](globe-view-spec.md),
and [Halton handoff](halton-equal-area-spec.md) retain their current authority.
This slice adds private relation operations; it does not retrospectively amend
those approvals or broaden their public/live interfaces.

Grounding checkout: `main`, HEAD `9e2e192`, clean before documentation edits.
Observed seams, not yet relation implementations:

| Existing surface | What it supplies or does not supply |
|---|---|
| `geogematria/projection.py` | Existing methods, offline gazetteers, six-decimal points, pre-snap coordinates, place IDs, and spherical distance helper |
| `geogematria/adapter.py` | Public canonicalization and phrase/value lookup; `get_cluster` currently calls public `find_by_value` |
| `geogematria/live_adapter.py` | Public read-only source; its protocol currently offers only `iter_clusters` |
| `backend/app.py`, `geogematria/layers.py` | Existing live manifest/cliquemap endpoints; `value_hash_v1` remains the only live layer projection |
| `atlas/datasets/manifest.json` | Static 1–2000 value-domain datasets for `value_hash_v1`, `webmercator_hash_v1`, and `nearest_10000_towns_hash_v1` |
| `atlas/src/atlasData.js`, `readoutModel.js`, `ReadoutTray.jsx` | Geographic selection/readouts; ordinary local visibility filters by phrase occupancy and is not complete chamber membership |
| `atlas/src/mapPresentation.js`, `atlas/vite.config.js` | Existing renderer and a development-only localhost API proxy, not a desktop backend lifecycle |
| `atlas/package.json` | React 18/Vite 5 and pinned MapLibre 5.24.0; no Tauri implementation exists in this checkout |

Earlier public-interface inspection confirmed `find_clicks` and the other public
lookup methods exist; existence alone does not prove result semantics, current
source connectivity, or a packaged integration. No owner database was opened
while writing this spec. No implementation acceptance gate below has been run.

## 3. identities, inputs, and chamber membership

Supported cipher identities are the current workbench set: `AQ`, `Synx`, `QWER`,
`nQWER`, `Ordinal`, `Reduced`, `Standard`, and `Satanic`. Resolve supported aliases
at the public input boundary; pass and persist the exact canonical spelling.
Do not normalize bytes inside `project_value`: `AQ` and `aq` seed different points.
Unknown identities and unavailable methods fail explicitly, without fallback.

Select endpoints from validated atlas cipher/value addresses or stored phrases
with a public source value in the selected cipher. Preserve selected phrase text
and its public normalized identity when available; numeric-only endpoints remain
valid. Missing stored phrase values are not calculated or saved as a side effect.
Both endpoints use the same selected cipher and projection in v1. Replacing or
swapping them changes inspector state, not persistent history.

The chamber domain is initially every integer **1–2000 inclusive**, regardless
of source occupancy. This is a declared geometric enumeration, not a claim to
have found every integer that could ever snap to the place. Configurable domains
and a corpus-only membership mode are deferred. This domain does not restrict
stored endpoint addresses or distance-derived target values in the private
Relations workspace; it does not expand existing static search/constellation.

A chamber is identified by canonical cipher, snap projection, gazetteer name and
SHA-256 content fingerprint, stable place ID, and domain bounds. Display place
name/country as labels, not identity. Its members are all domain values whose
existing projection selects that place ID under that exact gazetteer. Sort them
numerically and retain every member, including members with zero direct clicks.
A singleton is valid; shared names or coincident coordinates are not sufficient
to merge places. Coarse-grid collisions are not place-snap chambers.

Use the existing implemented projection registry; do not add or change methods.
Distance reads the selected method's coordinates. Chambers require one of its
implemented place-snap methods and complete offline gazetteer provenance. For
snap methods without a complete 1–2000 static domain, enumerate that finite
numeric domain through the Python projection layer without source access.
Do not infer membership from phrase-bearing cliquemaps, the visible local tray,
public occupancy suppression, or whichever features happen to be on screen.
Cache numeric membership by the full chamber instrument/domain identity;
refreshing corpus population must not change geographic membership.

## 4. distance-to-value contract

A raw address is the selected projected point for an unsnapped method, or the
`base_coordinate` preceding an existing place snap. A snapped address is the
selected town/city coordinate, with its place ID and gazetteer provenance.
Retain both when snapping applies; unsnapped endpoints have no fabricated town.

Use the existing authoritative six-decimal coordinate boundary, not undisclosed
higher-precision hash coordinates. Store latitude/longitude as named fields in
study JSON; renderer GeoJSON still uses `[longitude, latitude]`. Precision,
projection ID, and engine/measurement version accompany every reading.

Primary basis: **raw-to-raw**. For snapped pairs, show **town-to-town** as a
separately labelled comparison, including a valid zero when the town is shared.
No mixed raw/town measurement in v1 and no implicit substitution when raw
metadata is missing. Each excavated reading names its basis and measured pair;
raw is excavated by default. Inspecting the comparison's value, if offered,
explicitly selects that comparison and queries only its direct clicks.

The versioned measurement recipe is:

1. Convert coordinate degrees to radians and calculate spherical haversine `h`.
2. Guard finite inputs and floating boundary error; bound `h` to `[0, 1]`.
3. `distance_km = 6371.0088 * 2 * atan2(sqrt(h), sqrt(1-h))`.
4. `distance_miles = distance_km / 1.609344` (international statute miles).
5. `distance_value = floor(distance_miles + 0.5)` for a nonnegative distance:
   nearest whole mile, ties upward, not Python's default ties-to-even rounding.

Do not round kilometres or miles before deriving the value; presentation rounding
must not change it. Preserve the calculation's unrounded floating results and
all constants. Use Python as the sole numerical authority; Rust and JavaScript
do not independently reproduce this recipe or cipher/projection calculations.
This is shortest surface distance, not a chord, road route, or ellipsoidal survey.

Zero and targets above 2000 are valid. Look up direct clicks in the same selected
cipher without clipping, wrapping, reducing digits, or substituting a nearest
value. Return an explicit empty list if a successful exact lookup has no hits.
An out-of-domain target can have its own on-demand projected address, clearly
labelled as outside the chamber domain; this neither adds it to domain membership
nor expands ordinary constellation. No recursive measurements happen automatically.

Retain and display `abs(left_value - right_value)` alongside the geographic
reading. Arithmetic difference and geographic distance are different lenses;
this slice does not import the full arithmetic difference dossier or its extra
lookups. For a selected chamber pair, expose raw separation and each member's
raw-to-town displacement separately. Do not treat average snap displacement as
internal pairwise tightness or combine them into a resonance-strength score.
Calculate displayed displacements under this coordinate/measurement recipe;
legacy `distance_km` snap metadata is rounded and is not a full-precision oracle.

## 5. direct clicks and source access

Whole selected source database is the v1 scope; there is no session selector.
Persist that explicit scope. The only excavation is an exact integer match in
the selected canonical cipher. Use public `find_clicks` or a proven equivalent
public exact-value lookup; test the mapping before using existing `get_cluster`
as the relation source. Do not issue ciphering, neighbour, or cross-system calls.
Set whole-source/no-exclusion parameters explicitly; do not silently restrict
to an active session or exclude the selected endpoint phrases from exact hits.

Preserve source phrase spelling and normalization; source IDs are optional and
must come from a public result, not guessed fields. Group chamber results under
each numeric member. If one phrase has several memberships, retain each
attribution even when offering a deduplicated phrase display. Sort deterministically
by public normalized text with a stable tie-break; count actual captured records.
Pagination/scrolling is presentation only, never silently truncated evidence.

Distinguish successful empty results, pending results, and unavailable/failed
source access. Failure must not appear as zero inhabitants. A study is saveable
only after required lookups complete successfully, including valid empty lists;
no partially excavated collection may be labelled complete. Preserve numerical
evidence visibly if excavation fails, but disable save-as-complete and offer retry.

Open the source only through public `read_only=True` handles. No creation,
migration, raw SQLite connection, private DB method, or source-catalogue write.
Captured results describe reads over a recorded capture interval; do not claim
an atomic database snapshot or exact source revision unless a public interface
actually guarantees/provides it. A source revision may be unavailable.

## 6. study document and persistence

The canonical artifact is versioned UTF-8 JSON, with one common envelope and a
typed distance or chamber payload. V1 data requirements:

| Component | Required evidence |
|---|---|
| Envelope | Schema version, study ID, immutable revision ID, parent revision when present, kind, title, annotations, save time, capture start/end |
| Instrument | Canonical cipher per reading/member, selected/raw projection IDs, coordinate precision, measurement ID/version/constants, domain and gazetteer fingerprint when applicable |
| Inputs | Explicit endpoint/member references, integer values, selected phrase identities when supplied, source/dataset provenance, raw and optional snapped addresses |
| Source scope | Local source identity/label, whole-database scope, direct-click policy, public source revision or explicit unavailable status |
| Distance payload | A readings collection (one cipher in v1), ordered measured endpoints, basis, arithmetic difference, kilometres, miles, integer target, complete direct-click results; separately named comparisons |
| Chamber payload | Place identity, complete ordered numeric membership, per-member direct clicks including empty lists, selected pair and its measurements when retained |
| Completeness | Lookup success/completeness flags and counts derived from captured arrays, not UI visibility or fabricated totals |

Study revisions are geogematria-owned authored/derived state, not a second phrase
catalogue. Captured phrases are evidence in a study; they are not indexed as a
replacement source or inserted into Glossololary. Keep filesystem paths and
connection configuration outside the portable artifact; opaque source identity
must not falsely assert that two source versions are identical.

Default storage is `$XDG_DATA_HOME/geogematria/studies`, or
`~/.local/share/geogematria/studies` when XDG_DATA_HOME is unset. Use app-generated
identities, private directory/file permissions, schema validation, and atomic
publication of new revision files; never overwrite a captured revision. Lists,
open/reopen, annotations, and revisions must be reachable in the GUI, not merely
written to disk. Annotation edits produce a new revision while retaining the
original capture's times and evidence; revision time is separate.

Reopen displays captured evidence without querying the database, even if the
source is absent. Refresh is explicit: re-excavate the same recorded members and
targets, preserve the held geometry/recipe, and save a new revision with fresh
capture times. Failure leaves earlier revisions usable. Re-projecting under a
changed method, gazetteer, or domain is a new reading/study, not a silent refresh.

Export the same validated study JSON to an explicitly chosen destination; warn
that it contains private phrases and annotations. Do not export raw source DB
paths or connection secrets. No auto-export, remote upload, public-stage copy,
or phrase-catalogue import. Exported studies remain data, not executable commands;
opening them must validate schema/version and treat all text as untrusted.

## 7. workspace and geometry interaction

Use a shared Relations workspace, not an ever-growing locus tray. The desktop's
embedded private atlas offers a small Open chamber action when a valid snap instrument is
available and deliberate left/right endpoint selection for Measure relation.
Keep endpoint identities and the selected cipher/method visible; replacing or
clearing one must not secretly measure another pair. A dedicated desktop saved
studies list makes held readings discoverable across close/relaunch.

Selecting two chamber members reveals only that pair: two raw landings, their
raw interval, and each raw-to-shared-town connection. Label pair separation and
snap displacement independently. No automatic all-pairs web, jittered coordinates,
place-name merge, semantic-strength glow, or camera move merely from inspection.
Geometry is a view of saved/calculated evidence, not another numerical authority.
Surface/theme changes retain reading, selection, and export. Far-side globe
geometry is clipped appropriately without dropping its ledger or study evidence;
dateline drawing must not imply the longer route or alter the measured interval.

Required states: idle, incomplete/invalid selection, loading, ready (including
successful empty clicks), source unavailable/error, saving, saved, and failed
save/export with retry. Generation-bind requests to input pair, cipher, method,
domain, and source selection; old replies cannot replace a newer reading or
re-enable its save/export controls. Render keyboard focus and narrow-window
layouts using the existing theme grammar; validate usefulness through actual
rendered gestures rather than freezing a pixel-perfect layout in this draft.

Preserve future walking semantics without building route controls: inspection
and a future walk anchor are independent; only an explicit future Continue action
may append a step. Saving a study never advances a route. A future exact-value
hop retains phrase/value identity, a chamber hop retains both members plus place
and instrument, and a distance-generated move retains the measured pair plus
recipe and target. These are geogematria warrants; geographic co-membership must
not be persisted as a Glossololary exact-value or value-preserving Paths edge.

## 8. desktop, API, and privacy boundary

Tauri is a native Linux window containing the reused web-rendered instrument,
not an Avalonia-style native-control rewrite. Python retains domain computation
and public read-only source access. Rust owns process lifecycle and the narrowly
scoped local persistence/export boundary, not another gematria engine.

Define versioned private operations for capability/readiness discovery, distance
measurement/direct-click excavation, and chamber enumeration/direct clicks.
Logical request parameters and results must conform to sections 3–6. Exact
transport routes and implementation modules are engineering details to document
and test when implemented, not evidence that an endpoint already exists.
Advertise supported operations and versions honestly; mismatches fail visibly.
The existing live manifest and `value_hash_v1` allowlist remain unchanged.

The packaged application must start, monitor, retry, and stop its own Python
sidecar, including required public Glossololary package dependencies and offline
gazetteers. It must not depend on a checkout, activated venv, hand-started backend,
Vite proxy, or assumed availability of port 8000. Keep source DB selection in
private local configuration; never bundle an owner DB or captured studies.
If HTTP is used, bind to loopback on an app-owned port and authenticate the new
private transport with a per-launch secret held behind narrowly scoped Tauri
commands. Do not put secrets/phrase text in URLs, accept wildcard origins, expose
arbitrary filesystem/shell access, or adopt/terminate an unrelated existing server.
Do not change the legacy browser API's authentication contract incidentally.

Show a closable loading shell before initialization completes. Backend failure
or an absent source must not produce a blank window; saved studies remain
readable. Explicit retry cleans up the previous owned child, and closing during
startup, after failure, or after successful use must not orphan that child.

Private operations, source identifiers, study storage, and capture/export UI
must be excluded from the public artifact, not just hidden after mounting.
Desktop staging must not package old phrase-bearing snapshots as current clicks;
use explicit numeric geographic assets and live direct-click results. Existing
full/public scripts and dataset inputs retain their behavior and privacy rules.
Basemap requests may still use the existing external tile providers; disclose
that map rendering is not fully offline. No private phrases/studies are sent to
them, and a failed basemap does not invalidate captured numerical evidence.

## 9. change shape

| Dimension | Changed? | Source of truth | Required proof |
|---|---|---|---|
| User-visible behavior | Yes, private relations and study library | Sections 3–7 and existing globe contract | Model tests plus rendered desktop gestures; existing browser regression checks |
| Persisted state/schema | Yes, app-owned study revisions only | Section 6 | Round-trip, reopen, revision and atomic-failure fixtures |
| External/provider-visible behavior | Yes, local private API/sidecar; no new remote provider | Section 8 | Handshake, authorization, lifecycle and request inspection |
| Identifiers/secrets/privacy | Yes, study/place/source identities and per-launch transport secret | Sections 3, 6, 8; existing public sanitization | Seed/provenance tests, capability review and public/package scans |
| Lifecycle/terminal states | Yes | Sections 7–8 | Race, retry, startup/close/failure and no-orphan tests |
| Setup/operation/recovery | Yes, gated Linux desktop requirements | Section 10; development guide when implemented | Actual packaged startup, recovery and documented build |
| Normative contract/decision | Yes, explicitly accepted transition | This document; owner acceptance recorded above | Ordered implementation gates and acceptance evidence |
| Cross-repository dependency | Existing public Glossololary dependency; no internal changes | Agent guide and section 5 | Public exact-click conformance and source read-only proof |

## 10. ordered implementation gates

Owner amendment, 2026-10-04: "Proceed with Python-only relations and tests; defer
desktop verification." This changes the stage dependency, not the product or
numerical contracts. The renderer/lifecycle gate remains open. Steps 3–4 and
complete in-memory capture validation may proceed using injected sources and
disposable public-interface fixtures, without opening the owner database.
Study persistence, native workspace/transport integration, and packaged desktop
acceptance remain deferred; Python tests do not pass the native gate.

Native automation is paused after interaction coincided with loss of screen
visibility. The owner reported recovery after the session-owned app, engine,
and automation helper were stopped. The visual failure's cause is unconfirmed.
Do not relaunch native apps or desktop automation without renewed authorization
and an agreed isolation/cleanup protocol; do not terminate unrelated processes.

1. Owner acceptance and the implementation go-ahead are recorded above.
   Recheck git status and preserve the separate unimplemented Halton work.
2. Establish a bounded Tauri renderer/lifecycle spike before building the whole
   workspace: actual MapLibre WebGL2 flat/globe, selection/readout, theme switch,
   and closable startup/failure. Establish sidecar readiness and ownership.
   If either gate fails, stop and report it; a browser-only substitute is not
   fulfillment of the dedicated desktop app decision.
3. Define and test the versioned study/operation schema with injected sources.
   Prove public exact-click semantics, canonical identifiers, whole-source scope,
   complete numeric membership, and no prohibited lookup calls.
4. Add numerical conformance tests before implementing the relation service.
   Reuse the projection layer, preserve its existing outputs, and independently
   check distances. Do not regenerate existing static/private/public datasets.
5. Implement complete captures, app-owned atomic revisions, library/reopen,
   explicit refresh, annotations, and private JSON export with failure tests.
6. Wire selection, pair geometry, and the shared Relations workspace. Isolate
   private bundles/operations and stale requests; preserve static/globe behavior.
7. Exercise the packaged Linux app with Vite/manual backend stopped, injected
   fixtures first, then a scoped real-source read-only check. Reconcile exact
   commands, setup, package contents, operational docs, and acceptance evidence.

On the grounding machine, Rust/Cargo were not found on PATH or in the standard
`~/.cargo/bin` location, and GTK/WebKit development packages were not discoverable
through pkg-config. This is a setup gap, not proof that Tauri cannot work.
The earlier documentation-only turn installed nothing. The accepted implementation
includes required setup; administrator authentication, if needed, remains with
the owner and must not be requested as a password in chat.
Official references: [prerequisites](https://v2.tauri.app/start/prerequisites/),
[Linux webview](https://v2.tauri.app/reference/webview-versions/), and
[sidecars](https://v2.tauri.app/develop/sidecar/). Python sidecar packaging is
supported in principle; the actual dependency bundle and GPU interaction remain
unverified engineering gates, not reopened product decisions.

## 11. observable acceptance and validation

- An independent spherical oracle agrees with kilometre/mile results within a
  declared tolerance tight enough to detect coordinate/recipe errors. Swapping
  endpoints preserves distance/target while retaining the chosen endpoint roles.
- Coincident, same-town/different-raw, antimeridian, near-pole, antipodal and
  near-antipodal fixtures produce finite valid results. Quantization fixtures
  immediately below, at, and above a half mile obey upward ties; display precision
  cannot change lookup targets. Test zero and targets above 2000 explicitly.
- Complete 1–2000 enumeration determines chamber membership independently of
  clicks. Test empty and occupied members, a singleton, distinct place IDs with
  the same name/coordinate, multiple snap densities, and gazetteer identity drift.
- Case/alias tests preserve canonical seeds and old projection fixtures. No
  source absence, missing raw coordinate, unsupported method, or lookup failure
  becomes a different method, empty-success result, or fabricated point.
- Direct-click-only fixtures reject invocation of cipherings, neighbours, or
  cross-system lookup methods. Attribution and captured counts remain correct
  after grouping, deduplication, pagination, and export.
- Saved distance/chamber studies round-trip and reopen with the source unavailable.
  Annotation and refresh revisions leave earlier evidence intact. Interrupted
  saves, disk failures, incompatible schemas, and failed refreshes are recoverable
  without losing the previous revision or claiming a successful new one.
- Actual private UI gestures cover selection/replacement, pair geometry, loading,
  empty/error/retry, save, library/reopen, refresh and export; repeat on flat/globe,
  day/night, keyboard, and narrow windows. Inspecting does not persist history;
  switching surfaces never reduces the captured/exported reading.
- Launch the packaged desktop path without Vite or an existing backend. Observe
  a mapped window, renderer, readiness, offline study reopen, explicit source
  failure/retry, close during startup/failure/success, and absence of owned orphan
  processes. An isolated compile, PID, CPU geometry test, or Firefox render is
  not this proof.
- Fixture source tests prove read-only access, rejected writes, and no source
  creation. A separately scoped real integration check uses public interfaces,
  records evidence of source invariance safely, and does not print private phrase
  contents. Unit fixtures alone do not establish owner-source connectivity.
- Public/full regression builds and public-subpath checks pass. Scan emitted
  public assets recursively for private fields, study data, source identities,
  private endpoint/sidecar code, and compiled private fetches; compare existing
  public numeric coordinates/membership against source. Scan desktop packaging
  for owner DBs, stale phrase snapshots, credentials, and captured studies.

Existing commands from the repository root:

    uv run --locked --extra backend --extra test python -m unittest discover -s tests
    python3 /home/resonatingloop/.codex/skills/manage-project-docs/scripts/check_docset.py .
    git diff --check

From `atlas/`, sequentially because staging/build directories are shared:

    npm test
    npm run build
    npm run build:public

New desktop/schema/numerical/lifecycle commands must be real, exercised commands
recorded in development/status when implemented; this draft does not invent an
npm script, binary, or passing result. Follow existing generated-state safety:
stop a public preview before a full build, build public last, and restore full
dev staging only when needed without serving the full artifact publicly.
Inherited documentation findings are reported, not repaired by changing old spec
approval. Reconcile affected guides and status before claiming implementation
complete; keep rendered and real-source gates open until actually exercised.

## 12. accepted boundary

The owner's approved choices are recorded: first-slice readings/chambers/studies,
one selected cipher, domain-based membership with empty members retained,
raw-primary spherical miles with upward half-mile ties, direct clicks only,
private versioned study files with explicit refresh revisions, shared workspace
interaction, and the Tauri engineering/acceptance gates.

Initial 1–2000 domain, whole-database source scope, JSON envelope, XDG storage,
coordinate precision, and refresh-versus-reprojection rules concretize those
choices and were accepted with the written contract. No additional owner product
question is pending. Engineering gates remain open; acceptance and implementation
authorization are not evidence that any of those gates has passed.
