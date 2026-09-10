import React from "react";
import { ProjectedLocusReadout } from "./ProjectedLocusReadout.jsx";

// Expanded inspector. Slides in from the right edge over the map with a faint
// scrim. Overlay only: the map does not reflow underneath. Mounted whenever a
// locus is selected; the `open` flag drives the slide/scrim transition so
// closing collapses back to the bare LocusPlate.
export function ReadoutTray({
  open,
  locus,
  selectedFeatureKey,
  projectionMethod,
  cipherLabels,
  source,
  onClose,
  onSelectValue,
  selectionDisabled,
}) {
  if (!locus) {
    return null;
  }

  return (
    <>
      <div
        className={`readout-tray__scrim${open ? " readout-tray__scrim--open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`readout-tray${open ? " readout-tray--open" : ""}`}
        aria-label="Expanded locus readout"
        aria-hidden={open ? undefined : true}
        inert={open ? undefined : ""}
      >
        <div className="readout-tray__head">
          <p className="eyebrow">readout tray</p>
          <button
            type="button"
            className="readout-tray__close"
            onClick={onClose}
            aria-label="Close readout tray"
            title="Close readout tray"
          >
            &times;
          </button>
        </div>
        <div className="readout-tray__body">
          <ProjectedLocusReadout
            locus={locus}
            selectedFeatureKey={selectedFeatureKey}
            projectionMethod={projectionMethod}
            cipherLabels={cipherLabels}
            source={source}
            onSelectValue={onSelectValue}
            selectionDisabled={selectionDisabled}
          />
        </div>
      </aside>
    </>
  );
}
