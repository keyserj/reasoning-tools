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
import { findTopic, impliedClaimText, scoresOf } from "./model.ts";
import { type GuidingQuestion, guidingQuestions } from "./questions.ts";
import type { Ranked } from "./ranking.ts";
import type { Scores } from "./scores.ts";
import type { EdgeTypeName } from "./markers.ts";
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

export interface BundleEdge {
  sourceId: string;
  targetId: string;
  type: EdgeTypeName;
  scores: Scores | null;
}

export interface Bundle {
  perspectives: string[];
  topic: { id: string; description: string } | null;
  nodes: Record<string, BundleNode>;
  /** every relation, so a view can name the two ends of one it wasn't handed */
  edges: Record<string, BundleEdge>;
  questions: GuidingQuestion[];
  highlights: { ranked: Ranked[]; byCategory: Record<string, Ranked[]> };
  diagram: { nodeIds: string[]; edges: DiagramEdge[] };
  tradeoffs: Tradeoffs | null;
  /** keyed by what is argued about; only what the diagram can reach */
  arguments: Record<string, CalculatedArguments & { claims: ClaimNode[] }>;
}

export function buildBundle(doc: Doc): Bundle {
  const topic = findTopic(doc);
  const drawn = diagram(doc);
  const questions = guidingQuestions(doc);
  // One table, for the most central question that has criteria. A second such question would be
  // dropped silently; the wireframe assumes one because it has one place to put it.
  const table =
    questions.reduce<Tradeoffs | null>((found, q) => found ?? tradeoffs(doc, q.id), null) ?? null;

  const nodes: Record<string, BundleNode> = {};
  for (const node of doc.nodes) {
    nodes[node.id] = {
      label: impliedClaimText(node, doc),
      kind: kindOf(node, doc),
      tags: node.tags,
      subtypes: subtypesOf(node, doc),
      scores: scoresOf(node, doc),
    };
  }

  const argued: Record<string, CalculatedArguments & { claims: ClaimNode[] }> = {};
  for (const id of [...drawn.nodeIds, ...drawn.edges.map((edge) => edge.id)]) {
    argued[id] = { ...calculatedArguments(doc, id), claims: claimsAbout(doc, id) };
  }

  const edges: Record<string, BundleEdge> = {};
  for (const edge of doc.edges) {
    edges[edge.id] = {
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      type: edge.type,
      scores: edge.scores,
    };
  }

  return {
    perspectives: doc.perspectives,
    topic: topic ? { id: topic.id, description: topic.properties.description ?? "" } : null,
    nodes,
    edges,
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

/** The subtypes `ontology.md` says the edges imply, since nothing tags them. */
function subtypesOf(node: Node, doc: Doc): string[] {
  const subtypes: string[] = [];
  for (const edge of doc.edges) {
    const isSource = edge.sourceId === node.id;
    const isTarget = edge.targetId === node.id;
    if (isSource && edge.type === "categorizes") subtypes.push("category");
    if (isTarget && edge.type === "has") subtypes.push("component");
    // "Concept fulfils {Concept}" and "{Concept} criterion for Question" both name a criterion
    if (isSource && edge.type === "criterion for") subtypes.push("criterion");
    if (isTarget && edge.type === "fulfils") subtypes.push("criterion");
    // "{Claim} answers Clarifying Question"
    if (isSource && edge.type === "answers") subtypes.push("option");
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
      scores: scoresOf(source, doc),
      supports: edge.scores,
      children: supportersOf(doc, source.id, seen),
    });
    seen.delete(source.id);
  }
  return claims;
}
