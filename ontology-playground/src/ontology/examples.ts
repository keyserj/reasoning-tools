// Example ids are shared across ontologies, which is what makes "the same reasoning through
// another lens" a single click: switching ontology keeps the example id and loads that
// ontology's own writing of it (see App.tsx's switchOntology).
//
// Labels live here rather than per ontology so the dropdown reads identically everywhere, and
// so a substitution notice can name an example the current ontology doesn't have.
//
// An ontology need not ship every example — it only has to write the ones it can express.

import type { Ontology, OntologyExample } from "./types.ts";

export interface ExampleDef {
  id: string;
  label: string;
}

export const EXAMPLES: ExampleDef[] = [
  { id: "session-storage", label: "Session storage" },
  { id: "build-a-wall", label: "Build a wall" },
];

export const EXAMPLE_LABELS: Record<string, string> = Object.fromEntries(
  EXAMPLES.map((e) => [e.id, e.label]),
);

/** The dropdown's label for an example id, or null for one that isn't in the shared table. */
export function exampleLabel(id: string | null): string | null {
  return id === null ? null : (EXAMPLE_LABELS[id] ?? null);
}

/** The example an ontology opens on. Every ontology ships at least one — registry.test.ts. */
export function defaultExample(ontology: Ontology): OntologyExample {
  return ontology.examples[0];
}

/** This ontology's writing of a shared example, if it has one. */
export function findExample(ontology: Ontology, id: string | null): OntologyExample | undefined {
  return id === null ? undefined : ontology.examples.find((e) => e.id === id);
}

/**
 * Why an ontology can't show one of the shared examples. Lives here, next to the table it
 * talks about, because two places say it: the picker's tooltip on the grayed pill, and the
 * notice raised when someone clicks that pill — and the two drifting apart would be worse
 * than either being slightly redundant.
 */
export function missingExampleNote(ontology: Ontology, id: string): string {
  const label = exampleLabel(id);
  return `${ontology.label} doesn't have the ${label === null ? "requested" : `"${label}"`} example added yet`;
}
