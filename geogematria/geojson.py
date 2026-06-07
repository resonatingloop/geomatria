"""GeoJSON builders for geogematria CLI exports."""

from __future__ import annotations

from typing import Any

from collections import Counter, defaultdict

from geogematria.models import CipherValue, Cluster, DomainValue, GeoPoint, PhrasePath


def cluster_feature(cluster: Cluster, phrase_limit: int | None = None) -> dict[str, Any]:
    phrases = [phrase.text for phrase in cluster.phrases]
    if phrase_limit is not None:
        phrases = phrases[:phrase_limit]
    properties = {
        "cipher": cluster.cipher,
        "value": cluster.value,
        "projection": cluster.point.projection_id,
        "projection_method": cluster.point.projection_id,
        "count": len(cluster.phrases),
        "phrases": phrases,
    }
    properties.update(cluster.point.metadata or {})
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [cluster.point.longitude, cluster.point.latitude],
        },
        "properties": properties,
    }


def cluster_collection(clusters: list[Cluster]) -> dict[str, Any]:
    return {
        "type": "FeatureCollection",
        "features": [cluster_feature(cluster) for cluster in clusters],
    }


def domain_feature(domain_value: DomainValue) -> dict[str, Any]:
    phrases = [phrase.text for phrase in domain_value.phrases]
    phrase_count = len(domain_value.phrases)
    properties = {
        "mode": "value_domain",
        "cipher": domain_value.cipher,
        "value": domain_value.value,
        "projection": domain_value.point.projection_id,
        "projection_method": domain_value.point.projection_id,
        "phrase_count": phrase_count,
        "has_phrases": phrase_count > 0,
        "phrases": phrases,
    }
    properties.update(domain_value.point.metadata or {})
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [domain_value.point.longitude, domain_value.point.latitude],
        },
        "properties": properties,
    }


def domain_collection(
    domain_values: list[DomainValue],
    *,
    cipher: str,
    min_value: int,
    max_value: int,
) -> dict[str, Any]:
    features = [domain_feature(domain_value) for domain_value in domain_values]
    projection_method = (
        domain_values[0].point.projection_id if domain_values else None
    )
    return {
        "type": "FeatureCollection",
        "metadata": {
            "mode": "value_domain",
            "cipher": cipher,
            "projection_method": projection_method,
            "min_value": min_value,
            "max_value": max_value,
            "summary": domain_summary(features),
        },
        "features": features,
    }


def domain_summary(features: list[dict[str, Any]]) -> dict[str, Any]:
    loci: dict[tuple[Any, Any, Any], list[dict[str, Any]]] = defaultdict(list)
    countries: Counter[str] = Counter()
    regions: Counter[str] = Counter()
    with_phrases = 0

    for feature in features:
        properties = feature["properties"]
        longitude, latitude = feature["geometry"]["coordinates"]
        locus_key = (
            properties.get("projection_method"),
            longitude,
            latitude,
        )
        loci[locus_key].append(feature)
        if properties.get("has_phrases"):
            with_phrases += 1
        snapped_place = properties.get("snapped_place")
        if isinstance(snapped_place, dict):
            country = snapped_place.get("country")
            if country:
                countries[str(country)] += 1
            region = _base_region(properties.get("base_coordinate"))
            if region:
                regions[region] += 1

    top_loci = sorted(
        loci.values(),
        key=lambda locus_features: (
            -len(locus_features),
            locus_features[0]["geometry"]["coordinates"][0],
            locus_features[0]["geometry"]["coordinates"][1],
        ),
    )[:20]

    summary: dict[str, Any] = {
        "domain_value_count": len(features),
        "projected_locus_count": len(loci),
        "values_with_phrases": with_phrases,
        "values_without_phrases": len(features) - with_phrases,
        "top_projected_loci_by_domain_values": [
            _domain_locus_summary(locus_features) for locus_features in top_loci
        ],
    }
    if countries:
        summary["top_countries_by_domain_values"] = [
            {"country": country, "domain_value_count": count}
            for country, count in countries.most_common(20)
        ]
    if regions:
        summary["top_regions_by_domain_values"] = [
            {"region": region, "domain_value_count": count}
            for region, count in regions.most_common(20)
        ]
    return summary


def _domain_locus_summary(features: list[dict[str, Any]]) -> dict[str, Any]:
    first = features[0]
    properties = first["properties"]
    longitude, latitude = first["geometry"]["coordinates"]
    result: dict[str, Any] = {
        "projection_method": properties.get("projection_method"),
        "longitude": longitude,
        "latitude": latitude,
        "domain_value_count": len(features),
        "values": [feature["properties"]["value"] for feature in features],
        "values_with_phrases": sum(
            1 for feature in features if feature["properties"].get("has_phrases")
        ),
    }
    snapped_place = properties.get("snapped_place")
    if isinstance(snapped_place, dict):
        result["snapped_place"] = {
            "id": snapped_place.get("id"),
            "name": snapped_place.get("name"),
            "country": snapped_place.get("country"),
        }
    return result


def _base_region(base_coordinate: Any) -> str | None:
    if not isinstance(base_coordinate, dict):
        return None
    latitude = base_coordinate.get("latitude")
    longitude = base_coordinate.get("longitude")
    if not isinstance(latitude, int | float) or not isinstance(longitude, int | float):
        return None
    if latitude <= -60:
        return "antarctic/polar"
    if latitude >= 66.5:
        return "arctic/polar"
    if latitude <= -45:
        return "southern ocean belt"
    if -180 <= longitude <= -70 and -60 <= latitude <= 60:
        return "pacific"
    if 120 <= longitude <= 180 and -60 <= latitude <= 60:
        return "pacific"
    if -70 <= longitude <= 20 and -60 <= latitude <= 65:
        return "atlantic"
    if 20 < longitude < 120 and -60 <= latitude <= 35:
        return "indian ocean / africa-eurasia band"
    return "other/lat-lon heuristic"


def path_feature(path: PhrasePath) -> dict[str, Any]:
    return {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [point.longitude, point.latitude] for point in path.points
            ],
        },
        "properties": {
            "phrase": path.phrase.text,
            "canonical": path.phrase.normalized_text,
            "projection": path.points[0].projection_id if path.points else None,
            "projection_method": path.points[0].projection_id if path.points else None,
            "stops": [
                _stop_properties(stop, point)
                for stop, point in zip(path.stops, path.points)
            ],
        },
    }


def path_collection(path: PhrasePath) -> dict[str, Any]:
    return {"type": "FeatureCollection", "features": [path_feature(path)]}


def _stop_properties(stop: CipherValue, point: GeoPoint) -> dict[str, Any]:
    properties = {"cipher": stop.cipher, "value": stop.value}
    properties.update(point.metadata or {})
    return properties
