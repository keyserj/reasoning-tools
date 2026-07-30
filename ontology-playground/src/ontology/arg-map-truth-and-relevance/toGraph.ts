import type { Graph, GraphEdge, GraphNode } from "../types.ts";
import type { ArgDoc } from "./model.ts";
import { type Scores, formatScores } from "./scores.ts";

// How this ontology gets drawn — the one file to rewrite if the rendering should change.
//
// Every supports/critiques link is REIFIED into its own node sitting between its endpoints
// (`source ──▶ [supports 8,2,8] ──▶ target`). Mermaid can't point an arrow at another arrow,
// and in this ontology a link is an argued thing in its own right: a `= $some-link-id` block
// attaches arguments to a link's implied claim. Reifying makes that structurally identical to
// arguing about a claim, so every `$ref` resolves to a plain node and no case is special.
// It also puts every score in a box, which is the point of rendering this at all.
//
// The alternative, if the box count starts to feel heavy: draw links as labeled mermaid edges
// (`-- "supports [8,2,8]" -->`) and give each argued-about link its own *unattached* mini
// argument map, rooted at a claim spelling out the implied claim ("wall-reduces supports
// wall"). That mirrors how the source text already reads, at the cost of one concept having
// two visual forms and of `GraphEdge` needing a label.

/** Id of the header node. Leading `_` is already a safe mermaid identifier. */
const TOPIC_ID = "_topic";

/**
 * A claim nothing argues *for* — the thesis, in a document with one. Left unconnected, the
 * topic header is a component of its own and dagre drops it among the claims, so it gets
 * anchored to the first root by an invisible edge purely to fix where it lands.
 */
function firstRootClaimId(doc: ArgDoc): string | null {
  const sources = new Set(doc.links.map((link) => link.sourceId));
  return doc.claims.find((claim) => !sources.has(claim.id))?.id ?? null;
}

/** Scores go on their own line; ../mermaidFlowchart.ts turns the newline into a `<br/>`. */
function withScores(text: string, scores: Scores | null): string {
  return scores === null ? text : `${text}\n${formatScores(scores)}`;
}

/**
 * The header's text: why we're discussing this, and how to read a score row. Perspectives keep
 * the bracketed, comma-separated shape of a score row (and of the `%perspectives` line they come
 * from), so `[5,2,8]` can be read off the header slot by slot instead of by inference.
 */
function topicText(doc: ArgDoc): string {
  const parts: string[] = [];
  if (doc.description) parts.push(doc.description);
  if (doc.perspectives.length > 0) {
    parts.push(`Scores: [${doc.perspectives.join(", ")}]`);
  }
  return parts.join("\n");
}

/** Flatten an {@link ArgDoc} into the shared {@link Graph}, reifying links into nodes. */
export function toGraph(doc: ArgDoc): Graph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const known = new Set<string>();

  const header = topicText(doc);
  if (header !== "") {
    nodes.push({ id: TOPIC_ID, type: "topic", text: header });
    known.add(TOPIC_ID);
  }

  for (const claim of doc.claims) {
    nodes.push({ id: claim.id, type: "claim", text: withScores(claim.text, claim.scores) });
    known.add(claim.id);
  }
  // A link node is labelled with its type — its text *is* "supports" / "critiques", which is
  // what its implied claim asserts about the two claims it sits between.
  for (const link of doc.links) {
    nodes.push({ id: link.id, type: link.type, text: withScores(link.type, link.scores) });
    known.add(link.id);
  }
  for (const note of doc.notes) {
    nodes.push({ id: note.id, type: "note", text: note.text });
    known.add(note.id);
  }

  // Endpoints can dangle when a `$ref` names something that was never declared; the parser
  // already reported that, so here the half-edge is simply dropped.
  for (const link of doc.links) {
    if (known.has(link.sourceId)) edges.push({ from: link.sourceId, to: link.id, type: "link" });
    if (known.has(link.targetId)) edges.push({ from: link.id, to: link.targetId, type: "link" });
  }
  for (const note of doc.notes) {
    if (known.has(note.attachedTo)) {
      edges.push({ from: note.id, to: note.attachedTo, type: "note" });
    }
  }

  // Direction matters: the default layout is BT, where an edge's *target* is ranked above its
  // source. So the root is the source and the header the target, which lands the header on top.
  if (known.has(TOPIC_ID)) {
    const rootId = firstRootClaimId(doc);
    if (rootId !== null) edges.push({ from: rootId, to: TOPIC_ID, type: "anchor" });
  }

  return { nodes, edges };
}
