import type { EdgeTypeDef } from "../types.ts";
import { anchorEdgeType } from "../anchoring.ts";
import { noteEdgeType } from "../notes.ts";

// What can appear as a *connector* in the diagram.
export const renderedEdgeTypes: EdgeTypeDef[] = [
  { id: "link", connector: "-->" },
  noteEdgeType,
  // Draws nothing. It exists only to rank the topic header above the argument, so dagre stops
  // parking it wherever it likes — see ./toGraph.ts.
  anchorEdgeType,
];

export const renderedEdgeTypesById: Record<string, EdgeTypeDef> = Object.fromEntries(
  renderedEdgeTypes.map((t) => [t.id, t]),
);

export const DEFAULT_CONNECTOR = "-->";
