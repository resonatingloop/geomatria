import React, { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { formatCoordinate } from "./atlasData.js";
import {
  CONSTELLATION_PROJECTIONS, createConstellationLoader, createConstellationRequest,
  groupConstellationEntries, parseConstellationValue,
} from "./constellationData.js";
import { constellationMarkdown } from "./markdownExport.js";
import { MarkdownActions } from "./MarkdownActions.jsx";
import { FLAT, GLOBE, observeGlobeVisibility } from "./mapPresentation.js";

// Cache numeric indexes across visits to this view; no phrase data is retained.
const loadConstellation = createConstellationLoader();

export function ConstellationView({ manifest, map, manifestError, onRetryManifest,
  presentation, surface = FLAT, focusFallback, active = true }) {
  const [input, setInput] = useState("");
  const [projection, setProjection] = useState(CONSTELLATION_PROJECTIONS[0].id);
  const [state, setState] = useState({ status: "idle", result: null, message: "" });
  const [selectedCipher, setSelectedCipher] = useState("");
  const markers = useRef([]);
  const rows = useRef(new Map());
  const request = useMemo(() => createConstellationRequest(setState), []);
  const groups = useMemo(() => groupConstellationEntries(state.result?.entries ?? []), [state.result]);
  const markdown = state.result ? constellationMarkdown(state.result) : "";

  useEffect(() => () => request.dispose(), [request]);
  useEffect(() => { request.invalidate(); setSelectedCipher(""); }, [manifest, request]);

  function invalidate() {
    request.invalidate();
    setSelectedCipher("");
  }
  function cast(event) {
    event.preventDefault();
    setSelectedCipher("");
    try { parseConstellationValue(input); }
    catch (error) {
      request.invalidate();
      setState({ status: "error", result: null, message: error.message });
      return;
    }
    request.run(() => loadConstellation(manifest, projection, input));
  }

  function fitAll() {
    if (!map || !groups.length) return;
    map.resize();
    const bounds = new maplibregl.LngLatBounds();
    groups.forEach((group) => bounds.extend([group.longitude, group.latitude]));
    map.fitBounds(bounds, {
      padding: 30,
      maxZoom: 4, duration: 0, bearing: 0, pitch: 0,
    });
  }

  useEffect(() => {
    if (!active || !map || !presentation) return;
    presentation.enter("constellation", state.result, { fitFlat: fitAll });
  }, [active, map, presentation, state.result]);

  useEffect(() => {
    if (!active || !map) return;
    for (const group of groups) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "constellation-pin";
      button.textContent = group.entries.map((entry) => entry.cipher).join(" · ");
      button.setAttribute("aria-label", `${button.textContent}, value ${group.entries[0].value}${group.entries.length > 1 ? ", shared landing" : ""}`);
      button.addEventListener("click", () => setSelectedCipher(group.entries[0].cipher));
      const marker = new maplibregl.Marker({ element: button, anchor: "bottom", opacityWhenCovered: 0 })
        .setLngLat([group.longitude, group.latitude]).addTo(map);
      markers.current.push({ marker, button, group });
    }
    const stopVisibility = observeGlobeVisibility(map, markers.current.map(({ button, group }) => ({
      element: button, coordinate: () => [group.longitude, group.latitude],
      fallback: () => rows.current.get(group.entries[0].cipher)?.querySelector("button") ?? focusFallback?.(),
    })), () => presentation?.surface ?? FLAT, focusFallback);
    return () => {
      stopVisibility();
      markers.current.forEach(({ marker }) => marker.remove());
      markers.current = [];
    };
  }, [active, map, groups, presentation]);

  useEffect(() => {
    if (!active) return;
    for (const { button, group } of markers.current) {
      const selected = group.entries.some((entry) => entry.cipher === selectedCipher);
      button.classList.toggle("constellation-pin--selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    rows.current.get(selectedCipher)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const entry = state.result?.entries.find((item) => item.cipher === selectedCipher);
    presentation?.setFocus(entry ? [entry.longitude, entry.latitude] : null);
  }, [active, selectedCipher, groups, presentation]);

  useEffect(() => {
    if (!active) return;
    function onKeyDown(event) { if (event.key === "Escape") setSelectedCipher(""); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  function selectEntry(entry) {
    setSelectedCipher(entry.cipher);
    presentation?.focus([entry.longitude, entry.latitude], { zoom: 3, duration: surface === GLOBE ? 450 : 0 });
  }

  return (
    <aside className="constellation-panel" aria-label="value constellation" hidden={!active}>
      <div className="constellation-heading">
        <p className="eyebrow">static snapshots · eight registers</p>
        <h1>value constellation</h1>
        <p>one number, eight addresses.</p>
      </div>
      <MarkdownActions text={markdown} scope="whole constellation"
        filename={`geogematria-constellation-${state.result?.value ?? "reading"}-${projection}`} />
      <form className="constellation-form" onSubmit={cast} noValidate>
        <label className="field-control">
          <span>value · 1–2000</span>
          <input aria-label="constellation value" inputMode="numeric" type="text" value={input}
            placeholder="177" autoComplete="off" aria-describedby="constellation-status"
            aria-invalid={state.status === "error" ? true : undefined}
            onChange={(event) => { invalidate(); setInput(event.target.value); }} />
        </label>
        <label className="field-control">
          <span>projection method</span>
          <select value={projection} onChange={(event) => { invalidate(); setProjection(event.target.value); }}>
            {CONSTELLATION_PROJECTIONS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <button className="constellation-cast" type="submit" disabled={!manifest.length || state.status === "loading"}>
          {state.status === "error" ? "retry cast" : "cast"}
        </button>
      </form>
      <p id="constellation-status" className={`constellation-status constellation-status--${manifestError ? "error" : state.status}`} role="status">
        {manifestError || state.message || (manifest.length ? "enter a value to cast all eight ciphers." : "waiting for the static manifest.")}
      </p>
      {manifestError && <button type="button" onClick={onRetryManifest}>retry static manifest</button>}
      {state.result && (
        <>
          <div className="constellation-summary">
            <strong>{state.result.value}</strong>
            <span>8 addresses · {groups.length} landings</span>
            <button type="button" onClick={() => {
              if (surface === FLAT) setSelectedCipher("");
              presentation?.overview();
            }}>{surface === GLOBE ? "whole globe" : "show all"}</button>
          </div>
          <ol className="constellation-ledger" aria-label="cipher addresses">
            {state.result.entries.map((entry) => (
              <li key={entry.cipher} ref={(node) => { if (node) rows.current.set(entry.cipher, node); else rows.current.delete(entry.cipher); }}
                className={selectedCipher === entry.cipher ? "constellation-row--selected" : ""}>
                <button type="button" className="constellation-row__select" aria-pressed={selectedCipher === entry.cipher}
                  onClick={() => selectEntry(entry)}>
                  <span>{entry.cipher}</span><span>{entry.value}</span>
                </button>
                <p className="constellation-coordinate">{formatCoordinate(entry.latitude)}, {formatCoordinate(entry.longitude)}</p>
                {entry.place && <p>{entry.place.name}{entry.place.country ? `, ${entry.place.country}` : ""}
                  {entry.place.distanceKm !== null && <> · {entry.place.distanceKm} km snap</>}</p>}
                {entry.baseCoordinate && <p className="constellation-trace">hash: {formatCoordinate(entry.baseCoordinate.latitude)}, {formatCoordinate(entry.baseCoordinate.longitude)}<br />
                  {entry.baseCoordinate.projection}</p>}
              </li>
            ))}
          </ol>
          <p className="constellation-note">coordinates: latitude, longitude. saved phrase occupancy is not included.</p>
          {surface === GLOBE && <p className="constellation-note">all eight addresses stay in this ledger and its export, including the far side.</p>}
        </>
      )}
    </aside>
  );
}
