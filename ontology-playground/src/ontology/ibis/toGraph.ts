import type { RenderEdge, RenderGraph, RenderNode } from "../types.ts";
import { addDocumentNotes, addNotes } from "../notes.ts";
import { EDGE_TYPE_BY_NODE_TYPE, type IbisDoc } from "./model.ts";

/** Nodes nothing hangs under: an edge's `from` is always the child, so a root is never one. */
function rootNodeIds(doc: IbisDoc): string[] {
  const children = new Set(doc.edges.map((edge) => edge.from));
  return doc.nodes.filter((node) => !children.has(node.id)).map((node) => node.id);
}

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
    nodes.push({ id, type, text, lines: doc.sourceLines[id] });
    // Per node rather than in one pass at the end, so a note's box is declared next to the
    // node it is about; mermaid draws boxes in the order they're emitted.
    addNotes(nodes, edges, [{ id, notes }], doc.sourceLines);
  }

  for (const { id, from, to } of doc.edges) {
    // Always found: `parse` drops an edge whose `$ref` never resolved to a node.
    const nodeType = typeById.get(from);
    if (nodeType !== undefined) {
      edges.push({
        from,
        to,
        type: EDGE_TYPE_BY_NODE_TYPE[nodeType],
        lines: doc.sourceLines[id],
      });
    }
  }

  addDocumentNotes(nodes, edges, doc.notes, rootNodeIds(doc), doc.sourceLines);

  return { nodes, edges };
}
