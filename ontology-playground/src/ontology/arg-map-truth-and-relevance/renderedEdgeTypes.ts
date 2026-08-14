import type { EdgeTypeDef } from "../types.ts";
import { noteEdgeType } from "../notes.ts";
import { renderedNodeTypesById } from "./renderedNodeTypes.ts";

// What can appear as a *connector* in the diagram. Which of these are used depends on the
// `Edge claims` feature (./features.ts): `link`, `edge-half` and `edge-to-edge` draw the
// `implied` rendering, while `supports`/`critiques` draw the `spelled out` one — the same
// two ontology edge types that ./renderedNodeTypes.ts also renders as boxes, since either
// rendering is possible and the feature picks between them.
//
// `link` is mermaid's word on purpose: it's the one entry with no ontology content, drawn
// only because mermaid needs *something* between a box and its endpoint. The `edge-` names
// say something the ontology cares about, which is why they don't take it.
//
// A connector names the node type it is the other form of (`colorTypeId`) rather than holding
// a color, so it is drawn in whatever that type is configured with and restyling "Supports"
// moves its boxes and its connectors together. The icon is read off the same table for the
// same reason: the two forms of one concept can't drift apart.
export const renderedEdgeTypes: EdgeTypeDef[] = [
  { id: "link", connector: "-->" },
  // The two halves one ontology edge becomes when it's reified — see ./rendering.md on the
  // `Edge display` param. `edge-half` carries no arrowhead because it is half of one arrow,
  // not a relationship of its own; `edge-to-edge` is thick rather than dashed because `note`
  // already owns dashed.
  { id: "edge-half", connector: "---" },
  { id: "edge-to-edge", connector: "==>" },
  noteEdgeType,
  {
    id: "supports",
    connector: "-->",
    colorTypeId: "supports",
    icon: renderedNodeTypesById.supports.icon,
  },
  {
    id: "critiques",
    connector: "-->",
    colorTypeId: "critiques",
    icon: renderedNodeTypesById.critiques.icon,
  },
  // Draws nothing. It exists only to give a node a rank relative to the argument, so dagre
  // stops parking it wherever it likes: the topic header, and a detached edge-claim node,
  // which would otherwise float far from the edge it describes — see ./toGraph.ts.
  { id: "anchor", connector: "~~~" },
];

export const renderedEdgeTypesById: Record<string, EdgeTypeDef> = Object.fromEntries(
  renderedEdgeTypes.map((t) => [t.id, t]),
);

export const DEFAULT_CONNECTOR = "-->";
