import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

try:
    from fastapi.testclient import TestClient
except Exception:  # pragma: no cover - dependency absence is reported by test skip
    TestClient = None

import backend.app as backend_app
from backend.app import app, get_live_source
from geogematria.models import PhraseRecord


class FakeSource:
    def iter_clusters(self, cipher):
        assert cipher in {
            "AQ",
            "Synx",
            "Ordinal",
            "QWER",
            "nQWER",
            "Reduced",
            "Standard",
            "Satanic",
        }
        values = {
            "AQ": 111,
            "Synx": 126,
            "Ordinal": 222,
            "QWER": 333,
            "nQWER": 444,
            "Reduced": 55,
            "Standard": 900,
            "Satanic": 61,
        }
        phrases = {
            "AQ": "atlas",
            "Synx": "synx atlas",
            "Ordinal": "ordinal atlas",
            "QWER": "qwer atlas",
            "nQWER": "nqwer atlas",
            "Reduced": "reduced atlas",
            "Standard": "standard atlas",
            "Satanic": "satanic atlas",
        }
        value = values[cipher]
        phrase = phrases[cipher]
        return [(value, [PhraseRecord(text=phrase, normalized_text=phrase)])]


@unittest.skipIf(TestClient is None, "FastAPI test dependencies are not installed")
class BackendTests(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides[get_live_source] = lambda: FakeSource()
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_live_manifest(self):
        response = self.client.get("/api/live-manifest")

        self.assertEqual(response.status_code, 200)
        entries = response.json()
        self.assertEqual([entry["cipher"] for entry in entries], ["AQ", "Synx", "Ordinal", "QWER", "nQWER", "Reduced", "Standard", "Satanic"])
        entry = entries[0]
        self.assertEqual(entry["source"], "live")
        self.assertEqual(entry["mode"], "cliquemap")
        self.assertEqual(entry["cipher"], "AQ")
        self.assertEqual(entry["projection_method"], "value_hash_v1")

    def test_live_cliquemap_endpoint(self):
        response = self.client.get(
            "/api/layers/cliquemap?cipher=aq&projection_method=value_hash_v1"
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["type"], "FeatureCollection")
        self.assertEqual(data["metadata"]["source"], "live")
        self.assertEqual(data["features"][0]["properties"]["phrases"], ["atlas"])

    def test_live_cliquemap_endpoint_supports_ordinal(self):
        response = self.client.get(
            "/api/layers/cliquemap?cipher=ordinal&projection_method=value_hash_v1"
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["metadata"]["cipher"], "Ordinal")
        self.assertEqual(
            data["features"][0]["properties"]["phrases"],
            ["ordinal atlas"],
        )

    def test_live_cliquemap_endpoint_supports_synx(self):
        response = self.client.get(
            "/api/layers/cliquemap?cipher=synx&projection_method=value_hash_v1"
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["metadata"]["cipher"], "Synx")
        self.assertEqual(
            data["features"][0]["properties"]["phrases"],
            ["synx atlas"],
        )

    def test_live_cliquemap_endpoint_supports_qwer(self):
        response = self.client.get(
            "/api/layers/cliquemap?cipher=qwer&projection_method=value_hash_v1"
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["metadata"]["cipher"], "QWER")
        self.assertEqual(
            data["features"][0]["properties"]["phrases"],
            ["qwer atlas"],
        )

    def test_live_cliquemap_endpoint_supports_nqwer(self):
        response = self.client.get(
            "/api/layers/cliquemap?cipher=nqwer&projection_method=value_hash_v1"
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["metadata"]["cipher"], "nQWER")
        self.assertEqual(
            data["features"][0]["properties"]["phrases"],
            ["nqwer atlas"],
        )

    def test_live_cliquemap_endpoint_supports_reduced(self):
        response = self.client.get(
            "/api/layers/cliquemap?cipher=reduced&projection_method=value_hash_v1"
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["metadata"]["cipher"], "Reduced")
        self.assertEqual(
            data["features"][0]["properties"]["phrases"],
            ["reduced atlas"],
        )

    def test_live_cliquemap_endpoint_supports_standard(self):
        response = self.client.get(
            "/api/layers/cliquemap?cipher=standard&projection_method=value_hash_v1"
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["metadata"]["cipher"], "Standard")
        self.assertEqual(
            data["features"][0]["properties"]["phrases"],
            ["standard atlas"],
        )

    def test_live_cliquemap_endpoint_supports_satanic(self):
        response = self.client.get(
            "/api/layers/cliquemap?cipher=satanic&projection_method=value_hash_v1"
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["metadata"]["cipher"], "Satanic")
        self.assertEqual(
            data["features"][0]["properties"]["phrases"],
            ["satanic atlas"],
        )

    def test_live_cliquemap_endpoint_rejects_unsupported_projection(self):
        response = self.client.get(
            "/api/layers/cliquemap?cipher=aq&projection_method=nearest_10000_towns_hash_v1"
        )

        self.assertEqual(response.status_code, 404)

    def test_live_cliquemap_endpoint_rejects_unsupported_cipher(self):
        response = self.client.get(
            "/api/layers/cliquemap?cipher=bogus&projection_method=value_hash_v1"
        )

        self.assertEqual(response.status_code, 404)

    def test_live_manifest_reports_missing_db_as_unavailable(self):
        app.dependency_overrides.clear()
        with TemporaryDirectory() as tmpdir:
            missing_db_path = Path(tmpdir) / "missing.db"
            with patch.dict(
                "os.environ",
                {"GEOGEMATRIA_GLOSSOLOLARY_DB": str(missing_db_path)},
            ):
                client = TestClient(app)
                response = client.get("/api/live-manifest")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"], "live source unavailable")

    def test_live_cliquemap_endpoint_reports_missing_db_as_unavailable(self):
        app.dependency_overrides.clear()
        with TemporaryDirectory() as tmpdir:
            missing_db_path = Path(tmpdir) / "missing.db"
            with patch.dict(
                "os.environ",
                {"GEOGEMATRIA_GLOSSOLOLARY_DB": str(missing_db_path)},
            ):
                client = TestClient(app)
                response = client.get(
                    "/api/layers/cliquemap?cipher=aq&projection_method=value_hash_v1"
                )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"], "live source unavailable")

    def test_live_manifest_reports_adapter_construction_failure_as_unavailable(self):
        class BrokenAdapter:
            def __init__(self, db_path):
                raise RuntimeError("glossololary is not importable")

        app.dependency_overrides.clear()
        with TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "glossololary.db"
            db_path.touch()
            with patch.dict("os.environ", {"GEOGEMATRIA_GLOSSOLOLARY_DB": str(db_path)}):
                with patch.object(backend_app, "GlossololaryLiveAdapter", BrokenAdapter):
                    client = TestClient(app)
                    response = client.get("/api/live-manifest")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"], "live source unavailable")

    def test_live_cliquemap_endpoint_reports_adapter_construction_failure_as_unavailable(self):
        class BrokenAdapter:
            def __init__(self, db_path):
                raise RuntimeError("glossololary is not importable")

        app.dependency_overrides.clear()
        with TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "glossololary.db"
            db_path.touch()
            with patch.dict("os.environ", {"GEOGEMATRIA_GLOSSOLOLARY_DB": str(db_path)}):
                with patch.object(backend_app, "GlossololaryLiveAdapter", BrokenAdapter):
                    client = TestClient(app)
                    response = client.get(
                        "/api/layers/cliquemap?cipher=aq&projection_method=value_hash_v1"
                    )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"], "live source unavailable")


if __name__ == "__main__":
    unittest.main()
