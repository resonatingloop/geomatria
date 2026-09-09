import { MAP_MAX_ZOOM, MAP_MIN_ZOOM } from "./map2d.js";

export const FLAT = "flat";
export const GLOBE = "globe";
export const GRATICULE_ID = "instrument-graticule";
export const STYLE_THEME_KEY = "geogematria:theme";
const GLOBE_MIN_ZOOM = -2; // Map.setMinZoom's public lower bound in 5.24.0.
const radians = (degrees) => degrees * Math.PI / 180;

function coordinate(value) {
  return Array.isArray(value) ? [...value] : [value.lng, value.lat];
}

export function cameraSnapshot(map) {
  return { center: coordinate(map.getCenter()), zoom: map.getZoom(), fov: map.getVerticalFieldOfView(),
    bearing: 0, pitch: 0, roll: 0 };
}

// Viewport geometry only, never a value-to-coordinate transform. MapLibre 5's
// globe radius is worldSize / (2π cos(latitude)); zoom uses 512px world units.
// Solve the perspective silhouette radius, rather than fitting a lon/lat box.
// All camera inputs come from public APIs; no renderer internals are imported.
export function globeOverviewCamera({ width, height, center, fov = 36.86989764584402 }) {
  const target = coordinate(center);
  target[1] = Math.max(-85, Math.min(85, target[1]));
  const h = Math.max(1, height);
  const radiusOnScreen = Math.max(1, Math.min(width, h)) * 0.40;
  const distance = h / (2 * Math.tan(radians(fov) / 2));
  const radius = radiusOnScreen ** 2 / distance
    + radiusOnScreen * Math.sqrt(1 + (radiusOnScreen / distance) ** 2);
  const zoom = Math.log2(radius * 2 * Math.PI * Math.cos(radians(target[1])) / 512);
  // Small, pole-facing apertures can reach the public zoom floor. Widen the
  // lens only there, preserving the facing direction and existing coordinates.
  // Solve rho = R D / sqrt(D² + 2RD) for D at the supported minimum zoom.
  if (zoom < GLOBE_MIN_ZOOM) {
    const minimumRadius = 512 * 2 ** GLOBE_MIN_ZOOM / (2 * Math.PI * Math.cos(radians(target[1])));
    const lensDistance = 2 * radiusOnScreen ** 2 * minimumRadius / (minimumRadius ** 2 - radiusOnScreen ** 2);
    fov = Math.min(150, 2 * Math.atan(h / (2 * lensDistance)) * 180 / Math.PI);
  }
  return { center: target, zoom: Math.max(GLOBE_MIN_ZOOM, Math.min(MAP_MAX_ZOOM, zoom)), fov,
    bearing: 0, pitch: 0, roll: 0 };
}

export function motionDuration(milliseconds) {
  return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : milliseconds;
}

export function createGraticule() {
  const lines = [];
  // Existing Mercator basemaps do not supply polar-cap detail. Stop this
  // display guide at their coverage edge; do not invent geography at the caps.
  for (let longitude = -180; longitude < 180; longitude += 30) {
    const line = [];
    for (let latitude = -85; latitude <= 85; latitude += 2) line.push([longitude, latitude]);
    lines.push(line);
  }
  for (let latitude = -60; latitude <= 60; latitude += 30) {
    const line = [];
    for (let longitude = -180; longitude <= 180; longitude += 2) line.push([longitude, latitude]);
    lines.push(line);
  }
  return { type: "FeatureCollection", features: [{ type: "Feature", properties: {},
    geometry: { type: "MultiLineString", coordinates: lines } }] };
}

// A public project/unproject round trip distinguishes the front surface from
// a rear point that projects onto the same screen pixel. Unit vectors handle
// longitude wrapping and poles without mistaking either for a different place.
export function locationVisible(map, lngLat, surface) {
  if (surface !== GLOBE) return true;
  try {
    const expected = coordinate(lngLat);
    const point = map.project(expected);
    const canvas = map.getCanvas();
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)
      || point.x < 0 || point.y < 0 || point.x > canvas.clientWidth || point.y > canvas.clientHeight) return false;
    const actual = coordinate(map.unproject(point));
    const vector = ([lon, lat]) => [Math.cos(radians(lat)) * Math.cos(radians(lon)),
      Math.cos(radians(lat)) * Math.sin(radians(lon)), Math.sin(radians(lat))];
    const a = vector(expected), b = vector(actual);
    return a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0) < 1e-12;
  } catch { return false; }
}

export function setElementVisibility(element, visible, fallback) {
  const hidden = !visible;
  if (hidden && element.contains(element.ownerDocument?.activeElement)) fallback?.()?.focus?.({ preventScroll: true });
  if (element.inert !== hidden) element.inert = hidden;
  if (hidden) {
    element.setAttribute("aria-hidden", "true");
    element.style.visibility = "hidden";
  } else {
    element.removeAttribute("aria-hidden");
    element.style.visibility = "";
  }
}

// One observer for a whole marker group (not one animation loop per marker).
export function observeGlobeVisibility(map, entries, getSurface, fallback) {
  const update = () => {
    const surface = getSurface();
    for (const entry of entries) setElementVisibility(entry.element,
      locationVisible(map, entry.coordinate(), surface), entry.fallback ?? fallback);
  };
  map.on("render", update);
  update();
  return () => { map.off("render", update); entries.forEach(({ element }) => setElementVisibility(element, true)); };
}

export function createMapPresentation(map, {
  onSurface = () => {}, onError = () => {}, palette = () => ({}),
  requestFrame = (fn) => requestAnimationFrame(fn), cancelFrame = (id) => cancelAnimationFrame(id),
} = {}) {
  let surface = FLAT, workspace = null, disposed = false, theme = null, styleSequence = 0;
  let ready = false, baseSky, frame = null, updateFailed = false;
  const defaultFov = map.getVerticalFieldOfView();
  const contexts = new Map();
  const context = () => contexts.get(workspace);
  const safely = (operation) => {
    if (disposed) return;
    try {
      operation();
      if (updateFailed) { updateFailed = false; onError(""); }
    } catch {
      updateFailed = true;
      onError(surface === GLOBE
        ? "globe view update failed. the map may still render; use whole globe or return to flat to retry."
        : "map view update failed. the reading is unchanged; reload to retry.");
    }
  };
  const save = () => {
    if (context() && ready) context().cameras[surface] = { ...cameraSnapshot(map), overview: context().overview };
  };
  const minimumZoom = () => surface === GLOBE ? GLOBE_MIN_ZOOM : workspace === "constellation" ? -2 : MAP_MIN_ZOOM;
  const jump = ({ fov = defaultFov, ...camera }) => {
    map.setVerticalFieldOfView(fov);
    map.jumpTo(camera);
  };
  const overview = (center = map.getCenter()) => {
    if (!ready) return;
    if (surface === GLOBE) {
      const canvas = map.getCanvas();
      jump(globeOverviewCamera({ width: canvas.clientWidth, height: canvas.clientHeight,
        center, fov: defaultFov }));
    } else { map.setVerticalFieldOfView(defaultFov); context()?.fitFlat?.(map); }
    if (context()) context().overview = true;
  };
  const restore = () => {
    const current = context();
    map.setMinZoom(minimumZoom());
    map.setMaxZoom(MAP_MAX_ZOOM);
    if (!current) return;
    const camera = current.cameras[surface];
    if (camera) {
      current.overview = camera.overview;
      if (camera.overview && (surface === GLOBE || camera.reframe)) overview(camera.center);
      else jump(camera);
    } else overview(surface === GLOBE && current.focus ? current.focus : map.getCenter());
  };
  const appearance = () => {
    const colors = palette();
    map.setProjection({ type: surface === GLOBE ? "globe" : "mercator" });
    if (surface === GLOBE) {
      if (!map.getSource(GRATICULE_ID)) map.addSource(GRATICULE_ID, { type: "geojson", data: createGraticule() });
      if (!map.getLayer(GRATICULE_ID)) map.addLayer({ id: GRATICULE_ID, type: "line", source: GRATICULE_ID,
        paint: { "line-color": colors.graticule ?? "#8c7850", "line-width": 0.65,
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.38, 5, 0.16, 8, 0] } },
      map.getLayer("value-domain-heat") ? "value-domain-heat" : undefined);
      else map.setPaintProperty(GRATICULE_ID, "line-color", colors.graticule ?? "#8c7850");
      map.setSky({ "sky-color": colors.sky ?? "#e7e2d2", "horizon-color": colors.horizon ?? "#d6c195",
        "fog-color": colors.sky ?? "#e7e2d2", "fog-ground-blend": 0,
        "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.18, 4, 0.08, 6, 0] });
    } else {
      if (map.getLayer(GRATICULE_ID)) map.removeLayer(GRATICULE_ID);
      if (map.getSource(GRATICULE_ID)) map.removeSource(GRATICULE_ID);
      map.setSky(baseSky);
    }
  };
  const loaded = () => safely(() => {
    // The latest theme owns the scene; an obsolete load cannot apply its sky
    // or reset a newer surface. Surface itself is read here, never captured.
    if (ready || map.getStyle()?.metadata?.[STYLE_THEME_KEY] !== theme) return;
    baseSky = map.getStyle().sky;
    ready = true;
    appearance();
    restore();
  });
  const scheduleResize = () => {
    if (frame !== null || disposed) return;
    frame = requestFrame(() => {
      frame = null;
      safely(() => { map.resize(); if (context()?.overview) overview(); });
    });
  };
  const mapError = (event) => {
    // Network tile errors do not establish globe incompatibility.
    if (!event.sourceId && ready && surface === GLOBE) onError("globe rendering reported an error. return to flat if the surface is unavailable.");
  };
  const manualMove = (event) => { if (event.originalEvent && context()) context().overview = false; };
  map.on("style.load", loaded);
  map.on("error", mapError);
  map.on("movestart", manualMove);
  const observer = globalThis.ResizeObserver ? new ResizeObserver(scheduleResize) : null;
  observer?.observe(map.getContainer());
  return {
    get surface() { return surface; },
    save,
    beginStyle(nextTheme) { save(); theme = `${nextTheme}:${++styleSequence}`; ready = false; return theme; },
    enter(nextWorkspace, identity, { fitFlat, focus = null } = {}) {
      if (disposed) return;
      const previous = contexts.get(nextWorkspace);
      const changed = workspace !== nextWorkspace || previous?.identity !== identity;
      if (changed) { save(); map.stop(); }
      if (!previous || previous.identity !== identity) contexts.set(nextWorkspace,
        { identity, cameras: {}, overview: true, fitFlat, focus });
      else Object.assign(previous, { fitFlat, focus });
      workspace = nextWorkspace;
      if (changed && ready) safely(() => { map.resize(); restore(); });
    },
    setFocus(focus) { if (context()) context().focus = focus; },
    markDetail() { if (context()) context().overview = false; },
    setSurface(next) {
      if (disposed || ![FLAT, GLOBE].includes(next) || next === surface) return;
      save(); map.stop(); surface = next; onSurface(next); onError("");
      if (ready) safely(() => { appearance(); map.resize(); restore(); });
    },
    overview() { safely(() => {
      map.stop();
      if (!ready && context()) context().cameras[surface] = { ...cameraSnapshot(map), overview: true, reframe: true };
      overview();
    }); },
    focus(lngLat, { zoom = 3, duration = 450 } = {}) {
      if (context()) { context().focus = coordinate(lngLat); context().overview = false; }
      safely(() => {
        const camera = { center: coordinate(lngLat), zoom: Math.min(MAP_MAX_ZOOM, Math.max(map.getZoom(), zoom)),
          fov: map.getVerticalFieldOfView(),
          bearing: 0, pitch: 0, roll: 0 };
        if (!ready && context()) context().cameras[surface] = { ...camera, overview: false };
        else { const { fov, ...pose } = camera; map.easeTo({ ...pose, duration: motionDuration(duration) }); }
      });
    },
    dispose() {
      disposed = true;
      if (frame !== null) cancelFrame(frame);
      observer?.disconnect(); map.off("style.load", loaded); map.off("error", mapError); map.off("movestart", manualMove);
      contexts.clear();
    },
  };
}
