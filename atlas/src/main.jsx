import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  EMPTY_COLLECTION,
  VALUE_DOMAIN_MODE,
  atlasSummary,
  buildProjectedLoci,
  domainHeatmapCollection,
  findPhraseMatches,
  findValueMatches,
  getFeatureKey,
  markerSize,
  validateAtlas,
  validateManifest,
} from "./atlasData.js";
import {
  HEATMAP_MODE,
  getAvailableCiphers,
  getAvailableDatasets,
  getAvailableModes,
  getAvailableTransformFamilies,
  getDefaultDataset,
  isSelectableDataset,
  normalizeManifestEntry,
} from "./atlasManifest.js";
import {
  MAP_SEARCH_ZOOM,
  NAVIGATION_CONTROL_OPTIONS,
  create2DMapOptions,
  lockMapTo2D,
} from "./map2d.js";
import "./styles.css";

const MANIFEST_URL = "/data/manifest.json";
const LIVE_MANIFEST_URL = "/api/live-manifest";
const SOURCE_STATIC = "static";
const SOURCE_LIVE = "live";
const DOMAIN_HEAT_SOURCE_ID = "value-domain-source";
const DOMAIN_HEAT_LAYER_ID = "value-domain-heat";
const DOMAIN_PHRASE_LAYER_ID = "value-domain-phrases";

function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const unlock2DMapRef = useRef(null);
  const [staticManifest, setStaticManifest] = useState([]);
  const [liveManifest, setLiveManifest] = useState([]);
  const [liveManifestError, setLiveManifestError] = useState("");
  const [selectedSource, setSelectedSource] = useState(SOURCE_STATIC);
  const [selectedMode, setSelectedMode] = useState("");
  const [selectedCipher, setSelectedCipher] = useState("");
  const [selectedTransformFamily, setSelectedTransformFamily] = useState("");
  const [selectedDatasetFile, setSelectedDatasetFile] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [atlas, setAtlas] = useState(EMPTY_COLLECTION);
  const [selectedLocus, setSelectedLocus] = useState(null);
  const [selectedLocusKey, setSelectedLocusKey] = useState("");
  const [selectedFeatureKey, setSelectedFeatureKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadState, setLoadState] = useState({ status: "loading", message: "" });

  function applyDatasetSelection(dataset) {
    setSelectedMode(dataset?.mode ?? "");
    setSelectedCipher(dataset?.cipher ?? "");
    setSelectedTransformFamily(dataset?.transform_family ?? "");
    setSelectedDatasetFile(dataset?.file ?? "");
  }

  function selectDefaultDataset(filters) {
    applyDatasetSelection(getDefaultDataset(manifest, filters));
  }

  useEffect(() => {
    let isMounted = true;

    fetch(MANIFEST_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Manifest request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        validateManifest(data);
        if (isMounted) {
          const normalizedManifest = data.map(normalizeManifestEntry);
          setStaticManifest(normalizedManifest);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setLoadState({ status: "error", message: error.message });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch(LIVE_MANIFEST_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Live manifest request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (isMounted) {
          setLiveManifest(data.map((entry) => normalizeManifestEntry(entry)));
          setLiveManifestError("");
        }
      })
      .catch((error) => {
        if (isMounted) {
          setLiveManifest([]);
          setLiveManifestError(error.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const manifest = useMemo(
    () => (selectedSource === SOURCE_LIVE ? liveManifest : staticManifest),
    [liveManifest, selectedSource, staticManifest]
  );
  const summary = useMemo(() => atlasSummary(atlas), [atlas]);
  const activeManifestEntry = useMemo(
    () => manifest.find((entry) => entry.file === selectedDatasetFile),
    [manifest, selectedDatasetFile]
  );
  const isUnsupportedDataset =
    activeManifestEntry && !isSelectableDataset(activeManifestEntry);
  const renderMode = activeManifestEntry?.render_mode ?? "";
  const searchKind = activeManifestEntry?.search_kind ?? "phrase";
  const isHeatmapMode = renderMode === HEATMAP_MODE;
  const isValueSearch = searchKind === "value";
  const projectedLoci = useMemo(() => buildProjectedLoci(atlas), [atlas]);
  const markerLoci = useMemo(
    () =>
      isHeatmapMode
        ? projectedLoci.filter((locus) => locus.totalPhraseCount > 0)
        : projectedLoci,
    [isHeatmapMode, projectedLoci]
  );
  const heatmapCollection = useMemo(
    () => (isHeatmapMode ? domainHeatmapCollection(atlas) : EMPTY_COLLECTION),
    [atlas, isHeatmapMode]
  );
  const locusByFeatureKey = useMemo(() => {
    const byFeatureKey = new Map();
    for (const locus of projectedLoci) {
      for (const clique of locus.cliques) {
        byFeatureKey.set(clique.featureKey, locus);
      }
    }
    return byFeatureKey;
  }, [projectedLoci]);

  useEffect(() => {
    if (manifest.length === 0) {
      if (selectedSource === SOURCE_LIVE) {
        setAtlas(EMPTY_COLLECTION);
        setLoadState({
          status: "error",
          message: "live source unavailable",
        });
      }
      return;
    }

    if (!manifest.some((entry) => entry.file === selectedDatasetFile)) {
      applyDatasetSelection(getDefaultDataset(manifest));
    }
  }, [manifest, selectedDatasetFile, selectedSource]);

  useEffect(() => {
    if (!selectedDatasetFile || manifest.length === 0) {
      return;
    }

    let isMounted = true;
    const entry = manifest.find((item) => item.file === selectedDatasetFile);
    if (!entry) {
      setLoadState({
        status: "error",
        message: `Unknown atlas export: ${selectedDatasetFile}`,
      });
      return;
    }
    if (!isSelectableDataset(entry)) {
      setAtlas(EMPTY_COLLECTION);
      setLoadState({
        status: "error",
        message: `Unsupported atlas dataset mode: ${entry.mode}`,
      });
      return;
    }

    setLoadState({ status: "loading", message: "" });
    setSelectedLocus(null);
    setSelectedLocusKey("");
    setSelectedFeatureKey("");
    setSearchQuery("");

    fetch(entry.file)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`GeoJSON request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        validateAtlas(data);
        if (isMounted) {
          setAtlas(data);
          setLoadState({ status: "ready", message: "" });
        }
      })
      .catch((error) => {
        if (isMounted) {
          setAtlas(EMPTY_COLLECTION);
          setLoadState({ status: "error", message: error.message });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [manifest, refreshNonce, selectedDatasetFile]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    mapRef.current = new maplibregl.Map(
      create2DMapOptions(mapContainerRef.current, {
        version: 8,
        sources: {
          "osm-raster": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        },
        layers: [
          {
            id: "osm-raster",
            type: "raster",
            source: "osm-raster",
          },
        ],
      })
    );

    unlock2DMapRef.current = lockMapTo2D(mapRef.current);
    mapRef.current.addControl(
      new maplibregl.NavigationControl(NAVIGATION_CONTROL_OPTIONS),
      "top-right"
    );

    return () => {
      unlock2DMapRef.current?.();
      unlock2DMapRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    updateDomainHeatmap(map, heatmapCollection);
    return () => removeDomainHeatmap(map);
  }, [heatmapCollection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    markersRef.current.forEach((entry) => entry.marker.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    let hasBounds = false;

    for (const locus of markerLoci) {
      const markerNode = document.createElement("button");
      markerNode.type = "button";
      markerNode.className = isHeatmapMode
        ? "atlas-marker atlas-marker--domain"
        : "atlas-marker";
      markerNode.dataset.locusKey = locus.locusKey;
      markerNode.style.setProperty("--marker-size", `${markerSize(locus.totalPhraseCount)}px`);
      markerNode.setAttribute(
        "aria-label",
        isHeatmapMode
          ? `${locus.valuesWithPhrases} values with phrases at heat locus, ${locus.totalPhraseCount} phrases`
          : `${locus.cliques.length} cliques at projected locus, ${locus.totalPhraseCount} phrases`
      );
      markerNode.addEventListener("click", () => {
        selectProjectedLocus(locus);
      });

      const marker = new maplibregl.Marker({ element: markerNode, anchor: "center" })
        .setLngLat([locus.longitude, locus.latitude])
        .addTo(map);

      markersRef.current.push({ marker, markerNode, locusKey: locus.locusKey });
      bounds.extend([locus.longitude, locus.latitude]);
      hasBounds = true;
    }

    if (hasBounds) {
      map.fitBounds(bounds, { padding: 80, maxZoom: 4, duration: 0, bearing: 0, pitch: 0 });
    }
  }, [isHeatmapMode, markerLoci]);

  useEffect(() => {
    for (const entry of markersRef.current) {
      entry.markerNode.classList.toggle(
        "atlas-marker--selected",
        entry.locusKey === selectedLocusKey
      );
    }
  }, [selectedLocusKey]);

  const modeOptions = useMemo(() => getAvailableModes(manifest), [manifest]);
  const cipherOptions = useMemo(
    () => getAvailableCiphers(manifest, selectedMode),
    [manifest, selectedMode]
  );
  const transformFamilyOptions = useMemo(
    () => getAvailableTransformFamilies(manifest, selectedMode, selectedCipher),
    [manifest, selectedMode, selectedCipher]
  );
  const datasetOptions = useMemo(() => {
    return getAvailableDatasets(
      manifest,
      selectedMode,
      selectedCipher,
      selectedTransformFamily
    );
  }, [manifest, selectedMode, selectedCipher, selectedTransformFamily]);
  const searchMatches = useMemo(
    () =>
      isValueSearch
        ? findValueMatches(atlas, searchQuery)
        : findPhraseMatches(atlas, searchQuery),
    [atlas, isValueSearch, searchQuery]
  );

  function selectProjectedLocus(locus, { zoom = false, featureKey = "" } = {}) {
    setSelectedLocus(locus);
    setSelectedLocusKey(locus?.locusKey ?? "");
    setSelectedFeatureKey(featureKey);

    if (zoom && mapRef.current && locus) {
      mapRef.current.flyTo({
        center: [locus.longitude, locus.latitude],
        zoom: Math.max(mapRef.current.getZoom(), MAP_SEARCH_ZOOM),
        bearing: 0,
        pitch: 0,
        duration: 650,
      });
    }
  }

  return (
    <main className="atlas-shell">
      <header className="atlas-header">
        <div className="brand-lockup">
          <p className="eyebrow">static instrument</p>
          <h1>geogematria atlas</h1>
        </div>
        <div className="atlas-controls" aria-label="Atlas controls">
          <div className="control-card">
            <label className="field-control field-control--mode">
              <span>map mode</span>
              <select
                value={selectedMode}
                onChange={(event) =>
                  selectDefaultDataset({ mode: event.target.value })
                }
                disabled={modeOptions.length === 0}
              >
                {modeOptions.length === 0 ? (
                  <option value="">no supported modes</option>
                ) : (
                  modeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="field-control field-control--cipher">
              <span>cipher</span>
              <select
                value={selectedCipher}
                onChange={(event) =>
                  selectDefaultDataset({
                    mode: selectedMode,
                    cipher: event.target.value,
                  })
                }
                disabled={cipherOptions.length === 0}
              >
                {cipherOptions.length === 0 ? (
                  <option value="">no ciphers</option>
                ) : (
                  cipherOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="field-control field-control--family">
              <span>family</span>
              <select
                value={selectedTransformFamily}
                onChange={(event) =>
                  selectDefaultDataset({
                    mode: selectedMode,
                    cipher: selectedCipher,
                    transformFamily: event.target.value,
                  })
                }
                disabled={transformFamilyOptions.length === 0}
              >
                {transformFamilyOptions.length === 0 ? (
                  <option value="">no families</option>
                ) : (
                  transformFamilyOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="field-control field-control--projection">
              <span>dataset</span>
              <select
                value={selectedDatasetFile}
                onChange={(event) => setSelectedDatasetFile(event.target.value)}
                disabled={datasetOptions.length === 0}
              >
                {datasetOptions.length === 0 ? (
                  <option value="">no datasets</option>
                ) : (
                  datasetOptions.map((entry) => (
                    <option key={entry.file} value={entry.file}>
                      {datasetLabel(entry)}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="field-control search-control">
              <span>{isValueSearch ? "search values" : "search phrases"}</span>
              <input
                type={isValueSearch ? "number" : "search"}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={isValueSearch ? "333" : "resonating loop"}
                min={activeManifestEntry?.value_range?.[0]}
                max={activeManifestEntry?.value_range?.[1]}
                disabled={loadState.status !== "ready"}
              />
            </label>
          </div>
        </div>
        <div className="atlas-meta">
          <div className="source-controls" aria-label="Atlas source controls">
            <div className="source-toggle">
              <span>source</span>
              <button
                type="button"
                className={selectedSource === SOURCE_STATIC ? "source-toggle__button source-toggle__button--active" : "source-toggle__button"}
                onClick={() => setSelectedSource(SOURCE_STATIC)}
              >
                static
              </button>
              <button
                type="button"
                className={selectedSource === SOURCE_LIVE ? "source-toggle__button source-toggle__button--active" : "source-toggle__button"}
                onClick={() => setSelectedSource(SOURCE_LIVE)}
                disabled={liveManifest.length === 0}
                title={liveManifestError || "live local source"}
              >
                live
              </button>
            </div>
            <button
              type="button"
              className="refresh-button"
              onClick={() => setRefreshNonce((value) => value + 1)}
              disabled={loadState.status === "loading" || !activeManifestEntry}
            >
              refresh
            </button>
          </div>
          {liveManifestError && (
            <p className="projection-description projection-description--error">
              live source unavailable
            </p>
          )}
          {activeManifestEntry?.projection_description && (
            <p className="projection-description">{activeManifestEntry.projection_description}</p>
          )}
          {isUnsupportedDataset && (
            <p className="projection-description projection-description--error">
              Unsupported dataset mode: {activeManifestEntry.mode}
            </p>
          )}
          <div className="status-strip" aria-live="polite">
            <span><b>source</b>{selectedSource}</span>
            <span><b>mode</b>{activeManifestEntry?.mode_label ?? selectedMode ?? "..."}</span>
            <span><b>render</b>{activeManifestEntry?.render_mode ?? "..."}</span>
            <span><b>cipher</b>{activeManifestEntry?.cipher_label ?? selectedCipher ?? "..."}</span>
            <span><b>family</b>{activeManifestEntry?.transform_family_label ?? selectedTransformFamily ?? "..."}</span>
            <span><b>projection</b>{activeManifestEntry?.projection_method ?? "..."}</span>
            {isHeatmapMode ? (
              <>
                <span><b>values</b>{summary.domainValueCount}</span>
                <span><b>loci</b>{summary.projectedLocusCount}</span>
                <span><b>occupied</b>{summary.valuesWithPhrases}</span>
              </>
            ) : (
              <span><b>cliques</b>{summary.cliqueCount}</span>
            )}
            <span><b>phrases</b>{summary.phraseCount}</span>
            <span className="status-strip__path" title={activeManifestEntry?.file ?? MANIFEST_URL}>
              <b>dataset</b>{activeManifestEntry?.file ?? MANIFEST_URL}
            </span>
          </div>
        </div>
      </header>

      <section className="atlas-workspace">
        <div className="map-panel">
          <div ref={mapContainerRef} className="map-canvas" />
          {loadState.status !== "ready" && (
            <div className={`map-overlay map-overlay--${loadState.status}`}>
              {loadState.status === "loading" ? "Loading atlas data" : loadState.message}
            </div>
          )}
        </div>

        <aside className="side-panel">
          <SearchResults
            query={searchQuery}
            matches={searchMatches}
            searchKind={searchKind}
            selectedLocusKey={selectedLocusKey}
            locusByFeatureKey={locusByFeatureKey}
            onSelect={(match) => {
              const locus = locusByFeatureKey.get(
                getFeatureKey(match.feature, match.featureIndex)
              );
              selectProjectedLocus(locus, {
                zoom: true,
                featureKey: getFeatureKey(match.feature, match.featureIndex),
              });
            }}
          />
          <LocusPanel locus={selectedLocus} selectedFeatureKey={selectedFeatureKey} />
        </aside>
      </section>
    </main>
  );
}

function updateDomainHeatmap(map, collection) {
  const render = () => {
    removeDomainHeatmap(map);

    if (!collection.features.length) {
      return;
    }

    map.addSource(DOMAIN_HEAT_SOURCE_ID, {
      type: "geojson",
      data: collection,
    });
    map.addLayer({
      id: DOMAIN_HEAT_LAYER_ID,
      type: "heatmap",
      source: DOMAIN_HEAT_SOURCE_ID,
      maxzoom: 8,
      paint: {
        "heatmap-weight": ["interpolate", ["linear"], ["get", "heat_weight"], 0, 0, 1, 1],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 1, 0.85, 6, 1.9],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 1, 18, 5, 30, 8, 46],
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.72, 8, 0.5],
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(47, 117, 109, 0)",
          0.2,
          "rgba(47, 117, 109, 0.44)",
          0.45,
          "rgba(176, 108, 48, 0.58)",
          0.7,
          "rgba(171, 74, 43, 0.74)",
          1,
          "rgba(99, 38, 31, 0.86)",
        ],
      },
    });
    map.addLayer({
      id: DOMAIN_PHRASE_LAYER_ID,
      type: "circle",
      source: DOMAIN_HEAT_SOURCE_ID,
      filter: [">", ["get", "phrase_weight"], 0],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["get", "phrase_weight"], 1, 2.5, 8, 7],
        "circle-color": "#2f756d",
        "circle-opacity": 0.32,
        "circle-stroke-color": "#fffbee",
        "circle-stroke-width": 0.8,
        "circle-stroke-opacity": 0.55,
      },
    });
  };

  if (map.loaded?.()) {
    render();
  } else {
    map.once?.("load", render);
  }
}

function removeDomainHeatmap(map) {
  for (const layerId of [DOMAIN_PHRASE_LAYER_ID, DOMAIN_HEAT_LAYER_ID]) {
    if (map.getLayer?.(layerId)) {
      map.removeLayer(layerId);
    }
  }
  if (map.getSource?.(DOMAIN_HEAT_SOURCE_ID)) {
    map.removeSource(DOMAIN_HEAT_SOURCE_ID);
  }
}

function datasetLabel(entry) {
  return entry.dataset_label ?? entry.projection_label ?? entry.file;
}

function SearchResults({
  query,
  matches,
  searchKind,
  selectedLocusKey,
  locusByFeatureKey,
  onSelect,
}) {
  if (!query.trim()) {
    return null;
  }

  const isValueSearch = searchKind === "value";

  return (
    <section
      className="search-results"
      aria-label={isValueSearch ? "Value search results" : "Phrase search results"}
    >
      <div className="section-heading">
        <h2>{isValueSearch ? "Value matches" : "Phrase matches"}</h2>
        <span>{matches.length}</span>
      </div>
      {matches.length > 0 ? (
        <ol>
          {matches.map((match) => (
            <li key={match.id}>
              <button
                type="button"
                className={
                  locusByFeatureKey.get(getFeatureKey(match.feature, match.featureIndex))
                    ?.locusKey === selectedLocusKey
                    ? "search-result--selected"
                    : ""
                }
                onClick={() => onSelect(match)}
              >
                <span className="match-phrase">{match.phrase}</span>
                <span className="match-meta">
                  {isValueSearch
                    ? `${match.details.cliqueKind} | ${match.details.cliqueSize} phrases`
                    : `${match.details.cipher} ${match.details.value} ${match.details.cliqueKind} | ${match.details.cliqueSize} phrases`}
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-phrases">
          {isValueSearch ? "No value matches." : "No phrase matches."}
        </p>
      )}
    </section>
  );
}

function LocusPanel({ locus, selectedFeatureKey }) {
  if (!locus) {
    return (
      <section className="feature-panel feature-panel--empty">
        <div className="empty-card">
          <p className="eyebrow">projected locus</p>
          <p>Select a projected locus.</p>
        </div>
      </section>
    );
  }

  const hasCollision = locus.cliques.length > 1;
  const isValueDomainLocus = locus.cliques.some(
    (clique) => clique.details.mode === VALUE_DOMAIN_MODE
  );
  const visibleCliques = isValueDomainLocus
    ? visibleDomainCliques(locus.cliques, selectedFeatureKey)
    : locus.cliques;
  const visibleCollision = visibleCliques.length > 1;

  return (
    <section className="feature-panel">
      <article className="locus-card">
        <div className="locus-card__header">
          <div>
            <p className="eyebrow">
              {isValueDomainLocus ? "heat locus" : "projected locus"}
            </p>
            <h2>
              {isValueDomainLocus
                ? heatLocusTitle(locus)
                : visibleCollision
                  ? "multiple cliques"
                  : cliqueTitle(visibleCliques[0])}
            </h2>
          </div>
          <span className="type-badge">
            {isValueDomainLocus
              ? `${locus.valuesWithPhrases} occupied`
              : visibleCollision
                ? `${visibleCliques.length} cliques`
                : visibleCliques[0].details.cliqueKind}
          </span>
        </div>

        <dl className="detail-grid">
          {isValueDomainLocus ? (
            <>
              <div>
                <dt>Domain values here</dt>
                <dd>{locus.domainValueCount}</dd>
              </div>
              <div>
                <dt>Values with phrases</dt>
                <dd>{locus.valuesWithPhrases}</dd>
              </div>
            </>
          ) : (
            <div>
              <dt>Locus occupancy</dt>
              <dd>{locus.cliques.length} {locus.cliques.length === 1 ? "clique" : "cliques"}</dd>
            </div>
          )}
          <div>
            <dt>Projection method</dt>
            <dd>{locus.projectionMethod}</dd>
          </div>
          <div>
            <dt>Google Maps</dt>
            <dd>{locus.googleMapsCopy}</dd>
          </div>
          {locus.snappedPlace && (
            <div>
              <dt>Snapped place</dt>
              <dd>
                {locus.snappedPlace.name}, {locus.snappedPlace.country}
              </dd>
            </div>
          )}
          {locus.snapDistanceSummary && (
            <div>
              <dt>Snap distance</dt>
              <dd>{formatSnapDistanceSummary(locus.snapDistanceSummary)}</dd>
            </div>
          )}
        </dl>

        {locus.snappedPlace && (
          <p className="locus-note locus-note--place">
            Place-snapped locus from an offline gazetteer. Distinct cliques may
            share this town coordinate.
          </p>
        )}

        <details className="debug-details">
          <summary>Coordinate debug</summary>
          <dl className="detail-grid detail-grid--debug">
            <div>
              <dt>GeoJSON</dt>
              <dd>{locus.geoJsonCopy}</dd>
            </div>
            {locus.baseCoordinate && (
              <div>
                <dt>Original hash coordinate</dt>
                <dd>{locus.baseCoordinate.googleMapsCopy}</dd>
              </div>
            )}
          </dl>
        </details>

        {isValueDomainLocus && (
          <p className="locus-note locus-note--domain">
            The heat layer counts every exported integer value at this coordinate.
            The list below only shows values that have phrase occupancy.
          </p>
        )}

        {!isValueDomainLocus && hasCollision && (
          <p className="locus-note">
            This projected locus contains multiple cliques because distinct cipher values
            share the same projected coordinate.
          </p>
        )}

        <div className="clique-stack">
          {visibleCliques.map((clique) => (
            <CliqueCard key={clique.featureKey} clique={clique} collapsed={visibleCollision} />
          ))}
        </div>
      </article>
    </section>
  );
}

function CliqueCard({ clique, collapsed }) {
  const { details } = clique;
  const content = (
    <div className="phrase-card">
      <div className="section-heading">
        <h3>Phrases</h3>
        <span>{details.phrases.length}</span>
      </div>
      {details.phrases.length > 0 ? (
        <ul>
          {details.phrases.map((phrase, index) => (
            <li key={`${phrase}-${index}`}>{phrase}</li>
          ))}
        </ul>
      ) : (
        <p className="empty-phrases">
          {details.mode === VALUE_DOMAIN_MODE
            ? "No phrases for this value."
            : "No phrases in export."}
        </p>
      )}
    </div>
  );

  return (
    <section className="clique-card">
      <div className="clique-card__header">
        <div>
          <p className="eyebrow">
            {details.mode === VALUE_DOMAIN_MODE ? "domain value" : "clique"}
          </p>
          <h3>{cliqueTitle(clique)}</h3>
        </div>
        <span className="type-badge">{details.cliqueKind}</span>
      </div>
      <dl className="detail-grid detail-grid--compact">
        <div>
          <dt>{details.mode === VALUE_DOMAIN_MODE ? "Phrase count" : "Clique size"}</dt>
          <dd>{details.cliqueSize}</dd>
        </div>
      </dl>
      {collapsed ? (
        <details className="clique-phrases">
          <summary>Show phrases</summary>
          {content}
        </details>
      ) : (
        content
      )}
    </section>
  );
}

function cliqueTitle(clique) {
  return `${clique.details.cipher.toLowerCase()} ${clique.details.value}`;
}

function heatLocusTitle(locus) {
  const place = locus.snappedPlace
    ? `${locus.snappedPlace.name}, ${locus.snappedPlace.country}`
    : locus.googleMapsCopy;
  return `${locus.domainValueCount} values at ${place}`;
}

function visibleDomainCliques(cliques, selectedFeatureKey) {
  const visible = cliques.filter((clique) => clique.details.hasPhrases);
  if (
    selectedFeatureKey &&
    !visible.some((clique) => clique.featureKey === selectedFeatureKey)
  ) {
    const selected = cliques.find((clique) => clique.featureKey === selectedFeatureKey);
    if (selected) {
      return [selected, ...visible];
    }
  }

  return visible;
}

function formatDistance(distanceKm) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(distanceKm)} km`;
}

function formatSnapDistanceSummary(summary) {
  if (summary.count <= 1 || summary.min === summary.max) {
    return formatDistance(summary.average);
  }

  return `avg ${formatDistance(summary.average)} / max ${formatDistance(summary.max)}`;
}

createRoot(document.getElementById("root")).render(<App />);
