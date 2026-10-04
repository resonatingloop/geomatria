"""Private relation source boundary: public exact clicks, never expanded lookups."""
from __future__ import annotations

from dataclasses import dataclass, field, replace
import re
from typing import Protocol
from uuid import UUID, uuid4

from geogematria.relations import canonical_cipher, endpoint, PhraseReference, Endpoint


def portable_label(label: str) -> None:
    if (not isinstance(label, str) or not label.strip() or len(label) > 200
            or any(c in label for c in ("/", "\\", "\x00", "\n", "\r", "="))):
        raise ValueError("invalid portable source label")


def opaque_id(identifier: str) -> None:
    try:
        if not isinstance(identifier, str) or str(UUID(identifier)) != identifier:
            raise ValueError
    except (ValueError, AttributeError):
        raise ValueError("opaque UUID identity required") from None


@dataclass(frozen=True)
class SourceIdentity:
    label: str
    source_id: str = field(default_factory=lambda: str(uuid4()))
    revision_status: str = "unavailable"
    revision: str | None = None

    def __post_init__(self):
        portable_label(self.label)
        opaque_id(self.source_id)
        # No inspected public interface guarantees an exact source revision.
        if self.revision_status != "unavailable" or self.revision is not None:
            raise ValueError("source revision unavailable")


@dataclass(frozen=True)
class ClickRecord:
    text: str
    normalized_text: str
    cipher: str
    value: int
    source_record_id: str | None = None

    def __post_init__(self):
        if (not isinstance(self.text, str) or not self.text.strip()
                or not isinstance(self.normalized_text, str) or not self.normalized_text.strip()
                or canonical_cipher(self.cipher) != self.cipher or type(self.value) is not int):
            raise ValueError("invalid direct-click record")
        try:
            self.text.encode("utf-8")
            self.normalized_text.encode("utf-8")
        except UnicodeError:
            raise ValueError("invalid UTF-8 phrase text") from None
        if self.source_record_id is not None and (not isinstance(self.source_record_id, str)
                or not re.fullmatch(r"[A-Za-z0-9_.:-]{1,128}", self.source_record_id)):
            raise ValueError("invalid public record identity")


class ExactClickSource(Protocol):
    identity: SourceIdentity

    def find_clicks(self, target: int, cipher: str, *, session_id: None,
                    exclude_text: None) -> list[dict]: ...


@dataclass(frozen=True)
class LookupResult:
    cipher: str
    value: int
    source: SourceIdentity
    records: tuple[ClickRecord, ...]
    status: str = "complete"
    scope: str = "whole-database"
    policy: str = "direct-exact-clicks-only"
    error_code: str | None = None

    @property
    def count(self) -> int:
        return len(self.records)


def lookup_exact(source: ExactClickSource, cipher: str, value: int) -> LookupResult:
    canonical = canonical_cipher(cipher)
    if type(value) is not int:
        raise ValueError("exact target must be an integer")
    identity = source.identity
    if not isinstance(identity, SourceIdentity):
        raise ValueError("source identity required")
    SourceIdentity(identity.label, identity.source_id, identity.revision_status, identity.revision)
    try:
        rows = source.find_clicks(target=value, cipher=canonical, session_id=None, exclude_text=None)
    except Exception:
        return LookupResult(canonical, value, identity, (), "error", error_code="source-unavailable")
    try:
        if type(rows) is not list or source.identity != identity:
            raise ValueError
        records = []
        for row in rows:
            if type(row) is not dict or row.get("cipher") != canonical or type(row.get("value")) is not int or row["value"] != value:
                raise ValueError
            public_id = row.get("id")
            if public_id is not None and type(public_id) not in (str, int):
                raise ValueError
            records.append(ClickRecord(row["text"], row["normalized_text"], canonical, value,
                                       str(public_id) if public_id is not None else None))
        records = tuple(sorted(records, key=record_sort_key))
    except (ValueError, KeyError, TypeError, AttributeError):
        return LookupResult(canonical, value, identity, (), "error", error_code="invalid-source-result")
    return LookupResult(canonical, value, identity, records)


class SourceUnavailable(RuntimeError):
    """Allowlisted diagnostic; never exposes a connection path or original error."""


class PublicReadOnlySource:
    """Explicit path stays private; only public find_clicks is used for excavation."""
    def __init__(self, path, identity: SourceIdentity):
        if not isinstance(identity, SourceIdentity):
            raise ValueError("source identity required")
        try:
            from glossololary.db import GlossololaryDB
            self._db = GlossololaryDB(path=path, read_only=True)
        except Exception:
            raise SourceUnavailable("source-unavailable") from None
        self._identity = identity

    @property
    def identity(self) -> SourceIdentity:
        return self._identity

    def find_clicks(self, target: int, cipher: str, *, session_id: None,
                    exclude_text: None) -> list[dict]:
        if session_id is not None or exclude_text is not None:
            raise ValueError("whole-source no-exclusion scope required")
        if type(target) is not int:
            raise ValueError("exact target must be an integer")
        canonical = canonical_cipher(cipher)
        try:
            return self._db.find_clicks(target=target, cipher=canonical,
                                       session_id=None, exclude_text=None)
        except Exception:
            raise SourceUnavailable("source-unavailable") from None

    def find_by_text(self, text: str) -> list[dict]:
        return self._db.find_by_text(text)


def stored_endpoint(source, text: str, cipher: str, projection_id: str = "value_hash_v1") -> Endpoint:
    """Select an existing public value. Never calculate or save a missing phrase."""
    canonical = canonical_cipher(cipher)
    if not isinstance(text, str) or not text.strip():
        raise ValueError("stored phrase text required")
    identity = source.identity
    if not isinstance(identity, SourceIdentity):
        raise ValueError("source identity required")
    try:
        rows = source.find_by_text(text)
    except Exception:
        raise SourceUnavailable("source-unavailable") from None
    try:
        if type(rows) is not list or source.identity != identity:
            raise ValueError
        selected = [row for row in rows if row["cipher"] == canonical]
        if not selected:
            raise LookupError("stored-value-unavailable")
        if len(selected) != 1:
            raise ValueError
        row = selected[0]
        public_id = row.get("id")
        if public_id is not None and type(public_id) not in (str, int):
            raise ValueError
        record = ClickRecord(row["text"], row["normalized_text"], canonical, row["value"],
                             str(public_id) if public_id is not None else None)
    except (ValueError, TypeError, KeyError):
        raise ValueError("invalid-source-result") from None
    reference = PhraseReference(record.text, record.normalized_text, identity.source_id, record.source_record_id)
    return replace(endpoint(canonical, record.value, projection_id), phrase=reference, input_origin="stored-phrase")


def record_sort_key(record: ClickRecord) -> tuple[str, str, str]:
    return record.normalized_text, record.text, record.source_record_id or ""
