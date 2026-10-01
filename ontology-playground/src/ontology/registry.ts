import type { Ontology } from "./types.ts";
import { ibis } from "./ibis/index.ts";
import { kialo } from "./kialo/index.ts";
import { argMapTruthAndRelevance } from "./arg-map-truth-and-relevance/index.ts";
import { argMapBasic } from "./arg-map-basic/index.ts";
import { ameliorateV2 } from "./ameliorate-v2/index.ts";

// Insertion order drives the ontology dropdown, so the default one leads it.
export const ontologies: Record<string, Ontology> = {
  [argMapBasic.id]: argMapBasic,
  [argMapTruthAndRelevance.id]: argMapTruthAndRelevance,
  [ibis.id]: ibis,
  [kialo.id]: kialo,
  [ameliorateV2.id]: ameliorateV2,
};

export const ontologyList: Ontology[] = Object.values(ontologies);

export const defaultOntologyId = argMapBasic.id;

export function getOntology(id: string): Ontology {
  return ontologies[id] ?? ontologies[defaultOntologyId];
}
