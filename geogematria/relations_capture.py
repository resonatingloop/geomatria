"""Versioned immutable in-memory evidence. No storage, refresh or UI commands."""
from __future__ import annotations

from dataclasses import asdict, dataclass, fields, is_dataclass
from datetime import datetime, timezone
import json
import math
from types import UnionType
from typing import Any, Callable, cast, get_args, get_origin, get_type_hints
from uuid import uuid4

from geogematria.relations import DistanceReading, Endpoint, Chamber, measure_relation, chamber, chamber_pair
from geogematria.relations_source import (
    ExactClickSource, LookupResult, SourceIdentity, lookup_exact, opaque_id, record_sort_key,
)

SCHEMA_VERSION = "spatial_relation_capture_v1"
GEOMETRY_VERSION = "spatial_relation_geometry_v1"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(frozen=True)
class SourceScope:
    identity: SourceIdentity
    scope: str = "whole-database"
    policy: str = "direct-exact-clicks-only"
    consistency: str = "capture-interval-not-atomic"


@dataclass(frozen=True)
class Excavation:
    geometry: DistanceReading | Chamber
    source: SourceIdentity
    lookups: tuple[LookupResult, ...]
    capture_start: str
    capture_end: str
    selected_basis: str = "raw-to-raw"
    selected_pair: DistanceReading | None = None

    @property
    def saveable(self) -> bool:
        try:
            validate_excavation(self)
            return True
        except (ValueError, TypeError, KeyError, AttributeError):
            return False


@dataclass(frozen=True)
class CapturedDistance:
    geometry: DistanceReading
    selected_basis: str
    clicks: LookupResult


@dataclass(frozen=True)
class DistancePayload:
    readings: tuple[CapturedDistance, ...]


@dataclass(frozen=True)
class CapturedMember:
    address: Endpoint
    clicks: LookupResult


@dataclass(frozen=True)
class ChamberPayload:
    geometry: Chamber
    members: tuple[CapturedMember, ...]
    selected_pair: DistanceReading | None = None


@dataclass(frozen=True)
class Completeness:
    status: str
    required_lookup_count: int
    complete_lookup_count: int
    record_count: int


@dataclass(frozen=True)
class Capture:
    schema_version: str
    study_id: str
    revision_id: str
    parent_revision_id: str | None
    kind: str
    title: str
    annotations: str
    saved_at: str
    capture_start: str
    capture_end: str
    source_scope: SourceScope
    payload: DistancePayload | ChamberPayload
    completeness: Completeness


def _selected_measurement(geometry: DistanceReading, basis: str):
    if basis == "raw-to-raw":
        return geometry.primary
    if basis == "town-to-town" and geometry.town_comparison is not None:
        return geometry.town_comparison
    raise ValueError("unavailable or unsupported excavation basis")


def excavate_distance(geometry: DistanceReading, source: ExactClickSource, *, basis: str = "raw-to-raw") -> Excavation:
    validate_geometry(geometry)
    measured = _selected_measurement(geometry, basis)
    start = _now()
    identity = source.identity
    result = lookup_exact(source, geometry.left.cipher, measured.target)
    return Excavation(geometry, identity, (result,), start, _now(), basis)


def excavate_chamber(geometry: Chamber, source: ExactClickSource, *, selected_pair: tuple[int, int] | None = None) -> Excavation:
    validate_geometry(geometry)
    pair = None
    if selected_pair is not None:
        if type(selected_pair) is not tuple or len(selected_pair) != 2:
            raise ValueError("two chamber member values required")
        pair = chamber_pair(geometry, *selected_pair)
    start = _now()
    identity = source.identity
    lookups = tuple(lookup_exact(source, geometry.cipher, address.value) for address in geometry.members)
    return Excavation(geometry, identity, lookups, start, _now(), "per-member-exact-values", pair)


def complete_capture(excavation: Excavation, *, title: str = "", annotations: str = "") -> Capture:
    if not excavation.saveable:
        raise ValueError("incomplete capture")
    if isinstance(excavation.geometry, DistanceReading):
        payload = DistancePayload((CapturedDistance(excavation.geometry, excavation.selected_basis, excavation.lookups[0]),))
        kind = "distance"
    else:
        payload = ChamberPayload(excavation.geometry,
                                  tuple(CapturedMember(address, lookup) for address, lookup in zip(excavation.geometry.members, excavation.lookups)),
                                  excavation.selected_pair)
        kind = "chamber"
    count = len(excavation.lookups)
    captured = Capture(SCHEMA_VERSION, str(uuid4()), str(uuid4()), None, kind, title, annotations,
                   _now(), excavation.capture_start, excavation.capture_end, SourceScope(excavation.source),
                   payload, Completeness("complete", count, count, sum(r.count for r in excavation.lookups)))
    validate_capture(captured)
    return captured


def _time(text: str) -> datetime:
    try:
        value = datetime.fromisoformat(text)
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError
        return value
    except (ValueError, TypeError):
        raise ValueError("timezone-aware capture time required") from None


def _check_shape(cls, value):
    # Also protect direct Python callers (e.g. bool comparing equal to integer 1).
    if type(value) is not cls:
        raise ValueError("invalid typed evidence")
    decoded = _decode(cls, json.loads(json.dumps(asdict(value), allow_nan=False)))
    if decoded != value:
        raise ValueError("immutable typed evidence required")


def validate_geometry(geometry: DistanceReading | Chamber) -> None:
    if isinstance(geometry, DistanceReading):
        _check_shape(DistanceReading, geometry)
        expected = measure_relation(geometry.left, geometry.right)
    elif isinstance(geometry, Chamber):
        _check_shape(Chamber, geometry)
        expected = chamber(geometry.cipher, geometry.projection_id, geometry.place.place_id)
    else:
        raise ValueError("unsupported geometry kind")
    if geometry != expected:
        raise ValueError("geometry or measurement recipe mismatch")


def _validate_lookup(result: LookupResult, source: SourceIdentity, cipher: str, value: int) -> None:
    _check_shape(LookupResult, result)
    if (result.source != source or result.cipher != cipher or result.value != value
            or result.scope != "whole-database" or result.policy != "direct-exact-clicks-only"
            or result.status != "complete" or result.error_code is not None):
        raise ValueError("incomplete or mismatched exact lookup")
    if tuple(sorted(result.records, key=record_sort_key)) != result.records:
        raise ValueError("direct clicks must be sorted deterministically")
    if any(record.cipher != cipher or record.value != value for record in result.records):
        raise ValueError("direct-click attribution mismatch")


def validate_excavation(excavation: Excavation) -> None:
    _check_shape(Excavation, excavation)
    validate_geometry(excavation.geometry)
    if _time(excavation.capture_end) < _time(excavation.capture_start):
        raise ValueError("invalid capture interval")
    if isinstance(excavation.geometry, Chamber):
        geometry = excavation.geometry
        if excavation.selected_basis != "per-member-exact-values" or len(excavation.lookups) != len(geometry.members):
            raise ValueError("complete chamber lookups required")
        for address, result in zip(geometry.members, excavation.lookups):
            _validate_lookup(result, excavation.source, geometry.cipher, address.value)
        if excavation.selected_pair is not None:
            pair = excavation.selected_pair
            if pair != chamber_pair(geometry, pair.left.value, pair.right.value):
                raise ValueError("selected pair does not match chamber")
        return
    if excavation.selected_pair is not None:
        raise ValueError("selected chamber pair on distance excavation")
    for address in (excavation.geometry.left, excavation.geometry.right):
        if address.phrase is not None and address.phrase.source_id != excavation.source.source_id:
            raise ValueError("endpoint phrase/source identity mismatch")
    measured = _selected_measurement(excavation.geometry, excavation.selected_basis)
    if len(excavation.lookups) != 1:
        raise ValueError("required exact lookup missing")
    _validate_lookup(excavation.lookups[0], excavation.source,
                     excavation.geometry.left.cipher, measured.target)


def validate_capture(capture: Capture) -> None:
    _check_shape(Capture, capture)
    if capture.schema_version != SCHEMA_VERSION or capture.kind not in ("distance", "chamber"):
        raise ValueError("unsupported capture schema or kind")
    for identifier in (capture.study_id, capture.revision_id):
        opaque_id(identifier)
    if capture.parent_revision_id is not None:
        opaque_id(capture.parent_revision_id)
        if capture.parent_revision_id == capture.revision_id:
            raise ValueError("revision cannot parent itself")
    if _time(capture.saved_at) < _time(capture.capture_end):
        raise ValueError("revision time precedes capture")
    scope = capture.source_scope
    if scope != SourceScope(scope.identity):
        raise ValueError("unsupported source scope")
    if capture.kind == "distance" and isinstance(capture.payload, DistancePayload):
        if len(capture.payload.readings) != 1:
            raise ValueError("one reading/cipher required in v1")
        reading = capture.payload.readings[0]
        excavation = Excavation(reading.geometry, scope.identity, (reading.clicks,),
                                capture.capture_start, capture.capture_end, reading.selected_basis)
    elif capture.kind == "chamber" and isinstance(capture.payload, ChamberPayload):
        payload = capture.payload
        if tuple(member.address for member in payload.members) != payload.geometry.members:
            raise ValueError("captured chamber members mismatch")
        excavation = Excavation(payload.geometry, scope.identity, tuple(member.clicks for member in payload.members),
                                capture.capture_start, capture.capture_end, "per-member-exact-values", payload.selected_pair)
    else:
        raise ValueError("capture kind/payload mismatch")
    validate_excavation(excavation)
    expected = Completeness("complete", len(excavation.lookups), len(excavation.lookups), sum(r.count for r in excavation.lookups))
    if capture.completeness != expected:
        raise ValueError("capture counts or completeness mismatch")


def _decode(cls: Any, value: Any) -> Any:
    """Closed dataclass schema; never dynamically import types from document text."""
    origin, args = get_origin(cls), get_args(cls)
    if origin is UnionType:
        for option in args:
            try:
                return _decode(option, value)
            except (ValueError, TypeError, KeyError):
                pass
        raise ValueError("invalid union field")
    if cls is type(None):
        if value is not None:
            raise ValueError("null required")
        return None
    if origin is tuple:
        if type(value) is not list:
            raise ValueError("array required")
        return tuple(_decode(args[0], item) for item in value)
    if is_dataclass(cls):
        names = {f.name for f in fields(cls)}
        if type(value) is not dict or set(value) != names:
            raise ValueError("invalid object fields")
        hints = get_type_hints(cls)
        constructor = cast(Callable[..., Any], cls)
        return constructor(**{name: _decode(hints[name], value[name]) for name in names})
    if cls is float:
        if type(value) not in (int, float) or not math.isfinite(value):
            raise ValueError("finite number required")
        return float(value)
    if type(value) is not cls:
        raise ValueError("invalid field type")
    if cls is str:
        try:
            value.encode("utf-8")
        except UnicodeError:
            raise ValueError("invalid UTF-8 text") from None
    return value


def _load_json(text: str) -> dict:
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError("duplicate JSON field")
            result[key] = value
        return result

    def constant(_):
        raise ValueError("nonfinite JSON number")

    if type(text) is not str:
        raise ValueError("UTF-8 JSON text required")
    try:
        text.encode("utf-8")
        data = json.loads(text, object_pairs_hook=pairs, parse_constant=constant)
        if type(data) is not dict:
            raise ValueError
        return data
    except (ValueError, TypeError, UnicodeError, RecursionError, OverflowError):
        raise ValueError("invalid capture JSON") from None


def capture_to_json(capture: Capture) -> str:
    validate_capture(capture)
    return json.dumps(asdict(capture), ensure_ascii=False, allow_nan=False, sort_keys=True, separators=(",", ":"))


def capture_from_json(text: str) -> Capture:
    captured = _decode(Capture, _load_json(text))
    validate_capture(captured)
    return captured


def geometry_to_json(geometry: DistanceReading | Chamber) -> str:
    validate_geometry(geometry)
    kind = "distance" if isinstance(geometry, DistanceReading) else "chamber"
    return json.dumps(dict(schema_version=GEOMETRY_VERSION, kind=kind, geometry=asdict(geometry)),
                      ensure_ascii=False, allow_nan=False, sort_keys=True, separators=(",", ":"))


def geometry_from_json(text: str) -> DistanceReading | Chamber:
    data = _load_json(text)
    if set(data) != {"schema_version", "kind", "geometry"} or data["schema_version"] != GEOMETRY_VERSION or data["kind"] not in ("distance", "chamber"):
        raise ValueError("unsupported geometry schema")
    geometry = _decode(DistanceReading if data["kind"] == "distance" else Chamber, data["geometry"])
    validate_geometry(geometry)
    return geometry
