import unittest

from geogematria.layers import live_cliquemap_geojson, live_manifest_entries
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
            "AQ": 100,
            "Synx": 126,
            "Ordinal": 74,
            "QWER": 42,
            "nQWER": 35,
            "Reduced": 11,
            "Standard": 900,
            "Satanic": 61,
        }
        value = values[cipher]
        return [
            (
                value,
                [
                    PhraseRecord(text="true", normalized_text="true"),
                    PhraseRecord(text="zero", normalized_text="zero"),
                ],
            )
        ]


class LiveLayerTests(unittest.TestCase):
    def test_live_manifest_shape_matches_static_metadata_contract(self):
        entries = live_manifest_entries()
        entry = entries[0]

        self.assertEqual([entry["cipher"] for entry in entries], ["AQ", "Synx", "Ordinal", "QWER", "nQWER", "Reduced", "Standard", "Satanic"])
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

    def test_live_cliquemap_geojson_shape_for_ordinal(self):
        collection = live_cliquemap_geojson(FakeSource(), cipher="ordinal")

        self.assertEqual(collection["metadata"]["cipher"], "Ordinal")
        feature = collection["features"][0]
        self.assertEqual(feature["properties"]["cipher"], "Ordinal")
        self.assertEqual(feature["properties"]["value"], 74)
        self.assertEqual(feature["properties"]["projection_method"], "value_hash_v1")
        self.assertEqual(feature["properties"]["phrases"], ["true", "zero"])

    def test_live_cliquemap_geojson_shape_for_synx(self):
        collection = live_cliquemap_geojson(FakeSource(), cipher="synx")

        self.assertEqual(collection["metadata"]["cipher"], "Synx")
        feature = collection["features"][0]
        self.assertEqual(feature["properties"]["cipher"], "Synx")
        self.assertEqual(feature["properties"]["value"], 126)
        self.assertEqual(feature["properties"]["projection_method"], "value_hash_v1")
        self.assertEqual(feature["properties"]["phrases"], ["true", "zero"])

    def test_live_cliquemap_geojson_shape_for_qwer(self):
        collection = live_cliquemap_geojson(FakeSource(), cipher="qwer")

        self.assertEqual(collection["metadata"]["cipher"], "QWER")
        feature = collection["features"][0]
        self.assertEqual(feature["properties"]["cipher"], "QWER")
        self.assertEqual(feature["properties"]["value"], 42)
        self.assertEqual(feature["properties"]["projection_method"], "value_hash_v1")
        self.assertEqual(feature["properties"]["phrases"], ["true", "zero"])

    def test_live_cliquemap_geojson_shape_for_nqwer(self):
        collection = live_cliquemap_geojson(FakeSource(), cipher="nqwer")

        self.assertEqual(collection["metadata"]["cipher"], "nQWER")
        feature = collection["features"][0]
        self.assertEqual(feature["properties"]["cipher"], "nQWER")
        self.assertEqual(feature["properties"]["value"], 35)
        self.assertEqual(feature["properties"]["projection_method"], "value_hash_v1")
        self.assertEqual(feature["properties"]["phrases"], ["true", "zero"])

    def test_live_cliquemap_geojson_shape_for_reduced(self):
        collection = live_cliquemap_geojson(FakeSource(), cipher="reduced")

        self.assertEqual(collection["metadata"]["cipher"], "Reduced")
        feature = collection["features"][0]
        self.assertEqual(feature["properties"]["cipher"], "Reduced")
        self.assertEqual(feature["properties"]["value"], 11)
        self.assertEqual(feature["properties"]["projection_method"], "value_hash_v1")
        self.assertEqual(feature["properties"]["phrases"], ["true", "zero"])

    def test_live_cliquemap_geojson_shape_for_standard(self):
        collection = live_cliquemap_geojson(FakeSource(), cipher="standard")

        self.assertEqual(collection["metadata"]["cipher"], "Standard")
        feature = collection["features"][0]
        self.assertEqual(feature["properties"]["cipher"], "Standard")
        self.assertEqual(feature["properties"]["value"], 900)
        self.assertEqual(feature["properties"]["projection_method"], "value_hash_v1")
        self.assertEqual(feature["properties"]["phrases"], ["true", "zero"])

    def test_live_cliquemap_geojson_shape_for_satanic(self):
        collection = live_cliquemap_geojson(FakeSource(), cipher="satanic")

        self.assertEqual(collection["metadata"]["cipher"], "Satanic")
        feature = collection["features"][0]
        self.assertEqual(feature["properties"]["cipher"], "Satanic")
        self.assertEqual(feature["properties"]["value"], 61)
        self.assertEqual(feature["properties"]["projection_method"], "value_hash_v1")
        self.assertEqual(feature["properties"]["phrases"], ["true", "zero"])

    def test_live_cliquemap_rejects_unsupported_projection(self):
        with self.assertRaisesRegex(ValueError, "unsupported"):
            live_cliquemap_geojson(FakeSource(), projection_method="nearest_10000_towns_hash_v1")

    def test_live_cliquemap_rejects_unsupported_cipher(self):
        with self.assertRaisesRegex(ValueError, "unsupported"):
            live_cliquemap_geojson(FakeSource(), cipher="bogus")


if __name__ == "__main__":
    unittest.main()
