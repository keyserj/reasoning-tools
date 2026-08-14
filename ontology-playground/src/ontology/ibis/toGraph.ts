import type { RenderEdge, RenderGraph, RenderNode } from "../types.ts";
import type { IbisDoc } from "./model.ts";

/**
 * Flatten an {@link IbisDoc} into the shared {@link RenderGraph}.
 *
 * The one translation is giving each edge the type its connector is drawn from. An IBIS edge
 * carries none of its own, so it takes the type of the child it runs from — which is why
 * ./renderedEdgeTypes.ts has an entry per node type rather than a vocabulary of its own.
 */
export function toGraph(doc: IbisDoc): RenderGraph {
  const typeById = new Map(doc.nodes.map((node) => [node.id, node.type]));

  const nodes: RenderNode[] = doc.nodes.map(({ id, type, text }) => ({ id, type, text }));
  const edges: RenderEdge[] = [];
  for (const { from, to } of doc.edges) {
    // Always found: `parse` drops an edge whose `$ref` never resolved to a node.
    const type = typeById.get(from);
    if (type !== undefined) edges.push({ from, to, type });
  }

  return { nodes, edges };
}
