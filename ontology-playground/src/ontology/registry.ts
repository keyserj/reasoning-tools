import type { Ontology } from "./types.ts";
import { ibis } from "./ibis/index.ts";
import { argMapTruthAndRelevance } from "./arg-map-truth-and-relevance/index.ts";

// Insertion order drives the ontology dropdown.
export const ontologies: Record<string, Ontology> = {
  [ibis.id]: ibis,
  [argMapTruthAndRelevance.id]: argMapTruthAndRelevance,
};

export const ontologyList: Ontology[] = Object.values(ontologies);

export const defaultOntologyId = ibis.id;

export function getOntology(id: string): Ontology {
  return ontologies[id] ?? ontologies[defaultOntologyId];
}
