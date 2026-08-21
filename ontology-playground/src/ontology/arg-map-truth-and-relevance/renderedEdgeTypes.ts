import type { EdgeTypeDef } from "../types.ts";
import { anchorEdgeType } from "../anchoring.ts";
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
// A connector names the node type it is the other form of (`colorTypeId`) rather than holding a
// color, and reads its icon off the same table, so the two forms of one concept can't drift
// apart.
export const renderedEdgeTypes: EdgeTypeDef[] = [
  { id: "link", connector: "-->" },
  // Reified halves — see ./rendering.md. `edge-to-edge` stays plain: weight is the active mark's
  // channel, and a permanently thick connector would read as picked.
  { id: "edge-half", connector: "---" },
  { id: "edge-to-edge", connector: "-->" },
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
  anchorEdgeType,
];

export const renderedEdgeTypesById: Record<string, EdgeTypeDef> = Object.fromEntries(
  renderedEdgeTypes.map((t) => [t.id, t]),
);

export const DEFAULT_CONNECTOR = "-->";
