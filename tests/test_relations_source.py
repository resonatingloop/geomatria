"""Direct-click fixtures; no owner database, SQLite or private APIs."""
import importlib.util
import unittest
from dataclasses import dataclass
from uuid import UUID


class PublicShapeFixture:
    """Injected public interface with forbidden paths acting as tripwires."""
    def __init__(self, identity, rows=(), failure=None):
        self.identity = identity
        self.rows = list(rows)
        self.calls = []
        self.forbidden_calls = []
        self.failure = failure

    def find_clicks(self, target, cipher="AQ", session_id="implicit", exclude_text="implicit"):
        self.calls.append((target,cipher,session_id,exclude_text))
        if self.failure:
            raise self.failure
        return [row for row in self.rows if row.get("value") == target and row.get("cipher") == cipher]

    def __getattr__(self, name):
        if name in ("find_cipherings", "find_neighbors", "find_neighbours", "find_cross_system", "all_entries"):
            self.forbidden_calls.append(name)
            raise AssertionError("prohibited excavation")
        raise AttributeError(name)


class DirectClickTests(unittest.TestCase):
    def test_failures_and_malformed_results_are_not_empty_success(self):
        from geogematria.relations_source import SourceIdentity, lookup_exact, LookupResult
        identity = SourceIdentity(label="Synthetic fixture corpus")
        source = PublicShapeFixture(identity, failure=RuntimeError("secret /home/private/source.db"))
        result = lookup_exact(source,"AQ",177)
        self.assertEqual(result.status,"error")
        self.assertEqual(result.error_code,"source-unavailable")
        self.assertNotIn("/home",str(result))
        malformed = [None, {}, dict(text="Synthetic mismatch",normalized_text="synthetic mismatch",cipher="Synx",value=177),
                     dict(text="Synthetic mismatch",normalized_text="synthetic mismatch",cipher="AQ",value=178),
                     dict(text="Synthetic invalid",normalized_text="",cipher="AQ",value=177),
                     dict(text=7,normalized_text="synthetic invalid",cipher="AQ",value=177),
                     dict(text="Synthetic bool",normalized_text="synthetic bool",cipher="AQ",value=True),
                     dict(text="Synthetic path ID",normalized_text="synthetic path id",cipher="AQ",value=177,id="/home/private/id")]
        class BrokenSource(PublicShapeFixture):
            def find_clicks(self, **kwargs):
                return self.rows
        for row in malformed:
            with self.subTest(row=row):
                result = lookup_exact(BrokenSource(identity,[row]),"AQ",177)
                self.assertEqual(result.status,"error")
                self.assertEqual(result.error_code,"invalid-source-result")
                self.assertEqual(result.records,())
        class TruncatedSource(PublicShapeFixture):
            def find_clicks(self, **kwargs):
                return {"rows": [], "has_more": True}
        self.assertEqual(lookup_exact(TruncatedSource(identity),"AQ",177).status,"error")
        with self.assertRaises(ValueError):
            SourceIdentity(label="/home/private/corpus.db")
        with self.assertRaises(ValueError):
            SourceIdentity(label="Synthetic",source_id="/home/private/corpus.db")
        with self.assertRaises(ValueError):
            SourceIdentity(label="Synthetic",revision_status="exact",revision="unproven")

    def test_public_read_only_mapping_covers_session_only_and_no_exclusion(self):
        import os
        import tempfile
        from pathlib import Path
        from dataclasses import replace
        from unittest.mock import patch
        from glossololary.analysis import analyze
        from glossololary.db import GlossololaryDB
        from geogematria import relations_source as rs
        self.assertTrue(hasattr(rs,"PublicReadOnlySource"),"missing read-only public adapter")
        with tempfile.TemporaryDirectory(dir=os.environ["TMPDIR"]) as tmp:
            path = Path(tmp)/"synthetic.db"
            writable = GlossololaryDB(path=path)
            writable.init()
            base = analyze("Synthetic Alpha Fixture")
            fixture = replace(base,results=[replace(r,value=1302) for r in base.results if r.cipher_name=="AQ"])
            writable.save_analysis(fixture)
            writable.save_analysis(replace(fixture,text="Synthetic Session Fixture"),is_global=False)
            session = writable.create_session("Synthetic fixture session")
            writable.add_to_session(session,"Synthetic Session Fixture")
            before = path.read_bytes()
            handles=[]
            def factory(*,path,read_only):
                self.assertIs(read_only,True)
                db=GlossololaryDB(path=path,read_only=read_only)
                handles.append(db)
                return db
            with patch("glossololary.db.GlossololaryDB",side_effect=factory):
                source=rs.PublicReadOnlySource(path,rs.SourceIdentity(label="Synthetic public fixture"))
                result=rs.lookup_exact(source,"aq",1302)
            expected = writable.find_clicks(target=1302,cipher="AQ",session_id=None,exclude_text=None)
            self.assertEqual(result.status,"complete")
            self.assertEqual(result.count,2)
            self.assertEqual([r.text for r in result.records],["Synthetic Alpha Fixture","Synthetic Session Fixture"])
            self.assertEqual([(r.text,r.normalized_text,r.source_record_id) for r in result.records],
                             [(r["text"],r["normalized_text"],str(r["id"])) for r in expected])
            with self.assertRaisesRegex(Exception,"readonly"):
                handles[0].delete_entry_by_text("Synthetic Alpha Fixture")
            self.assertEqual(path.read_bytes(),before)
            missing=Path(tmp)/"missing.db"
            with self.assertRaisesRegex(rs.SourceUnavailable,"source-unavailable") as caught:
                rs.PublicReadOnlySource(missing,rs.SourceIdentity(label="Synthetic missing fixture"))
            self.assertFalse(missing.exists())
            self.assertNotIn(str(missing),str(caught.exception))

    def test_stored_endpoint_preserves_public_phrase_without_calculation(self):
        from geogematria import relations_source as rs
        self.assertTrue(hasattr(rs,"stored_endpoint"),"missing stored endpoint boundary")
        identity=rs.SourceIdentity(label="Synthetic phrase source")
        class StoredFixture(PublicShapeFixture):
            def find_by_text(self,text):
                return [dict(id=9,text="Synthetic ENdpoint",normalized_text="synthetic endpoint",cipher="AQ",value=2501),
                        dict(id=10,text="Synthetic ENdpoint",normalized_text="synthetic endpoint",cipher="Synx",value=44)]
        source=StoredFixture(identity)
        address=rs.stored_endpoint(source,"synthetic endpoint","aq","webmercator_hash_v1")
        self.assertEqual(address.value,2501)
        self.assertEqual(address.cipher,"AQ")
        self.assertEqual(address.phrase.text,"Synthetic ENdpoint")
        self.assertEqual(address.phrase.normalized_text,"synthetic endpoint")
        self.assertEqual(address.phrase.source_record_id,"9")
        self.assertEqual(address.phrase.source_id,identity.source_id)
        self.assertEqual(address.input_origin,"stored-phrase")
        self.assertEqual(source.calls,[])
        with self.assertRaises(LookupError):
            rs.stored_endpoint(source,"synthetic endpoint","Ordinal")
        class MissingFixture(StoredFixture):
            def find_by_text(self,text):
                return []
        with self.assertRaises(LookupError):
            rs.stored_endpoint(MissingFixture(identity),"Synthetic absent","AQ")

    def test_public_wrapper_refuses_phrase_targets_and_forbidden_scope(self):
        from pathlib import Path
        from unittest.mock import patch
        from geogematria import relations_source as rs
        fake=PublicShapeFixture(rs.SourceIdentity(label="Synthetic guarded source"))
        with patch("glossololary.db.GlossololaryDB",return_value=fake):
            source=rs.PublicReadOnlySource(Path("unused-synthetic.db"),fake.identity)
        for value in ("Synthetic phrase target",True,1302.0):
            with self.subTest(value=value),self.assertRaises(ValueError):
                source.find_clicks(value,"AQ",session_id=None,exclude_text=None)
        with self.assertRaises(ValueError):
            source.find_clicks(1302,"AQ",session_id=1,exclude_text=None)
        with self.assertRaises(ValueError):
            source.find_clicks(1302,"AQ",session_id=None,exclude_text="Synthetic excluded")
        self.assertEqual(fake.calls,[])
        source.find_clicks(1302,"aq",session_id=None,exclude_text=None)
        self.assertEqual(fake.calls,[(1302,"AQ",None,None)])

    def test_injected_exact_clicks_are_whole_source_sorted_and_attributed(self):
        self.assertIsNotNone(importlib.util.find_spec("geogematria.relations_source"),"missing exact source boundary")
        from geogematria.relations_source import SourceIdentity, lookup_exact
        identity = SourceIdentity(label="Synthetic fixture corpus")
        UUID(identity.source_id)
        source = PublicShapeFixture(identity, [
            dict(id=3,text="Synthetic ZEBRA",normalized_text="synthetic zebra",cipher="AQ",value=1302),
            dict(id=2,text="Synthetic alpha",normalized_text="synthetic alpha",cipher="AQ",value=1302),
            dict(id=1,text="Synthetic ALPHA",normalized_text="synthetic alpha",cipher="AQ",value=1302),
            dict(id=4,text="Synthetic other cipher",normalized_text="synthetic other cipher",cipher="Synx",value=1302),
            dict(id=5,text="Synthetic wrong value",normalized_text="synthetic wrong value",cipher="AQ",value=1303)])
        result = lookup_exact(source,"aq",1302)
        self.assertEqual(source.calls,[(1302,"AQ",None,None)])
        self.assertEqual(source.forbidden_calls,[])
        self.assertEqual(result.status,"complete")
        self.assertEqual(result.count,3)
        self.assertEqual([r.text for r in result.records],["Synthetic ALPHA","Synthetic alpha","Synthetic ZEBRA"])
        self.assertEqual([r.source_record_id for r in result.records],["1","2","3"])
        self.assertTrue(all(r.cipher=="AQ" and r.value==1302 for r in result.records))
        self.assertEqual(result.source,identity)
        self.assertEqual(result.scope,"whole-database")
        self.assertEqual(result.policy,"direct-exact-clicks-only")
        self.assertEqual(result.source.revision_status,"unavailable")
        self.assertIsNone(result.source.revision)
        empty = lookup_exact(source,"AQ",0)
        self.assertEqual(empty.status,"complete")
        self.assertEqual(empty.records,())
        self.assertEqual(empty.count,0)
        lookup_exact(source,"AQ",9999)
        self.assertEqual(source.calls[-1],(9999,"AQ",None,None))


if __name__ == "__main__":
    unittest.main()
