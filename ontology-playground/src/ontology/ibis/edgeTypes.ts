import type { EdgeTypeDef } from "../types.ts";

// IBIS types an edge by the child's marker, so there is one edge type per node type.
// Ontologies with their own edge verbs (causes / reduces / guides) declare them here
// independently of their node types.
export const edgeTypes: EdgeTypeDef[] = [
  { id: "question", connector: "-->" },
  { id: "idea", connector: "-->" },
  { id: "pro", connector: "-->" },
  { id: "con", connector: "-->" },
  { id: "note", connector: "-.->" },
];

export const edgeTypesById: Record<string, EdgeTypeDef> = Object.fromEntries(
  edgeTypes.map((t) => [t.id, t]),
);

export const DEFAULT_CONNECTOR = "-->";
