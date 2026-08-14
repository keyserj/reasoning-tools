import type { FeatureState, RenderEdge, RenderNode, RenderGraph } from "../types.ts";
import { addNotes } from "../notes.ts";
import { featureOption, featureParam } from "../features.ts";
import type { ArgDoc, Claim, Edge } from "./model.ts";
import {
  EDGE_CLAIMS,
  EDGE_DISPLAY,
  EDGE_DISPLAY_DISTINGUISH,
  IMPLIED,
  SPELLED_OUT,
} from "./features.ts";
import { type Scores, formatScores } from "./scores.ts";

// How this ontology gets drawn — the one file to rewrite if the rendering should change.
// Every supports/critiques edge makes a claim that can itself be argued about, and mermaid
// can't point an arrow at another arrow; the `Edge claims` feature switches between the two
// answers to that, which ./rendering.md lays out and compares.

/** Id of the header node. Leading `_` is already a safe mermaid identifier. */
const TOPIC_ID = "_topic";

/** How much of an endpoint's text a spelled-out claim quotes before it stops being readable. */
const SIDE_MAX = 40;

/** A claim nothing argues *for* — the thesis, in a document with one. */
function firstRootClaimId(doc: ArgDoc): string | null {
  const sources = new Set(doc.edges.map((edge) => edge.sourceId));
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

/** Topic header + one node per claim: the part both renderings share. */
function claimNodes(doc: ArgDoc): { nodes: RenderNode[]; known: Set<string> } {
  const nodes: RenderNode[] = [];
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
  return { nodes, known };
}

/**
 * Notes and the topic anchor, which attach the same way in both renderings. An owner with no
 * node of its own carries its notes nowhere: that's an un-argued edge under `spelled out`,
 * where the note is what would have earned it a node in the first place.
 */
function addNotesAndAnchor(
  doc: ArgDoc,
  nodes: RenderNode[],
  edges: RenderEdge[],
  known: Set<string>,
) {
  const owners: (Claim | Edge)[] = [...doc.claims, ...doc.edges];
  addNotes(
    nodes,
    edges,
    owners.filter((owner) => known.has(owner.id)),
  );

  // Direction matters: the default layout is BT, where an edge's *target* is ranked above its
  // source. So the root is the source and the header the target, which lands the header on top.
  if (known.has(TOPIC_ID)) {
    const rootId = firstRootClaimId(doc);
    if (rootId !== null) edges.push({ from: rootId, to: TOPIC_ID, type: "anchor" });
  }
}

/** Flatten an {@link ArgDoc} into the shared {@link RenderGraph}, reifying every edge into a node. */
function impliedClaims(doc: ArgDoc, distinguish: boolean): RenderGraph {
  const { nodes, known } = claimNodes(doc);
  const graphEdges: RenderEdge[] = [];
  const edgeIds = new Set(doc.edges.map((edge) => edge.id));

  // A reified node is labelled with its type — its text *is* "supports" / "critiques", which
  // is what its edge claim asserts about the two claims it sits between.
  for (const edge of doc.edges) {
    nodes.push({ id: edge.id, type: edge.type, text: withScores(edge.type, edge.scores) });
    known.add(edge.id);
  }

  // One ontology edge becomes two connectors; `distinguish` draws them as the halves they are.
  // Endpoints can dangle when a `$ref` names something that was never declared; the parser
  // already reported that, so here the half-edge is simply dropped.
  for (const edge of doc.edges) {
    if (known.has(edge.sourceId)) {
      graphEdges.push({
        from: edge.sourceId,
        to: edge.id,
        type: distinguish ? "edge-half" : "link",
      });
    }
    if (known.has(edge.targetId)) {
      graphEdges.push({
        from: edge.id,
        to: edge.targetId,
        type: distinguish && edgeIds.has(edge.targetId) ? "edge-to-edge" : "link",
      });
    }
  }

  addNotesAndAnchor(doc, nodes, graphEdges, known);
  return { nodes, edges: graphEdges };
}

/** `A really quite long claim…` — one side of a spelled-out claim. */
function truncate(text: string): string {
  return text.length <= SIDE_MAX ? text : `${text.slice(0, SIDE_MAX - 1).trimEnd()}…`;
}

/**
 * The claim an edge makes, spelled out: `"Redis is fast for hot reads" supports "We should…"`.
 *
 * A side falls back to the endpoint's id in the two cases where there is no claim text to
 * quote, both reachable: the endpoint is itself an edge (a nested edge claim — spelling
 * that one out in full is unreadable), or it is an unresolved `$ref`, which is the normal
 * state while typing `= $foo` before `&foo` exists.
 */
function edgeClaimText(edge: Edge, claimTextById: Map<string, string>): string {
  const side = (id: string) => truncate(claimTextById.get(id) ?? id);
  return `"${side(edge.sourceId)}" ${edge.type} "${side(edge.targetId)}"`;
}

/** What a labeled edge says: its type and, when someone scored it, its score row. */
function edgeLabel(edge: Edge): string {
  return edge.scores === null ? edge.type : `${edge.type} ${formatScores(edge.scores)}`;
}

/** Circled digits run out at ⑳, where the parenthesized form takes over. */
function marker(n: number): string {
  return n <= 20 ? String.fromCodePoint(0x245f + n) : `(${n})`;
}

/**
 * Flatten an {@link ArgDoc} into the shared {@link RenderGraph}, drawing edges as labeled connectors
 * and giving only the argued-about ones a detached node that spells their claim out.
 */
function spelledOutClaims(doc: ArgDoc): RenderGraph {
  const { nodes, known } = claimNodes(doc);
  const graphEdges: RenderEdge[] = [];
  const claimTextById = new Map(doc.claims.map((claim) => [claim.id, claim.text]));

  // An edge needs a node of its own exactly when something has to attach to it: another edge
  // argues about it (that's what a `= $edge-id` block writes), or a note hangs off it.
  const edgeIds = new Set(doc.edges.map((edge) => edge.id));
  const argued = new Set<string>();
  for (const edge of doc.edges) {
    if (edgeIds.has(edge.sourceId)) argued.add(edge.sourceId);
    if (edgeIds.has(edge.targetId)) argued.add(edge.targetId);
    if (edge.notes.length > 0) argued.add(edge.id);
  }

  const markers = new Map<string, string>();
  for (const edge of doc.edges) {
    if (!argued.has(edge.id)) continue;
    const mark = marker(markers.size + 1);
    markers.set(edge.id, mark);
    nodes.push({
      id: edge.id,
      type: "claim",
      text: withScores(`${mark} ${edgeClaimText(edge, claimTextById)}`, edge.scores),
    });
    known.add(edge.id);
  }

  // A dangling endpoint drops the connector, as in the other rendering. An endpoint that is
  // itself an edge resolves to that edge's detached node, which exists by construction: being
  // an endpoint is what got it one.
  for (const edge of doc.edges) {
    if (!known.has(edge.sourceId) || !known.has(edge.targetId)) continue;
    const mark = markers.get(edge.id);
    graphEdges.push({
      from: edge.sourceId,
      to: edge.targetId,
      type: edge.type,
      label: mark === undefined ? edgeLabel(edge) : `${mark} ${edgeLabel(edge)}`,
    });
  }

  // The marker says *which* connector a detached node is about; this anchor says roughly
  // *where*. The BT trap from addNotesAndAnchor applies: the node has to be the source for it
  // to land beneath the connector's upper end. Target end only — see ./rendering.md for why
  // pinning both is worse.
  for (const edge of doc.edges) {
    if (markers.has(edge.id) && known.has(edge.targetId)) {
      graphEdges.push({ from: edge.id, to: edge.targetId, type: "anchor" });
    }
  }

  addNotesAndAnchor(doc, nodes, graphEdges, known);
  return { nodes, edges: graphEdges };
}

/** Flatten an {@link ArgDoc} into the shared {@link RenderGraph}, per the `Edge claims` feature. */
export function toGraph(doc: ArgDoc, features: FeatureState): RenderGraph {
  const option = featureOption(features, EDGE_CLAIMS, SPELLED_OUT);
  if (option !== IMPLIED) return spelledOutClaims(doc);
  const display = featureParam(features, EDGE_CLAIMS, EDGE_DISPLAY, EDGE_DISPLAY_DISTINGUISH);
  return impliedClaims(doc, display === EDGE_DISPLAY_DISTINGUISH);
}
