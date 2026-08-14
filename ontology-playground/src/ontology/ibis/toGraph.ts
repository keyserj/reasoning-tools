import type { RenderEdge, RenderGraph, RenderNode } from "../types.ts";
import { addNotes } from "../notes.ts";
import { EDGE_TYPE_BY_NODE_TYPE, type IbisDoc } from "./model.ts";

/**
 * Flatten an {@link IbisDoc} into the shared {@link RenderGraph}.
 *
 * Two translations: naming each edge, which IBIS does by the child the edge runs from, and
 * turning each node's notes into boxes of their own, which is what a note is only ever drawn as.
 */
export function toGraph(doc: IbisDoc): RenderGraph {
  const typeById = new Map(doc.nodes.map((node) => [node.id, node.type]));

  const nodes: RenderNode[] = [];
  const edges: RenderEdge[] = [];
  for (const { id, type, text, notes } of doc.nodes) {
    nodes.push({ id, type, text });
    // Per node rather than in one pass at the end, so a note's box is declared next to the
    // node it is about; mermaid draws boxes in the order they're emitted.
    addNotes(nodes, edges, [{ id, notes }]);
  }

  for (const { from, to } of doc.edges) {
    // Always found: `parse` drops an edge whose `$ref` never resolved to a node.
    const nodeType = typeById.get(from);
    if (nodeType !== undefined) edges.push({ from, to, type: EDGE_TYPE_BY_NODE_TYPE[nodeType] });
  }

  return { nodes, edges };
}
