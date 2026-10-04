"""Versioned in-memory captures using obviously synthetic injected sources."""
import importlib.util
import json
import unittest
from dataclasses import FrozenInstanceError, replace
from uuid import UUID

from geogematria.relations import endpoint, measure_relation, chamber
from geogematria.relations_source import SourceIdentity
from test_relations_source import PublicShapeFixture


class CaptureTests(unittest.TestCase):
    def test_incomplete_and_forged_evidence_cannot_become_complete_capture(self):
        from geogematria import relations_capture as c
        from geogematria.relations import Coordinate
        from geogematria.relations_source import LookupResult
        geometry=measure_relation(endpoint("AQ",177,"webmercator_hash_v1"),endpoint("AQ",333,"webmercator_hash_v1"))
        source=PublicShapeFixture(SourceIdentity(label="Synthetic complete corpus"))
        valid=c.excavate_distance(geometry,source)
        forged=[replace(valid,lookups=()),
                replace(valid,lookups=(replace(valid.lookups[0],status="pending"),)),
                replace(valid,lookups=(replace(valid.lookups[0],value=177),)),
                replace(valid,lookups=(replace(valid.lookups[0],source=SourceIdentity(label="Synthetic different source")),)),
                replace(valid,lookups=(replace(valid.lookups[0],scope="active-session"),)),
                replace(valid,lookups=(replace(valid.lookups[0],policy="neighbors"),)),
                replace(valid,geometry=replace(geometry,primary=replace(geometry.primary,target=7))),
                replace(valid,geometry=replace(geometry,left=replace(geometry.left,raw=Coordinate(0,0)))),
                replace(valid,capture_end="2000-01-01T00:00:00+00:00")]
        for item in forged:
            with self.subTest(item=item):
                self.assertFalse(item.saveable)
                with self.assertRaises(ValueError):
                    c.complete_capture(item)
        failed=c.excavate_distance(geometry,PublicShapeFixture(source.identity,failure=RuntimeError("private path")))
        self.assertEqual(failed.geometry,geometry)
        self.assertFalse(failed.saveable)
        with self.assertRaises(ValueError):
            c.complete_capture(failed)
        saved=c.complete_capture(valid)
        for altered in (replace(saved,schema_version="unknown"),replace(saved,kind="chamber"),
                        replace(saved,study_id="/home/private/db"),
                        replace(saved,completeness=replace(saved.completeness,record_count=9))):
            with self.subTest(altered=altered), self.assertRaises(ValueError):
                c.capture_to_json(altered)
        data=json.loads(c.capture_to_json(saved))
        for key,val in (("target",7),("miles",0),("basis","town-to-town")):
            changed=json.loads(json.dumps(data))
            changed["payload"]["readings"][0]["geometry"]["primary"][key]=val
            with self.subTest(key=key), self.assertRaises(ValueError):
                c.capture_from_json(json.dumps(changed))
        with self.assertRaises(ValueError):
            c.geometry_to_json(replace(geometry,arithmetic_difference=7))

    def test_explicit_town_comparison_queries_zero_without_replacing_raw_primary(self):
        from geogematria import relations_capture as c
        geometry=measure_relation(endpoint("AQ",303,"nearest_10000_towns_hash_v1"),endpoint("AQ",466,"nearest_10000_towns_hash_v1"))
        source=PublicShapeFixture(SourceIdentity(label="Synthetic comparison corpus"))
        default=c.excavate_distance(geometry,source)
        self.assertEqual(default.selected_basis,"raw-to-raw")
        self.assertEqual(source.calls,[(geometry.primary.target,"AQ",None,None)])
        selected=c.excavate_distance(geometry,source,basis="town-to-town")
        self.assertEqual(source.calls[-1],(0,"AQ",None,None))
        saved=c.complete_capture(selected)
        row=saved.payload.readings[0]
        self.assertEqual(row.selected_basis,"town-to-town")
        self.assertEqual(row.clicks.value,0)
        self.assertEqual(row.geometry.primary,geometry.primary)
        self.assertEqual(c.capture_from_json(c.capture_to_json(saved)),saved)
        with self.assertRaises(ValueError):
            c.excavate_distance(geometry,source,basis="raw-to-town")
        plain=measure_relation(endpoint("AQ",177),endpoint("AQ",333))
        with self.assertRaises(ValueError):
            c.excavate_distance(plain,source,basis="town-to-town")

    def test_chamber_capture_retains_empty_members_and_repeat_phrase_attributions(self):
        from geogematria import relations_capture as c
        self.assertTrue(hasattr(c,"excavate_chamber"),"missing complete chamber capture")
        geometry=chamber("AQ","nearest_10000_towns_hash_v1","santa-rosa-us-5393287")
        source=PublicShapeFixture(SourceIdentity(label="Synthetic chamber corpus"),[
            dict(id=1,text="Synthetic repeated attribution",normalized_text="synthetic repeated attribution",cipher="AQ",value=303),
            dict(id=2,text="Synthetic repeated attribution",normalized_text="synthetic repeated attribution",cipher="AQ",value=466)])
        excavation=c.excavate_chamber(geometry,source,selected_pair=(303,466))
        self.assertEqual(source.calls,[(v,"AQ",None,None) for v in [303,466,627,674,1452,1807,1908]])
        self.assertTrue(excavation.saveable)
        saved=c.complete_capture(excavation,title="Synthetic chamber study")
        self.assertEqual(saved.kind,"chamber")
        self.assertEqual(saved.completeness.record_count,2)
        self.assertEqual(saved.completeness.required_lookup_count,7)
        self.assertEqual(saved.completeness.complete_lookup_count,7)
        self.assertEqual(saved.payload.geometry,geometry)
        self.assertEqual([m.address.value for m in saved.payload.members],[303,466,627,674,1452,1807,1908])
        self.assertEqual([m.clicks.count for m in saved.payload.members],[1,1,0,0,0,0,0])
        self.assertEqual(saved.payload.selected_pair.left.value,303)
        self.assertEqual(saved.payload.selected_pair.right.value,466)
        self.assertGreater(saved.payload.selected_pair.primary.miles,0)
        text=c.capture_to_json(saved)
        self.assertEqual(c.capture_from_json(text),saved)
        self.assertEqual(c.geometry_from_json(c.geometry_to_json(geometry)),geometry)
        source.rows=[]
        new=c.excavate_chamber(geometry,source)
        self.assertEqual(new.geometry,excavation.geometry)
        self.assertEqual([r.count for r in new.lookups],[0]*7)
        self.assertEqual([r.count for r in excavation.lookups],[1,1,0,0,0,0,0])
        for index,item in enumerate((replace(excavation,lookups=excavation.lookups[:-1]),
                                    replace(excavation,geometry=replace(geometry,members=geometry.members[:-1])),
                                    replace(excavation,geometry=replace(geometry,domain_max=2001)),
                                    replace(excavation,geometry=replace(geometry,chamber_id="forged")))):
            with self.subTest(index=index):
                self.assertFalse(item.saveable)
                with self.assertRaises(ValueError):
                    c.complete_capture(item)
        class PartialFixture(PublicShapeFixture):
            def find_clicks(self,target,**kwargs):
                if target==627:
                    raise RuntimeError("Synthetic failure")
                return super().find_clicks(target,**kwargs)
        failed=c.excavate_chamber(geometry,PartialFixture(source.identity))
        self.assertFalse(failed.saveable)
        self.assertEqual(len(failed.lookups),7)
        self.assertEqual(failed.lookups[2].status,"error")
        self.assertEqual(failed.geometry,geometry)

    def test_phrase_provenance_and_capture_source_are_bound(self):
        from geogematria import relations_capture as c
        from geogematria.relations import PhraseReference, validate_endpoint
        source=PublicShapeFixture(SourceIdentity(label="Synthetic phrase corpus"))
        left=endpoint("AQ",177,"webmercator_hash_v1")
        right=endpoint("AQ",333,"webmercator_hash_v1")
        phrase=PhraseReference("Synthetic ENdpoint","synthetic endpoint",source.identity.source_id,"7")
        left=replace(left,phrase=phrase,input_origin="stored-phrase")
        geometry=measure_relation(left,right)
        saved=c.complete_capture(c.excavate_distance(geometry,source))
        self.assertEqual(c.capture_from_json(c.capture_to_json(saved)),saved)
        changed=json.loads(c.capture_to_json(saved))
        changed["payload"]["readings"][0]["geometry"]["left"]["phrase"]["source_id"]=str(UUID(int=1))
        with self.assertRaises(ValueError):
            c.capture_from_json(json.dumps(changed))
        for index,altered in enumerate((replace(left,input_origin="numeric-address"),
                                      replace(left,phrase=None),
                                      replace(left,phrase=replace(phrase,source_id="/home/private/source.db")),
                                      replace(left,phrase=replace(phrase,text=7)),
                                      replace(right,input_origin="unknown"))):
            with self.subTest(index=index), self.assertRaises(ValueError):
                validate_endpoint(altered)

    def test_json_validation_rejects_duplicate_keys_and_malformed_evidence(self):
        from geogematria import relations_capture as c
        geometry=measure_relation(endpoint("AQ",177,"webmercator_hash_v1"),endpoint("AQ",333,"webmercator_hash_v1"))
        source=PublicShapeFixture(SourceIdentity(label="Synthetic parser corpus"),[
            dict(text="Synthetic parser fixture",normalized_text="synthetic parser fixture",cipher="AQ",value=1302)])
        text=c.capture_to_json(c.complete_capture(c.excavate_distance(geometry,source)))
        duplicated=text.replace('"kind":"distance"','"kind":"distance","kind":"distance"')
        with self.assertRaises(ValueError):
            c.capture_from_json(duplicated)
        data=json.loads(text)
        def modify(path,value):
            changed=json.loads(text)
            dest=changed
            for part in path[:-1]:
                dest=dest[part]
            dest[path[-1]]=value
            return changed
        root=[("schema_version",),("connection_path",),("capture_start",),("source_scope","scope"),
              ("source_scope","identity","source_id"),("completeness","record_count")]
        values=["unknown","/home/private/corpus.db","naive-time","active-session","/home/private/source.db",True]
        record=("payload","readings",0,"clicks","records",0)
        primary=("payload","readings",0,"geometry","primary")
        changes=list(zip(root,values))+[(record+("normalized_text",),""),(record+("value",),True),
                                       (record+("cipher",),"Synx"),(primary+("kilometres",),float("nan")),
                                       (primary+("recipe","earth_radius_km"),6371.0)]
        for index,(path,value) in enumerate(changes):
            with self.subTest(index=index),self.assertRaises(ValueError):
                c.capture_from_json(json.dumps(modify(path,value)))
        for bad in ("null","[]",'{"schema_version":7}',text.replace('"target":1302','"target":1302.0')):
            with self.assertRaises(ValueError):
                c.capture_from_json(bad)
        parent=replace(c.capture_from_json(text),parent_revision_id=str(UUID(int=17)))
        self.assertEqual(c.capture_from_json(c.capture_to_json(parent)),parent)

    def test_empty_zero_and_out_of_domain_targets_remain_valid_unclamped(self):
        from geogematria import relations_capture as c
        from geogematria import relations as r
        source=PublicShapeFixture(SourceIdentity(label="Synthetic numeric domain corpus"))
        zero=r.measure_relation(r.endpoint("AQ",2501),r.endpoint("AQ",2501))
        self.assertEqual(zero.primary.target,0)
        result=c.excavate_distance(zero,source)
        self.assertTrue(result.saveable)
        self.assertEqual(result.lookups[0].records,())
        far=None
        for value in range(2,20):
            candidate=r.measure_relation(r.endpoint("AQ",1),r.endpoint("AQ",value))
            if candidate.primary.target>2000:
                far=candidate
                break
        self.assertIsNotNone(far)
        result=c.excavate_distance(far,source)
        self.assertEqual(result.lookups[0].value,far.primary.target)
        self.assertEqual(source.calls[-1],(far.primary.target,"AQ",None,None))
        self.assertTrue(result.saveable)
        address=r.endpoint("AQ",far.primary.target,far.left.projection_id)
        self.assertEqual(address.domain_status,"outside-initial-chamber-domain")
        self.assertEqual(r.endpoint("AQ",0).domain_status,"outside-initial-chamber-domain")
        self.assertEqual(r.endpoint("AQ",2000).domain_status,"inside-initial-chamber-domain")

    def test_utf8_text_is_preserved_and_unpaired_surrogates_are_rejected(self):
        from geogematria import relations_capture as c
        geometry=measure_relation(endpoint("AQ",177,"webmercator_hash_v1"),endpoint("AQ",333,"webmercator_hash_v1"))
        source=PublicShapeFixture(SourceIdentity(label="Synthetic café corpus"),[
            dict(text="Synthetic CAFÉ",normalized_text="synthetic café",cipher="AQ",value=1302)])
        capture=c.complete_capture(c.excavate_distance(geometry,source),title="Synthetic café")
        text=c.capture_to_json(capture)
        self.assertIn("CAFÉ",text)
        self.assertEqual(text.encode("utf-8").decode("utf-8"),text)
        self.assertEqual(c.capture_from_json(text),capture)
        bad=json.loads(text)
        bad["title"]="Synthetic \ud800"
        with self.assertRaises(ValueError):
            c.capture_from_json(json.dumps(bad))
        source.rows=[dict(text="Synthetic \ud800",normalized_text="synthetic invalid",cipher="AQ",value=1302)]
        bad=c.excavate_distance(geometry,source)
        self.assertEqual(bad.lookups[0].status,"error")
        self.assertFalse(bad.saveable)

    def test_complete_capture_does_not_truncate_a_large_exact_result_array(self):
        from geogematria import relations_capture as c
        geometry=measure_relation(endpoint("AQ",177,"webmercator_hash_v1"),endpoint("AQ",333,"webmercator_hash_v1"))
        source=PublicShapeFixture(SourceIdentity(label="Synthetic full-array corpus"),[
            dict(id=i,text=f"Synthetic fixture record {i:04}",normalized_text=f"synthetic fixture record {i:04}",cipher="AQ",value=1302)
            for i in reversed(range(257))])
        original=c.complete_capture(c.excavate_distance(geometry,source))
        self.assertEqual(original.completeness.record_count,257)
        self.assertEqual(original.payload.readings[0].clicks.count,257)
        self.assertEqual([row.source_record_id for row in original.payload.readings[0].clicks.records],
                         [str(i) for i in range(257)])
        text=c.capture_to_json(original)
        source.failure=RuntimeError("Synthetic source now unavailable")
        restored=c.capture_from_json(text)
        self.assertEqual(restored,original)
        self.assertEqual(source.calls,[(1302,"AQ",None,None)])
        self.assertEqual(len(json.loads(text)["payload"]["readings"][0]["clicks"]["records"]),257)

    def test_raw_distance_capture_queries_only_target_and_serializes_complete_evidence(self):
        self.assertIsNotNone(importlib.util.find_spec("geogematria.relations_capture"),"missing typed capture engine")
        from geogematria import relations_capture as c
        geometry=measure_relation(endpoint("AQ",177,"webmercator_hash_v1"),
                                  endpoint("AQ",333,"webmercator_hash_v1"))
        source=PublicShapeFixture(SourceIdentity(label="Synthetic capture corpus"),[
            dict(id=1,text="Synthetic target fixture",normalized_text="synthetic target fixture",cipher="AQ",value=1302)])
        excavation=c.excavate_distance(geometry,source)
        self.assertEqual(source.calls,[(1302,"AQ",None,None)])
        self.assertTrue(excavation.saveable)
        saved=c.complete_capture(excavation,title="Synthetic distance study",annotations="Synthetic annotation")
        self.assertEqual(saved.kind,"distance")
        self.assertEqual(saved.schema_version,"spatial_relation_capture_v1")
        self.assertEqual(saved.completeness.record_count,1)
        self.assertEqual(saved.completeness.required_lookup_count,1)
        self.assertEqual(saved.completeness.complete_lookup_count,1)
        self.assertEqual(saved.source_scope.scope,"whole-database")
        self.assertEqual(saved.source_scope.policy,"direct-exact-clicks-only")
        self.assertEqual(saved.source_scope.consistency,"capture-interval-not-atomic")
        UUID(saved.study_id)
        UUID(saved.revision_id)
        self.assertIsNone(saved.parent_revision_id)
        text=c.capture_to_json(saved)
        self.assertIsInstance(text,str)
        data=json.loads(text)
        self.assertEqual(data["payload"]["readings"][0]["geometry"]["primary"]["miles"],1302.3543709959274)
        self.assertEqual(data["payload"]["readings"][0]["clicks"]["records"][0]["text"],"Synthetic target fixture")
        restored=c.capture_from_json(text)
        self.assertEqual(restored,saved)
        self.assertEqual(c.geometry_from_json(c.geometry_to_json(geometry)),geometry)
        self.assertEqual(source.calls,[(1302,"AQ",None,None)],"serialization must never query a source")
        with self.assertRaises(FrozenInstanceError):
            saved.title="Mutated"


if __name__ == "__main__":
    unittest.main()
