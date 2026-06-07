"""Public-interface adapter for live glossololary atlas layers."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from geogematria.adapter import DEFAULT_DB_PATH
from geogematria.models import PhraseRecord


class GlossololarySource(Protocol):
    """Small protocol used by live layer generation and backend tests."""

    def iter_clusters(self, cipher: str) -> list[tuple[int, list[PhraseRecord]]]:
        """Return phrase clusters grouped by value for a canonical cipher."""


@dataclass
class GlossololaryLiveAdapter:
    """Read live phrase/value rows through public ``GlossololaryDB`` methods."""

    db_path: Path = DEFAULT_DB_PATH

    def __post_init__(self) -> None:
        try:
            from glossololary.db import GlossololaryDB  # type: ignore[import-not-found]
        except Exception as exc:  # pragma: no cover - exercised by backend error path
            raise RuntimeError("glossololary is not importable") from exc

        self._db = GlossololaryDB(path=self.db_path)

    def iter_clusters(self, cipher: str) -> list[tuple[int, list[PhraseRecord]]]:
        rows = self._db.list_entries(cipher=cipher)
        clusters: dict[int, list[PhraseRecord]] = {}
        for row in rows:
            clusters.setdefault(row["value"], []).append(
                PhraseRecord(text=row["text"], normalized_text=row["normalized_text"])
            )

        return [
            (value, sorted(phrases, key=lambda phrase: phrase.normalized_text))
            for value, phrases in sorted(clusters.items(), key=lambda item: item[0])
        ]
