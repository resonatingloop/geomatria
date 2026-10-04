"""Gate-only JSON-lines engine. Public imports; no DB handle or source reads."""
import hashlib
import json
import sys


def probe():
    from geogematria.projection import project_value
    point = project_value("AQ", 177)
    return {"cipher": "AQ", "value": 177, "projection": point.projection_id,
            "latitude": point.latitude, "longitude": point.longitude}


def readiness():
    from glossololary.db import GlossololaryDB  # public import, not instantiated
    from glossololary.ciphers import resolve_cipher
    from geogematria.projection import SNAP_PROJECTION_GAZETTEERS, load_gazetteer
    assert GlossololaryDB and resolve_cipher("AQ")
    gazetteers = [{"name": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                  "places": len(load_gazetteer(path))}
                 for path in SNAP_PROJECTION_GAZETTEERS.values()]
    return {"protocol": 1, "event": "ready", "operations": ["probe"],
            "source": "not-opened", "imports": ["geogematria.projection", "glossololary.db", "glossololary.ciphers"],
            "probe": probe(), "gazetteers": gazetteers}


def emit(value):
    print(json.dumps(value, separators=(",", ":")), flush=True)


def main():
    import argparse
    import time
    parser = argparse.ArgumentParser()
    parser.add_argument("--gate-startup-delay", type=float, default=0)
    delay = parser.parse_args().gate_startup_delay
    if not 0 <= delay <= 30:
        return 2
    time.sleep(delay)
    try:
        emit(readiness())
    except Exception:
        emit({"protocol": 1, "event": "failed", "error": "packaged-import-or-gazetteer-failure"})
        return 1
    for line in sys.stdin:
        try:
            request = json.loads(line)
            if (not isinstance(request, dict) or set(request) != {"protocol", "id", "generation", "operation"}
                    or type(request["protocol"]) is not int or request["protocol"] != 1
                    or request["operation"] != "probe"
                    or any(type(request[k]) is not int or not 0 <= request[k] <= 2**31-1 for k in ("id", "generation"))):
                raise ValueError("invalid request")
            emit({"protocol": 1, "event": "reply", "id": request["id"],
                  "generation": request["generation"], "result": probe()})
        except (ValueError, TypeError, KeyError):
            emit({"protocol": 1, "event": "error", "error": "invalid-gate-request"})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
