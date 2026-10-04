"""Synthetic, source-free spatial relation conformance fixtures."""
import importlib
import math
import unittest


class EndpointTests(unittest.TestCase):
    def test_endpoint_and_authoritative_coordinate_validation(self):
        from geogematria.relations import Coordinate, endpoint
        for invalid in (True, 177.0, "177", None):
            with self.subTest(value=invalid), self.assertRaises(ValueError):
                endpoint("AQ", invalid)
        for cipher in ("not-a-cipher", "", None):
            with self.subTest(cipher=cipher), self.assertRaises(ValueError):
                endpoint(cipher, 177)
        with self.assertRaises(ValueError):
            endpoint("AQ", 177, "nonexistent_v1")
        for lat, lon in ((math.nan, 0), (0, math.inf), (91, 0),
                         (0, -181), (True, 0), (1.0000001, 0)):
            with self.subTest(coordinate=(lat, lon)), self.assertRaises(ValueError):
                Coordinate(lat, lon)
        for value in (-10, 0, 2001, 100000):
            self.assertEqual(endpoint("AQ", value).value, value)
        self.assertEqual(Coordinate(90, 180).latitude, 90)

    def test_canonical_numeric_endpoint_uses_public_alias_resolver(self):
        self.assertIsNotNone(importlib.util.find_spec("geogematria.relations"),
                             "relation engine must be importable")
        from geogematria.relations import endpoint
        from geogematria.projection import project_value
        for alias, canonical in (("aq", "AQ"), ("synx", "Synx"),
                                 ("qwerty", "QWER"), ("nqwer", "nQWER"),
                                 ("ordinal", "Ordinal"), ("reduced", "Reduced"),
                                 ("standard", "Standard"), ("satanic", "Satanic")):
            with self.subTest(alias=alias):
                address = endpoint(alias, 177)
                point = project_value(canonical, 177)
                self.assertEqual(address.cipher, canonical)
                self.assertEqual((address.raw.latitude, address.raw.longitude),
                                 (point.latitude, point.longitude))
                self.assertEqual(address.raw_projection_id, "value_hash_v1")
                self.assertIsNone(address.snapped)
                self.assertIsNone(address.phrase)
                self.assertEqual(address.coordinate_precision, 6)
        self.assertEqual(endpoint("AQ", 177).raw.latitude, 12.851504)
        self.assertEqual(endpoint("AQ", 177).raw.longitude, 20.991909)


class DistanceTests(unittest.TestCase):
    def test_half_mile_nextafter_boundaries_are_upward_not_bankers(self):
        from geogematria.relations import distance_value
        for whole in (0, 1, 10, 1302, 2000):
            half = whole + 0.5
            with self.subTest(whole=whole):
                self.assertEqual(distance_value(math.nextafter(half, 0)), whole)
                self.assertEqual(distance_value(half), whole + 1)
                self.assertEqual(distance_value(math.nextafter(half, math.inf)), whole + 1)
        for invalid in (-1, math.nan, math.inf, True, "1"):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                distance_value(invalid)

    def test_independent_cross_dot_oracle_and_basis_validation(self):
        from geogematria.relations import Coordinate, measure_coordinates
        # Cross/dot atan2 is independent of the haversine recipe. Ordinary
        # tolerance 1e-8 km; near-antipodal 3e-4 km accounts for h's loss of
        # precision near 1 (<= 30 cm). Canonical and ordinary cases are much
        # tighter, separately detecting coordinate/constant substitutions.
        def oracle(a, b):
            def vector(p):
                lat, lon = math.radians(p.latitude), math.radians(p.longitude)
                return (math.cos(lat)*math.cos(lon), math.cos(lat)*math.sin(lon), math.sin(lat))
            u, v = vector(a), vector(b)
            cross = (u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])
            return 6371.0088 * math.atan2(math.sqrt(sum(x*x for x in cross)), sum(x*y for x,y in zip(u,v)))
        fixtures = [((0,0),(0,0),1e-8), ((0,179.999999),(0,-179.999999),1e-8),
                    ((89.999999,0),(89.999999,180),1e-8), ((90,0),(90,180),1e-8),
                    ((0,0),(0,180),1e-8), ((0,0),(0.000001,179.999999),3e-4),
                    ((-90,120),(90,-15),1e-8), ((12.345678,25.123456),(-50.000001,120),1e-8)]
        for a, b, tolerance in fixtures:
            a, b = Coordinate(*a), Coordinate(*b)
            measured = measure_coordinates(a, b)
            with self.subTest(a=a,b=b):
                self.assertTrue(math.isfinite(measured.kilometres))
                self.assertAlmostEqual(measured.kilometres, oracle(a,b), delta=tolerance)
                self.assertAlmostEqual(measured.miles, oracle(a,b)/1.609344, delta=tolerance/1.609344)
                self.assertEqual(measure_coordinates(b,a).target, measured.target)
        self.assertEqual(measure_coordinates(Coordinate(0,0),Coordinate(0,0)).target,0)
        self.assertGreater(measure_coordinates(Coordinate(0,0),Coordinate(0,180)).target,2000)
        with self.assertRaises(ValueError):
            measure_coordinates(Coordinate(0,0),Coordinate(1,1), "raw-to-town")

    def test_all_registered_methods_and_snap_comparison_keep_raw_primary(self):
        from dataclasses import replace
        from unittest.mock import patch
        from geogematria import relations as r
        from geogematria.projection import list_projection_methods, project_value, SNAP_PROJECTION_GAZETTEERS
        for method in list_projection_methods():
            with self.subTest(method=method.projection_id):
                left, right = [r.endpoint("AQ", v, method.projection_id) for v in (303,466)]
                measured = r.measure_relation(left,right)
                self.assertEqual(measured.primary.basis,"raw-to-raw")
                if method.projection_id in SNAP_PROJECTION_GAZETTEERS:
                    self.assertIsNotNone(left.snapped, "snap endpoint must retain both addresses")
                    base = project_value("AQ",303,"webmercator_hash_v1")
                    self.assertEqual(left.raw,r.Coordinate(base.latitude,base.longitude))
                    self.assertEqual(left.raw_projection_id,"webmercator_hash_v1")
                    self.assertEqual(measured.town_comparison.basis,"town-to-town")
                    self.assertEqual(measured.left_displacement.basis,"left-raw-to-town")
                    self.assertEqual(measured.right_displacement.basis,"right-raw-to-town")
                    self.assertEqual(measured.left_displacement,
                                     r.measure_coordinates(left.raw,left.snapped,"left-raw-to-town"))
                    self.assertEqual(len(left.place.gazetteer.sha256),64)
                else:
                    self.assertIsNone(measured.town_comparison)
        left,right = [r.endpoint("AQ",v,"nearest_10000_towns_hash_v1") for v in (303,466)]
        self.assertEqual(left.place.name,"Santa Rosa")
        self.assertEqual(left.place.place_id,right.place.place_id)
        reading = r.measure_relation(left,right)
        self.assertEqual(reading.town_comparison.target,0)
        self.assertEqual(reading.town_comparison.miles,0)
        self.assertGreater(reading.primary.miles,0)
        with self.assertRaises(ValueError):
            r.measure_relation(replace(left,raw=r.Coordinate(0,0)),right)
        point = project_value("AQ",303,"nearest_10000_towns_hash_v1")
        point.metadata.pop("base_coordinate")
        with patch("geogematria.relations.project_value", return_value=point):
            with self.assertRaises(ValueError):
                r.endpoint("AQ",303,"nearest_10000_towns_hash_v1")

    def test_snap_metadata_cannot_forge_raw_hash_address(self):
        from dataclasses import replace
        from unittest.mock import patch
        from geogematria import relations as r
        from geogematria.projection import project_value
        point = project_value("AQ",303,"nearest_10000_towns_hash_v1")
        point.metadata["base_coordinate"]["latitude"] = 0.0
        def forged(cipher,value,method):
            return point if method == "nearest_10000_towns_hash_v1" else project_value(cipher,value,method)
        with patch("geogematria.relations.project_value",side_effect=forged):
            with self.assertRaises(ValueError):
                r.endpoint("AQ",303,"nearest_10000_towns_hash_v1")

    def test_raw_primary_distance_has_versioned_recipe_and_ordered_inputs(self):
        from geogematria import relations as r
        self.assertTrue(hasattr(r, "measure_relation"), "missing relation measurement")
        left = r.endpoint("aq", 177, "webmercator_hash_v1")
        right = r.endpoint("AQ", 333, "webmercator_hash_v1")
        reading = r.measure_relation(left, right)
        self.assertEqual(reading.left, left)
        self.assertEqual(reading.right, right)
        self.assertEqual(reading.primary.basis, "raw-to-raw")
        self.assertEqual(reading.primary.left, left.raw)
        self.assertEqual(reading.primary.right, right.raw)
        self.assertAlmostEqual(reading.primary.miles, 1302.3543709959274, places=9)
        self.assertEqual(reading.primary.target, 1302)
        self.assertEqual(reading.arithmetic_difference, 156)
        self.assertEqual(reading.primary.kilometres / 1.609344, reading.primary.miles)
        self.assertEqual(reading.primary.recipe.earth_radius_km, 6371.0088)
        self.assertEqual(reading.primary.recipe.km_per_mile, 1.609344)
        self.assertEqual(reading.primary.recipe.measurement_id, "spherical_haversine_miles_v1")
        self.assertEqual(reading.primary.recipe.rounding, "floor(distance_miles + 0.5)")
        self.assertEqual(reading.engine_version, "spatial_relations_v1")
        reverse = r.measure_relation(right, left)
        self.assertEqual(reverse.left, right)
        self.assertEqual(reverse.primary.target, reading.primary.target)
        self.assertEqual(reverse.primary.kilometres, reading.primary.kilometres)
        self.assertIsNone(reading.town_comparison)
        for other in (r.endpoint("Synx", 333, left.projection_id), r.endpoint("AQ", 333)):
            with self.assertRaises(ValueError):
                r.measure_relation(left, other)


class ChamberTests(unittest.TestCase):
    def test_all_four_densities_enumerate_exactly_the_complete_domain(self):
        from geogematria import relations as r
        from geogematria.projection import SNAP_PROJECTION_GAZETTEERS, project_value
        for method in SNAP_PROJECTION_GAZETTEERS:
            with self.subTest(method=method):
                selected = r.endpoint("AQ",177,method)
                result = r.chamber("AQ",method,selected.place.place_id)
                expected = [v for v in range(1,2001) if project_value("AQ",v,method).metadata[
                    "snapped_place"]["id"] == selected.place.place_id]
                self.assertEqual([p.value for p in result.members],expected)
                self.assertEqual(result.enumerated_count,2000)
                self.assertEqual(result,r.chamber("aq",method,selected.place.place_id))

    def test_singletons_and_coincident_named_places_remain_distinct(self):
        import json
        import os
        import tempfile
        from pathlib import Path
        from unittest.mock import patch
        from geogematria import relations as r
        from geogematria.projection import SNAP_PROJECTION_GAZETTEERS, project_value
        records = []
        for value in range(1,2001):
            p = project_value("AQ",value,"webmercator_hash_v1")
            records.append(dict(id=f"synthetic-place-{value}",name="Synthetic Twin Town",country="ZZ",
                                latitude=p.latitude,longitude=p.longitude))
        records.append(dict(records[0],id="synthetic-coincident-twin"))
        with tempfile.TemporaryDirectory(dir=os.environ["TMPDIR"]) as tmp:
            path = Path(tmp)/"synthetic-gazetteer.json"
            path.write_text(json.dumps(records),encoding="utf-8")
            with patch.dict(SNAP_PROJECTION_GAZETTEERS,{"nearest_32_cities_hash_v1":path}):
                one = r.chamber("AQ","nearest_32_cities_hash_v1","synthetic-place-1")
                other = r.chamber("AQ","nearest_32_cities_hash_v1","synthetic-coincident-twin")
                self.assertEqual([p.value for p in one.members],[1])
                self.assertEqual(other.members,())
                self.assertEqual(one.place.name,other.place.name)
                self.assertEqual(one.place.coordinate,other.place.coordinate)
                self.assertNotEqual(one.chamber_id,other.chamber_id)
                records[0]["latitude"] = 0
                path.write_text(json.dumps(records),encoding="utf-8")
                with self.assertRaisesRegex(ValueError,"drift"):
                    r.chamber("AQ","nearest_32_cities_hash_v1","synthetic-place-1")
                with self.assertRaisesRegex(ValueError,"drift"):
                    r.endpoint("AQ",1,"nearest_32_cities_hash_v1")

    def test_gazetteer_change_during_endpoint_projection_is_rejected(self):
        import os
        import json
        import tempfile
        from pathlib import Path
        from unittest.mock import patch
        from geogematria import relations as r
        from geogematria.projection import SNAP_PROJECTION_GAZETTEERS, project_value
        with tempfile.TemporaryDirectory(dir=os.environ["TMPDIR"]) as tmp:
            path=Path(tmp)/"synthetic-drift.json"
            records=[dict(id="synthetic-drift-place",name="Synthetic drift town",country="ZZ",latitude=1,longitude=2)]
            path.write_text(json.dumps(records),encoding="utf-8")
            def drift(cipher,value,method):
                point=project_value(cipher,value,method)
                if method=="nearest_32_cities_hash_v1":
                    path.write_text(json.dumps(records)+" ",encoding="utf-8")
                return point
            with patch.dict(SNAP_PROJECTION_GAZETTEERS,{"nearest_32_cities_hash_v1":path}):
                with patch("geogematria.relations.project_value",side_effect=drift):
                    with self.assertRaisesRegex(ValueError,"drift"):
                        r.endpoint("AQ",177,"nearest_32_cities_hash_v1")

    def test_complete_numeric_membership_uses_stable_santa_rosa_identity(self):
        import hashlib
        from geogematria import relations as r
        from geogematria.projection import SNAP_PROJECTION_GAZETTEERS, project_value
        self.assertTrue(hasattr(r,"chamber"), "missing chamber enumeration")
        selected = r.endpoint("AQ",303,"nearest_10000_towns_hash_v1")
        result = r.chamber("aq", selected.projection_id, selected.place.place_id)
        self.assertEqual(result.domain_min,1)
        self.assertEqual(result.domain_max,2000)
        self.assertEqual(result.enumerated_count,2000)
        self.assertEqual(result.place.name,"Santa Rosa")
        self.assertEqual(result.place.place_id,"santa-rosa-us-5393287")
        self.assertEqual([p.value for p in result.members],[303,466,627,674,1452,1807,1908])
        self.assertEqual(result.place.gazetteer.sha256, hashlib.sha256(
            SNAP_PROJECTION_GAZETTEERS[selected.projection_id].read_bytes()).hexdigest())
        self.assertEqual(result.chamber_id,r.chamber("AQ", selected.projection_id, "santa-rosa-us-5393287").chamber_id)
        self.assertTrue(all(p.place.place_id == "santa-rosa-us-5393287" for p in result.members))
        pair = r.chamber_pair(result,303,466)
        self.assertEqual(pair.town_comparison.target,0)
        self.assertGreater(pair.primary.miles,0)
        self.assertNotEqual(pair.primary.miles,pair.left_displacement.miles)
        with self.assertRaises(ValueError):
            r.chamber_pair(result,303,177)
        with self.assertRaises(ValueError):
            r.chamber("AQ","modulo_grid_v1","santa-rosa-us-5393287")
        with self.assertRaises(ValueError):
            r.chamber("AQ",selected.projection_id,"not-a-place")


if __name__ == "__main__":
    unittest.main()
