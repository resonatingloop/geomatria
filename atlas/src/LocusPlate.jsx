import React from "react";
import { VALUE_DOMAIN_MODE } from "./atlasData.js";
import { cliqueTitle } from "./ProjectedLocusReadout.jsx";

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

      <div className="locus-plate__meta">
        <span className="locus-plate__badge">{reading.badge}</span>
        <span className="locus-plate__count">{reading.count}</span>
      </div>

      <button type="button" className="locus-plate__open" onClick={onOpenTray}>
        open tray
      </button>
    </aside>
  );
}

function plateReading(locus, cipherLabels) {
  const isValueDomainLocus = locus.cliques.some(
    (clique) => clique.details.mode === VALUE_DOMAIN_MODE
  );

  if (isValueDomainLocus) {
    return {
      label: "heat locus",
      readout: `${locus.domainValueCount} values`,
      badge: `${locus.valuesWithPhrases} occupied`,
      count: `${locus.valuesWithPhrases} with phrases`,
    };
  }

  const collision = locus.cliques.length > 1;
  if (collision) {
    return {
      label: "projected locus",
      readout: "multiple cliques",
      badge: `${locus.cliques.length} cliques`,
      count: phraseCount(locus.totalPhraseCount),
    };
  }

  const clique = locus.cliques[0];
  return {
    label: "projected locus",
    readout: cliqueTitle(clique, cipherLabels),
    badge: clique.details.cliqueKind,
    count: phraseCount(locus.totalPhraseCount),
  };
}

function phraseCount(total) {
  return `${total} ${total === 1 ? "phrase" : "phrases"}`;
}
