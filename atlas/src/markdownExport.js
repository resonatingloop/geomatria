import { formatCoordinate } from "./atlasData.js";
import { locusReadoutModel } from "./readoutModel.js";

export function markdownText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/[\\`*_{}\[\]()#+.!|~\-]/g, "\\$&")
    .replace(/[\r\n\u2028\u2029]+/g, " ");
}

function coordinates(latitude, longitude) {
  return `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)} (latitude, longitude)`;
}

function geographicLines(entry) {
  const lines = [`- coordinates: ${coordinates(entry.latitude, entry.longitude)}`];
  if (entry.place) {
    lines.push(`- snapped place: ${markdownText(entry.place.name)}${entry.place.country ? `, ${markdownText(entry.place.country)}` : ""}`);
    if (Number.isFinite(entry.place.distanceKm)) lines.push(`- snap distance: ${entry.place.distanceKm} km`);
  }
  if (entry.baseCoordinate) {
    lines.push(`- original hash coordinate: ${coordinates(entry.baseCoordinate.latitude, entry.baseCoordinate.longitude)}`);
    const projection = entry.baseCoordinate.projection ?? entry.baseCoordinate.projectionMethod;
    if (projection) lines.push(`- original projection: ${markdownText(projection)}`);
  }
  return lines;
}

export function constellationMarkdown(result) {
  const lines = [
    `# value constellation · ${result.value}`, "",
    "- scope: whole constellation",
    "- source: static snapshots",
    `- projection: ${markdownText(result.projection)}`,
    `- cipher addresses: ${result.entries.length}`, "",
    "numeric/geographic reading only; saved phrase occupancy is not included.",
  ];
  for (const entry of result.entries) {
    lines.push("", `## ${markdownText(entry.cipher)} · ${entry.value}`, "", ...geographicLines(entry));
  }
  return `${lines.join("\n")}\n`;
}

export function locusMarkdown(locus, selectedFeatureKey = "", source = "static snapshot") {
  const model = locusReadoutModel(locus, selectedFeatureKey);
  if (!model) return "";
  const lines = ["# projected locus", "", "- scope: this locus readout",
    `- source: ${markdownText(source)}`,
    `- projection: ${markdownText(locus.projectionMethod)}`,
    ...geographicLines({ latitude: locus.latitude, longitude: locus.longitude,
      place: locus.snappedPlace ? { name: locus.snappedPlace.name, country: locus.snappedPlace.country } : null }),
  ];
  if (model.isValueDomain) lines.push(`- domain values here: ${locus.domainValueCount}`);
  else if (model.occupancyAvailable) lines.push(`- locus occupancy: ${locus.cliques.length} cliques`);
  if (model.occupancyAvailable && model.isValueDomain) lines.push(`- values with phrases: ${locus.valuesWithPhrases}`);
  if (!model.occupancyAvailable) lines.push("", "saved phrase occupancy is not published in this view.");
  if (model.cliques.length === 0) lines.push("", "no individual values selected in this readout.");
  for (const { details } of model.cliques) {
    lines.push("", `## ${markdownText(details.cipher)} · ${markdownText(details.value)}`, "",
      ...geographicLines({ ...details, place: details.snappedPlace }));
    if (model.occupancyAvailable) {
      lines.push(`- phrase count: ${details.cliqueSize}`, "", "### phrases", "",
        ...(details.phrases.length ? details.phrases.map((phrase) => `- ${markdownText(phrase)}`) : ["no phrases in this reading."]));
    }
  }
  return `${lines.join("\n")}\n`;
}

export async function copyMarkdown(text, clipboard = globalThis.navigator?.clipboard) {
  if (!clipboard?.writeText) throw new Error("clipboard unavailable; use download .md instead.");
  try { await clipboard.writeText(text); }
  catch { throw new Error("clipboard blocked; use download .md instead."); }
}

export function downloadMarkdown(text, filename, documentRef = document, urlApi = URL) {
  const url = urlApi.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const link = documentRef.createElement("a");
  link.href = url;
  link.download = `${filename.replace(/[^a-zA-Z0-9_-]/g, "-")}.md`;
  documentRef.body.append(link);
  try { link.click(); }
  finally {
    link.remove();
    // Let the browser start the download before releasing the URL.
    setTimeout(() => urlApi.revokeObjectURL(url), 1000);
  }
}
