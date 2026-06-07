import unittest

from geogematria.geojson import cluster_collection, domain_collection, path_collection
from geogematria.models import (
    CipherValue,
    Cluster,
    DomainValue,
    GeoPoint,
    PhrasePath,
    PhraseRecord,
)


class GeoJsonTests(unittest.TestCase):
    def test_cluster_collection_shape(self):
        cluster = Cluster(
            cipher="AQ",
            value=100,
            point=GeoPoint(latitude=12.5, longitude=-111.25, projection_id="value_hash_v1"),
            phrases=[
                PhraseRecord(text="true", normalized_text="true"),
                PhraseRecord(text="zero", normalized_text="zero"),
            ],
        )

        collection = cluster_collection([cluster])

        self.assertEqual(collection["type"], "FeatureCollection")
        feature = collection["features"][0]
        self.assertEqual(feature["geometry"]["type"], "Point")
        self.assertEqual(feature["geometry"]["coordinates"], [-111.25, 12.5])
        self.assertEqual(feature["properties"]["cipher"], "AQ")
        self.assertEqual(feature["properties"]["value"], 100)
        self.assertEqual(feature["properties"]["projection"], "value_hash_v1")
        self.assertEqual(feature["properties"]["projection_method"], "value_hash_v1")
        self.assertEqual(feature["properties"]["count"], 2)

    def test_cluster_collection_includes_snapped_place_metadata(self):
        cluster = Cluster(
            cipher="AQ",
            value=306,
            point=GeoPoint(
                latitude=33.4484,
                longitude=-112.074,
                projection_id="nearest_32_cities_hash_v1",
                metadata={
                    "base_coordinate": {
                        "latitude": 30.1,
                        "longitude": -111.8,
                        "projection_method": "webmercator_hash_v1",
                    },
                    "snapped_place": {
                        "id": "phoenix-usa",
                        "name": "Phoenix",
                        "country": "United States",
                        "latitude": 33.4484,
                        "longitude": -112.074,
                        "distance_km": 373.2,
                    },
                },
            ),
            phrases=[PhraseRecord(text="geogematria", normalized_text="geogematria")],
        )

        feature = cluster_collection([cluster])["features"][0]

        self.assertEqual(feature["geometry"]["coordinates"], [-112.074, 33.4484])
        self.assertEqual(
            feature["properties"]["base_coordinate"],
            {
                "latitude": 30.1,
                "longitude": -111.8,
                "projection_method": "webmercator_hash_v1",
            },
        )
        self.assertEqual(feature["properties"]["snapped_place"]["id"], "phoenix-usa")
        self.assertEqual(feature["properties"]["snapped_place"]["name"], "Phoenix")
        self.assertEqual(
            feature["properties"]["projection_method"], "nearest_32_cities_hash_v1"
        )

    def test_path_collection_shape(self):
        path = PhrasePath(
            phrase=PhraseRecord(text="geogematria", normalized_text="geogematria"),
            stops=[
                CipherValue(
                    text="geogematria",
                    normalized_text="geogematria",
                    cipher="AQ",
                    value=200,
                ),
                CipherValue(
                    text="geogematria",
                    normalized_text="geogematria",
                    cipher="Synx",
                    value=619,
                ),
            ],
            points=[
                GeoPoint(latitude=1.0, longitude=2.0, projection_id="value_hash_v1"),
                GeoPoint(latitude=3.0, longitude=4.0, projection_id="value_hash_v1"),
            ],
        )

        collection = path_collection(path)

        feature = collection["features"][0]
        self.assertEqual(feature["geometry"]["type"], "LineString")
        self.assertEqual(feature["geometry"]["coordinates"], [[2.0, 1.0], [4.0, 3.0]])
        self.assertEqual(feature["properties"]["phrase"], "geogematria")
        self.assertEqual(feature["properties"]["projection"], "value_hash_v1")
        self.assertEqual(feature["properties"]["projection_method"], "value_hash_v1")
        self.assertEqual(
            feature["properties"]["stops"],
            [
                {"cipher": "AQ", "value": 200},
                {"cipher": "Synx", "value": 619},
            ],
        )

    def test_path_collection_includes_stop_snapped_place_metadata(self):
        path = PhrasePath(
            phrase=PhraseRecord(text="geogematria", normalized_text="geogematria"),
            stops=[
                CipherValue(
                    text="geogematria",
                    normalized_text="geogematria",
                    cipher="AQ",
                    value=306,
                ),
            ],
            points=[
                GeoPoint(
                    latitude=33.4484,
                    longitude=-112.074,
                    projection_id="nearest_32_cities_hash_v1",
                    metadata={
                        "base_coordinate": {
                            "latitude": 30.1,
                            "longitude": -111.8,
                            "projection_method": "webmercator_hash_v1",
                        },
                        "snapped_place": {
                            "id": "phoenix-usa",
                            "name": "Phoenix",
                            "country": "United States",
                            "latitude": 33.4484,
                            "longitude": -112.074,
                            "distance_km": 373.2,
                        },
                    },
                ),
            ],
        )

        stop = path_collection(path)["features"][0]["properties"]["stops"][0]

        self.assertEqual(stop["cipher"], "AQ")
        self.assertEqual(stop["value"], 306)
        self.assertEqual(stop["snapped_place"]["id"], "phoenix-usa")

    def test_domain_collection_includes_values_without_phrases(self):
        domain_values = [
            DomainValue(
                cipher="AQ",
                value=100,
                point=GeoPoint(latitude=1.0, longitude=2.0, projection_id="value_hash_v1"),
                phrases=[PhraseRecord(text="true", normalized_text="true")],
            ),
            DomainValue(
                cipher="AQ",
                value=101,
                point=GeoPoint(latitude=3.0, longitude=4.0, projection_id="value_hash_v1"),
                phrases=[],
            ),
        ]

        collection = domain_collection(
            domain_values,
            cipher="AQ",
            min_value=100,
            max_value=101,
        )

        self.assertEqual(collection["metadata"]["mode"], "value_domain")
        self.assertEqual(collection["metadata"]["min_value"], 100)
        self.assertEqual(collection["metadata"]["max_value"], 101)
        self.assertEqual(collection["features"][0]["properties"]["mode"], "value_domain")
        self.assertEqual(collection["features"][0]["properties"]["phrase_count"], 1)
        self.assertTrue(collection["features"][0]["properties"]["has_phrases"])
        self.assertEqual(collection["features"][1]["properties"]["phrase_count"], 0)
        self.assertFalse(collection["features"][1]["properties"]["has_phrases"])
        self.assertEqual(
            collection["metadata"]["summary"]["values_with_phrases"],
            1,
        )
        self.assertEqual(
            collection["metadata"]["summary"]["values_without_phrases"],
            1,
        )

    def test_domain_collection_summarizes_projected_locus_collisions(self):
        domain_values = [
            DomainValue(
                cipher="AQ",
                value=100,
                point=GeoPoint(latitude=1.0, longitude=2.0, projection_id="modulo_grid_v1"),
                phrases=[],
            ),
            DomainValue(
                cipher="AQ",
                value=101,
                point=GeoPoint(latitude=1.0, longitude=2.0, projection_id="modulo_grid_v1"),
                phrases=[PhraseRecord(text="one", normalized_text="one")],
            ),
            DomainValue(
                cipher="AQ",
                value=102,
                point=GeoPoint(latitude=3.0, longitude=4.0, projection_id="modulo_grid_v1"),
                phrases=[],
            ),
        ]

        summary = domain_collection(
            domain_values,
            cipher="AQ",
            min_value=100,
            max_value=102,
        )["metadata"]["summary"]

        self.assertEqual(summary["domain_value_count"], 3)
        self.assertEqual(summary["projected_locus_count"], 2)
        self.assertEqual(
            summary["top_projected_loci_by_domain_values"][0]["domain_value_count"],
            2,
        )
        self.assertEqual(
            summary["top_projected_loci_by_domain_values"][0]["values"],
            [100, 101],
        )

    def test_domain_collection_includes_snapped_metadata_and_country_summary(self):
        domain_values = [
            DomainValue(
                cipher="AQ",
                value=100,
                point=GeoPoint(
                    latitude=33.4484,
                    longitude=-112.074,
                    projection_id="nearest_32_cities_hash_v1",
                    metadata={
                        "base_coordinate": {
                            "latitude": -80.0,
                            "longitude": 20.0,
                            "projection_method": "webmercator_hash_v1",
                        },
                        "snapped_place": {
                            "id": "phoenix-usa",
                            "name": "Phoenix",
                            "country": "United States",
                            "latitude": 33.4484,
                            "longitude": -112.074,
                            "distance_km": 4000.0,
                        },
                    },
                ),
                phrases=[],
            )
        ]

        collection = domain_collection(
            domain_values,
            cipher="AQ",
            min_value=100,
            max_value=100,
        )

        feature = collection["features"][0]
        summary = collection["metadata"]["summary"]
        self.assertEqual(feature["properties"]["snapped_place"]["id"], "phoenix-usa")
        self.assertEqual(
            summary["top_countries_by_domain_values"],
            [{"country": "United States", "domain_value_count": 1}],
        )
        self.assertEqual(
            summary["top_regions_by_domain_values"],
            [{"region": "antarctic/polar", "domain_value_count": 1}],
        )


if __name__ == "__main__":
    unittest.main()
