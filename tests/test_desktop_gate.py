"""Bounded desktop gate; never opens a source catalogue."""
import json
import os
from pathlib import Path
import selectors
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
ENGINE = ROOT / "desktop/sidecar/engine.py"


class DesktopGateTests(unittest.TestCase):
    def engine(self, args=()):
        self.assertTrue(ENGINE.is_file(), "the owned sidecar entry is not implemented")
        child = subprocess.Popen(
            [os.environ.get("DESKTOP_GATE_ENGINE", sys.executable)]
            + ([] if os.environ.get("DESKTOP_GATE_ENGINE") else [str(ENGINE)]) + list(args),
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, env={**os.environ, "PYTHONUNBUFFERED": "1"},
        )
        self.addCleanup(self.cleanup, child)
        return child

    @staticmethod
    def cleanup(child):
        if child.poll() is None:
            child.stdin.close()
            try:
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait(timeout=5)
        for stream in (child.stdin, child.stdout, child.stderr):
            if not stream.closed:
                stream.close()

    def read(self, child):
        with selectors.DefaultSelector() as selector:
            selector.register(child.stdout, selectors.EVENT_READ)
            self.assertTrue(selector.select(timeout=15), "sidecar readiness/reply timed out")
        line = child.stdout.readline()
        self.assertTrue(line, "sidecar exited without a protocol message")
        return json.loads(line)

    def test_readiness_proves_public_imports_and_all_offline_gazetteers(self):
        child = self.engine()
        ready = self.read(child)
        self.assertEqual(ready["protocol"], 1)
        self.assertEqual(ready["event"], "ready")
        self.assertEqual(ready["operations"], ["probe"])
        self.assertEqual(ready["source"], "not-opened")
        self.assertEqual(ready["probe"], {"cipher": "AQ", "value": 177,
                         "projection": "value_hash_v1", "latitude": 12.851504,
                         "longitude": 20.991909})
        self.assertEqual([g["places"] for g in ready["gazetteers"]], [32, 1000, 10000, 50000])
        for gazetteer in ready["gazetteers"]:
            self.assertRegex(gazetteer["sha256"], r"^[0-9a-f]{64}$")
        self.assertEqual(ready["imports"], ["geogematria.projection", "glossololary.db", "glossololary.ciphers"])
        self.assertNotIn("path", json.dumps(ready).lower())

    def test_numeric_stage_has_24_complete_domains_without_private_fields(self):
        subprocess.run(["node", str(ROOT / "desktop/build.mjs"), "--stage-only"], check=True,
                       stdout=subprocess.PIPE, text=True, cwd=ROOT)
        data_dir = ROOT / "desktop/frontend/public/data"
        manifest = json.loads((data_dir / "manifest.json").read_text())
        self.assertEqual(len(manifest), 24)
        forbidden = {"phrases", "phrase_count", "has_phrases", "count", "values_with_phrases",
                     "values_without_phrases", "source_id", "source_path", "study_id", "annotations"}
        def check(value):
            if isinstance(value, dict):
                self.assertFalse(forbidden.intersection(value))
                for item in value.values():
                    check(item)
            elif isinstance(value, list):
                for item in value:
                    check(item)
        total = 0
        for entry in manifest:
            name = entry["file"].split("/")[-1]
            data = json.loads((data_dir / name).read_text())
            source = json.loads((ROOT / "atlas/datasets" / name).read_text())
            check(data)
            self.assertEqual([f["geometry"] for f in data["features"]], [f["geometry"] for f in source["features"]])
            self.assertEqual({f["properties"]["value"] for f in data["features"]}, set(range(1, 2001)))
            self.assertEqual(len(data["features"]), 2000)
            total += len(data["features"])
        self.assertEqual(total, 48000)

    def test_startup_delay_keeps_readiness_pending_until_real_initialization(self):
        import time
        began = time.monotonic()
        child = self.engine(["--gate-startup-delay", "0.8"])
        self.assertEqual(self.read(child)["event"], "ready")
        self.assertGreaterEqual(time.monotonic() - began, 0.8)

    def test_bridge_is_bounded_and_echoes_request_generation(self):
        child = self.engine()
        self.read(child)
        child.stdin.write(json.dumps({"protocol": 1, "id": 7, "generation": 3, "operation": "probe"}) + "\n")
        child.stdin.flush()
        reply = self.read(child)
        self.assertEqual(reply, {"protocol": 1, "event": "reply", "id": 7,
                                "generation": 3, "result": {"cipher": "AQ", "value": 177,
                                "projection": "value_hash_v1", "latitude": 12.851504, "longitude": 20.991909}})
        for request in [{"protocol": 2, "operation": "probe"},
                        {"protocol": 1, "operation": "find_clicks"},
                        {"protocol": 1, "operation": "probe", "path": "forbidden"},
                        {"protocol": 1, "operation": "probe", "id": True, "generation": 1}]:
            child.stdin.write(json.dumps(request) + "\n")
            child.stdin.flush()
            self.assertEqual(self.read(child)["error"], "invalid-gate-request")
        child.stdin.close()
        self.assertEqual(child.wait(timeout=5), 0)


if __name__ == "__main__":
    unittest.main()
