import type { EdgeTypeDef } from "../types.ts";

// The ontology's own edge types (supports / critiques) don't appear here: ./toGraph.ts reifies
// them into nodes, so what's left to draw is only the plumbing that connects a link node to
// the two claims it sits between, plus a note's attachment.
export const renderedEdgeTypes: EdgeTypeDef[] = [
  { id: "link", connector: "-->" },
  { id: "note", connector: "-.->" },
  // Draws nothing. It exists only to give the topic header a rank relative to the argument,
  // so dagre stops parking it in among the claims — see ./toGraph.ts.
  { id: "anchor", connector: "~~~" },
];

export const renderedEdgeTypesById: Record<string, EdgeTypeDef> = Object.fromEntries(
  renderedEdgeTypes.map((t) => [t.id, t]),
);

export const DEFAULT_CONNECTOR = "-->";
