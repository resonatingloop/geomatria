import React from "react";
import { VALUE_DOMAIN_MODE } from "./atlasData.js";

// Full projected-locus dossier. Shared content rendered inside the ReadoutTray
// (and reusable elsewhere during migration). Moved here from main.jsx's former
// LocusPanel so the tray and any future surface can share one source of truth.
export function ProjectedLocusReadout({ locus, selectedFeatureKey, projectionMethod }) {
  if (!locus) {
    return null;
  }

  const hasCollision = locus.cliques.length > 1;
  const isValueDomainLocus = locus.cliques.some(
    (clique) => clique.details.mode === VALUE_DOMAIN_MODE
  );
  const visibleCliques = isValueDomainLocus
    ? visibleDomainCliques(locus.cliques, selectedFeatureKey)
    : locus.cliques;
  const visibleCollision = visibleCliques.length > 1;
  const soloClique = visibleCliques.length === 1 ? visibleCliques[0] : null;

  return (
    <article className="locus-card">
      <div className="locus-card__header">
        <div>
          <p className="eyebrow">
            {isValueDomainLocus ? "heat locus" : "projected locus"}
          </p>
          <h2>
            {isValueDomainLocus
              ? heatLocusTitle(locus)
              : visibleCollision
                ? "multiple cliques"
                : cliqueTitle(visibleCliques[0])}
          </h2>
        </div>
        <span className="type-badge">
          {isValueDomainLocus
            ? `${locus.valuesWithPhrases} occupied`
            : visibleCollision
              ? `${visibleCliques.length} cliques`
              : visibleCliques[0].details.cliqueKind}
        </span>
      </div>

      <dl className="detail-grid">
        {isValueDomainLocus ? (
          <>
            <div>
              <dt>Domain values here</dt>
              <dd>{locus.domainValueCount}</dd>
            </div>
            <div>
              <dt>Values with phrases</dt>
              <dd>{locus.valuesWithPhrases}</dd>
            </div>
          </>
        ) : (
          <div>
            <dt>Locus occupancy</dt>
            <dd>{locus.cliques.length} {locus.cliques.length === 1 ? "clique" : "cliques"}</dd>
          </div>
        )}
        <div>
          <dt>Projection method</dt>
          <dd>{locus.projectionMethod}</dd>
        </div>
        <div>
          <dt>Google Maps</dt>
          <dd>{locus.googleMapsCopy}</dd>
        </div>
        {locus.snappedPlace && (
          <div>
            <dt>Snapped place</dt>
            <dd>
              {locus.snappedPlace.name}, {locus.snappedPlace.country}
            </dd>
          </div>
        )}
        {locus.snapDistanceSummary && (
          <div>
            <dt>Snap distance</dt>
            <dd>{formatSnapDistanceSummary(locus.snapDistanceSummary)}</dd>
          </div>
        )}
      </dl>

      {locus.snappedPlace && (
        <p className="locus-note locus-note--place">
          Place-snapped locus from an offline gazetteer. Distinct cliques may
          share this town coordinate.
        </p>
      )}

      <details className="debug-details">
        <summary>Coordinate debug</summary>
        <dl className="detail-grid detail-grid--debug">
          <div>
            <dt>GeoJSON</dt>
            <dd>{locus.geoJsonCopy}</dd>
          </div>
          {locus.baseCoordinate && (
            <div>
              <dt>Original hash coordinate</dt>
              <dd>{locus.baseCoordinate.googleMapsCopy}</dd>
            </div>
          )}
          {projectionMethod && (
            <div>
              <dt>Projection method</dt>
              <dd>{projectionMethod}</dd>
            </div>
          )}
        </dl>
      </details>

      {isValueDomainLocus && (
        <p className="locus-note locus-note--domain">
          The heat layer counts every exported integer value at this coordinate.
          The list below only shows values that have phrase occupancy.
        </p>
      )}

      {!isValueDomainLocus && hasCollision && (
        <p className="locus-note">
          This projected locus contains multiple cliques because distinct cipher values
          share the same projected coordinate.
        </p>
      )}

      {/* Phrase content as a flat ledger inside the one plate. A single clique
          renders its phrases directly (the value already reads in the plate
          title); collisions/heat loci group phrases under quiet expandable
          value labels, where the differing value is informative, not a repeat. */}
      <section className="phrase-ledger-wrap">
        {visibleCollision ? (
          visibleCliques.map((clique) => (
            <details className="ledger-group" key={clique.featureKey}>
              <summary className="ledger-group__summary">
                <span className="ledger-group__value">{cliqueTitle(clique)}</span>
                <span className="ledger-group__kind">{clique.details.cliqueKind}</span>
                <span className="ledger-group__count">{clique.details.cliqueSize}</span>
              </summary>
              <PhraseLedger phrases={clique.details.phrases} mode={clique.details.mode} />
            </details>
          ))
        ) : (
          <>
            <div className="ledger-head">
              <span className="ledger-head__label">phrases</span>
              <span className="ledger-head__count">
                {soloClique ? soloClique.details.cliqueSize : 0}
              </span>
            </div>
            <PhraseLedger
              phrases={soloClique ? soloClique.details.phrases : []}
              mode={soloClique ? soloClique.details.mode : undefined}
            />
          </>
        )}
      </section>
    </article>
  );
}

function PhraseLedger({ phrases, mode }) {
  if (!phrases || phrases.length === 0) {
    return (
      <p className="empty-phrases">
        {mode === VALUE_DOMAIN_MODE
          ? "No phrases for this value."
          : "No phrases in export."}
      </p>
    );
  }
  return (
    <ol className="phrase-ledger">
      {phrases.map((phrase, index) => (
        <li key={`${phrase}-${index}`}>{phrase}</li>
      ))}
    </ol>
  );
}

export function cliqueTitle(clique) {
  return `${clique.details.cipher.toLowerCase()} ${clique.details.value}`;
}

export function heatLocusTitle(locus) {
  const place = locus.snappedPlace
    ? `${locus.snappedPlace.name}, ${locus.snappedPlace.country}`
    : locus.googleMapsCopy;
  return `${locus.domainValueCount} values at ${place}`;
}

export function visibleDomainCliques(cliques, selectedFeatureKey) {
  const visible = cliques.filter((clique) => clique.details.hasPhrases);
  if (
    selectedFeatureKey &&
    !visible.some((clique) => clique.featureKey === selectedFeatureKey)
  ) {
    const selected = cliques.find((clique) => clique.featureKey === selectedFeatureKey);
    if (selected) {
      return [selected, ...visible];
    }
  }

  return visible;
}

function formatDistance(distanceKm) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(distanceKm)} km`;
}

export function formatSnapDistanceSummary(summary) {
  if (summary.count <= 1 || summary.min === summary.max) {
    return formatDistance(summary.average);
  }

  return `avg ${formatDistance(summary.average)} / max ${formatDistance(summary.max)}`;
}
