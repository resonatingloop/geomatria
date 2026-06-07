import unittest

from geogematria.projection import (
    PROJECTION_ID,
    TOWNS10000_GAZETTEER_PATH,
    TOWNS1000_GAZETTEER_PATH,
    TOWNS50000_GAZETTEER_PATH,
    WEBMERCATOR_MAX_LATITUDE,
    GazetteerPlace,
    load_indexed_gazetteer,
    list_projection_methods,
    load_gazetteer,
    nearest_place_for_coordinate,
    project_value,
)


class ProjectionTests(unittest.TestCase):
    def test_projection_is_deterministic(self):
        first = project_value("AQ", 200)
        second = project_value("AQ", 200)

        self.assertEqual(first, second)
        self.assertEqual(first.projection_id, PROJECTION_ID)
        self.assertGreaterEqual(first.latitude, -90)
        self.assertLessEqual(first.latitude, 90)
        self.assertGreaterEqual(first.longitude, -180)
        self.assertLessEqual(first.longitude, 180)

    def test_same_value_different_cipher_projects_differently(self):
        aq = project_value("AQ", 100)
        synx = project_value("Synx", 100)

        self.assertNotEqual(aq, synx)

    def test_default_projection_matches_explicit_value_hash(self):
        implicit = project_value("AQ", 306)
        explicit = project_value("AQ", 306, projection_id=PROJECTION_ID)

        self.assertEqual(implicit, explicit)

    def test_unknown_projection_rejected(self):
        with self.assertRaisesRegex(ValueError, "unknown projection_id"):
            project_value("AQ", 100, projection_id="spiral_v1")

    def test_projection_registry_lists_default_and_experimental_methods(self):
        methods = list_projection_methods()
        ids = [method.projection_id for method in methods]

        self.assertEqual(ids[0], PROJECTION_ID)
        self.assertIn("webmercator_hash_v1", ids)
        self.assertIn("modulo_grid_v1", ids)
        self.assertIn("nearest_32_cities_hash_v1", ids)
        self.assertIn("nearest_1000_towns_hash_v1", ids)
        self.assertIn("nearest_10000_towns_hash_v1", ids)
        self.assertIn("nearest_50000_towns_hash_v1", ids)
        modulo = next(method for method in methods if method.projection_id == "modulo_grid_v1")
        self.assertTrue(modulo.experimental)
        self.assertIn("coarse grid", modulo.label)
        self.assertIn("collide visually", modulo.description)
        nearest = next(
            method
            for method in methods
            if method.projection_id == "nearest_32_cities_hash_v1"
        )
        self.assertTrue(nearest.experimental)
        self.assertIn("nearest 32 cities", nearest.label)
        self.assertIn("many cliques may share", nearest.description)
        nearest_1000 = next(
            method
            for method in methods
            if method.projection_id == "nearest_1000_towns_hash_v1"
        )
        self.assertTrue(nearest_1000.experimental)
        self.assertIn("nearest 1000 towns", nearest_1000.label)

    def test_each_projection_is_deterministic_and_in_bounds(self):
        for method in list_projection_methods():
            with self.subTest(method=method.projection_id):
                first = project_value("QWER", 110, projection_id=method.projection_id)
                second = project_value("QWER", 110, projection_id=method.projection_id)

                self.assertEqual(first, second)
                self.assertEqual(first.projection_id, method.projection_id)
                self.assertGreaterEqual(first.latitude, -90)
                self.assertLessEqual(first.latitude, 90)
                self.assertGreaterEqual(first.longitude, -180)
                self.assertLessEqual(first.longitude, 180)

    def test_webmercator_hash_stays_inside_webmercator_latitude(self):
        point = project_value("AQ", 306, projection_id="webmercator_hash_v1")

        self.assertGreaterEqual(point.latitude, -WEBMERCATOR_MAX_LATITUDE)
        self.assertLessEqual(point.latitude, WEBMERCATOR_MAX_LATITUDE)

    def test_projection_changes_locus_not_clique_identity(self):
        value_hash = project_value("AQ", 306, projection_id="value_hash_v1")
        webmercator = project_value("AQ", 306, projection_id="webmercator_hash_v1")
        modulo = project_value("AQ", 306, projection_id="modulo_grid_v1")

        self.assertEqual({value_hash.projection_id, webmercator.projection_id, modulo.projection_id}, {
            "value_hash_v1",
            "webmercator_hash_v1",
            "modulo_grid_v1",
        })
        self.assertNotEqual(
            {(value_hash.latitude, value_hash.longitude)},
            {(webmercator.latitude, webmercator.longitude)},
        )

    def test_nearest_town_selection_uses_haversine_distance(self):
        phoenix = GazetteerPlace(
            place_id="phoenix-usa",
            name="Phoenix",
            country="United States",
            latitude=33.4484,
            longitude=-112.074,
        )
        tucson = GazetteerPlace(
            place_id="tucson-usa",
            name="Tucson",
            country="United States",
            latitude=32.2226,
            longitude=-110.9747,
        )

        place, distance_km = nearest_place_for_coordinate(
            33.45, -112.05, places=[tucson, phoenix]
        )

        self.assertEqual(place.place_id, "phoenix-usa")
        self.assertLess(distance_km, 5)

    def test_indexed_nearest_matches_brute_force_nearest(self):
        places = load_gazetteer(TOWNS10000_GAZETTEER_PATH)
        indexed = load_indexed_gazetteer(TOWNS10000_GAZETTEER_PATH)
        sample_coordinates = [
            (33.45, -112.05),
            (-82.838188, 14.7766),
            (51.5, -0.1),
            (-12.0, 151.0),
        ]

        for latitude, longitude in sample_coordinates:
            with self.subTest(latitude=latitude, longitude=longitude):
                brute_place, brute_distance = nearest_place_for_coordinate(
                    latitude, longitude, places=places
                )
                indexed_place, indexed_distance = nearest_place_for_coordinate(
                    latitude, longitude, gazetteer=indexed
                )

                self.assertEqual(indexed_place.place_id, brute_place.place_id)
                self.assertAlmostEqual(indexed_distance, brute_distance)

    def test_nearest_city_hash_is_deterministic_and_includes_metadata(self):
        first = project_value("AQ", 306, projection_id="nearest_32_cities_hash_v1")
        second = project_value("AQ", 306, projection_id="nearest_32_cities_hash_v1")

        self.assertEqual(first, second)
        self.assertEqual(first.projection_id, "nearest_32_cities_hash_v1")
        self.assertIsNotNone(first.metadata)
        self.assertIn("base_coordinate", first.metadata)
        self.assertIn("snapped_place", first.metadata)
        self.assertEqual(
            first.metadata["base_coordinate"]["projection_method"],
            "webmercator_hash_v1",
        )
        snapped_place = first.metadata["snapped_place"]
        self.assertEqual(first.latitude, snapped_place["latitude"])
        self.assertEqual(first.longitude, snapped_place["longitude"])
        self.assertIsInstance(snapped_place["id"], str)
        self.assertIsInstance(snapped_place["name"], str)
        self.assertIsInstance(snapped_place["country"], str)
        self.assertGreaterEqual(snapped_place["distance_km"], 0)
        self.assertEqual(snapped_place["gazetteer"], "cities32.json")

    def test_nearest_1000_towns_hash_uses_committed_1000_place_gazetteer(self):
        places = load_gazetteer(TOWNS1000_GAZETTEER_PATH)

        point = project_value("AQ", 306, projection_id="nearest_1000_towns_hash_v1")

        self.assertEqual(point.projection_id, "nearest_1000_towns_hash_v1")
        self.assertEqual(point.metadata["snapped_place"]["gazetteer"], "towns1000.geonames.json")
        self.assertGreaterEqual(point.metadata["snapped_place"]["distance_km"], 0)
        self.assertEqual(len(places), 1000)

    def test_larger_town_hashes_use_committed_gazetteers(self):
        cases = [
            (
                "nearest_10000_towns_hash_v1",
                TOWNS10000_GAZETTEER_PATH,
                "towns10000.geonames.json",
                10000,
            ),
            (
                "nearest_50000_towns_hash_v1",
                TOWNS50000_GAZETTEER_PATH,
                "towns50000.geonames.json",
                50000,
            ),
        ]
        for projection_id, path, gazetteer_name, expected_count in cases:
            with self.subTest(projection_id=projection_id):
                point = project_value("AQ", 306, projection_id=projection_id)

                self.assertEqual(len(load_gazetteer(path)), expected_count)
                self.assertEqual(point.projection_id, projection_id)
                self.assertEqual(
                    point.metadata["snapped_place"]["gazetteer"],
                    gazetteer_name,
                )


if __name__ == "__main__":
    unittest.main()
