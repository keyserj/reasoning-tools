import type { EdgeTypeDef } from "../types.ts";
import { anchorEdgeType } from "../anchoring.ts";
import { noteEdgeType } from "../notes.ts";

export const renderedEdgeTypes: EdgeTypeDef[] = [
  { id: "relatesTo", connector: "arrow" },
  { id: "supports", connector: "arrow" },
  { id: "critiques", connector: "arrow" },
  noteEdgeType,
  // Draws nothing; it only ranks a document note above the argument — see ./toGraph.ts.
  anchorEdgeType,
];

export const renderedEdgeTypesById: Record<string, EdgeTypeDef> = Object.fromEntries(
  renderedEdgeTypes.map((t) => [t.id, t]),
);
