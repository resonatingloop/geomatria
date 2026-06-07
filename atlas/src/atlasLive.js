import { normalizeManifestEntry } from "./atlasManifest.js";

export const LIVE_MANIFEST_URL = "/api/live-manifest";

export async function loadLiveManifest(fetchManifest = fetch) {
  const response = await fetchManifest(LIVE_MANIFEST_URL);
  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, "Live manifest request failed"));
  }

  const data = await response.json();
  return data.map((entry) => normalizeManifestEntry(entry));
}

export async function responseErrorMessage(response, fallbackPrefix) {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string" && body.detail.trim()) {
      return body.detail;
    }
  } catch {
    // Fall through to the HTTP status fallback when the response is not JSON.
  }

  return `${fallbackPrefix}: ${response.status}`;
}
