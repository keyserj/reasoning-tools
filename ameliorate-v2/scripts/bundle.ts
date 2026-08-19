// Everything the wireframes need, in one object.
//
// The wireframes paste this in rather than fetching it: `versions.js` makes each version a
// snapshot that is never edited once cut, so a regenerated file has to reach a *new* version
// deliberately rather than silently rewriting the old ones. Pasting also leaves room to override
// a number by hand when a demo needs one, which is why nothing here is clever about presentation.

import { type CalculatedArguments, calculatedArguments } from "./arguments.ts";
import { type DiagramEdge, diagram } from "./diagram.ts";
import { highlights } from "./highlights.ts";
import type { Doc, Node } from "./model.ts";
import { findTopic, impliedClaimText } from "./model.ts";
import { type GuidingQuestion, guidingQuestions } from "./questions.ts";
import type { Ranked } from "./ranking.ts";
import type { Scores } from "./scores.ts";
import { type Tradeoffs, tradeoffs } from "./tradeoffs.ts";

/** A question is guiding or clarifying by the edge that reaches it, not by its `?` marker. */
export type NodeKind = "concept" | "guiding" | "clarifying" | "claim" | "source";

export interface BundleNode {
  label: string;
  kind: NodeKind;
  /** `#tag`s the author wrote */
  tags: string[];
  /** subtypes the edges imply, which nothing writes down */
  subtypes: string[];
  scores: Scores | null;
}

export interface ClaimNode {
  id: string;
  text: string;
  scores: Scores | null;
  /** the `supports` weight tying it to what it argues about; negative reads as critique */
  supports: Scores | null;
  children: ClaimNode[];
}

export interface Bundle {
  perspectives: string[];
  topic: { id: string; description: string } | null;
  nodes: Record<string, BundleNode>;
  questions: GuidingQuestion[];
  highlights: { top: Ranked[]; byCategory: Record<string, Ranked[]> };
  diagram: { nodeIds: string[]; edges: DiagramEdge[] };
  tradeoffs: Tradeoffs | null;
  /** keyed by what is argued about; only what the diagram can reach */
  arguments: Record<string, CalculatedArguments & { claims: ClaimNode[] }>;
}

export function buildBundle(doc: Doc): Bundle {
  const topic = findTopic(doc);
  const drawn = diagram(doc);
  const questions = guidingQuestions(doc);
  const table = questions.map((q) => tradeoffs(doc, q.id)).find((t) => t !== null) ?? null;

  const nodes: Record<string, BundleNode> = {};
  for (const node of doc.nodes) {
    nodes[node.id] = {
      label: impliedClaimText(node, doc),
      kind: kindOf(node, doc),
      tags: node.tags,
      subtypes: subtypesOf(node, doc),
      scores: node.scores,
    };
  }

  const argued: Record<string, CalculatedArguments & { claims: ClaimNode[] }> = {};
  for (const id of [...drawn.nodeIds, ...drawn.edges.map((edge) => edge.id)]) {
    argued[id] = { ...calculatedArguments(doc, id), claims: claimsAbout(doc, id) };
  }

  return {
    perspectives: doc.perspectives,
    topic: topic ? { id: topic.id, description: topic.properties.description ?? "" } : null,
    nodes,
    questions,
    highlights: highlights(doc),
    diagram: drawn,
    tradeoffs: table,
    arguments: argued,
  };
}

function kindOf(node: Node, doc: Doc): NodeKind {
  if (node.type !== "question") return node.type;
  const guides = doc.edges.some((edge) => edge.type === "guides" && edge.sourceId === node.id);
  return guides ? "guiding" : "clarifying";
}

/** Category, component and criterion are read off the edges, since nothing tags them. */
function subtypesOf(node: Node, doc: Doc): string[] {
  const subtypes: string[] = [];
  for (const edge of doc.edges) {
    if (edge.sourceId === node.id && edge.type === "categorizes") subtypes.push("category");
    if (edge.sourceId === node.id && edge.type === "criterion for") subtypes.push("criterion");
    if (edge.targetId === node.id && edge.type === "has") subtypes.push("component");
  }
  return [...new Set(subtypes)];
}

/**
 * The claims written about something's score, as the tree they were argued in. These reach the
 * bundle as reference output: the wireframe has nowhere to put them yet, and `ontology.md` has
 * no way to weigh one against the topic, since nothing ties a claim into the causal web.
 */
function claimsAbout(doc: Doc, subjectId: string): ClaimNode[] {
  const implied = doc.nodes.find((node) => node.impliedForId === subjectId);
  return implied ? supportersOf(doc, implied.id, new Set([implied.id])) : [];
}

function supportersOf(doc: Doc, targetId: string, seen: Set<string>): ClaimNode[] {
  const claims: ClaimNode[] = [];
  for (const edge of doc.edges) {
    if (edge.type !== "supports" && edge.type !== "critiques") continue;
    if (edge.targetId !== targetId || seen.has(edge.sourceId)) continue;
    const source = doc.nodes.find((node) => node.id === edge.sourceId);
    if (!source) continue;
    seen.add(source.id);
    claims.push({
      id: source.id,
      text: impliedClaimText(source, doc),
      scores: source.scores,
      supports: edge.scores,
      children: supportersOf(doc, source.id, seen),
    });
  }
  return claims;
}
