import sqlite3
import tempfile
import unittest
from pathlib import Path

from geogematria.adapter import DEFAULT_SRC_PATH, GlossololaryAdapter
from geogematria.live_adapter import GlossololaryLiveAdapter


def make_db(path):
    conn = sqlite3.connect(path)
    conn.execute(
        """
        CREATE TABLE entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            normalized_text TEXT NOT NULL,
            cipher TEXT NOT NULL,
            value INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(normalized_text, cipher)
        )
        """
    )
    rows = [
        ("reverse oracle", "reverse oracle", "AQ", 177),
        ("reverse oracle", "reverse oracle", "Synx", 511),
        ("other oracle", "other oracle", "AQ", 177),
        ("lonely phrase", "lonely phrase", "AQ", 50),
    ]
    conn.executemany(
        "INSERT INTO entries (text, normalized_text, cipher, value) VALUES (?, ?, ?, ?)",
        rows,
    )
    conn.commit()
    conn.close()


class AdapterTests(unittest.TestCase):
    def test_missing_source_is_not_created_by_either_adapter(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "missing.db"
            for adapter_type in (GlossololaryAdapter, GlossololaryLiveAdapter):
                with self.subTest(adapter=adapter_type.__name__):
                    with self.assertRaises(FileNotFoundError):
                        adapter_type(db_path=db_path)
                    self.assertFalse(db_path.exists())

    def test_source_database_rejects_writes_through_adapter(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "glossololary.db"
            make_db(db_path)
            before = db_path.read_bytes()
            adapter = GlossololaryAdapter(db_path=db_path, src_path=DEFAULT_SRC_PATH)

            with self.assertRaisesRegex(sqlite3.OperationalError, "readonly"):
                adapter.db.delete_entry_by_text("reverse oracle")

            self.assertEqual(adapter.get_value("reverse oracle", "AQ").value, 177)
            self.assertEqual(db_path.read_bytes(), before)

    def test_live_adapter_reads_existing_source_without_mutating_it(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "glossololary.db"
            make_db(db_path)
            before = db_path.read_bytes()

            clusters = GlossololaryLiveAdapter(db_path=db_path).iter_clusters("aq")

            self.assertEqual([value for value, _ in clusters], [50, 177])
            self.assertEqual(
                [phrase.text for phrase in clusters[1][1]],
                ["other oracle", "reverse oracle"],
            )
            self.assertEqual(db_path.read_bytes(), before)

    def test_adapter_get_value_cluster_and_path(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "glossololary.db"
            make_db(db_path)
            adapter = GlossololaryAdapter(db_path=db_path, src_path=DEFAULT_SRC_PATH)

            value = adapter.get_value("reverse oracle", "AQ")
            cluster = adapter.get_cluster("AQ", 177)
            path = adapter.get_path("reverse oracle")
            phrase_index = adapter.domain_phrase_index("AQ")

            self.assertEqual(value.value, 177)
            self.assertEqual(
                [phrase.text for phrase in cluster],
                ["other oracle", "reverse oracle"],
            )
            self.assertEqual(
                [(stop.cipher, stop.value) for stop in path],
                [("AQ", 177), ("Synx", 511)],
            )
            self.assertEqual(sorted(phrase_index), [50, 177])
            self.assertEqual(
                [phrase.text for phrase in phrase_index[177]],
                ["other oracle", "reverse oracle"],
            )

    def test_adapter_qwerty_alias_uses_glossololary_resolution(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "glossololary.db"
            make_db(db_path)
            conn = sqlite3.connect(db_path)
            conn.execute(
                "INSERT INTO entries (text, normalized_text, cipher, value) VALUES (?, ?, ?, ?)",
                ("keys", "keys", "QWER", 77),
            )
            conn.commit()
            conn.close()

            adapter = GlossololaryAdapter(db_path=db_path, src_path=DEFAULT_SRC_PATH)

            self.assertEqual(adapter.get_value("keys", "qwerty").cipher, "QWER")


if __name__ == "__main__":
    unittest.main()
