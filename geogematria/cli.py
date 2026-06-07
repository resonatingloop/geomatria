"""Command line interface for the geogematria v0 prototype."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from geogematria.adapter import DEFAULT_DB_PATH, DEFAULT_SRC_PATH, GlossololaryAdapter
from geogematria.geojson import cluster_collection, domain_collection, path_collection
from geogematria.models import (
    CipherValue,
    Cluster,
    DomainValue,
    GeoPoint,
    LocatedPhrase,
    PhrasePath,
)
from geogematria.projection import (
    PROJECTION_ID,
    list_projection_methods,
    project_value,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="geogematria v0 prototype")
    parser.add_argument("--db", default=str(DEFAULT_DB_PATH), help="glossololary db path")
    parser.add_argument(
        "--glossololary-src",
        default=str(DEFAULT_SRC_PATH),
        help="path to glossololary src for cipher registry resolution",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    locate = subparsers.add_parser("locate", help="locate a phrase in one cipher")
    locate.add_argument("phrase")
    locate.add_argument("--cipher", required=True)
    locate.add_argument("--projection", default=PROJECTION_ID)
    locate.add_argument("--json", action="store_true")

    cluster = subparsers.add_parser("cluster", help="show a cipher-value cluster")
    cluster.add_argument("--cipher", required=True)
    cluster.add_argument("--value", required=True, type=int)
    cluster.add_argument("--projection", default=PROJECTION_ID)
    cluster.add_argument("--json", action="store_true")

    path = subparsers.add_parser("path", help="show phrase path across ciphers")
    path.add_argument("phrase")
    path.add_argument("--projection", default=PROJECTION_ID)
    path.add_argument("--json", action="store_true")

    export = subparsers.add_parser("export", help="export a cipher atlas")
    export.add_argument("--cipher", required=True)
    export.add_argument("--projection", default=PROJECTION_ID)
    export.add_argument("--format", default="geojson", choices=["geojson"])

    export_domain = subparsers.add_parser(
        "export-domain", help="export a projected integer value domain"
    )
    export_domain.add_argument("--cipher", required=True)
    export_domain.add_argument("--projection", default=PROJECTION_ID)
    export_domain.add_argument("--min", required=True, type=int, dest="min_value")
    export_domain.add_argument("--max", required=True, type=int, dest="max_value")
    export_domain.add_argument("--format", default="geojson", choices=["geojson"])

    export_path = subparsers.add_parser("export-path", help="export phrase path")
    export_path.add_argument("phrase")
    export_path.add_argument("--projection", default=PROJECTION_ID)
    export_path.add_argument("--format", default="geojson", choices=["geojson"])

    ciphers = subparsers.add_parser("ciphers", help="list stable cipher names")
    ciphers.add_argument("--json", action="store_true")

    projections = subparsers.add_parser("list-projections", help="list projection methods")
    projections.add_argument("--json", action="store_true")
    return parser


def make_adapter(args: argparse.Namespace) -> GlossololaryAdapter:
    src_path = Path(args.glossololary_src) if args.glossololary_src else None
    return GlossololaryAdapter(db_path=Path(args.db), src_path=src_path)


def locate(
    adapter: GlossololaryAdapter,
    phrase: str,
    cipher: str,
    projection_id: str = PROJECTION_ID,
) -> LocatedPhrase:
    value = adapter.get_value(phrase, cipher)
    point = project_value(value.cipher, value.value, projection_id=projection_id)
    colocated = adapter.get_cluster(value.cipher, value.value)
    return LocatedPhrase(
        phrase=adapter.get_phrase(phrase),
        cipher_value=value,
        point=point,
        colocated=colocated,
    )


def cluster(
    adapter: GlossololaryAdapter,
    cipher: str,
    value: int,
    projection_id: str = PROJECTION_ID,
) -> Cluster:
    cipher = adapter.resolve_cipher(cipher)
    return Cluster(
        cipher=cipher,
        value=value,
        point=project_value(cipher, value, projection_id=projection_id),
        phrases=adapter.get_cluster(cipher, value),
    )


def phrase_path(
    adapter: GlossololaryAdapter,
    phrase: str,
    projection_id: str = PROJECTION_ID,
) -> PhrasePath:
    stops = adapter.get_path(phrase)
    if not stops:
        raise LookupError(f"no stored values for {phrase!r}")
    return PhrasePath(
        phrase=adapter.get_phrase(phrase),
        stops=stops,
        points=[
            project_value(stop.cipher, stop.value, projection_id=projection_id)
            for stop in stops
        ],
    )


def atlas(
    adapter: GlossololaryAdapter,
    cipher: str,
    projection_id: str = PROJECTION_ID,
) -> list[Cluster]:
    cipher = adapter.resolve_cipher(cipher)
    return [
        Cluster(
            cipher=cipher,
            value=value,
            point=project_value(cipher, value, projection_id=projection_id),
            phrases=phrases,
        )
        for value, phrases in adapter.iter_clusters(cipher)
    ]


def value_domain(
    adapter: GlossololaryAdapter,
    cipher: str,
    min_value: int,
    max_value: int,
    projection_id: str = PROJECTION_ID,
) -> list[DomainValue]:
    if min_value > max_value:
        raise ValueError("--min must be less than or equal to --max")
    cipher = adapter.resolve_cipher(cipher)
    phrase_index = adapter.domain_phrase_index(cipher)
    return [
        DomainValue(
            cipher=cipher,
            value=value,
            point=project_value(cipher, value, projection_id=projection_id),
            phrases=phrase_index.get(value, []),
        )
        for value in range(min_value, max_value + 1)
    ]


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    adapter = make_adapter(args)

    try:
        if args.command == "locate":
            result = locate(adapter, args.phrase, args.cipher, args.projection)
            output = _located_json(result) if args.json else _format_located(result)
        elif args.command == "cluster":
            result = cluster(adapter, args.cipher, args.value, args.projection)
            output = _cluster_json(result) if args.json else _format_cluster(result)
        elif args.command == "path":
            result = phrase_path(adapter, args.phrase, args.projection)
            output = _path_json(result) if args.json else _format_path(result)
        elif args.command == "export":
            output = cluster_collection(atlas(adapter, args.cipher, args.projection))
        elif args.command == "export-domain":
            output = domain_collection(
                value_domain(
                    adapter,
                    args.cipher,
                    args.min_value,
                    args.max_value,
                    args.projection,
                ),
                cipher=adapter.resolve_cipher(args.cipher),
                min_value=args.min_value,
                max_value=args.max_value,
            )
        elif args.command == "export-path":
            output = path_collection(phrase_path(adapter, args.phrase, args.projection))
        elif args.command == "ciphers":
            ciphers = adapter.list_ciphers()
            output = (
                [{"cipher": c.cipher, "has_digits": c.has_digits} for c in ciphers]
                if args.json
                else "\n".join(c.cipher for c in ciphers)
            )
        elif args.command == "list-projections":
            methods = list_projection_methods()
            output = (
                [
                    {
                        "projection_method": method.projection_id,
                        "label": method.label,
                        "description": method.description,
                        "experimental": method.experimental,
                    }
                    for method in methods
                ]
                if args.json
                else "\n".join(method.projection_id for method in methods)
            )
        else:
            parser.error(f"unknown command: {args.command}")
    except (LookupError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if isinstance(output, str):
        print(output)
    else:
        print(json.dumps(output, indent=2, sort_keys=True))
    return 0


def _located_json(result: LocatedPhrase) -> dict[str, Any]:
    output = {
        "phrase": result.phrase.text,
        "canonical": result.phrase.normalized_text,
        "cipher": result.cipher_value.cipher,
        "value": result.cipher_value.value,
        "projection": result.point.projection_id,
        "projection_method": result.point.projection_id,
        "latitude": result.point.latitude,
        "longitude": result.point.longitude,
        "colocated": [phrase.text for phrase in result.colocated],
    }
    output.update(result.point.metadata or {})
    return output


def _cluster_json(result: Cluster) -> dict[str, Any]:
    output = {
        "cipher": result.cipher,
        "value": result.value,
        "projection": result.point.projection_id,
        "projection_method": result.point.projection_id,
        "latitude": result.point.latitude,
        "longitude": result.point.longitude,
        "entries": [phrase.text for phrase in result.phrases],
    }
    output.update(result.point.metadata or {})
    return output


def _path_json(result: PhrasePath) -> dict[str, Any]:
    return {
        "phrase": result.phrase.text,
        "canonical": result.phrase.normalized_text,
        "projection": result.points[0].projection_id if result.points else PROJECTION_ID,
        "projection_method": result.points[0].projection_id if result.points else PROJECTION_ID,
        "stops": [
            _path_stop_json(stop, point)
            for stop, point in zip(result.stops, result.points)
        ],
    }


def _path_stop_json(stop: CipherValue, point: GeoPoint) -> dict[str, Any]:
    output = {
        "cipher": stop.cipher,
        "value": stop.value,
        "latitude": point.latitude,
        "longitude": point.longitude,
    }
    output.update(point.metadata or {})
    return output


def _format_located(result: LocatedPhrase) -> str:
    lines = [
        f"phrase: {result.phrase.text}",
        f"canonical: {result.phrase.normalized_text}",
        f"cipher: {result.cipher_value.cipher}",
        f"value: {result.cipher_value.value}",
        f"projection method: {result.point.projection_id}",
        f"latitude: {result.point.latitude}",
        f"longitude: {result.point.longitude}",
        "co-located entries:",
    ]
    lines.extend(f"  {phrase.text}" for phrase in result.colocated)
    return "\n".join(lines)


def _format_cluster(result: Cluster) -> str:
    lines = [
        f"cipher: {result.cipher}",
        f"value: {result.value}",
        f"projection method: {result.point.projection_id}",
        f"latitude: {result.point.latitude}",
        f"longitude: {result.point.longitude}",
        "entries:",
    ]
    lines.extend(f"  {phrase.text}" for phrase in result.phrases)
    return "\n".join(lines)


def _format_path(result: PhrasePath) -> str:
    lines = [
        f"phrase: {result.phrase.text}",
        f"canonical: {result.phrase.normalized_text}",
        "",
        "stops:",
    ]
    for stop, point in zip(result.stops, result.points):
        lines.extend(
            [
                f"  {stop.cipher}:",
                f"    value: {stop.value}",
                f"    latitude: {point.latitude}",
                f"    longitude: {point.longitude}",
            ]
        )
    return "\n".join(lines)


if __name__ == "__main__":
    raise SystemExit(main())
