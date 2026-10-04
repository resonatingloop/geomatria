# Python spatial relation engine

role: implementation reference for the owner-amended Python-only stage.
The [accepted spatial-relations spec](spatial-relations-spec.md) owns the contract.
This library is not desktop integration, a study library, or filesystem persistence.

## Boundaries and public imports

- `geogematria.relations`: immutable endpoints, authoritative coordinates,
  measurement recipe/readings, complete numeric chambers, and selected pair geometry.
- `geogematria.relations_source`: exact public source protocol, public read-only
  adapter, stored endpoint selection, source identities, and attributed click records.
- `geogematria.relations_capture`: typed in-memory excavations/captures, validation,
  and closed-schema UTF-8 JSON serialization. There are no filesystem commands.

The installed public Glossololary cipher resolver is required at input boundaries,
including numeric-only inputs. Database access is optional and never implicit:
`PublicReadOnlySource` requires an explicit private path and `SourceIdentity`.
Its constructor uses `GlossololaryDB(path=..., read_only=True)`; it does not initialize,
create, migrate, calculate, or save source data. Production excavation calls only
`find_clicks(target=integer, cipher=canonical, session_id=None, exclude_text=None)`.
Stored endpoint selection separately calls public `find_by_text`; a missing stored
value is an error, not permission to calculate it.

An injected source must implement `ExactClickSource`: expose a `SourceIdentity`
and return the **complete list** from that exact public-shaped lookup. A generator,
pagination envelope, malformed record, wrong cipher/value, or changed source identity
fails rather than silently becoming empty success. A provider that silently truncates
an ordinary list violates this protocol; the public adapter's whole-source mapping
is proven on disposable public-API fixtures, including session-only entries.
No ciphering, neighbour, cross-system, or occupancy enumeration is used.

Source UUIDs are opaque selection identities, not database hashes or exact revisions.
Source revision is explicitly unavailable. Labels are portable captions, not paths
or connection strings. Only allowlisted phrase fields and public result `id` values
enter captures; raw database row extras and connection configuration do not.
Errors use allowlisted diagnostics, not original database exception text.

## Geometry API

```python
from geogematria.relations import endpoint, measure_relation, chamber, chamber_pair

left = endpoint("aq", 177, "webmercator_hash_v1")
right = endpoint("AQ", 333, "webmercator_hash_v1")
reading = measure_relation(left, right)
assert reading.primary.target == 1302
assert reading.arithmetic_difference == 156

place = endpoint("AQ", 303, "nearest_10000_towns_hash_v1").place
geometry = chamber("AQ", "nearest_10000_towns_hash_v1", place.place_id)
pair = chamber_pair(geometry, 303, 466)
```

Aliases resolve to `AQ`, `Synx`, `QWER`, `nQWER`, `Ordinal`, `Reduced`, `Standard`,
and `Satanic`. No hash normalization or projection registry changes are made.
All seven existing methods support distance; chambers require one of the four
place-snap methods. Bool/string/fractional values and invalid coordinates are rejected.
Valid integer endpoint/target values, including zero and values above 2000, are not
clamped. `Endpoint.domain_status` labels on-demand numeric addresses relative to the
initial chamber domain; it never changes their values or adds chamber members.

`Coordinate` accepts finite, bounded, authoritative six-decimal coordinates. Snap
endpoints retain both the selected town and the preceding `webmercator_hash_v1`
raw point. Missing or forged raw metadata is rejected. Readings retain ordered
endpoints, canonical identities, engine version, full raw doubles, and the complete
recipe (`spherical_haversine_miles_v1`, version 1): guarded haversine, sphere radius
6371.0088 km, 1.609344 km per statute mile, upward nearest-half-mile quantization.

`distance_value` implements the algebraic result of `floor(miles + 0.5)` by comparing
its fractional part with 0.5. This avoids binary addition turning
`nextafter(0.5, 0)` into exactly 1.0. No presentation rounding or epsilon changes the
target. Town-to-town comparisons and left/right raw-to-town displacements have
separate bases; raw-to-raw stays primary. Legacy rounded snap displacement metadata
is not used as a numerical oracle.

Chambers enumerate every integer 1–2000 before any source query. Their stable IDs
include canonical cipher, selected snap method, gazetteer filename and SHA-256 of
actual bytes, stable place ID, and domain bounds. Membership caches contain geometry
only and are keyed by the instrument/gazetteer/domain identity. Cached projection
data are checked against real content, and changes during enumeration/projection
are rejected. Identical display names or coordinates never merge place identities.

## In-memory capture API

```python
from geogematria.relations_source import SourceIdentity
from geogematria.relations_capture import (
    excavate_distance, excavate_chamber, complete_capture,
    capture_to_json, capture_from_json, geometry_to_json, geometry_from_json,
)

class SyntheticSource:
    identity = SourceIdentity(label="Synthetic empty corpus")

    def find_clicks(self, target, cipher, *, session_id, exclude_text):
        assert session_id is None and exclude_text is None
        return []

source = SyntheticSource()
excavation = excavate_distance(reading, source)  # raw target only
assert excavation.saveable
capture = complete_capture(excavation, title="Synthetic distance study")
text = capture_to_json(capture)                 # a string, not a file write
assert capture_from_json(text) == capture
assert geometry_from_json(geometry_to_json(reading)) == reading

chamber_excavation = excavate_chamber(geometry, source, selected_pair=(303, 466))
chamber_capture = complete_capture(chamber_excavation)
```

Explicit `basis="town-to-town"` queries only that comparison's target; it does not
replace raw evidence or issue an additional raw lookup. Displacement and arithmetic
difference never trigger lookups. A chamber capture groups attributed records under
every numeric member, including successful empty lists. Pair retention is geometry,
not another excavation or an automatically traversed edge.

`Excavation` retains geometry and per-lookup status when source access fails. Its
`saveable` property validates the geometry, source/scope identity, exact target
attribution, ordering, required lookup coverage, and capture interval; missing,
pending, failed, malformed, or mismatched evidence cannot become a complete capture.
Counts come from the captured arrays. Text is data, never evaluated or rendered here.

The common `spatial_relation_capture_v1` envelope includes generated study/revision
UUIDs, optional validated parent revision, kind, title/annotations, revision time,
capture interval, explicit source scope/policy/consistency, typed payload and derived
completeness counts. Distance payloads preserve a one-reading collection in v1;
chamber payloads preserve complete membership and an optional selected pair.
All resulting evidence is immutable dataclass/tuple data. `saved_at` is the in-memory
revision timestamp, **not** a durable-save receipt.

Validation/serialization rejects unknown schemas/fields, duplicate JSON keys,
invalid types (including bool-as-integer), NaN/infinity, invalid UTF-8 text,
forged geometry/recipe/domain identity, mismatched source/scope/phrase attribution,
and fabricated totals. Numeric geometry is independently importable as
`spatial_relation_geometry_v1`. Round-trip decoding does not query any source.
It does validate against the current registered projections and matching offline
gazetteer bytes; historical gazetteer/version migration is not implemented.
Imported JSON is structurally validated evidence, not cryptographically authenticated
proof that an external author performed a particular database read.

## Exercised proof

From the repository root, using the existing environment without synchronization:

```bash
.venv/bin/python -m unittest discover -s tests -p 'test_relations*.py' -v
uv run --locked --offline --no-sync --extra backend --extra test python -m unittest discover -s tests
git diff --check
```

The focused suite passes 25 tests; the complete current Python tree passes 82
(57 baseline plus 25 relation tests), with the inherited Starlette/httpx warning.
Tests cover independent cross/dot atan2 oracle comparison (ordinary tolerance
1e-8 km; near-antipodal tolerance 3e-4 km), reversed/coincident/dateline/pole/
antipodal cases, adjacent representable half-mile boundaries, every registered
method, all four snap densities, full domain membership, synthetic singletons and
coincident named places, content/cache drift, exact-source mapping/read-only writes,
source failures, complete capture validation, and untruncated 257-record round-trips.

Genuine fixture outputs:

- AQ 177/333, `webmercator_hash_v1`: 2095.93619283607 km,
  1302.3543709959274 miles, target 1302; arithmetic difference 156.
  Independent oracle error: 4.547473508864641e-13 km.
- Santa Rosa US, stable ID `santa-rosa-us-5393287`, nearest 10,000 towns:
  members 303, 466, 627, 674, 1452, 1807, 1908.
  Gazetteer SHA-256: `8369ddf8358bb487b88875e1b19394f7c47a8093427d06e80f35158786a273b1`.
- Santa Rosa pair 303/466: raw separation 324.13015765483 miles (target 324),
  town comparison 0 miles; displacements 605.0121205880628 and 908.9581277059452
  miles. These are separate measurements, not a strength score.
- Synthetic chamber population: per-member counts `[1, 1, 0, 0, 0, 0, 0]`,
  seven successful exact lookups, two attributed records, JSON round-trip true.
- AQ 1/3, `value_hash_v1`: 9613.773507632268 miles, target 9614;
  its on-demand address remains outside the initial chamber domain.

No owner source DB, native app, browser, screenshot, display/session/service change,
sidecar/package build, atlas regeneration, launcher, commit or push was used for
this stage. Native desktop verification and all storage/library/reopen/refresh/
export UI functionality remain deferred. Fixture validation is not owner-source
connectivity or packaged desktop acceptance.
