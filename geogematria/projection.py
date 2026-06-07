"""Deterministic cipher-value geographic projection."""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import math
from pathlib import Path
from functools import lru_cache

from geogematria.models import GeoPoint

PROJECTION_ID = "value_hash_v1"
WEBMERCATOR_MAX_LATITUDE = 85.051129
DATA_DIR = Path(__file__).with_name("data")
CITIES32_GAZETTEER_PATH = DATA_DIR / "cities32.json"
TOWNS1000_GAZETTEER_PATH = DATA_DIR / "towns1000.geonames.json"
TOWNS10000_GAZETTEER_PATH = DATA_DIR / "towns10000.geonames.json"
TOWNS50000_GAZETTEER_PATH = DATA_DIR / "towns50000.geonames.json"
EARTH_RADIUS_KM = 6371.0088
SNAP_PROJECTION_GAZETTEERS = {
    "nearest_32_cities_hash_v1": CITIES32_GAZETTEER_PATH,
    "nearest_1000_towns_hash_v1": TOWNS1000_GAZETTEER_PATH,
    "nearest_10000_towns_hash_v1": TOWNS10000_GAZETTEER_PATH,
    "nearest_50000_towns_hash_v1": TOWNS50000_GAZETTEER_PATH,
}


@dataclass(frozen=True)
class ProjectionMethod:
    projection_id: str
    label: str
    description: str
    experimental: bool = False


PROJECTION_METHODS = [
    ProjectionMethod(
        PROJECTION_ID,
        "value hash v1",
        "Full-range deterministic hash projection for cipher/value cliques.",
    ),
    ProjectionMethod(
        "webmercator_hash_v1",
        "web mercator hash v1",
        "Deterministic hash projection constrained to Web Mercator latitude bounds.",
    ),
    ProjectionMethod(
        "modulo_grid_v1",
        "coarse grid v1 (experimental)",
        "Whole-degree coarse grid projection; distinct cipher values can collide visually at the same projected locus.",
        experimental=True,
    ),
    ProjectionMethod(
        "nearest_32_cities_hash_v1",
        "nearest 32 cities hash v1 (experimental)",
        "Static offline snap from webmercator_hash_v1 to the nearest city in the committed 32-city gazetteer; many cliques may share the same place locus.",
        experimental=True,
    ),
    ProjectionMethod(
        "nearest_1000_towns_hash_v1",
        "nearest 1000 towns hash v1 (experimental)",
        "Static offline snap from webmercator_hash_v1 to the nearest town/city in the committed 1000-place GeoNames snapshot; many cliques may share the same place locus.",
        experimental=True,
    ),
    ProjectionMethod(
        "nearest_10000_towns_hash_v1",
        "nearest 10000 towns hash v1 (experimental)",
        "Static offline snap from webmercator_hash_v1 to the nearest town/city in the committed 10000-place GeoNames snapshot; many cliques may share the same place locus.",
        experimental=True,
    ),
    ProjectionMethod(
        "nearest_50000_towns_hash_v1",
        "nearest 50000 towns hash v1 (experimental)",
        "Static offline snap from webmercator_hash_v1 to the nearest town/city in the committed 50000-place GeoNames snapshot; many cliques may share the same place locus.",
        experimental=True,
    ),
]


@dataclass(frozen=True)
class GazetteerPlace:
    place_id: str
    name: str
    country: str
    latitude: float
    longitude: float


@dataclass(frozen=True)
class IndexedGazetteer:
    places: tuple[GazetteerPlace, ...]
    points: tuple[tuple[float, float, float], ...]
    tree: "KdNode | None"


@dataclass(frozen=True)
class KdNode:
    point: tuple[float, float, float]
    place_index: int
    axis: int
    left: "KdNode | None" = None
    right: "KdNode | None" = None


def _scale(raw: int, upper: int, minimum: float, maximum: float) -> float:
    ratio = raw / upper
    return minimum + ratio * (maximum - minimum)


def list_projection_methods() -> list[ProjectionMethod]:
    return PROJECTION_METHODS


def resolve_projection_method(projection_id: str) -> ProjectionMethod:
    for method in PROJECTION_METHODS:
        if method.projection_id == projection_id:
            return method
    raise ValueError(f"unknown projection_id: {projection_id}")


def project_value(
    cipher: str, value: int, projection_id: str = PROJECTION_ID
) -> GeoPoint:
    """Project a stable ``cipher:value`` pair to latitude/longitude."""
    resolve_projection_method(projection_id)

    seed = f"{cipher}:{value}".encode("utf-8")
    digest = hashlib.sha256(seed).digest()
    if projection_id == "modulo_grid_v1":
        latitude, longitude = _modulo_grid(cipher, value, digest)
        metadata = None
    elif projection_id in SNAP_PROJECTION_GAZETTEERS:
        base_latitude, base_longitude = _hash_projection(
            digest, "webmercator_hash_v1"
        )
        gazetteer_path = SNAP_PROJECTION_GAZETTEERS[projection_id]
        place, distance_km = nearest_place_for_coordinate(
            base_latitude,
            base_longitude,
            gazetteer=load_indexed_gazetteer(gazetteer_path),
        )
        latitude, longitude = place.latitude, place.longitude
        metadata = {
            "base_coordinate": {
                "latitude": round(base_latitude, 6),
                "longitude": round(base_longitude, 6),
                "projection_method": "webmercator_hash_v1",
            },
            "snapped_place": {
                "id": place.place_id,
                "name": place.name,
                "country": place.country,
                "latitude": place.latitude,
                "longitude": place.longitude,
                "distance_km": round(distance_km, 3),
                "gazetteer": gazetteer_path.name,
            },
        }
    else:
        latitude, longitude = _hash_projection(digest, projection_id)
        metadata = None

    return GeoPoint(
        latitude=round(latitude, 6),
        longitude=round(longitude, 6),
        projection_id=projection_id,
        metadata=metadata,
    )


def _hash_projection(digest: bytes, projection_id: str) -> tuple[float, float]:
    lat_raw = int.from_bytes(digest[:8], "big")
    lon_raw = int.from_bytes(digest[8:16], "big")
    upper = (1 << 64) - 1
    latitude_bounds = (
        (-WEBMERCATOR_MAX_LATITUDE, WEBMERCATOR_MAX_LATITUDE)
        if projection_id == "webmercator_hash_v1"
        else (-90.0, 90.0)
    )
    latitude = _scale(lat_raw, upper, latitude_bounds[0], latitude_bounds[1])
    longitude = _scale(lon_raw, upper, -180.0, 180.0)
    return latitude, longitude


def _modulo_grid(cipher: str, value: int, digest: bytes) -> tuple[float, float]:
    cipher_offset = int.from_bytes(digest[:4], "big")
    latitude_index = (value * 17 + cipher_offset) % 171
    longitude_index = (value * 37 + (cipher_offset // 171)) % 361
    latitude = latitude_index - 85.0
    longitude = longitude_index - 180.0
    return latitude, longitude


@lru_cache(maxsize=None)
def load_gazetteer(path: Path = CITIES32_GAZETTEER_PATH) -> tuple[GazetteerPlace, ...]:
    with path.open(encoding="utf-8") as handle:
        records = json.load(handle)

    places = [
        GazetteerPlace(
            place_id=str(record["id"]),
            name=str(record["name"]),
            country=str(record["country"]),
            latitude=float(record["latitude"]),
            longitude=float(record["longitude"]),
        )
        for record in records
    ]
    if not places:
        raise ValueError(f"gazetteer is empty: {path}")
    return tuple(places)


@lru_cache(maxsize=None)
def load_indexed_gazetteer(path: Path = CITIES32_GAZETTEER_PATH) -> IndexedGazetteer:
    places = load_gazetteer(path)
    points = tuple(
        _unit_vector(place.latitude, place.longitude) for place in places
    )
    indexed_points = list(enumerate(points))
    return IndexedGazetteer(
        places=places,
        points=points,
        tree=_build_kd_tree(indexed_points),
    )


def nearest_place_for_coordinate(
    latitude: float,
    longitude: float,
    places: tuple[GazetteerPlace, ...] | list[GazetteerPlace] | None = None,
    gazetteer: IndexedGazetteer | None = None,
) -> tuple[GazetteerPlace, float]:
    if gazetteer is not None:
        target = _unit_vector(latitude, longitude)
        place_index, _ = _nearest_kd(gazetteer.tree, target)
        place = gazetteer.places[place_index]
        return (
            place,
            haversine_km(latitude, longitude, place.latitude, place.longitude),
        )

    candidates = places if places is not None else load_gazetteer()
    return min(
        (
            (place, haversine_km(latitude, longitude, place.latitude, place.longitude))
            for place in candidates
        ),
        key=lambda item: (item[1], item[0].place_id),
    )


nearest_town_for_coordinate = nearest_place_for_coordinate


def _unit_vector(latitude: float, longitude: float) -> tuple[float, float, float]:
    lat = math.radians(latitude)
    lon = math.radians(longitude)
    cos_lat = math.cos(lat)
    return (
        cos_lat * math.cos(lon),
        cos_lat * math.sin(lon),
        math.sin(lat),
    )


def _build_kd_tree(
    indexed_points: list[tuple[int, tuple[float, float, float]]],
    depth: int = 0,
) -> KdNode | None:
    if not indexed_points:
        return None

    axis = depth % 3
    indexed_points.sort(key=lambda item: (item[1][axis], item[0]))
    median = len(indexed_points) // 2
    place_index, point = indexed_points[median]
    return KdNode(
        point=point,
        place_index=place_index,
        axis=axis,
        left=_build_kd_tree(indexed_points[:median], depth + 1),
        right=_build_kd_tree(indexed_points[median + 1 :], depth + 1),
    )


def _nearest_kd(
    node: KdNode | None,
    target: tuple[float, float, float],
    best: tuple[int, float] | None = None,
) -> tuple[int, float]:
    if node is None:
        if best is None:
            raise ValueError("cannot search an empty gazetteer")
        return best

    distance = _squared_distance(target, node.point)
    if (
        best is None
        or distance < best[1]
        or (distance == best[1] and node.place_index < best[0])
    ):
        best = (node.place_index, distance)

    axis_delta = target[node.axis] - node.point[node.axis]
    near = node.left if axis_delta < 0 else node.right
    far = node.right if axis_delta < 0 else node.left
    best = _nearest_kd(near, target, best)

    if axis_delta * axis_delta <= best[1]:
        best = _nearest_kd(far, target, best)

    return best


def _squared_distance(
    first: tuple[float, float, float],
    second: tuple[float, float, float],
) -> float:
    return sum((left - right) ** 2 for left, right in zip(first, second))


def haversine_km(
    latitude_a: float,
    longitude_a: float,
    latitude_b: float,
    longitude_b: float,
) -> float:
    lat_a = math.radians(latitude_a)
    lat_b = math.radians(latitude_b)
    delta_lat = math.radians(latitude_b - latitude_a)
    delta_lon = math.radians(longitude_b - longitude_a)

    haversine = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat_a) * math.cos(lat_b) * math.sin(delta_lon / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * math.atan2(
        math.sqrt(haversine), math.sqrt(1 - haversine)
    )
