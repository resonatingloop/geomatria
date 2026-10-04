"""Python-only spatial geometry. No source/database or persistence side effects."""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import math
import re
from uuid import UUID

from geogematria.projection import (
    project_value, resolve_projection_method, SNAP_PROJECTION_GAZETTEERS,
    GazetteerPlace, load_indexed_gazetteer,
)

CANONICAL_CIPHERS = ("AQ", "Synx", "QWER", "nQWER", "Ordinal", "Reduced", "Standard", "Satanic")
ENGINE_VERSION = "spatial_relations_v1"
COORDINATE_PRECISION = 6


def canonical_cipher(cipher: str) -> str:
    """Resolve aliases only here, never change the projection hash seed contract."""
    from glossololary.ciphers import resolve_cipher
    if not isinstance(cipher, str):
        raise ValueError("unsupported cipher")
    try:
        canonical = resolve_cipher(cipher)
    except (ValueError, KeyError):
        raise ValueError("unsupported cipher") from None
    if canonical not in CANONICAL_CIPHERS:
        raise ValueError("unsupported cipher")
    return canonical


@dataclass(frozen=True)
class Coordinate:
    latitude: float
    longitude: float

    def __post_init__(self):
        for value, limit in ((self.latitude, 90), (self.longitude, 180)):
            if (type(value) not in (int, float) or not math.isfinite(value)
                    or abs(value) > limit or round(value, 6) != value):
                raise ValueError("invalid six-decimal coordinate")


@dataclass(frozen=True)
class GazetteerIdentity:
    name: str
    sha256: str


@dataclass(frozen=True)
class PlaceIdentity:
    place_id: str
    name: str
    country: str
    coordinate: Coordinate
    gazetteer: GazetteerIdentity


def gazetteer_snapshot(projection_id: str) -> tuple[GazetteerIdentity, tuple[GazetteerPlace, ...]]:
    """Fingerprint real bytes; refuse drift in the projection layer's cached data."""
    if projection_id not in SNAP_PROJECTION_GAZETTEERS:
        raise ValueError("place-snap projection required")
    path = SNAP_PROJECTION_GAZETTEERS[projection_id]
    try:
        data = path.read_bytes()
        records = json.loads(data)
        places = tuple(GazetteerPlace(str(row["id"]), str(row["name"]), str(row["country"]),
                                      float(row["latitude"]), float(row["longitude"])) for row in records)
        if not places or len({p.place_id for p in places}) != len(places):
            raise ValueError
        for place in places:
            Coordinate(round(place.latitude, 6), round(place.longitude, 6))
        cached = load_indexed_gazetteer(path)
        if cached.places != places or path.read_bytes() != data:
            raise ValueError
    except (OSError, ValueError, TypeError, KeyError):
        raise ValueError("gazetteer unavailable or content/cache drift") from None
    return GazetteerIdentity(path.name, hashlib.sha256(data).hexdigest()), places


@dataclass(frozen=True)
class PhraseReference:
    text: str
    normalized_text: str
    source_id: str
    source_record_id: str | None = None


@dataclass(frozen=True)
class Endpoint:
    cipher: str
    value: int
    projection_id: str
    raw_projection_id: str
    raw: Coordinate
    snapped: Coordinate | None = None
    phrase: PhraseReference | None = None
    coordinate_precision: int = COORDINATE_PRECISION
    place: PlaceIdentity | None = None
    input_origin: str = "numeric-address"

    @property
    def domain_status(self) -> str:
        return ("inside-initial-chamber-domain" if 1 <= self.value <= 2000
                else "outside-initial-chamber-domain")


def endpoint(cipher: str, value: int, projection_id: str = "value_hash_v1") -> Endpoint:
    canonical = canonical_cipher(cipher)
    if type(value) is not int:
        raise ValueError("value must be an integer")
    try:
        resolve_projection_method(projection_id)
    except ValueError:
        raise ValueError("unsupported projection") from None
    snapshot = gazetteer_snapshot(projection_id) if projection_id in SNAP_PROJECTION_GAZETTEERS else None
    address = _project_endpoint(canonical, value, projection_id, snapshot)
    if snapshot is not None:
        try:
            digest = hashlib.sha256(SNAP_PROJECTION_GAZETTEERS[projection_id].read_bytes()).hexdigest()
            if digest != snapshot[0].sha256:
                raise ValueError
        except (OSError, ValueError):
            raise ValueError("gazetteer content drift during projection") from None
    return address


def _project_endpoint(canonical, value, projection_id, snapshot=None, places_by_id=None):
    point = project_value(canonical, value, projection_id)
    if snapshot is not None:
        try:
            metadata = point.metadata or {}
            base = metadata["base_coordinate"]
            snap = metadata["snapped_place"]
            raw = Coordinate(base["latitude"], base["longitude"])
            if base["projection_method"] != "webmercator_hash_v1":
                raise ValueError
            raw_point = project_value(canonical, value, "webmercator_hash_v1")
            if raw != Coordinate(raw_point.latitude, raw_point.longitude):
                raise ValueError
            by_id = places_by_id or {p.place_id: p for p in snapshot[1]}
            place = by_id[snap["id"]]
            selected = Coordinate(point.latitude, point.longitude)
            if selected != Coordinate(round(place.latitude, 6), round(place.longitude, 6)):
                raise ValueError
            identity = PlaceIdentity(place.place_id, place.name, place.country, selected, snapshot[0])
            return Endpoint(canonical, value, projection_id, "webmercator_hash_v1", raw,
                            selected, place=identity)
        except (KeyError, TypeError, StopIteration, ValueError):
            raise ValueError("invalid or missing raw/snap address metadata") from None
    return Endpoint(canonical, value, projection_id, projection_id,
                    Coordinate(point.latitude, point.longitude))


def validate_endpoint(address: Endpoint) -> None:
    if not isinstance(address, Endpoint):
        raise ValueError("endpoint required")
    expected = endpoint(address.cipher, address.value, address.projection_id)
    if (address.cipher != expected.cipher or address.raw != expected.raw
            or address.snapped != expected.snapped or address.place != expected.place
            or address.raw_projection_id != expected.raw_projection_id
            or type(address.coordinate_precision) is not int or address.coordinate_precision != 6):
        raise ValueError("endpoint geometry or instrument identity mismatch")
    if address.phrase is None:
        if address.input_origin != "numeric-address":
            raise ValueError("endpoint input provenance mismatch")
    else:
        phrase = address.phrase
        if (type(phrase) is not PhraseReference or address.input_origin != "stored-phrase"
                or not isinstance(phrase.text, str) or not phrase.text.strip()
                or not isinstance(phrase.normalized_text, str) or not phrase.normalized_text.strip()):
            raise ValueError("invalid endpoint phrase provenance")
        try:
            if not isinstance(phrase.source_id, str) or str(UUID(phrase.source_id)) != phrase.source_id:
                raise ValueError
        except (ValueError, AttributeError):
            raise ValueError("opaque phrase source identity required") from None
        if phrase.source_record_id is not None and (not isinstance(phrase.source_record_id, str)
                or not re.fullmatch(r"[A-Za-z0-9_.:-]{1,128}", phrase.source_record_id)):
            raise ValueError("invalid public phrase record identity")


@dataclass(frozen=True)
class MeasurementRecipe:
    measurement_id: str = "spherical_haversine_miles_v1"
    version: int = 1
    earth_radius_km: float = 6371.0088
    km_per_mile: float = 1.609344
    coordinate_precision: int = COORDINATE_PRECISION
    rounding: str = "floor(distance_miles + 0.5)"
    geometry: str = "shortest spherical surface distance"


RECIPE = MeasurementRecipe()


@dataclass(frozen=True)
class Measurement:
    basis: str
    left: Coordinate
    right: Coordinate
    kilometres: float
    miles: float
    target: int
    recipe: MeasurementRecipe = RECIPE


def distance_value(miles: float) -> int:
    if type(miles) not in (int, float) or not math.isfinite(miles) or miles < 0:
        raise ValueError("distance must be finite and nonnegative")
    # Algebraic floor(miles + 0.5), without addition rounding nextafter(0.5,0)
    # up to 1.0. No presentation rounding, tolerance, or bankers' rounding.
    whole = math.floor(miles)
    return whole + int(miles - whole >= 0.5)


def measure_coordinates(left: Coordinate, right: Coordinate, basis: str = "raw-to-raw") -> Measurement:
    if basis not in ("raw-to-raw", "town-to-town", "left-raw-to-town", "right-raw-to-town"):
        raise ValueError("unsupported measurement basis")
    if not isinstance(left, Coordinate) or not isinstance(right, Coordinate):
        raise ValueError("coordinates required")
    Coordinate(left.latitude, left.longitude)
    Coordinate(right.latitude, right.longitude)
    lat_a, lat_b = math.radians(left.latitude), math.radians(right.latitude)
    dlat = math.radians(right.latitude - left.latitude)
    dlon = math.radians(right.longitude - left.longitude)
    h = math.sin(dlat / 2) ** 2 + math.cos(lat_a) * math.cos(lat_b) * math.sin(dlon / 2) ** 2
    h = min(1.0, max(0.0, h))
    km = RECIPE.earth_radius_km * 2 * math.atan2(math.sqrt(h), math.sqrt(1 - h))
    miles = km / RECIPE.km_per_mile
    return Measurement(basis, left, right, km, miles, distance_value(miles))


@dataclass(frozen=True)
class DistanceReading:
    left: Endpoint
    right: Endpoint
    primary: Measurement
    arithmetic_difference: int
    town_comparison: Measurement | None = None
    left_displacement: Measurement | None = None
    right_displacement: Measurement | None = None
    engine_version: str = ENGINE_VERSION


def measure_relation(left: Endpoint, right: Endpoint) -> DistanceReading:
    validate_endpoint(left)
    validate_endpoint(right)
    if (left.cipher, left.projection_id) != (right.cipher, right.projection_id):
        raise ValueError("endpoints must share cipher and projection")
    town = left_displacement = right_displacement = None
    if left.snapped is not None and right.snapped is not None:
        town = measure_coordinates(left.snapped, right.snapped, "town-to-town")
        left_displacement = measure_coordinates(left.raw, left.snapped, "left-raw-to-town")
        right_displacement = measure_coordinates(right.raw, right.snapped, "right-raw-to-town")
    return DistanceReading(left, right, measure_coordinates(left.raw, right.raw),
                           abs(left.value - right.value), town, left_displacement, right_displacement)


@dataclass(frozen=True)
class Chamber:
    cipher: str
    projection_id: str
    place: PlaceIdentity
    members: tuple[Endpoint, ...]
    chamber_id: str
    domain_min: int = 1
    domain_max: int = 2000
    enumerated_count: int = 2000
    engine_version: str = ENGINE_VERSION


# Geometry only. No source identity, phrase or occupancy enters this cache.
_DOMAIN_CACHE: dict[tuple, dict[str, tuple[Endpoint, ...]]] = {}


def chamber(cipher: str, projection_id: str, place_id: str) -> Chamber:
    canonical = canonical_cipher(cipher)
    snapshot = gazetteer_snapshot(projection_id)
    by_id = {p.place_id: p for p in snapshot[1]}
    if not isinstance(place_id, str) or place_id not in by_id:
        raise ValueError("unknown place identity")
    key = (canonical, projection_id, snapshot[0].name, snapshot[0].sha256, 1, 2000)
    if key not in _DOMAIN_CACHE:
        grouped = {}
        for value in range(1, 2001):
            address = _project_endpoint(canonical, value, projection_id, snapshot, by_id)
            grouped.setdefault(address.place.place_id, []).append(address)
        if gazetteer_snapshot(projection_id)[0] != snapshot[0]:
            raise ValueError("gazetteer changed during enumeration")
        # Publish only complete enumerations; a failed projection never poisons cache.
        _DOMAIN_CACHE[key] = {pid: tuple(members) for pid, members in grouped.items()}
    place = by_id[place_id]
    identity = PlaceIdentity(place_id, place.name, place.country,
                             Coordinate(round(place.latitude,6), round(place.longitude,6)), snapshot[0])
    chamber_id = hashlib.sha256(json.dumps((*key, place_id), ensure_ascii=False,
                                           separators=(",", ":")).encode("utf-8")).hexdigest()
    return Chamber(canonical, projection_id, identity, _DOMAIN_CACHE[key].get(place_id, ()), chamber_id)


def chamber_pair(geometry: Chamber, left_value: int, right_value: int) -> DistanceReading:
    expected = chamber(geometry.cipher, geometry.projection_id, geometry.place.place_id)
    if expected != geometry:
        raise ValueError("chamber geometry or instrument identity mismatch")
    by_value = {p.value: p for p in geometry.members}
    if type(left_value) is not int or type(right_value) is not int or left_value not in by_value or right_value not in by_value:
        raise ValueError("selected pair must belong to chamber")
    return measure_relation(by_value[left_value], by_value[right_value])
