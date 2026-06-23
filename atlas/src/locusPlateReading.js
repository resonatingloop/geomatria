import { VALUE_DOMAIN_MODE } from "./atlasData.js";

export function plateReading(locus, cipherLabels) {
  const isValueDomainLocus = locus.cliques.some(
    (clique) => clique.details.mode === VALUE_DOMAIN_MODE
  );

  if (isValueDomainLocus) {
    return valueDomainReading(locus, cipherLabels);
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

function valueDomainReading(locus, cipherLabels) {
  const occupied = locus.cliques.filter((clique) => clique.details.hasPhrases);
  const soloValue =
    locus.domainValueCount === 1 && locus.cliques.length === 1
      ? locus.cliques[0]
      : null;

  if (soloValue) {
    return {
      label:
        locus.occupancyPublic === false
          ? "domain value"
          : soloValue.details.hasPhrases
            ? "occupied value"
            : "empty value",
      readout: cliqueTitle(soloValue, cipherLabels),
      badge:
        locus.occupancyPublic === false
          ? ""
          : phraseCount(soloValue.details.cliqueSize),
      count: `heat: ${domainValueCount(locus.domainValueCount)}`,
    };
  }

  return {
    label: "heat locus",
    readout: heatLocusReadout(locus),
    badge:
      locus.occupancyPublic === false
        ? ""
        : `${locus.valuesWithPhrases} occupied`,
    count:
      locus.occupancyPublic === false
        ? ""
        : occupied.length > 0
          ? phraseCount(locus.totalPhraseCount)
          : "no phrases here",
  };
}

function domainValueCount(total) {
  return `${total} ${total === 1 ? "value" : "values"}`;
}

function heatLocusReadout(locus) {
  if (!locus.snappedPlace) {
    return `${domainValueCount(locus.domainValueCount)} here`;
  }
  return `${domainValueCount(locus.domainValueCount)} at ${locus.snappedPlace.name}, ${locus.snappedPlace.country}`;
}

function phraseCount(total) {
  return `${total} ${total === 1 ? "phrase" : "phrases"}`;
}

function cliqueTitle(clique, cipherLabels) {
  return `${cipherLabel(clique.details.cipher, cipherLabels)} ${clique.details.value}`;
}

function cipherLabel(cipher, cipherLabels) {
  const raw = String(cipher ?? "");
  if (cipherLabels?.get) {
    return cipherLabels.get(raw) ?? cipherLabels.get(raw.toLowerCase()) ?? raw;
  }
  return raw;
}
