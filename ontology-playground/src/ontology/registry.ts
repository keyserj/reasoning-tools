import type { Ontology } from "./types.ts";
import { ibis } from "./ibis/index.ts";
import { kialo } from "./kialo/index.ts";
import { relevanceArgumentMap } from "./relevance-argument-map/index.ts";
import { basicArgumentMap } from "./basic-argument-map/index.ts";
import { ameliorateV2 } from "./ameliorate-v2/index.ts";

// Insertion order drives the ontology dropdown, so the default one leads it.
export const ontologies: Record<string, Ontology> = {
  [basicArgumentMap.id]: basicArgumentMap,
  [relevanceArgumentMap.id]: relevanceArgumentMap,
  [ibis.id]: ibis,
  [kialo.id]: kialo,
  [ameliorateV2.id]: ameliorateV2,
};

export const ontologyList: Ontology[] = Object.values(ontologies);

export const defaultOntologyId = basicArgumentMap.id;

export function getOntology(id: string): Ontology {
  return ontologies[id] ?? ontologies[defaultOntologyId];
}
