import sqlite3
import tempfile
import unittest
from pathlib import Path

from geogematria.adapter import DEFAULT_SRC_PATH, GlossololaryAdapter
from geogematria.cli import value_domain


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
        ("alpha", "alpha", "AQ", 10),
        ("beta", "beta", "AQ", 12),
        ("gamma", "gamma", "Synx", 10),
    ]
    conn.executemany(
        "INSERT INTO entries (text, normalized_text, cipher, value) VALUES (?, ?, ?, ?)",
        rows,
    )
    conn.commit()
    conn.close()


class CliTests(unittest.TestCase):
    def test_value_domain_projects_full_range_and_overlays_phrases(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "glossololary.db"
            make_db(db_path)
            adapter = GlossololaryAdapter(db_path=db_path, src_path=DEFAULT_SRC_PATH)

            values = value_domain(
                adapter,
                "AQ",
                10,
                12,
                projection_id="value_hash_v1",
            )

            self.assertEqual([domain_value.value for domain_value in values], [10, 11, 12])
            self.assertEqual([phrase.text for phrase in values[0].phrases], ["alpha"])
            self.assertEqual(values[1].phrases, [])
            self.assertEqual([phrase.text for phrase in values[2].phrases], ["beta"])

    def test_value_domain_rejects_reversed_range(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "glossololary.db"
            make_db(db_path)
            adapter = GlossololaryAdapter(db_path=db_path, src_path=DEFAULT_SRC_PATH)

            with self.assertRaisesRegex(ValueError, "--min"):
                value_domain(adapter, "AQ", 12, 10)


if __name__ == "__main__":
    unittest.main()
