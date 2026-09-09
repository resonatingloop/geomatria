import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { globeOverviewCamera, locationVisible, GLOBE } from "../src/mapPresentation.js";
import { globeScreenCircle } from "../src/globeRelief.js";

// CPU-level oracle from the exact pinned renderer, not another hand-written
// globe approximation. Renderer internals stay test-only; production uses
// public project/unproject APIs. This does not establish GPU or browser proof.
// esbuild is Vite's declared dependency, resolved from Vite's own package.
const { build } = createRequire(import.meta.resolve("vite"))("esbuild");
const bundle = await build({
  stdin: { contents: `
    export { VerticalPerspectiveTransform } from './node_modules/maplibre-gl/src/geo/projection/vertical_perspective_transform.ts';
    export { LngLat } from './node_modules/maplibre-gl/src/geo/lng_lat.ts';`,
  resolveDir: fileURLToPath(new URL("../", import.meta.url)) },
  bundle: true, write: false, platform: "node", format: "cjs",
});
const module = { exports: {} };
runInNewContext(bundle.outputFiles[0].text, { module, exports: module.exports,
  require: createRequire(import.meta.url), console, setTimeout, clearTimeout,
  TextDecoder, TextEncoder, URL, URLSearchParams, performance, AbortController });
const { VerticalPerspectiveTransform, LngLat } = module.exports;
function nativeMap(center, width = 800, height = 600, zoom) {
  const transform = new VerticalPerspectiveTransform({ minZoom: -2, maxZoom: 10 });
  transform.resize(width, height);
  const camera = globeOverviewCamera({ width, height, center });
  transform.setFov(camera.fov);
  transform.setCenter(new LngLat(...camera.center)); transform.setZoom(zoom ?? camera.zoom);
  return { transform, camera,
    project: (coordinate) => transform.locationToScreenPoint(new LngLat(...(Array.isArray(coordinate)
      ? coordinate : [coordinate.lng, coordinate.lat]))),
    unproject: (point) => transform.screenPointToLocation(point),
    getCanvas: () => ({ clientWidth: width, clientHeight: height }),
    getCenter: () => transform.center, getZoom: () => transform.zoom,
    getVerticalFieldOfView: () => transform.fov, getProjection: () => ({ type: "globe" }),
    getPitch: () => 0, getRoll: () => 0,
  };
}

test("native globe occlusion agrees for front/rear, dateline, polar and coincident fixtures", () => {
  for (const center of [[0, 0], [179, 0], [-179, 0], [30, 80], [-30, -80]]) {
    for (const zoom of [undefined, 5, 10]) {
      const map = nativeMap(center, 800, 600, zoom);
      const fixtures = [center, center, [center[0] + 180, -center[1]],
        [179.9, 10], [-179.9, 10], [0, 89.99], [0, -89.99], [0, 0], [45, 30]];
      for (const coordinate of fixtures) {
        const point = map.project(coordinate);
        const nativeVisible = !map.transform.isLocationOccluded(new LngLat(...coordinate))
          && point.x >= 0 && point.y >= 0 && point.x <= 800 && point.y <= 600;
        assert.equal(locationVisible(map, coordinate, GLOBE), nativeVisible, `${center}; zoom ${zoom}; point ${coordinate}`);
      }
    }
  }
});

test("native silhouette fits with a margin in portrait, landscape, and high-latitude overviews", () => {
  for (const [width, height] of [[800, 600], [320, 480], [600, 220], [180, 180]]) {
    for (const center of [[0, 0], [179, 0], [30, 80], [-30, -85]]) {
      const map = nativeMap(center, width, height);
      let largestRadius = 0;
      // Known geographic grid, independent of gematria transform algorithms.
      for (let latitude = -89; latitude <= 89; latitude += 2) {
        for (let longitude = -180; longitude < 180; longitude += 3) {
          const point = map.project([longitude, latitude]);
          if (map.transform.isLocationOccluded(new LngLat(longitude, latitude))) continue;
          const radius = Math.hypot(point.x - width / 2, point.y - height / 2);
          largestRadius = Math.max(largestRadius, radius);
        }
      }
      const expected = Math.min(width, height) * 0.4;
      assert(Math.abs(largestRadius - expected) < 1, `${width}x${height} at ${center}: radius ${largestRadius} vs ${expected}`);
      const relief = globeScreenCircle(map);
      assert.equal(relief.x, width / 2); assert.equal(relief.y, height / 2);
      assert(Math.abs(largestRadius - relief.radius) < 1, "decorative rim must match the native silhouette");
    }
  }
});
