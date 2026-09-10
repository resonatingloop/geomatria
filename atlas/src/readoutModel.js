import { VALUE_DOMAIN_MODE } from "./atlasData.js";

export function visibleDomainCliques(cliques, selectedFeatureKey) {
  const visible = cliques.filter((clique) => clique.details.hasPhrases);
  if (selectedFeatureKey && !visible.some((clique) => clique.featureKey === selectedFeatureKey)) {
    const selected = cliques.find((clique) => clique.featureKey === selectedFeatureKey);
    if (selected) return [selected, ...visible];
  }
  return visible;
}

export function locusReadoutModel(locus, selectedFeatureKey = "") {
  if (!locus) return null;
  const isValueDomain = locus.cliques.some((clique) => clique.details.mode === VALUE_DOMAIN_MODE);
  const occupancyAvailable = locus.occupancyPublic !== false;
  // Public visibility must not be inferred from retained private fields, even
  // if an incorrectly populated fixture or future provider supplies them.
  const candidates = occupancyAvailable ? locus.cliques : locus.cliques.map((clique) => ({
    ...clique,
    details: { ...clique.details, phrases: [], hasPhrases: false, cliqueSize: 0, cliqueKind: "domain value" },
  }));
  // Numeric domain membership is public; phrase occupancy is not. Only the
  // local phrase-bearing reading uses the selected-plus-occupied filter.
  const cliques = isValueDomain && occupancyAvailable
    ? visibleDomainCliques(candidates, selectedFeatureKey)
    : isValueDomain
      ? candidates.sort((a, b) => Number(a.details.value) - Number(b.details.value))
      : candidates;
  const selectedClique = cliques.find((clique) => clique.featureKey === selectedFeatureKey) ?? null;
  return { isValueDomain, occupancyAvailable, cliques, selectedClique };
}
