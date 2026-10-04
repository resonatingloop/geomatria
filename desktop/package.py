"""Make a relocatable gate artifact; no checkout, venv, Node, or server at runtime."""
from pathlib import Path
import hashlib
import json
import shutil
import tarfile

DESKTOP = Path(__file__).resolve().parent
output = DESKTOP / "artifacts/geogematria-desktop-gate"
if output.exists():
    shutil.rmtree(output)  # This exact generated directory is owned by this script.
(output / "bin").mkdir(parents=True)
shutil.copy2(DESKTOP / "src-tauri/target/debug/geogematria-desktop-gate", output / "bin")
product = json.loads((DESKTOP / "src-tauri/tauri.conf.json").read_text())["productName"]
shutil.copytree(DESKTOP / "sidecar/dist/geogematria-engine", output / "lib" / product / "engine")
files = sorted(p for p in output.rglob("*") if p.is_file())
for p in files:
    if p.suffix.lower() in {".db", ".sqlite", ".sqlite3", ".env"} or "studies" in p.parts:
        raise RuntimeError("prohibited package input")
inventory = [{"file": str(p.relative_to(output)), "bytes": p.stat().st_size,
              "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
(DESKTOP / "artifacts/package-inventory.json").write_text(json.dumps(inventory, indent=2) + "\n")
archive = DESKTOP / "artifacts/geogematria-desktop-gate-linux-x86_64.tar.gz"
with tarfile.open(archive, "w:gz") as tar:
    tar.add(output, arcname=output.name)
print(json.dumps({"artifact": str(archive), "binary": str(output / "bin" / output.name),
                  "files": len(files), "sha256": hashlib.sha256(archive.read_bytes()).hexdigest()}))
