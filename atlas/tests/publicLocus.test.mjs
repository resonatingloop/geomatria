import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildProjectedLoci } from "../src/atlasData.js";
import { locusReadoutModel } from "../src/readoutModel.js";
import { locusMarkdown } from "../src/markdownExport.js";

// Compile the actual JSX for component/markup checks without adding a test
// renderer dependency. This is not browser layout, focus or event-dispatch proof.
const { build } = createRequire(import.meta.resolve("vite"))("esbuild");
const bundle = await build({
  entryPoints: [fileURLToPath(new URL("../src/ReadoutTray.jsx", import.meta.url)),
    fileURLToPath(new URL("../src/ProjectedLocusReadout.jsx", import.meta.url))],
  bundle: true, write: false, outdir: "unused", platform: "node", format: "cjs",
  packages: "external", define: { "import.meta.env": "{}" },
});
function loadComponent(filename) {
  const module = { exports: {} };
  runInNewContext(bundle.outputFiles.find((file) => file.path.endsWith(filename)).text, {
    module, exports: module.exports, require: createRequire(import.meta.url),
    console, URL, Blob, setTimeout, clearTimeout,
  });
  return module.exports;
}
const { ProjectedLocusReadout } = loadComponent("ProjectedLocusReadout.js");
const { ReadoutTray } = loadComponent("ReadoutTray.js");

function fixture(occupancyPublic = false, values = [1677, 43, 913]) {
  return buildProjectedLoci({
    type: "FeatureCollection", metadata: { occupancy_public: occupancyPublic },
    features: values.map((value) => ({
      type: "Feature", geometry: { type: "Point", coordinates: [-120.43572, 34.95303] },
      properties: { cipher: "AQ", value, mode: "value_domain",
        projection_method: "nearest_10000_towns_hash_v1",
        phrases: value === 913 ? ["PRIVATE_PHRASE_SENTINEL"] : [],
        phrase_count: value === 913 ? 98765 : 0,
        base_coordinate: { latitude: 40, longitude: value / 10, projection_method: "webmercator_hash_v1" },
        snapped_place: { name: "Santa Maria", country: "US", latitude: 34.95303,
          longitude: -120.43572, distance_km: value / 2 },
      },
    })),
  })[0];
}
function nodes(element, predicate) {
  if (Array.isArray(element)) return element.flatMap((child) => nodes(child, predicate));
  if (!React.isValidElement(element)) return [];
  return [...(predicate(element) ? [element] : []), ...nodes(element.props.children, predicate)];
}
const valueButtons = (tree) => nodes(tree, (node) => node.type === "button" && "aria-pressed" in node.props);

test("public heat click retains every numeric value, sorted, without phrase-driven membership", () => {
  const locus = fixture();
  const before = JSON.stringify(locus);
  for (const key of ["", "stale-key", ...locus.cliques.map((c) => c.featureKey)]) {
    const model = locusReadoutModel(locus, key);
    assert.deepEqual(model.cliques.map((c) => c.details.value), ["43", "913", "1677"]);
    assert(model.cliques.every((c) => c.details.phrases.length === 0 && !c.details.hasPhrases));
    assert.equal(model.selectedClique?.featureKey ?? "", locus.cliques.some((c) => c.featureKey === key) ? key : "");
  }
  assert.equal(JSON.stringify(locus), before, "visibility must not mutate the source locus");
});

test("public tray exposes selectable values before geography, including a single-value locus", () => {
  for (const values of [[1677, 43, 913], [43]]) {
    const locus = fixture(false, values);
    const html = renderToStaticMarkup(React.createElement(ProjectedLocusReadout, { locus, onSelectValue() {} }));
    assert(html.includes('aria-label="domain values at this locus"'));
    assert(html.indexOf('class="public-value-list"') < html.indexOf('class="detail-grid"'));
    assert.equal((html.match(/aria-pressed="false"/g) ?? []).length, values.length);
    assert(!html.includes("select an integer through the value aperture"));
    assert(!html.includes("PRIVATE_PHRASE_SENTINEL"));
    assert(!html.includes("98765"));
    assert(!html.includes("No phrases"));
    assert(html.includes("occupancy is not published"));
  }
});

test("value buttons emit their feature identity, retain all siblings and reflect the selected reading", () => {
  const locus = fixture();
  let selectedFeatureKey = "";
  const onSelectValue = (key) => { selectedFeatureKey = key; };
  const tree = () => ProjectedLocusReadout({ locus, selectedFeatureKey, onSelectValue });
  const order = locusReadoutModel(locus).cliques;
  assert.equal(order.length, 3);
  assert.equal(valueButtons(tree()).length, 3);
  for (let index = 0; index < order.length; index++) {
    valueButtons(tree())[index].props.onClick();
    assert.equal(selectedFeatureKey, order[index].featureKey);
    const buttons = valueButtons(tree());
    assert.equal(buttons.length, 3);
    assert.equal(buttons.filter((button) => button.props["aria-pressed"]).length, 1);
    assert.equal(buttons[index].props["aria-pressed"], true);
    const html = renderToStaticMarkup(React.createElement(ProjectedLocusReadout, { locus, selectedFeatureKey, onSelectValue }));
    assert(html.includes(`selected value · AQ ${order[index].details.value}`));
    assert(html.includes(`snap distance: ${order[index].details.snappedPlace.distanceKm}`));
    const markdown = locusMarkdown(locus, selectedFeatureKey);
    for (const value of [43, 913, 1677]) assert(markdown.includes(`## AQ · ${value}`));
  }
});

test("tray forwards selection and disabled state; a closed tray remains inert", () => {
  const locus = fixture();
  const onSelectValue = () => {};
  const tree = ReadoutTray({ open: false, locus, onSelectValue, selectionDisabled: true });
  const readout = nodes(tree, (node) => node.type?.name === "ProjectedLocusReadout")[0];
  assert.equal(readout.props.onSelectValue, onSelectValue);
  assert.equal(readout.props.selectionDisabled, true);
  const aside = nodes(tree, (node) => node.type === "aside")[0];
  assert.equal(aside.props["aria-hidden"], true); assert.equal(aside.props.inert, "");
  const buttons = valueButtons(ProjectedLocusReadout(readout.props));
  assert(buttons.every((button) => button.props.disabled));
});

test("local phrase-bearing domain keeps selected-plus-occupied visibility and its phrase ledger", () => {
  const locus = fixture(true);
  const selected = locus.cliques.find((c) => c.details.value === "43").featureKey;
  assert.deepEqual(locusReadoutModel(locus, selected).cliques.map((c) => c.details.value), ["43", "913"]);
  const html = renderToStaticMarkup(React.createElement(ProjectedLocusReadout, { locus, selectedFeatureKey: selected }));
  assert(!html.includes('class="public-value-list"'));
  assert(html.includes("PRIVATE_PHRASE_SENTINEL"));
});
