import type { EdgeTypeDef } from "../types.ts";

// An IBIS edge is typed by the child it runs from (./toGraph.ts), so there is one edge type per
// node type. Ontologies with their own edge verbs (causes / reduces / guides) declare them here
// independently of their node types.
export const renderedEdgeTypes: EdgeTypeDef[] = [
  { id: "question", connector: "-->" },
  { id: "idea", connector: "-->" },
  { id: "pro", connector: "-->" },
  { id: "con", connector: "-->" },
  { id: "note", connector: "-.->" },
];

export const renderedEdgeTypesById: Record<string, EdgeTypeDef> = Object.fromEntries(
  renderedEdgeTypes.map((t) => [t.id, t]),
);

export const DEFAULT_CONNECTOR = "-->";
