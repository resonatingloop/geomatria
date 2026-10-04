"""Build onedir: one owned process, interpreter/imports/data, no DB files."""
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
site = ROOT / "desktop/build-env/lib/python3.12/site-packages"
sys.path.insert(0, str(site))
import PyInstaller.__main__

PyInstaller.__main__.run([
    "--noconfirm", "--clean", "--onedir", "--name", "geogematria-engine",
    "--distpath", str(ROOT / "desktop/sidecar/dist"),
    "--workpath", str(ROOT / "desktop/sidecar/build"),
    "--specpath", str(ROOT / "desktop/sidecar"),
    "--paths", str(ROOT),
    "--hidden-import", "glossololary.db", "--hidden-import", "glossololary.ciphers",
    "--collect-data", "geogematria",
    str(ROOT / "desktop/sidecar/engine.py"),
])
