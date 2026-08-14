import type { RenderEdge, RenderGraph, RenderNode } from "../types.ts";
import { EDGE_TYPE_BY_NODE_TYPE, type IbisDoc } from "./model.ts";

/**
 * Flatten an {@link IbisDoc} into the shared {@link RenderGraph}.
 *
 * The one translation is naming each edge, which IBIS does by the child the edge runs from.
 */
export function toGraph(doc: IbisDoc): RenderGraph {
  const typeById = new Map(doc.nodes.map((node) => [node.id, node.type]));

  const nodes: RenderNode[] = doc.nodes.map(({ id, type, text }) => ({ id, type, text }));
  const edges: RenderEdge[] = [];
  for (const { from, to } of doc.edges) {
    // Always found: `parse` drops an edge whose `$ref` never resolved to a node.
    const nodeType = typeById.get(from);
    if (nodeType !== undefined) edges.push({ from, to, type: EDGE_TYPE_BY_NODE_TYPE[nodeType] });
  }

  return { nodes, edges };
}
