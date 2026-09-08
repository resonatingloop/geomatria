"""Thin adapter over the public glossololary database contract."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from geogematria.models import CipherRecord, CipherValue, PhraseRecord

DEFAULT_GLOSSOLOLARY_ROOT = Path.home() / ".projects" / "glossololary"
DEFAULT_DB_PATH = DEFAULT_GLOSSOLOLARY_ROOT / "glossololary.db"
DEFAULT_SRC_PATH = DEFAULT_GLOSSOLOLARY_ROOT / "src"


class GlossololaryAdapter:
    """Read phrase/cipher/value records through ``GlossololaryDB`` public methods."""

    def __init__(self, db_path: Path, src_path: Path | None = None, db: Any | None = None):
        self.db_path = db_path
        self.src_path = src_path
        self._db = db
        self._normalize_text = None
        self._resolve_cipher = None
        self._get_active_ciphers = None
        self._load_glossololary()

    def _load_glossololary(self) -> None:
        if self.src_path is not None and self.src_path.exists():
            src_text = str(self.src_path)
            if src_text not in sys.path:
                sys.path.insert(0, src_text)

        try:
            from glossololary.ciphers import (  # type: ignore[import-not-found]
                get_active_ciphers,
                normalize_text,
                resolve_cipher,
            )
            from glossololary.db import GlossololaryDB  # type: ignore[import-not-found]
        except Exception as exc:
            if self._db is None:
                raise RuntimeError(
                    "glossololary source is required for the adapter contract"
                ) from exc
            return

        self._normalize_text = normalize_text
        self._resolve_cipher = resolve_cipher
        self._get_active_ciphers = get_active_ciphers
        if self._db is None:
            self._db = GlossololaryDB(path=self.db_path, read_only=True)

    @property
    def db(self):
        if self._db is None:
            raise RuntimeError("GlossololaryDB is not configured")
        return self._db

    def normalize_text(self, text: str) -> str:
        if self._normalize_text is not None:
            return self._normalize_text(text)
        return " ".join(text.lower().split())

    def resolve_cipher(self, cipher: str) -> str:
        if self._resolve_cipher is None:
            raise RuntimeError("resolve_cipher is required by the glossololary contract")
        return self._resolve_cipher(cipher)

    def list_ciphers(self) -> list[CipherRecord]:
        if self._get_active_ciphers is None:
            rows = self.db.all_entries()
            seen = sorted({row["cipher"] for row in rows})
            return [CipherRecord(cipher=cipher) for cipher in seen]
        return [
            CipherRecord(
                cipher=cipher.name,
                has_digits=cipher.char_value("0") is not None,
            )
            for cipher in self._get_active_ciphers()
        ]

    def get_phrase(self, text: str) -> PhraseRecord:
        rows = self.db.find_by_text(text)
        if not rows:
            return PhraseRecord(text=text, normalized_text=self.normalize_text(text))
        row = rows[0]
        return PhraseRecord(text=row["text"], normalized_text=row["normalized_text"])

    def get_value(self, text: str, cipher: str) -> CipherValue:
        cipher = self.resolve_cipher(cipher)
        rows = self.db.find_by_text(text)
        for row in rows:
            if row["cipher"] == cipher:
                return self._row_to_cipher_value(row)
        raise LookupError(f"no stored value for {text!r} in {cipher}")

    def get_cluster(self, cipher: str, value: int) -> list[PhraseRecord]:
        cipher = self.resolve_cipher(cipher)
        rows = self.db.find_by_value(cipher, value)
        return [
            PhraseRecord(text=row["text"], normalized_text=row["normalized_text"])
            for row in sorted(rows, key=lambda row: row["normalized_text"])
        ]

    def get_path(self, text: str) -> list[CipherValue]:
        rows = self.db.find_by_text(text)
        values = [self._row_to_cipher_value(row) for row in rows]
        order = {cipher.cipher: index for index, cipher in enumerate(self.list_ciphers())}
        return sorted(values, key=lambda value: order.get(value.cipher, 999))

    def iter_clusters(self, cipher: str) -> list[tuple[int, list[PhraseRecord]]]:
        cipher = self.resolve_cipher(cipher)
        rows = [row for row in self.db.all_entries() if row["cipher"] == cipher]
        clusters: dict[int, list[PhraseRecord]] = {}
        for row in rows:
            clusters.setdefault(row["value"], []).append(
                PhraseRecord(text=row["text"], normalized_text=row["normalized_text"])
            )
        return [
            (value, sorted(phrases, key=lambda phrase: phrase.normalized_text))
            for value, phrases in sorted(clusters.items(), key=lambda item: item[0])
        ]

    def domain_phrase_index(self, cipher: str) -> dict[int, list[PhraseRecord]]:
        return dict(self.iter_clusters(cipher))

    @staticmethod
    def _row_to_cipher_value(row: dict) -> CipherValue:
        return CipherValue(
            text=row["text"],
            normalized_text=row["normalized_text"],
            cipher=row["cipher"],
            value=row["value"],
        )
