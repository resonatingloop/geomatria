"""Live atlas layer generation."""

from __future__ import annotations

from geogematria.geojson import cluster_collection
from geogematria.live_adapter import GlossololarySource
from geogematria.models import Cluster
from geogematria.projection import project_value

LIVE_CLIQUEMAP_MODE = "cliquemap"
LIVE_CIPHER = "AQ"
LIVE_PROJECTION_METHOD = "value_hash_v1"


def live_manifest_entries() -> list[dict]:
    """Return supported live layer metadata in static-manifest shape."""
    return [
        {
            "id": "live.aq.value_hash_v1.cliquemap",
            "source": "live",
            "mode": LIVE_CLIQUEMAP_MODE,
            "mode_label": "cliquemap",
            "render_mode": LIVE_CLIQUEMAP_MODE,
            "search_kind": "phrase",
            "cipher": LIVE_CIPHER,
            "cipher_label": LIVE_CIPHER,
            "transform_family": "hash",
            "transform_family_label": "hash scatter",
            "projection_method": LIVE_PROJECTION_METHOD,
            "projection_label": "value hash v1",
            "projection_description": "Live local cliquemap from glossololary.",
            "dataset_label": "live value hash v1",
            "file": "/api/layers/cliquemap?cipher=aq&projection_method=value_hash_v1",
        }
    ]


def is_supported_live_layer(mode: str, cipher: str, projection_method: str) -> bool:
    return (
        mode == LIVE_CLIQUEMAP_MODE
        and cipher.upper() == LIVE_CIPHER
        and projection_method == LIVE_PROJECTION_METHOD
    )


def live_cliquemap_geojson(
    source: GlossololarySource,
    *,
    cipher: str = "aq",
    projection_method: str = LIVE_PROJECTION_METHOD,
) -> dict:
    """Build the v1c allowlisted live cliquemap FeatureCollection."""
    if not is_supported_live_layer(LIVE_CLIQUEMAP_MODE, cipher, projection_method):
        raise ValueError("unsupported live cliquemap selection")

    clusters = [
        Cluster(
            cipher=LIVE_CIPHER,
            value=value,
            point=project_value(LIVE_CIPHER, value, projection_id=projection_method),
            phrases=phrases,
        )
        for value, phrases in source.iter_clusters(LIVE_CIPHER)
    ]
    collection = cluster_collection(clusters)
    collection["metadata"] = {
        "source": "live",
        "mode": LIVE_CLIQUEMAP_MODE,
        "render_mode": LIVE_CLIQUEMAP_MODE,
        "cipher": LIVE_CIPHER,
        "projection_method": projection_method,
        "summary": {
            "clique_count": len(clusters),
            "phrase_count": sum(len(cluster.phrases) for cluster in clusters),
        },
    }
    return collection
