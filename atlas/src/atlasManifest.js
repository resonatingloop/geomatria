export const CLIQUEMAP_MODE = "cliquemap";
export const VALUE_DOMAIN_MODE = "value_domain";
export const HEATMAP_MODE = "heatmap";
export const UNKNOWN_MODE = "unknown";
export const UNKNOWN_TRANSFORM_FAMILY = "unknown";

export const SUPPORTED_DATASET_MODES = new Set([
  CLIQUEMAP_MODE,
  VALUE_DOMAIN_MODE,
  HEATMAP_MODE,
]);

export const SUPPORTED_RENDER_MODES = new Set([CLIQUEMAP_MODE, HEATMAP_MODE]);

const MODE_LABELS = {
  [CLIQUEMAP_MODE]: "cliquemap",
  [VALUE_DOMAIN_MODE]: "value domain",
  [HEATMAP_MODE]: "heatmap",
  [UNKNOWN_MODE]: "unsupported mode",
};

const TRANSFORM_FAMILY_LABELS = {
  hash: "hash scatter",
  grid: "grid / modular",
  place_snap: "place snap",
  curve: "curve / sequence",
  sequence: "curve / sequence",
  fractal: "fractal / ternary",
  ternary: "fractal / ternary",
  sphere: "sphere-aware",
  [UNKNOWN_TRANSFORM_FAMILY]: "unknown",
};

export function normalizeManifestEntry(entry) {
  const mode = normalizeToken(entry?.mode, CLIQUEMAP_MODE);
  const renderMode = normalizeRenderMode(entry?.render_mode, mode);
  const transformFamily = normalizeToken(
    entry?.transform_family,
    inferTransformFamily(entry?.projection_method)
  );
  const valueRange = normalizeValueRange(entry);
  const searchKind = normalizeToken(entry?.search_kind, inferSearchKind(mode, renderMode));
  const projectionLabel = displayValue(entry?.projection_label, entry?.projection_method);
  const datasetLabel =
    displayValue(entry?.dataset_label, entry?.dataset) ??
    datasetLabelFromEntry(entry, projectionLabel, valueRange);

  return {
    ...entry,
    mode,
    mode_label: displayValue(entry?.mode_label, MODE_LABELS[mode]) ?? mode,
    render_mode: renderMode,
    search_kind: searchKind,
    cipher_label: displayValue(entry?.cipher_label, entry?.label) ?? entry?.cipher,
    transform_family: transformFamily,
    transform_family_label:
      displayValue(entry?.transform_family_label, TRANSFORM_FAMILY_LABELS[transformFamily]) ??
      transformFamily,
    projection_label: projectionLabel,
    dataset_label: datasetLabel,
    value_range: valueRange,
    is_supported_mode: isSupportedDatasetMode(mode),
    is_supported_render_mode: isSupportedRenderMode(renderMode),
  };
}

export function inferTransformFamily(projectionMethod) {
  if (typeof projectionMethod !== "string") {
    return UNKNOWN_TRANSFORM_FAMILY;
  }

  if (projectionMethod.includes("nearest_")) {
    return "place_snap";
  }
  if (projectionMethod.includes("modulo_grid") || projectionMethod.includes("grid")) {
    return "grid";
  }
  if (projectionMethod.includes("hash")) {
    return "hash";
  }

  return UNKNOWN_TRANSFORM_FAMILY;
}

export function getAvailableModes(manifest) {
  return uniqueOptions(
    normalizeManifest(manifest).filter(isSelectableDataset),
    (entry) => entry.mode,
    (entry) => entry.mode_label
  );
}

export function getAvailableCiphers(manifest, mode) {
  return uniqueOptions(
    normalizeManifest(manifest).filter(
      (entry) => isSelectableDataset(entry) && entry.mode === mode
    ),
    (entry) => entry.cipher,
    (entry) => entry.cipher_label
  );
}

export function getAvailableTransformFamilies(manifest, mode, cipher) {
  return uniqueOptions(
    normalizeManifest(manifest).filter(
      (entry) =>
        isSelectableDataset(entry) &&
        entry.mode === mode &&
        entry.cipher === cipher
    ),
    (entry) => entry.transform_family,
    (entry) => entry.transform_family_label
  );
}

export function getAvailableDatasets(manifest, mode, cipher, transformFamily) {
  return normalizeManifest(manifest).filter(
    (entry) =>
      isSelectableDataset(entry) &&
      entry.mode === mode &&
      entry.cipher === cipher &&
      entry.transform_family === transformFamily
  );
}

export function getDefaultDataset(manifest, filters = {}) {
  const normalized = normalizeManifest(manifest).filter(isSelectableDataset);
  if (normalized.length === 0) {
    return null;
  }

  const mode = filters.mode ?? getAvailableModes(normalized)[0]?.id;
  const cipher = filters.cipher ?? getAvailableCiphers(normalized, mode)[0]?.id;
  const transformFamily =
    filters.transformFamily ??
    getAvailableTransformFamilies(normalized, mode, cipher)[0]?.id;
  const datasets = getAvailableDatasets(normalized, mode, cipher, transformFamily);

  return datasets[0] ?? null;
}

export function isSelectableDataset(entry) {
  return (
    entry?.is_supported_mode === true &&
    entry?.is_supported_render_mode === true &&
    typeof entry?.file === "string"
  );
}

function normalizeManifest(manifest) {
  return (manifest ?? []).map(normalizeManifestEntry);
}

function normalizeRenderMode(explicitRenderMode, mode) {
  const renderMode = normalizeToken(explicitRenderMode, "");
  if (SUPPORTED_RENDER_MODES.has(renderMode)) {
    return renderMode;
  }

  if (mode === VALUE_DOMAIN_MODE || mode === HEATMAP_MODE) {
    return HEATMAP_MODE;
  }
  if (mode === CLIQUEMAP_MODE) {
    return CLIQUEMAP_MODE;
  }

  return UNKNOWN_MODE;
}

function inferSearchKind(mode, renderMode) {
  if (mode === VALUE_DOMAIN_MODE || renderMode === HEATMAP_MODE) {
    return "value";
  }

  return "phrase";
}

function normalizeValueRange(entry) {
  if (
    Array.isArray(entry?.value_range) &&
    entry.value_range.length === 2 &&
    Number.isInteger(entry.value_range[0]) &&
    Number.isInteger(entry.value_range[1])
  ) {
    return entry.value_range;
  }

  if (Number.isInteger(entry?.min_value) && Number.isInteger(entry?.max_value)) {
    return [entry.min_value, entry.max_value];
  }

  return null;
}

function datasetLabelFromEntry(entry, projectionLabel, valueRange) {
  if (valueRange) {
    return `${projectionLabel} · values ${valueRange[0]}-${valueRange[1]}`;
  }

  return projectionLabel;
}

function uniqueOptions(entries, getId, getLabel) {
  const seen = new Set();
  const options = [];

  for (const entry of entries) {
    const id = getId(entry);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    options.push({ id, label: getLabel(entry) ?? id });
  }

  return options;
}

function isSupportedDatasetMode(mode) {
  return SUPPORTED_DATASET_MODES.has(mode);
}

function isSupportedRenderMode(renderMode) {
  return SUPPORTED_RENDER_MODES.has(renderMode);
}

function normalizeToken(value, fallback) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function displayValue(value, fallback) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (typeof fallback === "string" && fallback.trim()) {
    return fallback;
  }
  return null;
}
