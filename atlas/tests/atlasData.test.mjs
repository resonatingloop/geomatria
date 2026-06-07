import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_MARKER_SIZE,
  MIN_MARKER_SIZE,
  VALUE_DOMAIN_MODE,
  atlasSummary,
  buildProjectedLoci,
  domainHeatmapCollection,
  findPhraseMatches,
  findValueMatches,
  getFeatureDetails,
  markerSize,
  validateAtlas,
  validateManifest,
} from "../src/atlasData.js";
import {
  CLIQUEMAP_MODE,
  HEATMAP_MODE,
  UNKNOWN_TRANSFORM_FAMILY,
  getAvailableCiphers,
  getAvailableDatasets,
  getAvailableModes,
  getAvailableTransformFamilies,
  getDefaultDataset,
  inferTransformFamily,
  normalizeManifestEntry,
} from "../src/atlasManifest.js";
import {
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  NAVIGATION_CONTROL_OPTIONS,
  create2DMapOptions,
  lockMapTo2D,
} from "../src/map2d.js";
import {
  LIVE_MANIFEST_URL,
  loadLiveManifest,
  responseErrorMessage,
} from "../src/atlasLive.js";

function feature({
  coordinates = [-111.25, 12.5],
  properties = {
    cipher: "QWER",
    value: 100,
    projection: "value_hash_v1",
    count: 2,
    phrases: ["true", "zero"],
  },
} = {}) {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates,
    },
    properties,
  };
}

test("coordinate display preserves google lat/lon and geojson lon/lat order", () => {
  const details = getFeatureDetails(
    feature({ coordinates: [-111.25, 12.5] })
  );

  assert.equal(details.googleMapsCopy, "12.500000, -111.250000");
  assert.equal(details.geoJsonCopy, "[-111.250000, 12.500000]");
});

test("coordinate validation rejects likely swapped coordinate order", () => {
  assert.throws(
    () =>
      validateAtlas({
        type: "FeatureCollection",
        features: [feature({ coordinates: [95, 170] })],
      }),
    /Expected \[longitude, latitude\]/
  );
});

test("marker size scales from clique size with fixed min and max", () => {
  assert.equal(markerSize(0), MIN_MARKER_SIZE);
  assert(markerSize(4) > markerSize(1));
  assert.equal(markerSize(10000), MAX_MARKER_SIZE);
});

test("missing count falls back to clique size without breaking summaries or marker sizing", () => {
  const noCount = feature({
    properties: {
      cipher: "QWER",
      value: 101,
      projection: "value_hash_v1",
      phrases: ["one", "two", "three"],
    },
  });

  assert.equal(getFeatureDetails(noCount).cliqueSize, 3);
  assert.equal(atlasSummary({ type: "FeatureCollection", features: [noCount] }).phraseCount, 3);
  assert.equal(atlasSummary({ type: "FeatureCollection", features: [noCount] }).cliqueCount, 1);
  assert(markerSize(getFeatureDetails(noCount).cliqueSize) > MIN_MARKER_SIZE);
});

test("empty phrases and unexpected properties are tolerated", () => {
  const sparse = feature({
    properties: {
      cipher: "QWER",
      value: 102,
      projection: "value_hash_v1",
      count: 0,
      phrases: [],
      unexpected: "ignored",
    },
  });

  const details = getFeatureDetails(sparse);
  assert.equal(details.cliqueSize, 0);
  assert.equal(details.cliqueKind, "singleton");
  assert.deepEqual(details.phrases, []);
});

test("long phrase lists stay intact for scrollable rendering", () => {
  const phrases = Array.from({ length: 125 }, (_, index) => `phrase ${index + 1}`);
  const details = getFeatureDetails(
    feature({
      properties: {
        cipher: "QWER",
        value: 103,
        projection: "value_hash_v1",
        count: 125,
        phrases,
      },
    })
  );

  assert.equal(details.cliqueSize, 125);
  assert.equal(details.cliqueKind, "clique");
  assert.equal(details.phrases.length, 125);
  assert.equal(details.phrases[124], "phrase 125");
});

test("selected marker data can be represented by the selected clique details", () => {
  const selectedClique = feature({
    coordinates: [4, 3],
    properties: {
      cipher: "QWER",
      value: 619,
      projection: "value_hash_v1",
      count: 5,
      phrases: ["atlas"],
    },
  });

  const details = getFeatureDetails(selectedClique);
  assert.equal(details.value, "619");
  assert.equal(details.projectionMethod, "value_hash_v1");
  assert.equal(details.cliqueSize, 5);
  assert.equal(details.googleMapsCopy, "3.000000, 4.000000");
  assert.equal(details.geoJsonCopy, "[4.000000, 3.000000]");
});

test("snapped place metadata is normalized from geojson properties", () => {
  const details = getFeatureDetails(
    feature({
      coordinates: [-112.074, 33.4484],
      properties: {
        cipher: "AQ",
        value: 306,
        projection_method: "nearest_32_cities_hash_v1",
        count: 8,
        phrases: ["geogematria"],
        base_coordinate: {
          latitude: 30.1,
          longitude: -111.8,
          projection_method: "webmercator_hash_v1",
        },
        snapped_place: {
          id: "phoenix-usa",
          name: "Phoenix",
          country: "United States",
          latitude: 33.4484,
          longitude: -112.074,
          distance_km: 373.2,
        },
      },
    })
  );

  assert.equal(details.projectionMethod, "nearest_32_cities_hash_v1");
  assert.equal(details.snappedPlace.name, "Phoenix");
  assert.equal(details.snappedPlace.country, "United States");
  assert.equal(details.snappedPlace.googleMapsCopy, "33.448400, -112.074000");
  assert.equal(details.baseCoordinate.projectionMethod, "webmercator_hash_v1");
  assert.equal(details.baseCoordinate.googleMapsCopy, "30.100000, -111.800000");
});

test("manifest entries must point at static geojson data files", () => {
  assert.doesNotThrow(() =>
    validateManifest([
      {
        cipher: "QWER",
        label: "QWER",
        projection_method: "value_hash_v1",
        projection_label: "value hash v1",
        projection_description: "Full-range deterministic hash projection.",
        file: "/data/qwer.value_hash_v1.geojson",
      },
    ])
  );
  assert.throws(
    () =>
      validateManifest([
        {
          cipher: "QWER",
          label: "QWER",
          projection_method: "value_hash_v1",
          projection_label: "value hash v1",
          projection_description: "Full-range deterministic hash projection.",
          file: "https://example.test/qwer.value_hash_v1.geojson",
        },
      ]),
    /static GeoJSON/
  );
  assert.throws(
    () =>
      validateManifest([
        {
          cipher: "QWER",
          label: "QWER",
          file: "/data/qwer.value_hash_v1.geojson",
        },
      ]),
    /projection_method/
  );
  assert.throws(
    () =>
      validateManifest([
        {
          cipher: "QWER",
          label: "QWER",
          projection_method: "value_hash_v1",
          projection_label: "value hash v1",
          projection_description: "Full-range deterministic hash projection.",
          file: "/data/qwer.geojson",
        },
      ]),
    /include projection method/
  );
});

test("manifest accepts explicit value-domain static geojson entries", () => {
  assert.doesNotThrow(() =>
    validateManifest([
      {
        mode: "value_domain",
        cipher: "Satanic",
        label: "Satanic",
        projection_method: "nearest_10000_towns_hash_v1",
        projection_label: "nearest 10000 towns hash v1",
        projection_description: "Static snapped value-domain export.",
        min_value: 1,
        max_value: 2000,
        file: "/data/satanic.nearest_10000_towns_hash_v1.domain_1_2000.geojson",
      },
    ])
  );
  assert.throws(
    () =>
      validateManifest([
        {
          mode: "value_domain",
          cipher: "Satanic",
          label: "Satanic",
          projection_method: "nearest_10000_towns_hash_v1",
          projection_label: "nearest 10000 towns hash v1",
          projection_description: "Static snapped value-domain export.",
          min_value: 2000,
          max_value: 1,
          file: "/data/satanic.nearest_10000_towns_hash_v1.domain_2000_1.geojson",
        },
      ]),
    /min_value/
  );
});

test("manifest normalization preserves value-domain identity while deriving heatmap rendering", () => {
  const normalized = normalizeManifestEntry({
    mode: VALUE_DOMAIN_MODE,
    cipher: "Satanic",
    label: "Satanic",
    projection_method: "nearest_10000_towns_hash_v1",
    projection_label: "nearest 10000 towns hash v1",
    projection_description: "Static snapped value-domain export.",
    min_value: 1,
    max_value: 2000,
    file: "/data/satanic.nearest_10000_towns_hash_v1.domain_1_2000.geojson",
  });

  assert.equal(normalized.mode, VALUE_DOMAIN_MODE);
  assert.equal(normalized.mode_label, "value domain");
  assert.equal(normalized.render_mode, HEATMAP_MODE);
  assert.equal(normalized.search_kind, "value");
  assert.equal(normalized.transform_family, "place_snap");
  assert.deepEqual(normalized.value_range, [1, 2000]);
});

test("manifest normalization preserves live source metadata", () => {
  const normalized = ["AQ", "Synx", "Ordinal", "QWER", "nQWER", "Reduced", "Standard", "Satanic"].map((cipher) =>
    normalizeManifestEntry({
      source: "live",
      mode: "cliquemap",
      render_mode: "cliquemap",
      search_kind: "phrase",
      cipher,
      label: cipher,
      cipher_label: cipher,
      transform_family: "hash",
      transform_family_label: "hash scatter",
      projection_method: "value_hash_v1",
      projection_label: "value hash v1",
      projection_description: "Live local cliquemap from glossololary.",
      dataset_label: `live ${cipher} value hash v1`,
      file: `/api/layers/cliquemap?cipher=${cipher.toLowerCase()}&projection_method=value_hash_v1`,
    })
  );

  assert.deepEqual(normalized.map((entry) => entry.cipher), ["AQ", "Synx", "Ordinal", "QWER", "nQWER", "Reduced", "Standard", "Satanic"]);
  for (const entry of normalized) {
    assert.equal(entry.source, "live");
    assert.equal(entry.mode, "cliquemap");
    assert.equal(entry.render_mode, "cliquemap");
    assert.equal(entry.search_kind, "phrase");
    assert.equal(entry.transform_family, "hash");
    assert.equal(entry.file.startsWith("/api/"), true);
  }
});

test("live manifest loader normalizes entries and can be retried by callers", async () => {
  let requestCount = 0;
  const fetchManifest = async (url) => {
    requestCount += 1;
    assert.equal(url, LIVE_MANIFEST_URL);
    return {
      ok: true,
      async json() {
        return [
          {
            source: "live",
            mode: "cliquemap",
            render_mode: "cliquemap",
            search_kind: "phrase",
            cipher: "AQ",
            label: "AQ",
            cipher_label: "AQ",
            transform_family: "hash",
            transform_family_label: "hash scatter",
            projection_method: "value_hash_v1",
            projection_label: "value hash v1",
            projection_description: "Live local cliquemap from glossololary.",
            dataset_label: "live AQ value hash v1",
            file: "/api/layers/cliquemap?cipher=aq&projection_method=value_hash_v1",
          },
        ];
      },
    };
  };

  const first = await loadLiveManifest(fetchManifest);
  const second = await loadLiveManifest(fetchManifest);

  assert.equal(requestCount, 2);
  assert.equal(first[0].source, "live");
  assert.equal(first[0].cipher, "AQ");
  assert.equal(second[0].file.startsWith("/api/"), true);
});

test("live manifest loader reports unavailable fetches", async () => {
  await assert.rejects(
    () =>
      loadLiveManifest(async () => ({
        ok: false,
        status: 503,
        async json() {
          return { detail: "live source unavailable" };
        },
      })),
    /live source unavailable/
  );
});

test("response error messages fall back to HTTP status for non-json errors", async () => {
  const message = await responseErrorMessage(
    {
      status: 500,
      async json() {
        throw new Error("not json");
      },
    },
    "Live manifest request failed"
  );

  assert.equal(message, "Live manifest request failed: 500");
});

test("manifest normalization defaults legacy cliquemap entries without label parsing", () => {
  const normalized = normalizeManifestEntry({
    cipher: "QWER",
    label: "QWER",
    projection_method: "value_hash_v1",
    projection_label: "value hash v1",
    projection_description: "Full-range deterministic hash projection.",
    file: "/data/qwer.value_hash_v1.geojson",
  });

  assert.equal(normalized.mode, CLIQUEMAP_MODE);
  assert.equal(normalized.render_mode, CLIQUEMAP_MODE);
  assert.equal(normalized.search_kind, "phrase");
  assert.equal(normalized.transform_family, "hash");
});

test("transform family inference allows unknown families without crashing", () => {
  assert.equal(inferTransformFamily("nearest_32_cities_hash_v1"), "place_snap");
  assert.equal(inferTransformFamily("modulo_grid_v1"), "grid");
  assert.equal(inferTransformFamily("value_hash_v1"), "hash");
  assert.equal(inferTransformFamily("future_projection_v1"), UNKNOWN_TRANSFORM_FAMILY);
});

test("manifest filters derive mode, cipher, family, and dataset options", () => {
  const manifest = [
    normalizeManifestEntry({
      cipher: "AQ",
      label: "AQ",
      projection_method: "value_hash_v1",
      projection_label: "value hash v1",
      projection_description: "Full-range deterministic hash projection.",
      file: "/data/aq.value_hash_v1.geojson",
    }),
    normalizeManifestEntry({
      mode: VALUE_DOMAIN_MODE,
      cipher: "AQ",
      label: "AQ",
      projection_method: "nearest_10000_towns_hash_v1",
      projection_label: "nearest 10000 towns hash v1",
      projection_description: "Static snapped value-domain export.",
      min_value: 1,
      max_value: 2000,
      file: "/data/aq.nearest_10000_towns_hash_v1.domain_1_2000.geojson",
    }),
    normalizeManifestEntry({
      mode: "future_stratum",
      render_mode: "temporal",
      cipher: "AQ",
      label: "AQ",
      projection_method: "future_projection_v1",
      projection_label: "future projection v1",
      projection_description: "Unsupported future export.",
      file: "/data/aq.future_projection_v1.geojson",
    }),
  ];

  assert.deepEqual(getAvailableModes(manifest).map((option) => option.id), [
    CLIQUEMAP_MODE,
    VALUE_DOMAIN_MODE,
  ]);
  assert.deepEqual(getAvailableCiphers(manifest, VALUE_DOMAIN_MODE), [
    { id: "AQ", label: "AQ" },
  ]);
  assert.deepEqual(
    getAvailableTransformFamilies(manifest, VALUE_DOMAIN_MODE, "AQ"),
    [{ id: "place_snap", label: "place snap" }]
  );
  assert.equal(
    getAvailableDatasets(manifest, VALUE_DOMAIN_MODE, "AQ", "place_snap")[0].file,
    "/data/aq.nearest_10000_towns_hash_v1.domain_1_2000.geojson"
  );
  assert.equal(getDefaultDataset(manifest, { mode: VALUE_DOMAIN_MODE })?.mode, VALUE_DOMAIN_MODE);
});

test("unknown transform families remain selectable for supported modes", () => {
  const manifest = [
    normalizeManifestEntry({
      mode: CLIQUEMAP_MODE,
      render_mode: CLIQUEMAP_MODE,
      cipher: "AQ",
      label: "AQ",
      transform_family: UNKNOWN_TRANSFORM_FAMILY,
      transform_family_label: "unknown",
      projection_method: "future_projection_v1",
      projection_label: "future projection v1",
      projection_description: "Supported mode with unknown transform family.",
      file: "/data/aq.future_projection_v1.geojson",
    }),
  ];

  assert.deepEqual(getAvailableTransformFamilies(manifest, CLIQUEMAP_MODE, "AQ"), [
    { id: UNKNOWN_TRANSFORM_FAMILY, label: "unknown" },
  ]);
  assert.equal(
    getAvailableDatasets(manifest, CLIQUEMAP_MODE, "AQ", UNKNOWN_TRANSFORM_FAMILY).length,
    1
  );
});

test("value-domain features use phrase_count without defaulting empty values to one", () => {
  const emptyDomainValue = feature({
    properties: {
      mode: VALUE_DOMAIN_MODE,
      cipher: "Satanic",
      value: 101,
      projection_method: "nearest_10000_towns_hash_v1",
      phrase_count: 0,
      has_phrases: false,
      phrases: [],
    },
  });
  const occupiedDomainValue = feature({
    coordinates: [-111.25, 12.5],
    properties: {
      mode: VALUE_DOMAIN_MODE,
      cipher: "Satanic",
      value: 102,
      projection_method: "nearest_10000_towns_hash_v1",
      phrase_count: 2,
      has_phrases: true,
      phrases: ["one", "two"],
    },
  });

  const emptyDetails = getFeatureDetails(emptyDomainValue);
  const occupiedDetails = getFeatureDetails(occupiedDomainValue);

  assert.equal(emptyDetails.mode, VALUE_DOMAIN_MODE);
  assert.equal(emptyDetails.cliqueSize, 0);
  assert.equal(emptyDetails.hasPhrases, false);
  assert.equal(emptyDetails.cliqueKind, "empty value");
  assert.equal(occupiedDetails.cliqueSize, 2);
  assert.equal(occupiedDetails.hasPhrases, true);
  assert.equal(occupiedDetails.cliqueKind, "occupied value");
});

test("value-domain summaries separate domain values, projected loci, and phrases", () => {
  const collection = {
    type: "FeatureCollection",
    metadata: {
      mode: VALUE_DOMAIN_MODE,
      summary: {
        domain_value_count: 3,
        projected_locus_count: 2,
        values_with_phrases: 1,
        values_without_phrases: 2,
      },
    },
    features: [
      feature({
        coordinates: [-111.25, 12.5],
        properties: {
          mode: VALUE_DOMAIN_MODE,
          cipher: "Satanic",
          value: 1,
          projection_method: "nearest_10000_towns_hash_v1",
          phrase_count: 0,
          has_phrases: false,
          phrases: [],
        },
      }),
      feature({
        coordinates: [-111.25, 12.5],
        properties: {
          mode: VALUE_DOMAIN_MODE,
          cipher: "Satanic",
          value: 2,
          projection_method: "nearest_10000_towns_hash_v1",
          phrase_count: 3,
          has_phrases: true,
          phrases: ["a", "b", "c"],
        },
      }),
      feature({
        coordinates: [-3, 44],
        properties: {
          mode: VALUE_DOMAIN_MODE,
          cipher: "Satanic",
          value: 3,
          projection_method: "nearest_10000_towns_hash_v1",
          phrase_count: 0,
          has_phrases: false,
          phrases: [],
        },
      }),
    ],
  };

  const summary = atlasSummary(collection);
  const loci = buildProjectedLoci(collection);
  const heatmap = domainHeatmapCollection(collection);

  assert.equal(summary.mode, VALUE_DOMAIN_MODE);
  assert.equal(summary.domainValueCount, 3);
  assert.equal(summary.projectedLocusCount, 2);
  assert.equal(summary.valuesWithPhrases, 1);
  assert.equal(summary.valuesWithoutPhrases, 2);
  assert.equal(summary.phraseCount, 3);
  assert.equal(loci.length, 2);
  assert.equal(loci[0].domainValueCount, 2);
  assert.equal(loci[0].valuesWithPhrases, 1);
  assert.equal(loci[0].totalPhraseCount, 3);
  assert.equal(heatmap.features.length, 3);
  assert.equal(heatmap.features[1].properties.heat_weight, 1);
  assert.equal(heatmap.features[1].properties.phrase_weight, 3);
});

test("value-domain search finds exact integer values including empty values", () => {
  const collection = {
    type: "FeatureCollection",
    metadata: { mode: VALUE_DOMAIN_MODE },
    features: [
      feature({
        properties: {
          mode: VALUE_DOMAIN_MODE,
          cipher: "Satanic",
          value: 108,
          projection_method: "nearest_10000_towns_hash_v1",
          phrase_count: 0,
          has_phrases: false,
          phrases: [],
        },
      }),
      feature({
        properties: {
          mode: VALUE_DOMAIN_MODE,
          cipher: "Satanic",
          value: 110,
          projection_method: "nearest_10000_towns_hash_v1",
          phrase_count: 1,
          has_phrases: true,
          phrases: ["not the query"],
        },
      }),
    ],
  };

  const matches = findValueMatches(collection, "108");

  assert.equal(matches.length, 1);
  assert.equal(matches[0].details.value, "108");
  assert.equal(matches[0].details.hasPhrases, false);
  assert.equal(findValueMatches(collection, "geo").length, 0);
});

test("phrase search returns matches that point back to their clique feature", () => {
  const qwer110 = feature({
    coordinates: [14.7766, -87.658294],
    properties: {
      cipher: "QWER",
      value: 110,
      projection: "value_hash_v1",
      count: 2,
      phrases: ["geogematria", "dilettante"],
    },
  });
  const qwer112 = feature({
    coordinates: [-2, 10],
    properties: {
      cipher: "QWER",
      value: 112,
      projection: "value_hash_v1",
      count: 1,
      phrases: ["other"],
    },
  });

  const matches = findPhraseMatches(
    { type: "FeatureCollection", features: [qwer110, qwer112] },
    "GEO"
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0].phrase, "geogematria");
  assert.equal(matches[0].feature, qwer110);
  assert.equal(matches[0].details.value, "110");
  assert.equal(matches[0].details.cliqueKind, "clique");
});

test("projected loci group by coordinate without merging cliques", () => {
  const aq306 = feature({
    coordinates: [-124, 47],
    properties: {
      cipher: "AQ",
      value: 306,
      projection_method: "modulo_grid_v1",
      count: 8,
      phrases: ["first clique"],
    },
  });
  const aq407 = feature({
    coordinates: [-124, 47],
    properties: {
      cipher: "AQ",
      value: 407,
      projection_method: "modulo_grid_v1",
      count: 3,
      phrases: ["second clique"],
    },
  });

  const loci = buildProjectedLoci({
    type: "FeatureCollection",
    features: [aq306, aq407],
  });

  assert.equal(loci.length, 1);
  assert.equal(loci[0].cliques.length, 2);
  assert.equal(loci[0].totalPhraseCount, 11);
  assert.deepEqual(
    loci[0].cliques.map((clique) => clique.details.value),
    ["306", "407"]
  );
});

test("snapped place loci can hold multiple distinct cliques without merging them", () => {
  const aq306 = feature({
    coordinates: [-112.074, 33.4484],
    properties: {
      cipher: "AQ",
      value: 306,
      projection_method: "nearest_32_cities_hash_v1",
      count: 8,
      phrases: ["first clique"],
      snapped_place: {
        id: "phoenix-usa",
        name: "Phoenix",
        country: "United States",
        latitude: 33.4484,
        longitude: -112.074,
        distance_km: 10,
      },
    },
  });
  const aq407 = feature({
    coordinates: [-112.074, 33.4484],
    properties: {
      cipher: "AQ",
      value: 407,
      projection_method: "nearest_32_cities_hash_v1",
      count: 3,
      phrases: ["second clique"],
      snapped_place: {
        id: "phoenix-usa",
        name: "Phoenix",
        country: "United States",
        latitude: 33.4484,
        longitude: -112.074,
        distance_km: 12,
      },
    },
  });

  const loci = buildProjectedLoci({
    type: "FeatureCollection",
    features: [aq306, aq407],
  });

  assert.equal(loci.length, 1);
  assert.equal(loci[0].snappedPlace.name, "Phoenix");
  assert.equal(loci[0].cliques.length, 2);
  assert.deepEqual(loci[0].snapDistanceSummary, {
    count: 2,
    min: 10,
    max: 12,
    average: 11,
  });
  assert.deepEqual(
    loci[0].cliques.map((clique) => clique.details.value),
    ["306", "407"]
  );
});

test("distinct projected coordinates remain distinct loci", () => {
  const first = feature({ coordinates: [-124, 47] });
  const second = feature({ coordinates: [-123, 47] });
  const loci = buildProjectedLoci({
    type: "FeatureCollection",
    features: [first, second],
  });

  assert.equal(loci.length, 2);
});

test("2d map options keep the atlas flat and bounded", () => {
  const container = {};
  const style = { version: 8, sources: {}, layers: [] };
  const options = create2DMapOptions(container, style);

  assert.equal(options.container, container);
  assert.equal(options.style, style);
  assert.equal(options.bearing, 0);
  assert.equal(options.pitch, 0);
  assert.equal(options.minPitch, 0);
  assert.equal(options.maxPitch, 0);
  assert.equal(options.pitchWithRotate, false);
  assert.equal(options.renderWorldCopies, false);
  assert.equal(options.minZoom, MAP_MIN_ZOOM);
  assert.equal(options.maxZoom, MAP_MAX_ZOOM);
  assert.equal(NAVIGATION_CONTROL_OPTIONS.showCompass, false);
});

test("2d map lock disables rotation and removes pitch/bearing drift", () => {
  const calls = [];
  let pitch = 25;
  let bearing = 35;
  const map = {
    dragRotate: { disable: () => calls.push("dragRotate.disable") },
    touchPitch: { disable: () => calls.push("touchPitch.disable") },
    touchZoomRotate: { disableRotation: () => calls.push("touchZoomRotate.disableRotation") },
    keyboard: { disableRotation: () => calls.push("keyboard.disableRotation") },
    setMinPitch: (value) => calls.push(`setMinPitch:${value}`),
    setMaxPitch: (value) => calls.push(`setMaxPitch:${value}`),
    getPitch: () => pitch,
    setPitch: (value) => {
      pitch = value;
      calls.push(`setPitch:${value}`);
    },
    getBearing: () => bearing,
    setBearing: (value) => {
      bearing = value;
      calls.push(`setBearing:${value}`);
    },
    on: (eventName) => calls.push(`on:${eventName}`),
    off: (eventName) => calls.push(`off:${eventName}`),
  };

  const unlock = lockMapTo2D(map);
  unlock();

  assert(calls.includes("dragRotate.disable"));
  assert(calls.includes("touchPitch.disable"));
  assert(calls.includes("touchZoomRotate.disableRotation"));
  assert(calls.includes("keyboard.disableRotation"));
  assert(calls.includes("setMinPitch:0"));
  assert(calls.includes("setMaxPitch:0"));
  assert(calls.includes("setPitch:0"));
  assert(calls.includes("setBearing:0"));
  assert(calls.includes("on:rotate"));
  assert(calls.includes("off:rotate"));
  assert.equal(pitch, 0);
  assert.equal(bearing, 0);
});
