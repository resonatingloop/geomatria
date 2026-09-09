import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import maplibregl from "maplibre-gl";
import {
  FLAT, GLOBE, GRATICULE_ID, STYLE_THEME_KEY, cameraSnapshot, createGraticule,
  createMapPresentation, globeOverviewCamera, locationVisible, motionDuration, observeGlobeVisibility,
} from "../src/mapPresentation.js";
import { CONSTELLATION_CIPHERS, groupConstellationEntries } from "../src/constellationData.js";
import { constellationMarkdown, locusMarkdown } from "../src/markdownExport.js";
import { buildProjectedLoci } from "../src/atlasData.js";

class MapDouble {
  center = [0, 12]; zoom = 1.4; minZoom = 1; maxZoom = 10;
  listeners = new Map(); sources = new Map(); layers = new Map(); moves = [];
  canvas = { clientWidth: 800, clientHeight: 600 }; resizes = 0;
  fov = 36.86989764584402;
  style = {}; projection = { type: "mercator" };
  on(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  off(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name, event = {}) { for (const fn of this.listeners.get(name) ?? []) fn(event); }
  getCenter() { return { lng: this.center[0], lat: this.center[1] }; }
  getZoom() { return this.zoom; }
  getCanvas() { return this.canvas; }
  getContainer() { return this.canvas; }
  getVerticalFieldOfView() { return this.fov; }
  setVerticalFieldOfView(fov) { this.fov = Math.max(0.1, Math.min(150, fov)); }
  getStyle() { return this.style; }
  getSource(id) { return this.sources.get(id); }
  getLayer(id) { return this.layers.get(id); }
  addSource(id, source) { assert(!this.sources.has(id)); this.sources.set(id, source); }
  addLayer(layer) { assert(!this.layers.has(layer.id)); this.layers.set(layer.id, layer); }
  removeSource(id) { this.sources.delete(id); }
  removeLayer(id) { this.layers.delete(id); }
  setPaintProperty(id, key, value) { this.layers.get(id).paint[key] = value; }
  setProjection(projection) { if (this.rejectGlobe && projection.type === "globe") throw Error("fixture"); this.projection = projection; }
  setSky(sky) { this.style.sky = sky; }
  // Exercise the public API guard, not just the more permissive transform.
  get transform() { return { maxZoom: this.maxZoom, zoom: this.zoom }; }
  _getTransformForUpdate() { return { setMinZoom: (zoom) => { this.minZoom = zoom; } }; }
  _applyUpdatedTransform() {}
  _update() {}
  setMinZoom(zoom) { return maplibregl.Map.prototype.setMinZoom.call(this, zoom); }
  setMaxZoom(zoom) { this.maxZoom = zoom; }
  stop() {}
  resize() { this.resizes++; }
  jumpTo(camera) { this.center = [...camera.center]; this.zoom = camera.zoom; this.moves.push(camera); }
  easeTo(camera) { this.jumpTo(camera); }
  styleLoaded(token, sky) {
    this.style = { metadata: { [STYLE_THEME_KEY]: token }, sky };
    this.sources.clear(); this.layers.clear(); this.emit("style.load");
  }
}
const atlasFit = (map) => map.jumpTo({ center: [5, 10], zoom: 2, bearing: 0, pitch: 0, roll: 0 });
const constellationFit = (map) => map.jumpTo({ center: [-15, 0], zoom: 1, bearing: 0, pitch: 0, roll: 0 });
function setup(options = {}) {
  const map = new MapDouble();
  const presentation = createMapPresentation(map, options);
  const identity = {};
  presentation.enter("atlas", identity, { fitFlat: atlasFit });
  map.styleLoaded(presentation.beginStyle("day"));
  return { map, presentation, identity };
}

test("starts flat, remembers four separate cameras, invalidates only changed data", () => {
  const { map, presentation: p, identity } = setup();
  assert.equal(p.surface, FLAT);
  assert.equal(map.projection.type, "mercator");
  const reading = {};
  p.focus([20, 30], { zoom: 5 }); const atlasFlat = cameraSnapshot(map);
  p.setSurface(GLOBE);
  assert.deepEqual(map.center, [20, 30]); // first globe faces the reading
  assert.equal(map.maxZoom, 10);
  p.focus([100, 15], { zoom: 6 }); const atlasGlobe = cameraSnapshot(map);
  p.enter("constellation", reading, { fitFlat: constellationFit });
  p.focus([-175, 50], { zoom: 4 }); const constellationGlobe = cameraSnapshot(map);
  p.setSurface(FLAT); assert.equal(map.minZoom, -2);
  p.focus([15, -10], { zoom: 3 }); const constellationFlat = cameraSnapshot(map);
  p.enter("atlas", identity, { fitFlat: atlasFit });
  assert.equal(map.minZoom, 1); assert.deepEqual(cameraSnapshot(map), atlasFlat);
  p.setSurface(GLOBE); assert.deepEqual(cameraSnapshot(map), atlasGlobe);
  p.enter("constellation", reading, { fitFlat: constellationFit });
  assert.deepEqual(cameraSnapshot(map), constellationGlobe);
  p.setSurface(FLAT); assert.deepEqual(cameraSnapshot(map), constellationFlat);
  p.enter("constellation", {}, { fitFlat: constellationFit });
  assert.deepEqual(map.center, [-15, 0]); assert.equal(map.zoom, 1);
  p.enter("atlas", identity, { fitFlat: atlasFit });
  assert.deepEqual(cameraSnapshot(map), atlasFlat);
  p.dispose();
});

test("whole globe preserves facing, overview refits on resize, detail does not", (t) => {
  let resized, disconnected = false, queued, cancelled;
  const previous = Object.getOwnPropertyDescriptor(globalThis, "ResizeObserver");
  Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: class {
    constructor(fn) { resized = fn; } observe() {} disconnect() { disconnected = true; }
  } });
  t.after(() => previous ? Object.defineProperty(globalThis, "ResizeObserver", previous) : delete globalThis.ResizeObserver);
  const { map, presentation: p } = setup({ requestFrame(fn) { queued = fn; return 42; }, cancelFrame(id) { cancelled = id; } });
  p.setSurface(GLOBE); p.focus([40, -60], { zoom: 5 }); p.overview();
  assert.deepEqual(map.center, [40, -60]);
  map.canvas.clientWidth = 320; map.canvas.clientHeight = 480;
  resized(); resized(); const before = map.resizes; queued(); assert.equal(map.resizes, before + 1);
  assert.deepEqual(cameraSnapshot(map), globeOverviewCamera({ width: 320, height: 480, center: [40, -60] }));
  map.emit("movestart", { originalEvent: {} });
  map.center = [15, 25]; map.zoom = 7; const detail = cameraSnapshot(map);
  map.canvas.clientWidth = 600; resized(); queued();
  assert.deepEqual(cameraSnapshot(map), detail);
  resized(); p.dispose(); assert(disconnected); assert.equal(cancelled, 42);
  const count = map.resizes; queued(); assert.equal(map.resizes, count);
});

test("public heatmaps restore their flat overview even with no phrase markers to fit", () => {
  const { map, presentation: p } = setup();
  p.enter("atlas", {}, { fitFlat: () => {} });
  const original = cameraSnapshot(map);
  p.setSurface(GLOBE); p.focus([150, 30], { zoom: 5 });
  p.setSurface(FLAT);
  assert.deepEqual(cameraSnapshot(map), original);
  p.dispose();
});

test("globe setup respects the real public zoom guard and completes without a false warning", () => {
  const errors = [];
  const { map, presentation: p } = setup({ onError: (message) => errors.push(message) });
  assert.throws(() => map.setMinZoom(-12), /minZoom must be between -2/);
  p.setSurface(GLOBE);
  assert.equal(map.minZoom, -2);
  assert.equal(map.projection.type, "globe");
  assert.deepEqual(cameraSnapshot(map), globeOverviewCamera({ width: 800, height: 600, center: [5, 10] }));
  assert(errors.every((message) => message === ""));
  p.dispose();
});

test("pole-facing overview uses a supported lens and restores the flat lens separately", () => {
  const { map, presentation: p } = setup();
  const flatFov = map.fov;
  map.canvas.clientWidth = 180; map.canvas.clientHeight = 180;
  p.focus([30, 85]); p.setSurface(GLOBE);
  assert.equal(map.zoom, -2); assert(map.fov > flatFov && map.fov <= 150);
  const globeCamera = cameraSnapshot(map);
  p.setSurface(FLAT); assert.equal(map.fov, flatFov);
  p.setSurface(GLOBE); assert.deepEqual(cameraSnapshot(map), globeCamera);
  map.canvas.clientWidth = 800; map.canvas.clientHeight = 800; p.overview();
  assert.equal(map.fov, flatFov);
  p.dispose();
});

test("camera failures do not claim a missing renderer and a successful retry clears the warning", () => {
  const errors = [];
  const { map, presentation: p } = setup({ onError: (message) => errors.push(message) });
  p.setSurface(GLOBE);
  const jump = map.jumpTo;
  map.jumpTo = () => { throw Error("fixture camera error"); };
  p.overview();
  assert.match(errors.at(-1), /view update failed/);
  assert(!errors.at(-1).includes("rendering unavailable"));
  assert.equal(map.projection.type, "globe");
  map.jumpTo = jump; p.overview(); assert.equal(errors.at(-1), "");
  p.dispose();
});

test("latest style generation and surface win, including day -> night -> day", () => {
  const { map, presentation: p } = setup();
  p.setSurface(GLOBE); p.focus([179, 45], { zoom: 5 });
  const saved = cameraSnapshot(map);
  const obsoleteDay = p.beginStyle("day");
  const obsoleteNight = p.beginStyle("dark");
  const latest = p.beginStyle("day");
  const moveCount = map.moves.length;
  map.styleLoaded(obsoleteDay); map.styleLoaded(obsoleteNight);
  assert.equal(map.moves.length, moveCount);
  p.setSurface(FLAT); p.setSurface(GLOBE);
  map.styleLoaded(latest, { "sky-color": "#abcdef" });
  assert.equal(map.projection.type, "globe");
  assert.deepEqual(cameraSnapshot(map), saved);
  assert.equal(map.sources.size, 1); assert.equal(map.layers.size, 1);
  map.emit("style.load"); // duplicate readiness cannot overwrite base sky or camera
  assert.equal(map.sources.size, 1);
  p.setSurface(FLAT);
  assert.equal(map.sources.size, 0); assert.equal(map.layers.size, 0);
  assert.deepEqual(map.style.sky, { "sky-color": "#abcdef" });
  p.dispose();
});

test("selection and overview requested during style loading survive readiness", () => {
  const { map, presentation: p } = setup();
  p.setSurface(GLOBE);
  let token = p.beginStyle("dark");
  p.focus([-179, 80], { zoom: 6 });
  map.styleLoaded(token);
  assert.deepEqual(map.center, [-179, 80]); assert.equal(map.zoom, 6);
  token = p.beginStyle("day"); p.overview(); map.styleLoaded(token);
  assert.deepEqual(map.center, [-179, 80]); assert(map.zoom < 3);
  p.dispose();
});

test("graticule is separate display geometry and globe errors allow flat recovery", () => {
  const errors = [];
  const { map, presentation: p } = setup({ onError: (message) => errors.push(message) });
  map.rejectGlobe = true; p.setSurface(GLOBE);
  assert.match(errors.at(-1), /return to flat/);
  p.setSurface(FLAT); assert.equal(errors.at(-1), "");
  assert.equal(map.projection.type, "mercator");
  map.rejectGlobe = false; p.setSurface(GLOBE);
  const count = errors.length;
  map.emit("error", { sourceId: "network-tile" }); assert.equal(errors.length, count);
  map.emit("error", {}); assert.match(errors.at(-1), /return to flat/);
  const graticule = map.getSource(GRATICULE_ID).data;
  assert.deepEqual(graticule, createGraticule());
  assert.deepEqual(graticule.features[0].properties, {});
  assert.equal(graticule.features[0].geometry.type, "MultiLineString");
  p.dispose();
  assert([...map.listeners.values()].every((listeners) => listeners.size === 0));
  const moves = map.moves.length;
  map.emit("style.load"); p.setSurface(FLAT); p.focus([0, 0]);
  assert.equal(map.moves.length, moves);
});

test("globe sky, projection, and guide layer validate against the pinned style specification", () => {
  const { validateStyleMin } = createRequire(import.meta.resolve("maplibre-gl"))("@maplibre/maplibre-gl-style-spec");
  const { map, presentation: p } = setup();
  p.setSurface(GLOBE);
  const errors = validateStyleMin({ version: 8, projection: map.projection, sky: map.style.sky,
    sources: Object.fromEntries(map.sources), layers: [...map.layers.values()] });
  assert.deepEqual(errors.map(({ message }) => message), []);
  p.dispose();
});

test("reduced motion applies to programmatic focus and all cameras stay north-up", (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "matchMedia");
  Object.defineProperty(globalThis, "matchMedia", { configurable: true, value: () => ({ matches: true }) });
  t.after(() => previous ? Object.defineProperty(globalThis, "matchMedia", previous) : delete globalThis.matchMedia);
  const { map, presentation: p } = setup();
  assert.equal(motionDuration(650), 0);
  p.setSurface(GLOBE); p.focus([175, 60], { zoom: 20, duration: 650 });
  assert.equal(map.moves.at(-1).duration, 0); assert.equal(map.zoom, 10);
  for (const camera of map.moves) assert.deepEqual([camera.bearing, camera.pitch, camera.roll], [0, 0, 0]);
  p.dispose();
});

function element(document) {
  return { ownerDocument: document, style: {}, attributes: {}, inert: false,
    contains(node) { return node === this; }, focus() { document.activeElement = this; },
    setAttribute(key, value) { this.attributes[key] = value; }, removeAttribute(key) { delete this.attributes[key]; } };
}
test("rear and offscreen controls become inert; focused markers hand off and cleanup restores", () => {
  const map = new MapDouble(); const document = {};
  const marker = element(document), fallback = element(document);
  let front = true, onscreen = true, surface = GLOBE;
  map.project = () => ({ x: onscreen ? 100 : -20, y: 100 });
  map.unproject = () => ({ lng: front ? 0 : 180, lat: 0 });
  marker.focus();
  const dispose = observeGlobeVisibility(map, [{ element: marker, coordinate: () => [0, 0] }], () => surface, () => fallback);
  assert.equal(marker.inert, false);
  front = false; map.emit("render");
  assert.equal(marker.inert, true); assert.equal(marker.style.visibility, "hidden");
  assert.equal(marker.attributes["aria-hidden"], "true"); assert.equal(document.activeElement, fallback);
  front = true; map.emit("render"); assert.equal(marker.inert, false);
  onscreen = false; map.emit("render"); assert.equal(marker.inert, true);
  surface = FLAT; map.emit("render"); assert.equal(marker.inert, false);
  surface = GLOBE; map.emit("render"); dispose();
  assert.equal(marker.inert, false); assert.equal(marker.style.visibility, "");
  assert.equal(map.listeners.get("render").size, 0);
  map.project = () => ({ x: NaN, y: 0 }); assert.equal(locationVisible(map, [0, 0], GLOBE), false);
});

test("surface and camera changes cannot mutate reading scope, collisions, or markdown", () => {
  const result = { value: 177, projection: "webmercator_hash_v1", entries: CONSTELLATION_CIPHERS.map((cipher, i) => ({
    cipher, value: 177, longitude: i < 4 ? 0 : 180, latitude: 0,
  })) };
  const locus = buildProjectedLoci({ type: "FeatureCollection", metadata: { occupancy_public: false },
    features: [{ type: "Feature", geometry: { type: "Point", coordinates: [180, 0] },
      properties: { cipher: "AQ", value: 177, mode: "value_domain", projection_method: "webmercator_hash_v1",
        phrases: ["PRIVATE_SENTINEL"], phrase_count: 1 } }] })[0];
  const before = JSON.stringify(result), text = constellationMarkdown(result), locusText = locusMarkdown(locus, locus.cliques[0].featureKey);
  const { presentation: p } = setup();
  p.enter("constellation", result, { fitFlat: constellationFit });
  p.setSurface(GLOBE); p.focus([180, 0]); p.overview(); p.setSurface(FLAT);
  assert.equal(JSON.stringify(result), before);
  assert.equal(constellationMarkdown(result), text);
  assert.equal(text.match(/^## /gm).length, 8);
  assert.equal(groupConstellationEntries(result.entries).length, 2);
  assert.equal(locusMarkdown(locus, locus.cliques[0].featureKey), locusText);
  assert(!locusText.includes("PRIVATE_SENTINEL")); assert(locusText.includes("not published"));
  p.dispose();
});

test("workspace wiring parks the constellation and keeps surface out of dataset/export dependencies", () => {
  const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
  const constellation = readFileSync(new URL("../src/ConstellationView.jsx", import.meta.url), "utf8");
  assert(main.includes('<ConstellationView active={isConstellation}'));
  assert(!main.includes('{isConstellation && <ConstellationView'));
  assert(constellation.includes('hidden={!active}'));
  assert(main.includes('[manifest, refreshNonce, selectedDatasetFile]'));
  assert(main.includes('locationVisible(map, item.geometry.coordinates, surface)'));
  assert(!main.includes('localStorage.setItem("surface"'));
});
