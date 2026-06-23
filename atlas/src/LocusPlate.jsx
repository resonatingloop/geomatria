import React from "react";
import { plateReading } from "./locusPlateReading.js";

// Compact selected-locus reading token. Mounted bottom-left over the map only
// while a locus is selected. A reading token, not the full dossier: the
// ReadoutTray holds everything else.
export function LocusPlate({ locus, cipherLabels, onOpenTray, onClear }) {
  if (!locus) {
    return null;
  }

  const reading = plateReading(locus, cipherLabels);

  return (
    <aside className="locus-plate" aria-label="Acquired locus reading">
      <span className="locus-plate__rivet locus-plate__rivet--tl" aria-hidden="true" />
      <span className="locus-plate__rivet locus-plate__rivet--tr" aria-hidden="true" />
      <span className="locus-plate__rivet locus-plate__rivet--bl" aria-hidden="true" />
      <span className="locus-plate__rivet locus-plate__rivet--br" aria-hidden="true" />

      <button
        type="button"
        className="locus-plate__clear"
        onClick={onClear}
        aria-label="Clear selection"
        title="Clear selection"
      >
        &times;
      </button>

      <p className="locus-plate__label">{reading.label}</p>
      <p className="locus-plate__readout">{reading.readout}</p>

      {(reading.badge || reading.count) && (
        <div className="locus-plate__meta">
          {reading.badge && <span className="locus-plate__badge">{reading.badge}</span>}
          {reading.count && <span className="locus-plate__count">{reading.count}</span>}
        </div>
      )}

      <button type="button" className="locus-plate__open" onClick={onOpenTray}>
        open tray
      </button>
    </aside>
  );
}
