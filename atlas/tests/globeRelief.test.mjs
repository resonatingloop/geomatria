import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { globeScreenCircle, observeGlobeRelief } from "../src/globeRelief.js";
import { globeOverviewCamera } from "../src/mapPresentation.js";

function fixture() {
  const camera = globeOverviewCamera({ width: 800, height: 600, center: [0, 0] });
  const listeners = new Set(), elements = [], placements = [];
  const map = {
    width: 800, height: 600, center: { lng: 0, lat: 0 }, zoom: camera.zoom, fov: camera.fov,
    surface: "globe", pitch: 0, roll: 0, offsetX: 0, offsetY: 0,
    getCanvas: () => canvas, getProjection() { return { type: this.surface }; },
    getCenter() { return this.center; }, getZoom() { return this.zoom; },
    getVerticalFieldOfView() { return this.fov; }, getPitch() { return this.pitch; }, getRoll() { return this.roll; },
    project() { return { x: this.width / 2 + this.offsetX, y: this.height / 2 + this.offsetY }; },
    on(name, callback) { assert.equal(name, "render"); listeners.add(callback); },
    off(name, callback) { assert.equal(name, "render"); listeners.delete(callback); },
  };
  const canvas = {
    get clientWidth() { return map.width; }, get clientHeight() { return map.height; },
    ownerDocument: { createElement(tag) {
      assert.equal(tag, "div");
      const element = { attributes: {}, style: { setProperty(key, value) { this[key] = value; } },
        setAttribute(key, value) { this.attributes[key] = value; }, remove() { this.removed = true; } };
      elements.push(element); return element;
    } },
    insertAdjacentElement(where, element) { placements.push({ where, element }); },
  };
  return { map, elements, placements, listeners, render: () => listeners.forEach((callback) => callback()) };
}

test("relief follows camera radius, lens, aperture and projected center without changing the camera", () => {
  const { map } = fixture();
  const circle = globeScreenCircle(map);
  assert.equal(circle.x, 400); assert.equal(circle.y, 300); assert(Math.abs(circle.radius - 240) < 1e-8);
  map.offsetX = 20; map.offsetY = -15; map.zoom += 0.5;
  const zoomed = globeScreenCircle(map);
  assert(zoomed.radius > circle.radius); assert.equal(zoomed.x, 420); assert.equal(zoomed.y, 285);
  map.fov = 60;
  assert(globeScreenCircle(map).radius < zoomed.radius);
  map.width = 180; map.height = 180; map.center = { lng: 179, lat: 85 };
  const camera = globeOverviewCamera({ width: 180, height: 180, center: [179, 85] });
  map.zoom = camera.zoom; map.fov = camera.fov;
  const before = JSON.stringify({ center: map.center, zoom: map.zoom, fov: map.fov });
  assert(Math.abs(globeScreenCircle(map).radius - 72) < 1e-8);
  assert.equal(JSON.stringify({ center: map.center, zoom: map.zoom, fov: map.fov }), before);
});

test("flat, unsupported poses, invalid sizes and offscreen limbs have no decorative circle", () => {
  const { map } = fixture();
  map.surface = "mercator"; assert.equal(globeScreenCircle(map), null); map.surface = "globe";
  map.pitch = 10; assert.equal(globeScreenCircle(map), null); map.pitch = 0;
  map.roll = 10; assert.equal(globeScreenCircle(map), null); map.roll = 0;
  map.width = 0; assert.equal(globeScreenCircle(map), null); map.width = 800;
  map.zoom = NaN; assert.equal(globeScreenCircle(map), null);
  map.zoom = 10; assert.equal(globeScreenCircle(map), null);
});

test("one inert decoration sits directly after the canvas, tracks renders and cleans up", () => {
  const { map, elements, placements, listeners, render } = fixture();
  const dispose = observeGlobeRelief(map);
  assert.equal(elements.length, 1); assert.equal(listeners.size, 1);
  const element = elements[0];
  assert.deepEqual(placements, [{ where: "afterend", element }]);
  assert.equal(element.attributes["aria-hidden"], "true"); assert.equal(element.inert, true);
  assert.equal(element.hidden, false);
  assert(!("tabIndex" in element));
  const width = parseFloat(element.style.width);
  map.zoom += 0.5; render(); assert(parseFloat(element.style.width) > width);
  map.surface = "mercator"; render(); assert.equal(element.hidden, true);
  map.surface = "globe"; render(); assert.equal(element.hidden, false);
  dispose(); assert.equal(listeners.size, 0); assert.equal(element.removed, true);
});

test("temporary style unavailability hides only the decoration and recovers on the next render", () => {
  const { map, elements, render } = fixture();
  const dispose = observeGlobeRelief(map);
  const project = map.project;
  map.project = () => { throw Error("style loading"); };
  assert.doesNotThrow(render); assert.equal(elements[0].hidden, true);
  map.project = project; render(); assert.equal(elements[0].hidden, false);
  dispose();
});

test("relief is day/globe-only, non-interactive, unanimated and below marker stacking", () => {
  const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert(main.includes("theme !== THEME_DAY || surface !== GLOBE || !presentation"));
  assert(main.includes("return observeGlobeRelief(mapRef.current)"));
  assert(main.includes("[presentation, surface, theme]"));
  const rules = css.slice(css.indexOf(".globe-relief {"), css.indexOf(".globe-register {"));
  assert(rules.includes("display: none")); assert(rules.includes("pointer-events: none"));
  assert(rules.includes("[data-theme='day'] .atlas-workspace--globe .globe-relief:not([hidden])"));
  assert(!rules.includes("z-index:")); assert(!rules.includes("transition:")); assert(!rules.includes("animation:"));
});
