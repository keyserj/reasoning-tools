import type { Ontology } from "./types.ts";
import { ibis } from "./ibis/index.ts";
import { kialo } from "./kialo/index.ts";
import { argMapTruthAndRelevance } from "./arg-map-truth-and-relevance/index.ts";

// Insertion order drives the ontology dropdown, so the default one leads it.
export const ontologies: Record<string, Ontology> = {
  [argMapTruthAndRelevance.id]: argMapTruthAndRelevance,
  [ibis.id]: ibis,
  [kialo.id]: kialo,
};

export const ontologyList: Ontology[] = Object.values(ontologies);

// Arg map rather than ibis because it's the one with rendering features to show off.
export const defaultOntologyId = argMapTruthAndRelevance.id;

export function getOntology(id: string): Ontology {
  return ontologies[id] ?? ontologies[defaultOntologyId];
}
