import unittest

try:
    from fastapi.testclient import TestClient
except Exception:  # pragma: no cover - dependency absence is reported by test skip
    TestClient = None

from backend.app import app, get_live_source
from geogematria.models import PhraseRecord


class FakeSource:
    def iter_clusters(self, cipher):
        assert cipher == "AQ"
        return [(111, [PhraseRecord(text="atlas", normalized_text="atlas")])]


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
        entry = response.json()[0]
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

    def test_live_cliquemap_endpoint_rejects_unsupported_projection(self):
        response = self.client.get(
            "/api/layers/cliquemap?cipher=aq&projection_method=nearest_10000_towns_hash_v1"
        )

        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
