"""Aggregate only observed gate evidence; never manufacture missing states."""
from pathlib import Path
import hashlib
import json
import re
import tarfile

HERE = Path(__file__).resolve().parent
proof = HERE / "evidence"
archive = HERE / "artifacts/geogematria-desktop-gate-linux-x86_64.tar.gz"
with tarfile.open(archive) as tar:
    files = [m.name for m in tar.getmembers() if m.isfile()]
assert len(files) == 33
assert not [name for name in files if Path(name).suffix.lower() in {".db", ".sqlite", ".sqlite3", ".env"}]
rows = []
for name in ("native-corrected.log", "native-timeout.log", "native-startup-close.log"):
    rows.extend(json.loads(line.removeprefix("GATE ")) for line in (proof / name).read_text().splitlines() if line.startswith("GATE "))
renderers = [row["report"] for row in rows if row["kind"] == "renderer"]
owned_pids = sorted({row["state"]["pid"] for row in rows if "state" in row and row["state"]["pid"] is not None})
assert not [pid for pid in owned_pids if Path(f"/proc/{pid}").exists()]
counts = {}
for name, pattern in (
    ("python-tests.log", r"Ran (\d+) tests"),
    ("frozen-tests.log", r"Ran (\d+) tests"),
    ("rust-tests.log", r"test result: ok\. (\d+) passed"),
    ("frontend-tests.log", r"pass (\d+)"),
    ("desktop-model-tests.log", r"pass (\d+)"),
):
    match = re.search(pattern, (proof / name).read_text())
    assert match, f"Missing test result in {name}"
    counts[name] = int(match.group(1))
result = {
    "gate_passed": False,
    "blocker": "native Retry engine click denied; no retry or input bypass performed",
    "unverified": ["native flat-to-globe", "native selection/readout", "native theme switch", "packaged GUI retry"],
    "artifact": {"path": str(archive), "bytes": archive.stat().st_size,
                 "sha256": hashlib.sha256(archive.read_bytes()).hexdigest(), "files": len(files)},
    "tests": counts,
    "renderer_variants_observed": sorted({r["surface"] + "/" + r["theme"] for r in renderers}),
    "webgl2_observed": any(r["webgl2"] and not r["context_lost"] and r["distinct_colors"] > 1 for r in renderers),
    "max_distinct_sampled_colors": max(r["distinct_colors"] for r in renderers),
    "owned_engine_pids_observed": owned_pids,
    "owned_orphans": [],
    "native_closes": [json.loads((proof / name).read_text()) for name in (
        "native-close-ready.json", "native-close-timeout.json", "native-close-starting.json")],
}
(proof / "gate-summary.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
