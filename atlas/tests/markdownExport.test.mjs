import assert from "node:assert/strict";
import test from "node:test";
import { buildProjectedLoci } from "../src/atlasData.js";
import { locusReadoutModel } from "../src/readoutModel.js";
import {
  constellationMarkdown, copyMarkdown, downloadMarkdown, locusMarkdown, markdownText,
} from "../src/markdownExport.js";

function locusFixture(occupancyPublic = true) {
  return buildProjectedLoci({
    type: "FeatureCollection", metadata: { occupancy_public: occupancyPublic },
    features: [
      { value: 177, phrases: [], phrase_count: 0 },
      { value: 178, phrases: ["visible <tag> | [link](url)\n# heading"], phrase_count: 1 },
      { value: 179, phrases: [], phrase_count: 0, secret: "HIDDEN_SENTINEL" },
    ].map((properties) => ({
      type: "Feature", geometry: { type: "Point", coordinates: [12.25, 34.5] },
      properties: { ...properties, cipher: "AQ", mode: "value_domain", projection_method: "nearest_10000_towns_hash_v1",
        base_coordinate: { latitude: 40, longitude: 10, projection_method: "webmercator_hash_v1" },
        snapped_place: { name: "test town", country: "XX", latitude: 34.5, longitude: 12.25, distance_km: 12.345 } },
    })),
  })[0];
}

test("locus display and export share the selected-plus-visible scope", () => {
  const locus = locusFixture();
  const selected = locus.cliques[0].featureKey;
  assert.deepEqual(locusReadoutModel(locus, selected).cliques.map(({ details }) => details.value), ["177", "178"]);
  const text = locusMarkdown(locus, selected);
  assert(text.includes("## AQ · 177"));
  assert(text.includes("## AQ · 178"));
  assert(!text.includes("## AQ · 179"));
  assert(!text.includes("HIDDEN_SENTINEL"));
  assert(text.includes("34.500000, 12.250000 (latitude, longitude)"));
  assert(text.includes("40.000000, 10.000000 (latitude, longitude)"));
  assert(text.includes("12.345 km"));
  assert(text.includes("source: static snapshot"));
});

test("public locus exports suppress populated private fields and never imply zero occupancy", () => {
  const locus = locusFixture(false);
  const selected = locus.cliques[1].featureKey;
  const model = locusReadoutModel(locus, selected);
  assert.deepEqual(model.cliques.map(({ details }) => details.value), ["177", "178", "179"]);
  assert(model.cliques.every(({ details }) => details.phrases.length === 0));
  const text = locusMarkdown(locus, selected);
  assert(text.includes("## AQ · 178"));
  assert(text.includes("occupancy is not published"));
  assert(!text.includes("visible"));
  assert(!text.includes("phrase count:"));
  assert(!text.includes("values with phrases:"));
  assert(!text.includes("no phrases"));
  assert(!text.includes("HIDDEN_SENTINEL"));
  const unselected = locusMarkdown(locus);
  assert(!unselected.includes("no individual values selected"));
  for (const value of [177, 178, 179]) assert(unselected.includes(`## AQ · ${value}`));
  assert.equal(unselected, text, "selecting a public value must not shrink the locus export");
});

test("local live cliquemap exports retain visible saved phrases and label their source", () => {
  const locus = buildProjectedLoci({ type: "FeatureCollection", features: [{
    type: "Feature", geometry: { type: "Point", coordinates: [-12, 34] },
    properties: { cipher: "QWER", value: 177, projection: "value_hash_v1", count: 1, phrases: ["saved phrase"] },
  }] })[0];
  const text = locusMarkdown(locus, "", "live local layer");
  assert(text.includes("source: live local layer"));
  assert(text.includes("saved phrase"));
  assert(text.includes("phrase count: 1"));
});

test("markdown text neutralizes markup, table syntax, headings and embedded newlines", () => {
  const escaped = markdownText("<script>&evil</script>\r\n# title | [link](url) `code` *x* ![image](u) ~~strike~~");
  assert(!escaped.includes("<script>"));
  assert(!escaped.includes("\n"));
  assert(escaped.includes("&lt;script&gt;&amp;evil"));
  assert(escaped.includes("\\|"));
  assert(escaped.includes("\\[link\\]\\(url\\)"));
  assert(escaped.includes("\\# title"));
});

test("whole constellation markdown includes every cipher at collisions, with only numeric/geographic fields", () => {
  const entries = ["AQ", "QWER"].map((cipher) => ({
    cipher, value: 177, latitude: 34.5, longitude: 12.25,
    phrases: ["PRIVATE_SENTINEL"], phrase_count: 999, unexpected: "PRIVATE_SENTINEL",
    place: { name: "test town", country: "XX", distanceKm: 12.345 },
    baseCoordinate: { latitude: 40, longitude: 10, projection: "webmercator_hash_v1" },
  }));
  const text = constellationMarkdown({ value: 177, projection: "nearest_10000_towns_hash_v1", entries });
  assert(text.includes("scope: whole constellation"));
  assert(text.includes("## AQ · 177"));
  assert(text.includes("## QWER · 177"));
  assert.equal(text.match(/34\.500000, 12\.250000/g).length, 2);
  assert(!text.includes("PRIVATE_SENTINEL"));
  assert(!text.includes("999"));
});

test("copy handles success, unavailable clipboard and denied access", async () => {
  let copied;
  await copyMarkdown("test markdown", { writeText: async (text) => { copied = text; } });
  assert.equal(copied, "test markdown");
  await assert.rejects(copyMarkdown("test", {}), /clipboard unavailable/);
  await assert.rejects(copyMarkdown("test", { writeText: async () => { throw new Error("denied"); } }), /clipboard blocked/);
});

test("download and copy receive identical UTF-8 markdown; links and URLs are cleaned up", async () => {
  const text = "# reading\n\n177 · eight addresses\n";
  let blob, copied, clicked = false, removed = false, revoked = false;
  const link = { click() { clicked = true; }, remove() { removed = true; } };
  const documentRef = { createElement: () => link, body: { append: (element) => assert.equal(element, link) } };
  const urlApi = { createObjectURL(value) { blob = value; return "blob:reading"; }, revokeObjectURL(url) { assert.equal(url, "blob:reading"); revoked = true; } };
  await copyMarkdown(text, { writeText: async (value) => { copied = value; } });
  downloadMarkdown(text, "constellation/177", documentRef, urlApi);
  assert.equal(await blob.text(), copied);
  assert.equal(blob.type, "text/markdown;charset=utf-8");
  assert.equal(link.download, "constellation-177.md");
  assert(clicked && removed);
  await new Promise((resolve) => setTimeout(resolve, 1050));
  assert(revoked);
});
