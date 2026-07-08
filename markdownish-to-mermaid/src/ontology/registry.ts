import type { Ontology } from "./types.ts";
import { ibis } from "./ibis/index.ts";

export const ontologies: Record<string, Ontology> = {
  [ibis.id]: ibis,
};

export const ontologyList: Ontology[] = Object.values(ontologies);

export const defaultOntologyId = ibis.id;

export function getOntology(id: string): Ontology {
  return ontologies[id] ?? ibis;
}
