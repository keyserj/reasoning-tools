import type { EdgeTypeDef } from "../types.ts";

// One entry per link in IBIS's vocabulary (./model.ts), which ./toGraph.ts reads off the child an
// edge runs from. Ontologies whose edges say something their endpoints don't (causes / reduces /
// guides) declare them there and here independently of their node types.
export const renderedEdgeTypes: EdgeTypeDef[] = [
  { id: "questions", connector: "-->" },
  { id: "respondsTo", connector: "-->" },
  { id: "supports", connector: "-->" },
  { id: "objectsTo", connector: "-->" },
  { id: "note", connector: "-.->" },
];

export const renderedEdgeTypesById: Record<string, EdgeTypeDef> = Object.fromEntries(
  renderedEdgeTypes.map((t) => [t.id, t]),
);

export const DEFAULT_CONNECTOR = "-->";
