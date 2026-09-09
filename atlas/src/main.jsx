import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  EMPTY_COLLECTION,
  atlasSummary,
  buildProjectedLoci,
  domainHeatmapCollection,
  findPhraseMatches,
  findValueMatches,
  getFeatureKey,
  markerSize,
  resolveAssetUrl,
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
import { loadLiveManifest, responseErrorMessage } from "./atlasLive.js";
import { LocusPlate } from "./LocusPlate.jsx";
import { ReadoutTray } from "./ReadoutTray.jsx";
import { ConstellationView } from "./ConstellationView.jsx";
import { FLAT, GLOBE, STYLE_THEME_KEY, createMapPresentation, locationVisible,
  motionDuration, observeGlobeVisibility } from "./mapPresentation.js";
import { observeGlobeRelief } from "./globeRelief.js";
import "./styles.css";

// Curated GitHub Pages build: hides in-progress features (the live local
// source) so the public atlas ships only the static, polished slice.
const PUBLIC_BUILD = import.meta.env.VITE_DEPLOY_TARGET === "public";
const MANIFEST_URL = "/data/manifest.json";
const SOURCE_STATIC = "static";
const SOURCE_LIVE = "live";
const THEME_DAY = "day";
const THEME_DARK = "dark";
const THEME_STORAGE_KEY = "geogematria-theme";
const DARK_BASEMAP_STYLE_URL = "/basemap-night.json";
const DOMAIN_HEAT_SOURCE_ID = "value-domain-source";
const DOMAIN_HEAT_LAYER_ID = "value-domain-heat";
const DOMAIN_PHRASE_LAYER_ID = "value-domain-phrases";
const DOMAIN_SELECT_LAYER_ID = "value-domain-select";
const SVG_NS = "http://www.w3.org/2000/svg";
const TRI_PATH = "M50,20 L76,65 L24,65 Z";
const TRI_PATH_DENSE = "M50,23 L73,63 L27,63 Z";
const TRI_VERTICES = [[50, 20], [76, 65], [24, 65]];
const TRI_VERTICES_DENSE = [[50, 23], [73, 63], [27, 63]];
const DAY_BASEMAP_STYLE = {
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
};

function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const presentationRef = useRef(null);
  const [presentation, setPresentation] = useState(null);
  const [surface, setSurface] = useState(FLAT);
  const [surfaceError, setSurfaceError] = useState("");
  const [rendererError, setRendererError] = useState("");
  const surfaceControlRef = useRef(null);
  const [view, setView] = useState("atlas");
  const isConstellation = view === "constellation";
  const selectedLocusKeyRef = useRef("");
  const unlock2DMapRef = useRef(null);
  const apertureRef = useRef(null);
  const platePopupRef = useRef(null);
  const plateContainerRef = useRef(null);
  if (plateContainerRef.current === null && typeof document !== "undefined") {
    // Stable portal target created during render so the plate paints on the
    // first selection; maplibre's Popup adopts this node via setDOMContent.
    plateContainerRef.current = document.createElement("div");
  }

  // Marker opacity is driven through MapLibre's setOpacity() API rather than CSS:
  // MapLibre writes element.style.opacity inline on every map move, which would
  // override any CSS opacity rule. Resting loci read as ghosts; a selection snaps
  // the chosen locus to full and pushes the rest to afterimages.
  // Day/night ghost opacity values live in --marker-ghost-opacity (tokens.css);
  // we read the token at call time so theme changes take effect immediately.
  const AFTERIMAGE_OPACITY_DARK = "0.12";
  const AFTERIMAGE_OPACITY_LIGHT = "0.38";
  function markerOpacityFor(locusKey) {
    const selected = selectedLocusKeyRef.current;
    const isDarkTheme = document.documentElement.dataset.theme === THEME_DARK;
    if (!selected) {
      const ghost = getComputedStyle(document.documentElement)
        .getPropertyValue("--marker-ghost-opacity").trim();
      return ghost || (isDarkTheme ? "0.5" : "0.56");
    }
    if (locusKey === selected) return "1";
    return isDarkTheme ? AFTERIMAGE_OPACITY_DARK : AFTERIMAGE_OPACITY_LIGHT;
  }
  function applyMarkerOpacity(entry) {
    entry.marker.setOpacity(markerOpacityFor(entry.locusKey));
  }
  const [staticManifest, setStaticManifest] = useState([]);
  const [staticManifestError, setStaticManifestError] = useState("");
  const [staticManifestNonce, setStaticManifestNonce] = useState(0);
  const [liveManifest, setLiveManifest] = useState([]);
  const [liveManifestError, setLiveManifestError] = useState("");
  const [selectedSource, setSelectedSource] = useState(SOURCE_STATIC);
  const [selectedMode, setSelectedMode] = useState("");
  const [selectedCipher, setSelectedCipher] = useState("");
  const [selectedTransformFamily, setSelectedTransformFamily] = useState("");
  const [selectedDatasetFile, setSelectedDatasetFile] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [liveManifestRefreshNonce, setLiveManifestRefreshNonce] = useState(0);
  const [atlas, setAtlas] = useState(EMPTY_COLLECTION);
  const [selectedLocus, setSelectedLocus] = useState(null);
  const [selectedLocusKey, setSelectedLocusKey] = useState("");
  const [selectedFeatureKey, setSelectedFeatureKey] = useState("");
  const [trayOpen, setTrayOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadState, setLoadState] = useState({ status: "loading", message: "" });
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return THEME_DAY;
    }
    return window.localStorage.getItem(THEME_STORAGE_KEY) === THEME_DARK
      ? THEME_DARK
      : THEME_DAY;
  });

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
    setStaticManifestError("");

    fetch(resolveAssetUrl(MANIFEST_URL))
      .then((response) => readJsonResponse(response, "Manifest request failed"))
      .then((data) => {
        validateManifest(data);
        if (isMounted) {
          const normalizedManifest = data.map(normalizeManifestEntry);
          setStaticManifest(normalizedManifest);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setStaticManifestError(error.message);
          setLoadState({ status: "error", message: error.message });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [staticManifestNonce]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (PUBLIC_BUILD) {
      return;
    }
    let isMounted = true;

    loadLiveManifest()
      .then((data) => {
        if (isMounted) {
          setLiveManifest(data);
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
  }, [liveManifestRefreshNonce]);

  const manifest = useMemo(
    () => (selectedSource === SOURCE_LIVE ? liveManifest : staticManifest),
    [liveManifest, selectedSource, staticManifest]
  );
  const summary = useMemo(() => atlasSummary(atlas), [atlas]);
  const activeManifestEntry = useMemo(
    () => manifest.find((entry) => entry.file === selectedDatasetFile),
    [manifest, selectedDatasetFile]
  );
  const renderMode = activeManifestEntry?.render_mode ?? "";
  const searchKind = activeManifestEntry?.search_kind ?? "phrase";
  const isHeatmapMode = renderMode === HEATMAP_MODE;
  const occupancyPublic = activeManifestEntry?.occupancy_public !== false;
  const isValueSearch = searchKind === "value";
  const projectedLoci = useMemo(() => buildProjectedLoci(atlas), [atlas]);
  const markerLoci = useMemo(
    () =>
      isHeatmapMode && occupancyPublic
        ? projectedLoci.filter((locus) => locus.totalPhraseCount > 0)
        : isHeatmapMode
          ? []
        : projectedLoci,
    [isHeatmapMode, occupancyPublic, projectedLoci]
  );
  const heatmapCollection = useMemo(
    () => (isHeatmapMode && !isConstellation ? domainHeatmapCollection(atlas) : EMPTY_COLLECTION),
    [atlas, isHeatmapMode, isConstellation]
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
  const locusByKey = useMemo(
    () => new Map(projectedLoci.map((locus) => [locus.locusKey, locus])),
    [projectedLoci]
  );

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
    setTrayOpen(false);
    setSearchQuery("");

    fetch(resolveAssetUrl(entry.file))
      .then((response) => readJsonResponse(response, "GeoJSON request failed"))
      .then((data) => {
        validateAtlas(data);
        if (isMounted) {
          setAtlas({ ...data, metadata: {
            ...data.metadata,
            occupancy_public: !PUBLIC_BUILD && entry.occupancy_public !== false && data.metadata?.occupancy_public !== false,
          } });
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

    try {
      mapRef.current = new maplibregl.Map(
        create2DMapOptions(mapContainerRef.current, null)
      );
    } catch {
      setRendererError("map rendering unavailable. check browser graphics support and reload to retry.");
      return;
    }
    presentationRef.current = createMapPresentation(mapRef.current, {
      onSurface: setSurface, onError: setSurfaceError,
      palette: () => {
        const styles = getComputedStyle(document.documentElement);
        return { graticule: cssToken(styles, "--globe-graticule"), sky: cssToken(styles, "--globe-space"),
          horizon: cssToken(styles, "--globe-limb") };
      },
    });
    setPresentation(presentationRef.current);
    const canvas = mapRef.current.getCanvas();
    const contextLost = () => setRendererError("graphics context lost. reload to retry; the reading has not been cleared.");
    const contextRestored = () => setRendererError("");
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("webglcontextrestored", contextRestored);

    unlock2DMapRef.current = lockMapTo2D(mapRef.current);
    mapRef.current.addControl(
      new maplibregl.NavigationControl(NAVIGATION_CONTROL_OPTIONS),
      "top-right"
    );

    return () => {
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      presentationRef.current?.dispose();
      presentationRef.current = null;
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

    const token = presentationRef.current?.beginStyle(theme);
    const abort = new AbortController();
    async function applyStyle() {
      const base = baseMapStyle(theme);
      const style = typeof base === "string"
        ? await fetch(base, { signal: abort.signal }).then((response) => readJsonResponse(response, "basemap unavailable"))
        : base;
      if (abort.signal.aborted) return;
      // A complete style load has a definite readiness event, including a
      // day -> night -> day race where an identical-style diff would be a no-op.
      map.setStyle({ ...style, metadata: { ...style.metadata, [STYLE_THEME_KEY]: token } }, { diff: false });
      setSurfaceError("");
    }
    applyStyle().catch(() => {
      if (!abort.signal.aborted) setSurfaceError("basemap unavailable. switch the lamp or reload to retry; the reading is unchanged.");
    });
    return () => abort.abort();
  }, [theme]);

  useEffect(() => {
    if (theme !== THEME_DAY || surface !== GLOBE || !presentation || !mapRef.current) return;
    return observeGlobeRelief(mapRef.current);
  }, [presentation, surface, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    return updateDomainHeatmap(map, heatmapCollection, {
      onSelectLocus: (locusKey) => {
        const locus = locusByKey.get(locusKey);
        if (locus) {
          selectProjectedLocus(locus);
        }
      },
    });
  }, [heatmapCollection, locusByKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    markersRef.current.forEach((entry) => entry.marker.remove());
    markersRef.current = [];
    if (isConstellation) return;

    const bounds = new maplibregl.LngLatBounds();
    let hasBounds = false;

    for (const locus of markerLoci) {
      const markerNode = document.createElement("button");
      const markerPixelSize = markerSize(locus.totalPhraseCount);
      markerNode.type = "button";
      markerNode.className = [
        "atlas-marker",
        isHeatmapMode ? "atlas-marker--domain" : "",
        !isHeatmapMode && locus.cliques.length > 1 ? "atlas-marker--multi-clique" : "",
        markerPixelSize >= 47 ? "atlas-marker--dense" : "",
      ]
        .filter(Boolean)
        .join(" ");
      markerNode.dataset.locusKey = locus.locusKey;
      markerNode.style.setProperty("--marker-size", `${markerPixelSize}px`);
      markerNode.append(createMarkerArt({ isHeatmapMode, isDense: markerPixelSize >= 47 }));
      markerNode.setAttribute(
        "aria-label",
        isHeatmapMode
          ? `${locus.valuesWithPhrases} values with phrases at heat locus, ${locus.totalPhraseCount} phrases`
          : `${locus.cliques.length} cliques at projected locus, ${locus.totalPhraseCount} phrases`
      );
      markerNode.addEventListener("click", () => {
        selectProjectedLocus(locus);
      });

      const marker = new maplibregl.Marker({ element: markerNode, anchor: "center", opacityWhenCovered: 0 })
        .setLngLat([locus.longitude, locus.latitude])
        .addTo(map);

      const entry = { marker, markerNode, locusKey: locus.locusKey };
      // hover reveals a ghost/afterimage; leaving restores its state opacity
      markerNode.addEventListener("mouseenter", () => marker.setOpacity("1"));
      markerNode.addEventListener("mouseleave", () => applyMarkerOpacity(entry));
      applyMarkerOpacity(entry);

      markersRef.current.push(entry);
      bounds.extend([locus.longitude, locus.latitude]);
      hasBounds = true;
    }

    presentationRef.current?.enter("atlas", atlas, {
      fitFlat: () => { if (hasBounds) map.fitBounds(bounds, { padding: 80, maxZoom: 4, duration: 0, bearing: 0, pitch: 0 }); },
      focus: getLocusLngLat(selectedLocus),
    });
    return observeGlobeVisibility(map, markersRef.current.map(({ markerNode, locusKey }) => ({
      element: markerNode, coordinate: () => {
        const locus = locusByKey.get(locusKey);
        return [locus.longitude, locus.latitude];
      },
    })), () => presentationRef.current?.surface, () => surfaceControlRef.current);
  }, [isHeatmapMode, markerLoci, isConstellation, presentation]);

  useEffect(() => {
    if (!isConstellation) presentationRef.current?.setFocus(getLocusLngLat(selectedLocus));
  }, [selectedLocus, isConstellation]);

  useEffect(() => {
    selectedLocusKeyRef.current = selectedLocusKey;
    for (const entry of markersRef.current) {
      entry.markerNode.classList.toggle(
        "atlas-marker--selected",
        entry.locusKey === selectedLocusKey
      );
      applyMarkerOpacity(entry);
    }
  }, [selectedLocusKey, isConstellation]);

  useEffect(() => {
    for (const entry of markersRef.current) {
      applyMarkerOpacity(entry);
    }
  }, [theme]);

  // Esc is two-stage: collapse the tray first, then clear the selection.
  useEffect(() => {
    if (!selectedLocus || isConstellation) {
      return;
    }
    function onKeyDown(event) {
      if (event.key !== "Escape") {
        return;
      }
      if (trayOpen) {
        setTrayOpen(false);
      } else {
        clearSelection();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedLocus, trayOpen, isConstellation]);

  // Tether the LocusPlate popup to the selected coordinate. Create-once: the
  // popup is only removed when nothing is selected (below) or on unmount (next
  // effect), so it just re-points across selections rather than rebuilding.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const lngLat = getLocusLngLat(isConstellation ? null : selectedLocus);
    if (!lngLat) {
      platePopupRef.current?.remove();
      platePopupRef.current = null;
      return;
    }
    if (!platePopupRef.current) {
      platePopupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        closeOnMove: false,
        offset: 16,
        maxWidth: "none",
        className: "locus-plate-popup",
        locationOccludedOpacity: 0,
      }).setDOMContent(plateContainerRef.current);
    }
    platePopupRef.current.setLngLat(lngLat);
    if (!platePopupRef.current.isOpen()) {
      platePopupRef.current.addTo(map);
    }
    return observeGlobeVisibility(map, [{ element: platePopupRef.current.getElement(), coordinate: () => lngLat }],
      () => presentationRef.current?.surface, () => surfaceControlRef.current);
  }, [selectedLocus, isConstellation, presentation]);

  function changeView(next) {
    if (next === view) return;
    presentationRef.current?.save();
    mapRef.current?.stop();
    setView(next);
  }

  useEffect(
    () => () => {
      platePopupRef.current?.remove();
      platePopupRef.current = null;
    },
    []
  );

  const modeOptions = useMemo(() => getAvailableModes(manifest), [manifest]);
  const cipherOptions = useMemo(
    () => getAvailableCiphers(manifest, selectedMode),
    [manifest, selectedMode]
  );
  const cipherLabels = useMemo(() => {
    const labels = new Map();
    for (const option of cipherOptions) {
      labels.set(option.id, option.label);
      labels.set(option.id.toLowerCase(), option.label);
    }
    return labels;
  }, [cipherOptions]);
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
      if (presentationRef.current?.surface === GLOBE) {
        presentationRef.current.focus([locus.longitude, locus.latitude], { zoom: MAP_SEARCH_ZOOM, duration: 650 });
        return;
      }
      presentationRef.current?.markDetail();
      mapRef.current.flyTo({
        center: [locus.longitude, locus.latitude],
        zoom: Math.max(mapRef.current.getZoom(), MAP_SEARCH_ZOOM),
        bearing: 0,
        pitch: 0,
        duration: motionDuration(650),
      });
    }
  }

  function clearSelection() {
    setSelectedLocus(null);
    setSelectedLocusKey("");
    setSelectedFeatureKey("");
    setTrayOpen(false);
  }

  function openReadoutTray() {
    setSearchQuery("");
    setTrayOpen(true);
  }

  function refreshAtlasSource() {
    setLiveManifestRefreshNonce((value) => value + 1);
    setRefreshNonce((value) => value + 1);
  }

  const modeIndex = Math.max(
    0,
    modeOptions.findIndex((option) => option.id === selectedMode),
  );
  const viewTickPos =
    modeOptions.length > 1
      ? (10 + (modeIndex / (modeOptions.length - 1)) * 140) / 160
      : 0.5;

  return (
    <main className="atlas-shell">
      <header className={`atlas-header atlas-header--source-${selectedSource}`}>
        <div className="header-left">
          <div className="header-band">
            <div className="brand-lockup">
              <img
                className="brand-seal"
                src={resolveAssetUrl("/geogematria_seal.svg")}
                alt=""
                aria-hidden="true"
              />
              <div className="brand-copy">
                <p className="eyebrow">
                  {isConstellation ? "static constellation instrument" : selectedSource === SOURCE_LIVE ? "live local instrument" : "static instrument"}
                </p>
              </div>
            </div>
            <div className="source-controls header-source-controls" aria-label="Atlas source controls">
              <div className="source-toggle" aria-label="atlas view">
                {["atlas", "constellation"].map((option) => (
                  <button key={option} type="button" aria-pressed={view === option}
                    className={view === option ? "source-toggle__button source-toggle__button--active" : "source-toggle__button"}
                    onClick={() => changeView(option)}>{option}</button>
                ))}
              </div>
              <div className="source-toggle surface-toggle" aria-label="map surface">
                <span>surface</span>
                {[FLAT, GLOBE].map((option) => (
                  <button key={option} type="button" aria-pressed={surface === option}
                    ref={surface === option ? surfaceControlRef : undefined}
                    disabled={!presentation || Boolean(rendererError)}
                    className={surface === option ? "source-toggle__button source-toggle__button--active" : "source-toggle__button"}
                    onClick={() => presentation?.setSurface(option)}>{option}</button>
                ))}
              </div>
              {!PUBLIC_BUILD && !isConstellation && (
                <div className="source-toggle">
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
                    title={liveManifestError || "live local instrument"}
                  >
                    live
                  </button>
                </div>
              )}
              <button
                type="button"
                className="refresh-button"
                hidden={isConstellation}
                onClick={refreshAtlasSource}
                disabled={loadState.status === "loading"}
              >
                recast
              </button>
              <div className="source-toggle">
                <span>lamp</span>
                <button
                  type="button"
                  className={theme === THEME_DAY ? "source-toggle__button source-toggle__button--active" : "source-toggle__button"}
                  onClick={() => setTheme(THEME_DAY)}
                >
                  on
                </button>
                <button
                  type="button"
                  className={theme === THEME_DARK ? "source-toggle__button source-toggle__button--active" : "source-toggle__button"}
                  onClick={() => setTheme(THEME_DARK)}
                >
                  off
                </button>
              </div>
            </div>
          </div>
          {!isConstellation && <div className="atlas-controls" aria-label="Atlas calibration register">
            <div className="control-card">
            <label
              className="field-control field-control--mode"
              style={{ "--view-tickpos": viewTickPos }}
            >
              <span>projection</span>
              <select
                value={selectedMode}
                onChange={(event) =>
                  selectDefaultDataset({ mode: event.target.value })
                }
                disabled={modeOptions.length === 0}
              >
                {modeOptions.length === 0 ? (
                  <option value="">no projections</option>
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
              <span>cipher register</span>
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
                  <option value="">no registers</option>
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
              <span>lineage</span>
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
                  <option value="">no lineages</option>
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
              <span>source plate</span>
              <select
                value={selectedDatasetFile}
                onChange={(event) => setSelectedDatasetFile(event.target.value)}
                disabled={datasetOptions.length === 0}
              >
                {datasetOptions.length === 0 ? (
                  <option value="">no plates</option>
                ) : (
                  datasetOptions.map((entry) => (
                    <option key={entry.file} value={entry.file}>
                      {datasetLabel(entry)}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="field-control search-control" ref={apertureRef}>
              <span>{isValueSearch ? "value aperture" : "phrase aperture"}</span>
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
            {!trayOpen && (
              <SearchResults
                query={searchQuery}
                matches={searchMatches}
                searchKind={searchKind}
                selectedLocusKey={selectedLocusKey}
                locusByFeatureKey={locusByFeatureKey}
                anchorRef={apertureRef}
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
            )}
          </div>}
        </div>
      </header>

      <section className={`atlas-workspace${isConstellation ? " atlas-workspace--constellation" : ""}${surface === GLOBE ? " atlas-workspace--globe" : ""}`}>
        <div className="map-panel">
          <div ref={mapContainerRef} className="map-canvas" />
          {(rendererError || surfaceError) && <div className="surface-error" role="alert">
            <p>{rendererError || surfaceError}</p>
            {!rendererError && surface === GLOBE && <button type="button" onClick={() => presentation?.setSurface(FLAT)}>return to flat</button>}
          </div>}
          {surface === GLOBE && !rendererError && <div className="globe-register">
            {!isConstellation && <button type="button" onClick={() => presentation?.overview()}>whole globe</button>}
            <span>turn to reveal the far side · polar basemap detail is limited</span>
          </div>}
          {!isConstellation && loadState.status !== "ready" && (
            <div className={`map-overlay map-overlay--${loadState.status}`}>
              {loadState.status === "loading" ? "Loading atlas data" : loadState.message}
            </div>
          )}
          <div className="map-glass" />
          {!isConstellation && <div className="map-status-cluster">
            <div className="status-strip" aria-live="polite">
              {!isHeatmapMode && (
                <span><b>cliques</b>{summary.cliqueCount}</span>
              )}
              {isHeatmapMode && !occupancyPublic ? (
                <span><b>values</b>{summary.domainValueCount}</span>
              ) : (
                <span><b>phrases</b>{summary.phraseCount}</span>
              )}
            </div>
          </div>}
        </div>

        <ConstellationView active={isConstellation} manifest={staticManifest} map={mapRef.current}
          presentation={presentation} surface={surface} focusFallback={() => surfaceControlRef.current}
          manifestError={staticManifestError} onRetryManifest={() => setStaticManifestNonce((value) => value + 1)} />
        {!isConstellation && selectedLocus &&
          plateContainerRef.current &&
          createPortal(
            <LocusPlate
              locus={selectedLocus}
              cipherLabels={cipherLabels}
              onOpenTray={openReadoutTray}
              onClear={clearSelection}
            />,
            plateContainerRef.current
          )}
        {!isConstellation && <ReadoutTray
          open={trayOpen}
          locus={selectedLocus}
          selectedFeatureKey={selectedFeatureKey}
          projectionMethod={activeManifestEntry?.projection_method}
          cipherLabels={cipherLabels}
          source={selectedSource === SOURCE_LIVE ? "live local layer" : "static snapshot"}
          onClose={() => setTrayOpen(false)}
        />}
      </section>
    </main>
  );
}

async function readJsonResponse(response, fallbackMessage) {
  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, fallbackMessage));
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    const preview = text.trimStart().slice(0, 72) || "<empty response>";
    throw new Error(`${fallbackMessage}: expected JSON, received ${JSON.stringify(preview)}`);
  }
}

function updateDomainHeatmap(map, collection, { onSelectLocus } = {}) {
  let disposed = false;
  let frameId = null;
  let appliedTokenSignature = "";
  let pointerActive = false;

  const removeReadyListeners = () => {
    map.off?.("load", scheduleRender);
    map.off?.("style.load", scheduleRender);
    map.off?.("styledata", scheduleRender);
  };

  const hitTestSelectableLocus = (point) => {
    if (!map.getLayer?.(DOMAIN_SELECT_LAYER_ID)) {
      return "";
    }
    try {
      const features = map.queryRenderedFeatures(point, {
        layers: [DOMAIN_SELECT_LAYER_ID],
      });
      const surface = map.getProjection()?.type === "globe" ? GLOBE : FLAT;
      const feature = features.find((item) => item.geometry?.type === "Point"
        && locationVisible(map, item.geometry.coordinates, surface));
      return String(feature?.properties?.locus_key ?? "");
    } catch (error) {
      return "";
    }
  };

  const handleMapClick = (event) => {
    const locusKey = hitTestSelectableLocus(event.point);
    if (locusKey) {
      onSelectLocus?.(locusKey);
    }
  };

  const handleMapMouseMove = (event) => {
    const hasSelectableLocus = Boolean(hitTestSelectableLocus(event.point));
    if (hasSelectableLocus === pointerActive) {
      return;
    }
    pointerActive = hasSelectableLocus;
    map.getCanvas().style.cursor = pointerActive ? "pointer" : "";
  };

  const handleMapMouseLeave = () => {
    pointerActive = false;
    map.getCanvas().style.cursor = "";
  };

  const scheduleRender = () => {
    if (disposed || frameId !== null) {
      return;
    }
    frameId = window.requestAnimationFrame(() => {
      frameId = null;
      render();
    });
  };

  const render = () => {
    if (disposed) {
      return;
    }

    if (!collection.features.length) {
      removeDomainHeatmap(map);
      appliedTokenSignature = "";
      return;
    }

    if (!map.getStyle?.()) {
      scheduleRender();
      return;
    }

    try {
      const themeTokens = atlasThemeTokens();
      const tokenSignature = heatmapTokenSignature(themeTokens);
      const source = map.getSource?.(DOMAIN_HEAT_SOURCE_ID);
      const hasHeatLayer = map.getLayer?.(DOMAIN_HEAT_LAYER_ID);
      const hasPhraseLayer = map.getLayer?.(DOMAIN_PHRASE_LAYER_ID);
      const hasSelectLayer = map.getLayer?.(DOMAIN_SELECT_LAYER_ID);

      if (source && hasHeatLayer && hasPhraseLayer && hasSelectLayer) {
        if (appliedTokenSignature !== tokenSignature) {
          applyDomainHeatmapPaint(map, themeTokens);
          appliedTokenSignature = tokenSignature;
        }
        return;
      }

      removeDomainHeatmap(map);
      map.addSource(DOMAIN_HEAT_SOURCE_ID, {
        type: "geojson",
        data: collection,
      });
      map.addLayer({
        id: DOMAIN_HEAT_LAYER_ID,
        type: "heatmap",
        source: DOMAIN_HEAT_SOURCE_ID,
        maxzoom: 8,
        paint: domainHeatmapPaint(themeTokens),
      });
      map.addLayer({
        id: DOMAIN_PHRASE_LAYER_ID,
        type: "circle",
        source: DOMAIN_HEAT_SOURCE_ID,
        filter: [">", ["get", "phrase_weight"], 0],
        paint: domainPhrasePaint(themeTokens),
      });
      map.addLayer({
        id: DOMAIN_SELECT_LAYER_ID,
        type: "circle",
        source: DOMAIN_HEAT_SOURCE_ID,
        paint: domainSelectPaint(),
      });
      appliedTokenSignature = tokenSignature;
    } catch (error) {
      scheduleRender();
    }
  };

  map.on?.("load", scheduleRender);
  map.on?.("style.load", scheduleRender);
  map.on?.("styledata", scheduleRender);
  map.on?.("click", handleMapClick);
  map.on?.("mousemove", handleMapMouseMove);
  map.getCanvas().addEventListener("mouseleave", handleMapMouseLeave);
  scheduleRender();

  return () => {
    disposed = true;
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
    removeReadyListeners();
    map.off?.("click", handleMapClick);
    map.off?.("mousemove", handleMapMouseMove);
    map.getCanvas().removeEventListener("mouseleave", handleMapMouseLeave);
    if (pointerActive) {
      map.getCanvas().style.cursor = "";
    }
    removeDomainHeatmap(map);
  };
}

function heatmapTokenSignature(themeTokens) {
  return [
    themeTokens.mapHeatEmpty,
    themeTokens.mapHeatLow,
    themeTokens.mapHeatMid,
    themeTokens.mapHeatHigh,
    themeTokens.mapHeatPeak,
    themeTokens.mapPhrasePoint,
    themeTokens.mapPhraseStroke,
  ].join("|");
}

function domainHeatmapPaint(themeTokens) {
  return {
    "heatmap-weight": ["interpolate", ["linear"], ["get", "heat_weight"], 0, 0, 1, 1],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 1, 0.85, 6, 1.9],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 1, 18, 5, 30, 8, 46],
    "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.72, 8, 0.5],
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      themeTokens.mapHeatEmpty,
      0.2,
      themeTokens.mapHeatLow,
      0.45,
      themeTokens.mapHeatMid,
      0.7,
      themeTokens.mapHeatHigh,
      1,
      themeTokens.mapHeatPeak,
    ],
  };
}

function domainPhrasePaint(themeTokens) {
  return {
    "circle-radius": ["interpolate", ["linear"], ["get", "phrase_weight"], 1, 2.5, 8, 7],
    "circle-color": themeTokens.mapPhrasePoint,
    "circle-opacity": 0.32,
    "circle-stroke-color": themeTokens.mapPhraseStroke,
    "circle-stroke-width": 0.8,
    "circle-stroke-opacity": 0.55,
  };
}

function domainSelectPaint() {
  return {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 20, 5, 32, 8, 48],
    "circle-color": "rgba(255, 255, 255, 0)",
    "circle-opacity": 1,
  };
}

function applyDomainHeatmapPaint(map, themeTokens) {
  for (const [name, value] of Object.entries(domainHeatmapPaint(themeTokens))) {
    map.setPaintProperty(DOMAIN_HEAT_LAYER_ID, name, value);
  }
  for (const [name, value] of Object.entries(domainPhrasePaint(themeTokens))) {
    map.setPaintProperty(DOMAIN_PHRASE_LAYER_ID, name, value);
  }
}

function atlasThemeTokens() {
  const styles = getComputedStyle(document.documentElement);
  return {
    mapHeatEmpty: cssToken(styles, "--map-heat-empty"),
    mapHeatLow: cssToken(styles, "--map-heat-low"),
    mapHeatMid: cssToken(styles, "--map-heat-mid"),
    mapHeatHigh: cssToken(styles, "--map-heat-high"),
    mapHeatPeak: cssToken(styles, "--map-heat-peak"),
    mapPhrasePoint: cssToken(styles, "--map-phrase-point"),
    mapPhraseStroke: cssToken(styles, "--map-phrase-stroke"),
  };
}

function cssToken(styles, name) {
  return styles.getPropertyValue(name).trim();
}

function removeDomainHeatmap(map) {
  for (const layerId of [DOMAIN_SELECT_LAYER_ID, DOMAIN_PHRASE_LAYER_ID, DOMAIN_HEAT_LAYER_ID]) {
    if (map.getLayer?.(layerId)) {
      map.removeLayer(layerId);
    }
  }
  if (map.getSource?.(DOMAIN_HEAT_SOURCE_ID)) {
    map.removeSource(DOMAIN_HEAT_SOURCE_ID);
  }
}

function baseMapStyle(theme) {
  return theme === THEME_DARK
    ? resolveAssetUrl(DARK_BASEMAP_STYLE_URL)
    : DAY_BASEMAP_STYLE;
}

function createMarkerArt({ isHeatmapMode, isDense }) {
  const art = document.createElement("span");
  art.className = "atlas-marker-art";
  art.append(createMarkerVisual({ isHeatmapMode, isDense }));
  return art;
}

function createMarkerVisual({ isHeatmapMode, isDense }) {
  const visual = document.createElementNS(SVG_NS, "svg");
  visual.setAttribute("class", "atlas-marker-visual");
  visual.setAttribute("viewBox", "0 0 100 100");
  visual.setAttribute("aria-hidden", "true");
  visual.setAttribute("focusable", "false");

  const halo = document.createElementNS(SVG_NS, "circle");
  halo.setAttribute("class", "atlas-marker-halo");
  halo.setAttribute("cx", "50");
  halo.setAttribute("cy", "50");
  halo.setAttribute("r", isHeatmapMode ? "35" : isDense ? "36" : "39");
  visual.append(halo);

  const haloGlow = document.createElementNS(SVG_NS, "circle");
  haloGlow.setAttribute("class", "atlas-marker-halo-glow");
  haloGlow.setAttribute("cx", "50");
  haloGlow.setAttribute("cy", "50");
  haloGlow.setAttribute("r", isHeatmapMode ? "28" : isDense ? "29" : "31");
  visual.append(haloGlow);

  if (isHeatmapMode) {
    return visual;
  }

  const tri = document.createElementNS(SVG_NS, "path");
  tri.setAttribute("class", "atlas-marker-shape");
  tri.setAttribute("d", isDense ? TRI_PATH_DENSE : TRI_PATH);
  visual.append(tri);

  const vertices = isDense ? TRI_VERTICES_DENSE : TRI_VERTICES;
  for (const [cx, cy] of vertices) {
    const node = document.createElementNS(SVG_NS, "circle");
    node.setAttribute("class", "atlas-marker-vertex");
    node.setAttribute("cx", String(cx));
    node.setAttribute("cy", String(cy));
    node.setAttribute("r", isDense ? "4" : "4.5");
    visual.append(node);
  }

  const spark = document.createElementNS(SVG_NS, "circle");
  spark.setAttribute("class", "atlas-marker-spark");
  spark.setAttribute("cx", "50");
  spark.setAttribute("cy", "50");
  spark.setAttribute("r", "3.5");
  visual.append(spark);

  return visual;
}

function datasetLabel(entry) {
  return entry.dataset_label ?? entry.projection_label ?? entry.file;
}

// Every selectable locus is a buildProjectedLoci() record, which carries
// longitude/latitude for both clique and heat/value-domain loci. Guard finite
// values so a malformed record can't throw inside maplibre's setLngLat.
function getLocusLngLat(locus) {
  if (!locus) {
    return null;
  }
  const { longitude, latitude } = locus;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }
  return [longitude, latitude];
}

// Pins the aperture results dropdown under the search field. The dropdown is
// position: fixed (to escape header/control-card overflow), so it needs the
// field's viewport rect, refreshed on resize while open.
function useApertureAnchor(anchorRef, active) {
  const [style, setStyle] = useState(null);

  useLayoutEffect(() => {
    if (!active || !anchorRef?.current) {
      return;
    }
    const measure = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const margin = 12;
      const width = Math.min(
        360,
        Math.max(rect.width, 280),
        window.innerWidth - margin * 2
      );
      const left = Math.min(rect.left, window.innerWidth - margin - width);
      setStyle({
        top: rect.bottom + 6,
        left: Math.max(margin, left),
        width,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [anchorRef, active]);

  return style;
}

function SearchResults({
  query,
  matches,
  searchKind,
  selectedLocusKey,
  locusByFeatureKey,
  anchorRef,
  onSelect,
}) {
  const hasQuery = Boolean(query.trim());
  const style = useApertureAnchor(anchorRef, hasQuery);

  if (!hasQuery) {
    return null;
  }

  const isValueSearch = searchKind === "value";

  return (
    <section
      className="search-results"
      style={style}
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
                    ? match.details.cliqueSize > 0
                      ? `${match.details.cliqueKind} | ${match.details.cliqueSize} phrases`
                      : `${match.details.cipher} ${match.details.value}`
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

createRoot(document.getElementById("root")).render(<App />);
