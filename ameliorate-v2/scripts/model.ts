// The ontology's own model - `ontology.md`'s structure and nothing else. Nothing here records
// where in the source a thing was written, and nothing here knows how any of it is drawn.

import type { EdgeTypeName } from "./markers.ts";
import type { Scores } from "./scores.ts";

export interface Note {
  id: string;
  text: string;
}

export type NodeType = "concept" | "question" | "claim" | "source";

export interface Node {
  id: string;
  /** empty on an implied claim, whose text is derived from what `impliedForId` names */
  text: string;
  type: NodeType;
  /** `#tag`s written on the line; subtypes edges imply (criterion, category, component) aren't here */
  tags: string[];
  /** `%key: value` lines nested under the declaration, e.g. `description`, `opposite` */
  properties: Record<string, string>;
  /** `null` = nobody scored it (no brackets at all) */
  scores: Scores | null;
  notes: Note[];
  /**
   * Set on a claim standing behind another thing's score, written `= $wall-reduces`. The score
   * itself stays on what this names, so an implied claim's own `scores` is always null - see
   * `ontology.md`'s answered question about an implied claim's score being the same score.
   */
  impliedForId?: string;
}

export interface Edge {
  id: string;
  type: EdgeTypeName;
  sourceId: string;
  targetId: string;
  scores: Scores | null;
  notes: Note[];
}

export interface Doc {
  /** `%perspectives` - whose scores appear, and in what order the slots are read */
  perspectives: string[];
  /** declaration order, except implied claims, which land at the end in first-reference order */
  nodes: Node[];
  edges: Edge[];
  /** `~` lines with nothing above them: notes about the document rather than about a line */
  notes: Note[];
}

/** An implied claim's score is the score of what it stands behind, held in exactly one place. */
export function scoresOf(node: Node, doc: Doc): Scores | null {
  if (node.impliedForId === undefined) return node.scores;
  const referent =
    doc.nodes.find((n) => n.id === node.impliedForId) ??
    doc.edges.find((e) => e.id === node.impliedForId);
  return referent?.scores ?? null;
}

/** `ontology.md` tags the topic explicitly, the same way it tags an action. */
export const TOPIC_TAG = "topic";

/**
 * The `#topic` concept: what every score is relative to, and what distance is measured from.
 * ./validate.ts holds a document to at most one, so the first match is the only match.
 */
export function findTopic(doc: Doc): Node | undefined {
  return doc.nodes.find((node) => node.type === "concept" && node.tags.includes(TOPIC_TAG));
}

/**
 * What an implied claim says. Derived rather than stored, per `ontology.md`'s legend: the text
 * belongs to whatever the claim stands behind, so writing it on the reference line would be a
 * second copy free to drift.
 */
export function impliedClaimText(node: Node, doc: Doc): string {
  if (node.impliedForId === undefined) return node.text;
  const referent = doc.nodes.find((other) => other.id === node.impliedForId);
  if (referent) {
    // a claim is already worded as something evaluable; a concept's score is about changing it
    return referent.type === "claim" ? referent.text : `${referent.text} is important to increase`;
  }
  const edge = doc.edges.find((other) => other.id === node.impliedForId);
  if (!edge) return "";
  const textOf = (id: string): string => {
    const found = doc.nodes.find((other) => other.id === id);
    return found ? impliedClaimText(found, doc) : id;
  };
  return `${textOf(edge.sourceId)} ${edge.type} ${textOf(edge.targetId)}`;
}
