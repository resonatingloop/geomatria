"""Real packaged startup/close probe, on the current X11 display, no input focus."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

binary = Path(sys.argv[1]).resolve()
proof_dir = Path(sys.argv[2]).resolve()
proof_dir.mkdir(parents=True, exist_ok=True)
env = {k: v for k, v in os.environ.items() if k in {
    "DISPLAY", "DBUS_SESSION_BUS_ADDRESS", "XDG_RUNTIME_DIR", "HOME", "TMPDIR"}}
env.update(PATH="/usr/bin:/bin", LANG="C.UTF-8", GDK_BACKEND="x11",
           GEOGEMATRIA_GATE_STARTUP_DELAY="30", XDG_DATA_HOME=str(proof_dir / "xdg-data"))
start = time.monotonic()
with (proof_dir / "native-startup-close.log").open("w") as log:
    child = subprocess.Popen([str(binary)], cwd=os.environ["TMPDIR"], env=env, stdout=log, stderr=log)
    try:
        window = None
        until = start + 8
        while time.monotonic() < until:
            tree = subprocess.check_output(["xwininfo", "-root", "-tree"], env=env, text=True)
            candidates = re.findall(r'(0x[0-9a-f]+) "Geogematria · renderer / owned-engine gate"', tree)
            for candidate in candidates:
                prop = subprocess.check_output(["xprop", "-id", candidate, "_NET_WM_PID"], env=env, text=True)
                if prop.strip().split("=")[-1].strip() == str(child.pid):
                    window = int(candidate, 16)
                    break
            if window:
                text = (proof_dir / "native-startup-close.log").read_text()
                if '"phase":"starting"' in text:
                    break
            time.sleep(0.05)
        if not window or '"phase":"starting"' not in (proof_dir / "native-startup-close.log").read_text():
            raise RuntimeError("did not observe mapped startup shell before deadline")
        mapped = subprocess.check_output(["xwininfo", "-id", str(window)], env=env, text=True)
        if "IsViewable" not in mapped:
            raise RuntimeError("native window not mapped")
        (proof_dir / "native-startup-mapped.txt").write_text(mapped)
        result = subprocess.check_output([sys.executable, str(Path(__file__).with_name("native_close.py")),
                                          str(child.pid), str(window)], env=env, text=True)
        proof = json.loads(result)
        proof["elapsed_seconds"] = time.monotonic() - start
        proof["starting_observed"] = True
        if not proof["owned_engine_pids"] or proof["elapsed_seconds"] >= 12:
            raise RuntimeError("close was not during owned-child startup")
        (proof_dir / "native-close-starting.json").write_text(json.dumps(proof, indent=2) + "\n")
        print(json.dumps(proof))
        child.wait(timeout=5)
    finally:
        if child.poll() is None:
            child.terminate()
            child.wait(timeout=5)
