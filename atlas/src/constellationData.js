import { resolveAssetUrl, validateAtlas } from "./atlasData.js";

export const CONSTELLATION_CIPHERS = ["AQ", "Synx", "QWER", "nQWER", "Ordinal", "Reduced", "Standard", "Satanic"];
export const CONSTELLATION_PROJECTIONS = [
  { id: "webmercator_hash_v1", label: "hash scatter" },
  { id: "nearest_10000_towns_hash_v1", label: "nearest 10,000 towns" },
];

export function parseConstellationValue(input) {
  const text = String(input).trim();
  const value = Number(text);
  if (!/^\d+$/.test(text) || !Number.isInteger(value) || value < 1 || value > 2000) {
    throw new Error("enter a whole number from 1 to 2000.");
  }
  return value;
}

export function constellationDatasets(manifest, projection) {
  if (!CONSTELLATION_PROJECTIONS.some(({ id }) => id === projection)) {
    throw new Error("choose a supported constellation projection.");
  }
  return CONSTELLATION_CIPHERS.map((cipher) => {
    const matches = manifest.filter((entry) =>
      entry.source !== "live" && entry.mode === "value_domain" &&
      entry.cipher === cipher && entry.projection_method === projection &&
      entry.min_value === 1 && entry.max_value === 2000
    );
    if (matches.length !== 1 || !/^\/?data\/.+\.geojson$/.test(matches[0].file)) {
      throw new Error(`expected one static 1–2000 dataset for ${cipher}; found ${matches.length}.`);
    }
    return matches[0];
  });
}

// Only these numeric/geographic fields cross into the constellation. In
// particular, local snapshots must not introduce saved-phrase occupancy here.
function numericEntry(feature, dataset) {
  const p = feature.properties;
  const [longitude, latitude] = feature.geometry.coordinates;
  const base = p.base_coordinate;
  const place = p.snapped_place;
  return {
    cipher: dataset.cipher,
    value: p.value,
    projection: dataset.projection_method,
    dataset: dataset.id,
    latitude,
    longitude,
    baseCoordinate: base && Number.isFinite(base.latitude) && Number.isFinite(base.longitude)
      ? { latitude: base.latitude, longitude: base.longitude, projection: base.projection_method }
      : null,
    place: place && typeof place.name === "string"
      ? {
        name: place.name,
        country: typeof place.country === "string" ? place.country : "",
        distanceKm: Number.isFinite(place.distance_km) ? place.distance_km : null,
      }
      : null,
  };
}

function datasetIndex(collection, dataset) {
  validateAtlas(collection);
  const index = new Map();
  for (const feature of collection.features) {
    const p = feature.properties ?? {};
    if (p.mode !== "value_domain" || p.cipher !== dataset.cipher ||
        (p.projection_method ?? p.projection) !== dataset.projection_method ||
        !Number.isInteger(p.value) || p.value < 1 || p.value > 2000 || index.has(p.value)) {
      throw new Error(`invalid or duplicate cipher/value in ${dataset.cipher} snapshot.`);
    }
    index.set(p.value, numericEntry(feature, dataset));
  }
  if (index.size !== 2000) throw new Error(`incomplete ${dataset.cipher} snapshot; expected values 1–2000.`);
  return index;
}

export function groupConstellationEntries(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = `${entry.projection}:${entry.longitude}:${entry.latitude}`;
    if (!groups.has(key)) groups.set(key, { key, longitude: entry.longitude, latitude: entry.latitude, entries: [] });
    groups.get(key).entries.push(entry);
  }
  return [...groups.values()];
}

export function createConstellationLoader(fetcher = (...args) => fetch(...args), resolve = resolveAssetUrl) {
  const cache = new Map();
  function loadDataset(dataset) {
    const key = `${resolve(dataset.file)}:${dataset.cipher}:${dataset.projection_method}`;
    if (!cache.has(key)) {
      const pending = Promise.resolve().then(async () => {
        const response = await fetcher(resolve(dataset.file));
        if (!response.ok) throw new Error(`${dataset.cipher} snapshot request failed (${response.status}).`);
        return datasetIndex(await response.json(), dataset);
      }).catch((error) => {
        cache.delete(key); // failures are retryable; only successful/in-flight loads are reused
        throw error;
      });
      cache.set(key, pending);
    }
    return cache.get(key);
  }
  return async (manifest, projection, input) => {
    const value = parseConstellationValue(input);
    const datasets = constellationDatasets(manifest, projection);
    const indexes = await Promise.all(datasets.map(loadDataset));
    return { value, projection, source: "static snapshots", entries: indexes.map((index) => index.get(value)) };
  };
}

// A small latest-request gate shared by the UI and race-condition tests.
export function createConstellationRequest(onState) {
  let generation = 0;
  return {
    invalidate() {
      generation += 1;
      onState({ status: "idle", result: null, message: "" });
    },
    dispose() { generation += 1; },
    async run(task) {
      const current = ++generation;
      onState({ status: "loading", result: null, message: "loading eight static snapshots…" });
      try {
        const result = await task();
        if (current === generation) onState({ status: "ready", result, message: "eight cipher addresses ready." });
      } catch (error) {
        if (current === generation) onState({ status: "error", result: null, message: error.message });
      }
    },
  };
}
