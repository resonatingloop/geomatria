"""Send a native WM close ONLY to a verified, owned gate window (no focus)."""
import argparse
import ctypes as c
import ctypes.util
import json
from pathlib import Path
import subprocess
import time

parser = argparse.ArgumentParser()
parser.add_argument("pid", type=int)
parser.add_argument("window_id", type=int)
args = parser.parse_args()
exe = Path(f"/proc/{args.pid}/exe").resolve()
if exe.name != "geogematria-desktop-gate":
    raise SystemExit("refusing non-gate process")
prop = subprocess.check_output(["xprop", "-id", str(args.window_id), "_NET_WM_PID"], text=True)
if prop.strip().split("=")[-1].strip() != str(args.pid):
    raise SystemExit("refusing window/PID mismatch")
children = []
for entry in Path("/proc").iterdir():
    if not entry.name.isdecimal():
        continue
    try:
        stat = (entry / "stat").read_text().rsplit(")", 1)[1].split()
        if int(stat[1]) == args.pid and (entry / "exe").resolve().name == "geogematria-engine":
            children.append(int(entry.name))
    except (FileNotFoundError, PermissionError, ProcessLookupError):
        pass
lib = c.CDLL(ctypes.util.find_library("X11"))
lib.XOpenDisplay.argtypes = [c.c_char_p]
lib.XOpenDisplay.restype = c.c_void_p
lib.XInternAtom.argtypes = [c.c_void_p, c.c_char_p, c.c_int]
lib.XInternAtom.restype = c.c_ulong
lib.XSendEvent.argtypes = [c.c_void_p, c.c_ulong, c.c_int, c.c_long, c.c_void_p]
lib.XFlush.argtypes = [c.c_void_p]
lib.XCloseDisplay.argtypes = [c.c_void_p]
class Data(c.Union):
    _fields_ = [("b", c.c_char * 20), ("s", c.c_short * 10), ("l", c.c_long * 5)]
class Client(c.Structure):
    _fields_ = [("type", c.c_int), ("serial", c.c_ulong), ("send_event", c.c_int),
                ("display", c.c_void_p), ("window", c.c_ulong), ("message_type", c.c_ulong),
                ("format", c.c_int), ("data", Data)]
class Event(c.Union):
    _fields_ = [("client", Client), ("padding", c.c_long * 24)]
display = lib.XOpenDisplay(None)
if not display:
    raise SystemExit("native X11 display unavailable")
event = Event()
event.client.type = 33
event.client.send_event = 1
event.client.display = display
event.client.window = args.window_id
event.client.message_type = lib.XInternAtom(display, b"WM_PROTOCOLS", 0)
event.client.format = 32
event.client.data.l[0] = lib.XInternAtom(display, b"WM_DELETE_WINDOW", 0)
lib.XSendEvent(display, args.window_id, 0, 0, c.byref(event))
lib.XFlush(display)
lib.XCloseDisplay(display)
def running(pid):
    try:
        return Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()[0] != "Z"
    except FileNotFoundError:
        return False

until = time.monotonic() + 10
while running(args.pid) and time.monotonic() < until:
    time.sleep(0.05)
remaining = [pid for pid in children if Path(f"/proc/{pid}").exists()]
proof = {"window_id": args.window_id, "app_pid": args.pid, "owned_engine_pids": children,
         "native_close": not running(args.pid), "owned_orphans": remaining}
print(json.dumps(proof))
if not proof["native_close"] or remaining:
    raise SystemExit(1)
