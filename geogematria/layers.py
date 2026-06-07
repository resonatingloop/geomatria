"""Live atlas layer generation."""

from __future__ import annotations

from geogematria.geojson import cluster_collection
from geogematria.live_adapter import GlossololarySource
from geogematria.models import Cluster
from geogematria.projection import project_value

LIVE_CLIQUEMAP_MODE = "cliquemap"
LIVE_PROJECTION_METHOD = "value_hash_v1"
LIVE_CIPHERS = {
    "aq": {"cipher": "AQ", "label": "AQ"},
    "synx": {"cipher": "Synx", "label": "Synx"},
    "ordinal": {"cipher": "Ordinal", "label": "Ordinal"},
    "qwer": {"cipher": "QWER", "label": "QWER"},
    "nqwer": {"cipher": "nQWER", "label": "nQWER"},
    "reduced": {"cipher": "Reduced", "label": "Reduced"},
    "standard": {"cipher": "Standard", "label": "Standard"},
    "satanic": {"cipher": "Satanic", "label": "Satanic"},
}


def live_manifest_entries() -> list[dict]:
    """Return supported live layer metadata in static-manifest shape."""
    return [
        _live_manifest_entry(cipher_id, metadata)
        for cipher_id, metadata in LIVE_CIPHERS.items()
    ]


def is_supported_live_layer(mode: str, cipher: str, projection_method: str) -> bool:
    return (
        mode == LIVE_CLIQUEMAP_MODE
        and normalize_live_cipher(cipher) is not None
        and projection_method == LIVE_PROJECTION_METHOD
    )


def normalize_live_cipher(cipher: str) -> str | None:
    normalized = cipher.lower()
    if normalized in LIVE_CIPHERS:
        return LIVE_CIPHERS[normalized]["cipher"]
    for metadata in LIVE_CIPHERS.values():
        if cipher.upper() == metadata["cipher"].upper():
            return metadata["cipher"]
    return None


def live_cliquemap_geojson(
    source: GlossololarySource,
    *,
    cipher: str = "aq",
    projection_method: str = LIVE_PROJECTION_METHOD,
) -> dict:
    """Build the v1c allowlisted live cliquemap FeatureCollection."""
    if not is_supported_live_layer(LIVE_CLIQUEMAP_MODE, cipher, projection_method):
        raise ValueError("unsupported live cliquemap selection")

    canonical_cipher = normalize_live_cipher(cipher)
    if canonical_cipher is None:
        raise ValueError("unsupported live cliquemap selection")

    clusters = [
        Cluster(
            cipher=canonical_cipher,
            value=value,
            point=project_value(canonical_cipher, value, projection_id=projection_method),
            phrases=phrases,
        )
        for value, phrases in source.iter_clusters(canonical_cipher)
    ]
    collection = cluster_collection(clusters)
    collection["metadata"] = {
        "source": "live",
        "mode": LIVE_CLIQUEMAP_MODE,
        "render_mode": LIVE_CLIQUEMAP_MODE,
        "cipher": canonical_cipher,
        "projection_method": projection_method,
        "summary": {
            "clique_count": len(clusters),
            "phrase_count": sum(len(cluster.phrases) for cluster in clusters),
        },
    }
    return collection


def _live_manifest_entry(cipher_id: str, metadata: dict[str, str]) -> dict:
    return {
        "id": f"live.{cipher_id}.{LIVE_PROJECTION_METHOD}.cliquemap",
        "source": "live",
        "mode": LIVE_CLIQUEMAP_MODE,
        "mode_label": "cliquemap",
        "render_mode": LIVE_CLIQUEMAP_MODE,
        "search_kind": "phrase",
        "cipher": metadata["cipher"],
        "cipher_label": metadata["label"],
        "transform_family": "hash",
        "transform_family_label": "hash scatter",
        "projection_method": LIVE_PROJECTION_METHOD,
        "projection_label": "value hash v1",
        "projection_description": "Live local cliquemap from glossololary.",
        "dataset_label": f"live {metadata['label']} value hash v1",
        "file": (
            f"/api/layers/cliquemap?cipher={cipher_id}"
            f"&projection_method={LIVE_PROJECTION_METHOD}"
        ),
    }
