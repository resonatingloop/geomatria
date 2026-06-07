import { VALUE_DOMAIN_MODE, normalizeManifestEntry } from "./atlasManifest.js";

export { VALUE_DOMAIN_MODE } from "./atlasManifest.js";

export const EMPTY_COLLECTION = {
  type: "FeatureCollection",
  features: [],
};

export const MIN_MARKER_SIZE = 14;
export const MAX_MARKER_SIZE = 42;
export const DEFAULT_COUNT = 1;

export function validateManifest(data) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Expected a non-empty atlas manifest.");
  }

  for (const rawEntry of data) {
    const entry = normalizeManifestEntry(rawEntry);
    if (
      typeof entry?.cipher !== "string" ||
      typeof entry?.label !== "string" ||
      typeof entry?.mode !== "string" ||
      typeof entry?.render_mode !== "string" ||
      typeof entry?.search_kind !== "string" ||
      typeof entry?.transform_family !== "string" ||
      typeof entry?.projection_method !== "string" ||
      typeof entry?.projection_label !== "string" ||
      typeof entry?.projection_description !== "string" ||
      typeof entry?.file !== "string"
    ) {
      throw new Error(
        "Manifest entries require cipher, label, mode, render_mode, search_kind, transform_family, projection_method, projection_label, projection_description, and file strings."
      );
    }
    if (!entry.file.startsWith("/data/") || !entry.file.endsWith(".geojson")) {
      throw new Error(`Manifest file must point at static GeoJSON data: ${entry.file}`);
    }
    const isValueDomainEntry = entry.mode === VALUE_DOMAIN_MODE;
    if (isValueDomainEntry) {
      if (
        !Number.isInteger(entry.min_value) ||
        !Number.isInteger(entry.max_value) ||
        entry.min_value > entry.max_value
      ) {
        throw new Error(
          `Value-domain manifest entries require min_value <= max_value: ${entry.file}`
        );
      }
    }
    if (
      !entry.file.endsWith(`.${entry.projection_method}.geojson`) &&
      !(
        isValueDomainEntry &&
        entry.file.endsWith(
          `.${entry.projection_method}.domain_${entry.min_value}_${entry.max_value}.geojson`
        )
      )
    ) {
      throw new Error(
        `Manifest file must include projection method before .geojson: ${entry.file}`
      );
    }
  }
}

export function validateAtlas(data) {
  if (data?.type !== "FeatureCollection" || !Array.isArray(data.features)) {
    throw new Error("Expected a GeoJSON FeatureCollection.");
  }

  for (const feature of data.features) {
    validateFeature(feature);
  }
}

export function validateFeature(feature) {
  if (feature?.geometry?.type !== "Point") {
    throw new Error("The static atlas only accepts GeoJSON Point features.");
  }

  const coordinates = feature.geometry.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    throw new Error("Point feature is missing [longitude, latitude] coordinates.");
  }

  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new Error("Point coordinates must be finite numbers.");
  }

  if (Math.abs(longitude) > 180 || Math.abs(latitude) > 90) {
    throw new Error(
      `Coordinate order sanity failed for [${longitude}, ${latitude}]. Expected [longitude, latitude].`
    );
  }
}

export function getFeatureDetails(feature) {
  const properties = feature?.properties ?? {};
  const [longitude, latitude] = feature?.geometry?.coordinates ?? [0, 0];
  const phrases = Array.isArray(properties.phrases) ? properties.phrases : [];
  const mode = properties.mode === VALUE_DOMAIN_MODE ? VALUE_DOMAIN_MODE : "clique";
  const phraseCount =
    mode === VALUE_DOMAIN_MODE
      ? normalizeDomainPhraseCount(properties.phrase_count, phrases.length)
      : normalizeCliqueSize(properties.count, phrases.length);

  return {
    mode,
    cipher: displayValue(properties.cipher, "unknown cipher"),
    value: displayValue(properties.value, "unknown value"),
    projectionMethod: displayValue(
      properties.projection_method ?? properties.projection,
      "unknown projection method"
    ),
    cliqueSize: phraseCount,
    cliqueKind: mode === VALUE_DOMAIN_MODE ? domainValueKind(properties, phraseCount) : phraseCount > 1 ? "clique" : "singleton",
    hasPhrases:
      mode === VALUE_DOMAIN_MODE
        ? properties.has_phrases === true || phraseCount > 0
        : phraseCount > 0,
    phrases,
    baseCoordinate: normalizeCoordinatePair(properties.base_coordinate),
    snappedPlace: normalizeSnappedPlace(properties.snapped_place),
    longitude,
    latitude,
    googleMapsCopy: `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`,
    geoJsonCopy: `[${formatCoordinate(longitude)}, ${formatCoordinate(latitude)}]`,
  };
}

export function getFeatureKey(feature, index = 0) {
  const details = getFeatureDetails(feature);
  return [
    details.cipher,
    details.value,
    details.projectionMethod,
    details.longitude,
    details.latitude,
    index,
  ].join(":");
}

export function getProjectedLocusKey(feature) {
  const details = getFeatureDetails(feature);
  return `${details.projectionMethod}:${details.longitude}:${details.latitude}`;
}

export function buildProjectedLoci(collection) {
  const loci = new Map();

  for (const [featureIndex, feature] of (collection?.features ?? []).entries()) {
    const details = getFeatureDetails(feature);
    const featureKey = getFeatureKey(feature, featureIndex);
    const locusKey = getProjectedLocusKey(feature);
    const existing = loci.get(locusKey) ?? {
      locusKey,
      longitude: details.longitude,
      latitude: details.latitude,
      projectionMethod: details.projectionMethod,
      googleMapsCopy: details.googleMapsCopy,
      geoJsonCopy: details.geoJsonCopy,
      baseCoordinate: details.baseCoordinate,
      snappedPlace: details.snappedPlace,
      cliques: [],
      domainValueCount: 0,
      valuesWithPhrases: 0,
      totalPhraseCount: 0,
    };

    existing.cliques.push({
      feature,
      featureIndex,
      featureKey,
      details,
    });
    if (details.mode === VALUE_DOMAIN_MODE) {
      existing.domainValueCount += 1;
      if (details.hasPhrases) {
        existing.valuesWithPhrases += 1;
      }
    }
    existing.totalPhraseCount += details.cliqueSize;
    loci.set(locusKey, existing);
  }

  return [...loci.values()].map((locus) => ({
    ...locus,
    snapDistanceSummary: summarizeSnapDistances(locus.cliques),
  }));
}

export function normalizeCliqueSize(rawSize, fallbackPhraseCount = 0) {
  const numericSize = Number(rawSize);
  if (Number.isFinite(numericSize) && numericSize >= 0) {
    return Math.floor(numericSize);
  }

  if (fallbackPhraseCount > 0) {
    return fallbackPhraseCount;
  }

  return DEFAULT_COUNT;
}

export function normalizeDomainPhraseCount(rawSize, fallbackPhraseCount = 0) {
  const numericSize = Number(rawSize);
  if (Number.isFinite(numericSize) && numericSize >= 0) {
    return Math.floor(numericSize);
  }

  return Math.max(0, fallbackPhraseCount);
}

export function markerSize(cliqueSize) {
  return Math.max(
    MIN_MARKER_SIZE,
    Math.min(MAX_MARKER_SIZE, 12 + Math.sqrt(normalizeCliqueSize(cliqueSize)) * 10)
  );
}

export function atlasSummary(collection) {
  const features = collection?.features ?? [];
  const metadataSummary = collection?.metadata?.summary;
  const isValueDomain =
    collection?.metadata?.mode === VALUE_DOMAIN_MODE ||
    features.some((feature) => feature?.properties?.mode === VALUE_DOMAIN_MODE);

  if (isValueDomain) {
    const valuesWithPhrases = features.filter(
      (feature) => getFeatureDetails(feature).hasPhrases
    ).length;
    return {
      mode: VALUE_DOMAIN_MODE,
      domainValueCount:
        metadataSummary?.domain_value_count ?? features.length,
      projectedLocusCount:
        metadataSummary?.projected_locus_count ?? buildProjectedLoci(collection).length,
      valuesWithPhrases:
        metadataSummary?.values_with_phrases ?? valuesWithPhrases,
      valuesWithoutPhrases:
        metadataSummary?.values_without_phrases ??
        Math.max(0, features.length - valuesWithPhrases),
      cliqueCount: valuesWithPhrases,
      phraseCount: features.reduce(
        (total, feature) => total + getFeatureDetails(feature).cliqueSize,
        0
      ),
    };
  }

  return {
    mode: "clique",
    cliqueCount: features.length,
    phraseCount: features.reduce(
      (total, feature) => total + getFeatureDetails(feature).cliqueSize,
      0
    ),
  };
}

export function domainHeatmapCollection(collection) {
  return {
    type: "FeatureCollection",
    features: (collection?.features ?? [])
      .filter((feature) => feature?.properties?.mode === VALUE_DOMAIN_MODE)
      .map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          heat_weight: 1,
          phrase_weight: normalizeDomainPhraseCount(feature.properties?.phrase_count),
        },
      })),
  };
}

export function findPhraseMatches(collection, query, limit = 80) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const matches = [];
  for (const [featureIndex, feature] of (collection?.features ?? []).entries()) {
    const details = getFeatureDetails(feature);
    for (const [phraseIndex, phrase] of details.phrases.entries()) {
      const phraseText = String(phrase);
      if (phraseText.toLowerCase().includes(normalizedQuery)) {
        matches.push({
          id: `${getFeatureKey(feature, featureIndex)}:${phraseIndex}`,
          phrase: phraseText,
          feature,
          featureIndex,
          details,
        });
      }

      if (matches.length >= limit) {
        return matches;
      }
    }
  }

  return matches;
}

export function findValueMatches(collection, query, limit = 80) {
  const normalizedQuery = query.trim();
  if (!/^\d+$/.test(normalizedQuery)) {
    return [];
  }

  const valueQuery = Number(normalizedQuery);
  const matches = [];
  for (const [featureIndex, feature] of (collection?.features ?? []).entries()) {
    const details = getFeatureDetails(feature);
    if (Number(details.value) === valueQuery) {
      matches.push({
        id: getFeatureKey(feature, featureIndex),
        phrase: `${details.cipher} ${details.value}`,
        feature,
        featureIndex,
        featureKey: getFeatureKey(feature, featureIndex),
        details,
      });
    }

    if (matches.length >= limit) {
      return matches;
    }
  }

  return matches;
}

export function formatCoordinate(value) {
  return Number(value).toFixed(6);
}

function displayValue(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

function domainValueKind(properties, phraseCount) {
  if (properties.has_phrases === true || phraseCount > 0) {
    return phraseCount === 1 ? "occupied value" : "occupied value";
  }

  return "empty value";
}

function normalizeCoordinatePair(value) {
  if (
    !value ||
    !Number.isFinite(value.latitude) ||
    !Number.isFinite(value.longitude)
  ) {
    return null;
  }

  return {
    latitude: value.latitude,
    longitude: value.longitude,
    projectionMethod: displayValue(
      value.projection_method,
      "unknown projection method"
    ),
    googleMapsCopy: `${formatCoordinate(value.latitude)}, ${formatCoordinate(
      value.longitude
    )}`,
    geoJsonCopy: `[${formatCoordinate(value.longitude)}, ${formatCoordinate(
      value.latitude
    )}]`,
  };
}

function normalizeSnappedPlace(value) {
  if (
    !value ||
    typeof value.name !== "string" ||
    !Number.isFinite(value.latitude) ||
    !Number.isFinite(value.longitude)
  ) {
    return null;
  }

  return {
    id: displayValue(value.id, "unknown place"),
    name: value.name,
    country: displayValue(value.country, "unknown country"),
    latitude: value.latitude,
    longitude: value.longitude,
    distanceKm: Number.isFinite(value.distance_km) ? value.distance_km : null,
    googleMapsCopy: `${formatCoordinate(value.latitude)}, ${formatCoordinate(
      value.longitude
    )}`,
    geoJsonCopy: `[${formatCoordinate(value.longitude)}, ${formatCoordinate(
      value.latitude
    )}]`,
  };
}

function summarizeSnapDistances(cliques) {
  const distances = cliques
    .map((clique) => clique.details.snappedPlace?.distanceKm)
    .filter((distance) => Number.isFinite(distance));

  if (distances.length === 0) {
    return null;
  }

  const min = Math.min(...distances);
  const max = Math.max(...distances);
  const average =
    distances.reduce((total, distance) => total + distance, 0) / distances.length;

  return {
    count: distances.length,
    min,
    max,
    average,
  };
}
