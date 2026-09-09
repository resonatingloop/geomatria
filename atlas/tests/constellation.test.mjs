import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CONSTELLATION_CIPHERS, CONSTELLATION_PROJECTIONS, constellationDatasets,
  createConstellationLoader, createConstellationRequest, groupConstellationEntries, parseConstellationValue,
} from "../src/constellationData.js";
import { publicDataset, publicManifestEntry } from "../scripts/build-data.mjs";

const projection = CONSTELLATION_PROJECTIONS[0].id;
const manifest = CONSTELLATION_CIPHERS.map((cipher) => ({
  id: `${cipher}.${projection}.value_domain`, cipher, source: "static", mode: "value_domain",
  projection_method: projection, min_value: 1, max_value: 2000,
  file: `/data/${cipher}.${projection}.domain_1_2000.geojson`,
}));
function collection(dataset) {
  return {
    type: "FeatureCollection", metadata: { phrases: ["PRIVATE_SENTINEL"], occupancy_public: true },
    features: Array.from({ length: 2000 }, (_, index) => ({
      type: "Feature", geometry: { type: "Point", coordinates: [index / 20, index / 50] },
      properties: { cipher: dataset.cipher, value: index + 1, projection_method: dataset.projection_method,
        mode: "value_domain", phrases: ["PRIVATE_SENTINEL"], phrase_count: 12, has_phrases: true,
        unrecognized: { secret: "PRIVATE_SENTINEL" } },
    })),
  };
}
function fetchFixture(onFetch = () => {}) {
  return async (url) => {
    const dataset = manifest.find((entry) => url.endsWith(entry.file));
    onFetch(dataset, url);
    return { ok: true, json: async () => collection(dataset) };
  };
}

test("constellation accepts only exact integers within 1–2000", () => {
  for (const value of [1, 177, 2000, " 0177 "]) assert.equal(parseConstellationValue(value), Number(value));
  for (const value of ["", " ", 0, -1, 2001, "1.5", "1e3", "0x10", "177 words", "+177", Infinity, NaN]) {
    assert.throws(() => parseConstellationValue(value), /whole number/);
  }
});

test("manifest selection retains canonical order and rejects missing or ambiguous snapshots", () => {
  assert.deepEqual(constellationDatasets([...manifest].reverse(), projection).map((entry) => entry.cipher), CONSTELLATION_CIPHERS);
  assert.throws(() => constellationDatasets(manifest.slice(1), projection), /expected one/);
  assert.throws(() => constellationDatasets([...manifest, manifest[0]], projection), /found 2/);
  assert.throws(() => constellationDatasets(manifest, "value_hash_v1"), /supported/);
  assert.throws(() => constellationDatasets(manifest.map((entry) => ({ ...entry, source: "live" })), projection), /expected one/);
  assert.throws(() => constellationDatasets(manifest.map((entry) => ({ ...entry, file: "https://example.test/data.geojson" })), projection), /expected one/);
});

test("loader caches eight numeric indexes, uses the public subpath, and drops private/unknown fields", async () => {
  const calls = [];
  const load = createConstellationLoader(fetchFixture((_, url) => calls.push(url)), (file) => `/geogematria${file}`);
  const [first, second] = await Promise.all([load(manifest, projection, 1), load(manifest, projection, 177)]);
  const last = await load(manifest, projection, 2000);
  assert.equal(calls.length, 8);
  assert(calls.every((url) => url.startsWith("/geogematria/data/") && !url.includes("/api/")));
  for (const result of [first, second, last]) {
    assert.deepEqual(result.entries.map((entry) => entry.cipher), CONSTELLATION_CIPHERS);
    assert(result.entries.every((entry) => entry.value === result.value));
    assert(!JSON.stringify(result).includes("PRIVATE_SENTINEL"));
    assert(!JSON.stringify(result).includes("phrase_count"));
  }
});

test("failed snapshots are evicted and retry succeeds without reloading the successful seven", async () => {
  const calls = new Map();
  const load = createConstellationLoader(async (url) => {
    calls.set(url, (calls.get(url) ?? 0) + 1);
    if (url === manifest[0].file && calls.get(url) === 1) return { ok: false, status: 503 };
    return fetchFixture()(url);
  });
  await assert.rejects(load(manifest, projection, 177), /503/);
  assert.equal((await load(manifest, projection, 177)).entries.length, 8);
  assert.equal([...calls.values()].reduce((a, b) => a + b, 0), 9);
});

test("corrupt, duplicate, incomplete, wrong-cipher and wrong-projection data cannot yield a partial constellation", async () => {
  const corruptions = [
    (data) => data.features.pop(),
    (data) => { data.features[0].properties.value = 2; },
    (data) => { data.features[0].properties.cipher = "wrong"; },
    (data) => { data.features[0].properties.projection_method = "wrong"; },
    (data) => { data.features[0].geometry.coordinates = [999, 999]; },
  ];
  for (const corrupt of corruptions) {
    const load = createConstellationLoader(async (url) => {
      const dataset = manifest.find((entry) => entry.file === url);
      const data = collection(dataset);
      if (dataset.cipher === "AQ") corrupt(data);
      return { ok: true, json: async () => data };
    });
    await assert.rejects(load(manifest, projection, 177));
  }
});

test("coincident ciphers keep their entries at the true shared coordinate", () => {
  const entries = CONSTELLATION_CIPHERS.map((cipher) => ({ cipher, value: 177, longitude: 12, latitude: 34, projection }));
  const groups = groupConstellationEntries(entries);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].entries, entries);
  assert.equal(groups[0].longitude, 12);
  assert.equal(groups[0].latitude, 34);
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("latest-request gate ignores old completions/errors and invalidates exportable results", async () => {
  const states = [];
  const request = createConstellationRequest((state) => states.push(state));
  const first = deferred();
  const second = deferred();
  const oldRun = request.run(() => first.promise);
  const newRun = request.run(() => second.promise);
  second.resolve({ value: 2000 });
  await newRun;
  first.reject(new Error("old failure"));
  await oldRun;
  assert.equal(states.at(-1).result.value, 2000);
  request.invalidate();
  assert.equal(states.at(-1).result, null);
  const third = deferred();
  const pending = request.run(() => third.promise);
  request.invalidate();
  third.resolve({ value: 1 });
  await pending;
  assert.equal(states.at(-1).status, "idle");
  const disposed = deferred();
  const last = request.run(() => disposed.promise);
  const count = states.length;
  request.dispose();
  disposed.resolve({ value: 177 });
  await last;
  assert.equal(states.length, count);
});

test("real curated snapshots match both editions for boundary values and 177 without phrase data", async () => {
  const master = JSON.parse(readFileSync(new URL("../datasets/manifest.json", import.meta.url), "utf8"));
  const curation = JSON.parse(readFileSync(new URL("../datasets/curation.public.json", import.meta.url), "utf8"));
  const selected = master.filter((entry) => curation.includes(entry.file.split("/").at(-1)));
  const read = (file) => JSON.parse(readFileSync(new URL(`../datasets/${file.split("/").at(-1)}`, import.meta.url), "utf8"));
  const local = createConstellationLoader(async (file) => ({ ok: true, json: async () => read(file) }));
  const publicLoad = createConstellationLoader(async (file) => ({ ok: true, json: async () => publicDataset(read(file)) }));
  for (const { id } of CONSTELLATION_PROJECTIONS) {
    for (const value of [1, 177, 2000]) {
      const reading = await local(master, id, value);
      const publicReading = await publicLoad(selected.map(publicManifestEntry), id, value);
      assert.deepEqual(publicReading, reading);
      for (const entry of reading.entries) {
        const dataset = selected.find((dataset) => dataset.cipher === entry.cipher && dataset.projection_method === id);
        const feature = read(dataset.file).features.find((feature) => feature.properties.value === value);
        assert.deepEqual([entry.longitude, entry.latitude], feature.geometry.coordinates);
        assert(Math.abs(entry.latitude) <= 85.051129);
      }
    }
  }
});

test("current request failures disable the reading and a successful retry recovers", async () => {
  const states = [];
  const request = createConstellationRequest((state) => states.push(state));
  await request.run(async () => { throw new Error("snapshot unavailable"); });
  assert.deepEqual(states.at(-1), { status: "error", result: null, message: "snapshot unavailable" });
  await request.run(async () => ({ value: 177 }));
  assert.equal(states.at(-2).status, "loading");
  assert.equal(states.at(-2).result, null);
  assert.equal(states.at(-1).status, "ready");
  assert.equal(states.at(-1).result.value, 177);
});

test("public sanitization removes phrase fields and occupancy metadata without mutating sources", () => {
  const original = collection(manifest[0]);
  original.metadata.summary = { values_with_phrases: 12, values_without_phrases: 2, domain_value_count: 2000 };
  // Unknown fields are deliberately not treated as safe export fields; the
  // constellation loader's own allowlist separately strips them.
  const sanitized = publicDataset(original);
  assert.equal(sanitized.metadata.occupancy_public, false);
  assert.equal(sanitized.metadata.summary.domain_value_count, 2000);
  assert(!("values_with_phrases" in sanitized.metadata.summary));
  assert(!("phrases" in sanitized.features[0].properties));
  assert(!("phrase_count" in sanitized.features[0].properties));
  assert(!("has_phrases" in sanitized.features[0].properties));
  assert.equal(original.features[0].properties.phrases[0], "PRIVATE_SENTINEL");
});
