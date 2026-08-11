import type { EdgeTypeDef } from "../types.ts";
import { renderedNodeTypesById } from "./renderedNodeTypes.ts";

// What can appear as a *connector* in the diagram.
//
// `link` is the common case and carries nothing: a claim whose box already says which stance it
// was placed with has nothing left for its connector to say. `pro` and `con` are for the claims
// whose box couldn't — see ./rendering.md — and they name the node type they take their color
// from (`colorTypeId`) rather than holding a hex, so restyling "Pro" moves its boxes and its
// connectors together.
export const renderedEdgeTypes: EdgeTypeDef[] = [
  { id: "link", connector: "-->" },
  {
    id: "pro",
    connector: "-->",
    colorTypeId: "pro",
    icon: renderedNodeTypesById.pro.icon,
  },
  {
    id: "con",
    connector: "-->",
    colorTypeId: "con",
    icon: renderedNodeTypesById.con.icon,
  },
  { id: "note", connector: "-.->" },
  // Draws nothing. It exists only to rank the topic header above the argument, so dagre stops
  // parking it wherever it likes — see ./toGraph.ts.
  { id: "anchor", connector: "~~~" },
];

export const renderedEdgeTypesById: Record<string, EdgeTypeDef> = Object.fromEntries(
  renderedEdgeTypes.map((t) => [t.id, t]),
);

export const DEFAULT_CONNECTOR = "-->";
