"""Shared data models for the geogematria prototype."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class GeoPoint:
    latitude: float
    longitude: float
    projection_id: str
    metadata: dict[str, Any] | None = None


@dataclass(frozen=True)
class CipherRecord:
    cipher: str
    has_digits: bool | None = None


@dataclass(frozen=True)
class PhraseRecord:
    text: str
    normalized_text: str


@dataclass(frozen=True)
class CipherValue:
    text: str
    normalized_text: str
    cipher: str
    value: int


@dataclass(frozen=True)
class LocatedPhrase:
    phrase: PhraseRecord
    cipher_value: CipherValue
    point: GeoPoint
    colocated: list[PhraseRecord]


@dataclass(frozen=True)
class Cluster:
    cipher: str
    value: int
    point: GeoPoint
    phrases: list[PhraseRecord]


@dataclass(frozen=True)
class DomainValue:
    cipher: str
    value: int
    point: GeoPoint
    phrases: list[PhraseRecord]


@dataclass(frozen=True)
class PhrasePath:
    phrase: PhraseRecord
    stops: list[CipherValue]
    points: list[GeoPoint]
