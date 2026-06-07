import unittest

from geogematria.layers import live_cliquemap_geojson, live_manifest_entries
from geogematria.models import PhraseRecord


class FakeSource:
    def iter_clusters(self, cipher):
        assert cipher == "AQ"
        return [
            (
                100,
                [
                    PhraseRecord(text="true", normalized_text="true"),
                    PhraseRecord(text="zero", normalized_text="zero"),
                ],
            )
        ]


class LiveLayerTests(unittest.TestCase):
    def test_live_manifest_shape_matches_static_metadata_contract(self):
        entry = live_manifest_entries()[0]

        self.assertEqual(entry["source"], "live")
        self.assertEqual(entry["mode"], "cliquemap")
        self.assertEqual(entry["render_mode"], "cliquemap")
        self.assertEqual(entry["search_kind"], "phrase")
        self.assertEqual(entry["cipher"], "AQ")
        self.assertEqual(entry["transform_family"], "hash")
        self.assertEqual(entry["projection_method"], "value_hash_v1")

    def test_live_cliquemap_geojson_shape(self):
        collection = live_cliquemap_geojson(FakeSource())

        self.assertEqual(collection["type"], "FeatureCollection")
        self.assertEqual(collection["metadata"]["source"], "live")
        self.assertEqual(collection["metadata"]["mode"], "cliquemap")
        self.assertEqual(len(collection["features"]), 1)
        feature = collection["features"][0]
        self.assertEqual(feature["geometry"]["type"], "Point")
        self.assertEqual(feature["properties"]["cipher"], "AQ")
        self.assertEqual(feature["properties"]["value"], 100)
        self.assertEqual(feature["properties"]["projection_method"], "value_hash_v1")
        self.assertEqual(feature["properties"]["count"], 2)
        self.assertEqual(feature["properties"]["phrases"], ["true", "zero"])

    def test_live_cliquemap_rejects_unsupported_projection(self):
        with self.assertRaisesRegex(ValueError, "unsupported"):
            live_cliquemap_geojson(FakeSource(), projection_method="nearest_10000_towns_hash_v1")


if __name__ == "__main__":
    unittest.main()
