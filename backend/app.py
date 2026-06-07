"""Local-only FastAPI backend for live geogematria layers."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query

from geogematria.adapter import DEFAULT_DB_PATH
from geogematria.live_adapter import GlossololaryLiveAdapter, GlossololarySource
from geogematria.layers import (
    LIVE_CLIQUEMAP_MODE,
    LIVE_PROJECTION_METHOD,
    is_supported_live_layer,
    live_cliquemap_geojson,
    live_manifest_entries,
)

app = FastAPI(title="geogematria local backend")


def _db_path() -> Path:
    return Path(os.environ.get("GEOGEMATRIA_GLOSSOLOLARY_DB", str(DEFAULT_DB_PATH)))


def get_live_source() -> GlossololarySource:
    db_path = _db_path()
    if not db_path.exists():
        raise HTTPException(status_code=503, detail="live source unavailable")

    try:
        return GlossololaryLiveAdapter(db_path=db_path)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="live source unavailable") from exc


@app.get("/api/live-manifest")
def api_live_manifest(source: GlossololarySource = Depends(get_live_source)) -> list[dict]:
    return live_manifest_entries()


@app.get("/api/layers/cliquemap")
def api_live_cliquemap(
    cipher: str = Query("aq"),
    projection_method: str = Query(LIVE_PROJECTION_METHOD),
    source: GlossololarySource = Depends(get_live_source),
) -> dict:
    if not is_supported_live_layer(LIVE_CLIQUEMAP_MODE, cipher, projection_method):
        raise HTTPException(status_code=404, detail="unsupported live dataset")

    try:
        return live_cliquemap_geojson(
            source,
            cipher=cipher,
            projection_method=projection_method,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="live source unavailable") from exc
