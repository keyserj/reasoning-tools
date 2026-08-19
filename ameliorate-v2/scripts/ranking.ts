// What is worth looking at in a topic, ranked. `UX-design.md` asks two states for the same
// judgement - the agenda pane's Hottest Details and the structure pane's "top N nodes to the
// topic" - so the judgement is made once here and the two views differ only in what they filter
// and how many they take.
//
// This is a view-shaping question, not part of the ontology: `ontology.md` has no notion of a
// thing being "hot" or "controversial". What it does supply is every input - change importance,
// the spread between perspectives, and the causal distance a score is discounted by.

import { CAUSAL_TYPES, topicReach } from "./chains.ts";
import type { Doc, Edge, Node } from "./model.ts";
import { findTopic } from "./model.ts";
import {
  MAX_SCORE,
  UNSCORED_CONCEPT,
  UNSCORED_RELATION,
  averageMagnitude,
  deviation,
} from "./scores.ts";

/**
 * `UX-design.md`'s three filters. "Change importance" rather than "importance": a concept's score
 * says how much it matters that the thing *changes*, in either direction, not how much it matters.
 */
export type Signal = "change-importance" | "controversy" | "unknown";

export interface Ranked {
  kind: "node" | "edge";
  id: string;
  /** each 0..1, before distance is applied */
  signals: Record<Signal, number>;
  /** 0..1: how much of the signal survives the causal distance to the topic */
  reach: number;
  /** 0..1: the strongest reason to look at this, discounted by how far away it is */
  hot: number;
  /** every signal this scores above zero on, strongest first */
  categories: Signal[];
}

const NO_SIGNALS: Record<Signal, number> = {
  "change-importance": 0,
  controversy: 0,
  unknown: 0,
};

/**
 * Rank everything a reader might be pointed at. The topic itself is left out: it's the thing
 * being read about, so "look at the topic" is not a finding.
 */
export function rank(doc: Doc): Ranked[] {
  const topic = findTopic(doc);
  if (!topic) return [];

  const reaches = topicReach(doc, topic.id);
  const reachOf = (id: string): number => reaches.get(id) ?? 0;
  // A question with any answer has stopped being an unknown, however split those answers are.
  // The `answers` weights are ignored, so a contested answer reads as settled - the compromise
  // is that "unknown" tracks whether anyone has replied, not whether the reply landed.
  const answered = new Set(doc.edges.filter((e) => e.type === "answers").map((e) => e.targetId));
  const clarifiesBy = new Map<string, Edge[]>();
  for (const edge of doc.edges) {
    if (edge.type !== "clarifies") continue;
    const existing = clarifiesBy.get(edge.sourceId);
    if (existing) existing.push(edge);
    else clarifiesBy.set(edge.sourceId, [edge]);
  }
  const byId = new Map(doc.nodes.map((node) => [node.id, node]));
  const ranked: Ranked[] = [];

  const add = (
    kind: "node" | "edge",
    id: string,
    signals: Partial<Record<Signal, number>>,
    nodeReach: number,
  ): void => {
    const full = { ...NO_SIGNALS, ...signals };
    const strongest = Math.max(...Object.values(full));
    if (strongest === 0 || nodeReach === 0) return;
    const categories = (Object.keys(full) as Signal[])
      .filter((signal) => full[signal] > 0)
      .sort((a, b) => full[b] - full[a]);
    ranked.push({
      kind,
      id,
      signals: full,
      reach: nodeReach,
      hot: strongest * nodeReach,
      categories,
    });
  };

  for (const node of doc.nodes) {
    if (node.id === topic.id) continue;
    if (node.type === "concept") {
      add(
        "node",
        node.id,
        {
          "change-importance": averageMagnitude(node.scores, UNSCORED_CONCEPT) / MAX_SCORE,
          controversy: deviation(node.scores) / MAX_SCORE,
        },
        reachOf(node.id),
      );
    } else if (node.type === "question") {
      const clarifies = clarifiesBy.get(node.id);
      // a guiding question sets the agenda rather than marking a gap, and a clarifying question
      // that has been answered is no longer an unknown
      if (!clarifies || answered.has(node.id)) continue;
      // a question hanging over several things is as pressing as the most pressing of them
      const unknown = Math.max(
        ...clarifies.map((edge) => averageMagnitude(edge.scores, UNSCORED_RELATION) / MAX_SCORE),
      );
      const questionReach = Math.max(
        ...clarifies.map((edge) => reachOfClarified(doc, edge.targetId, byId, reachOf)),
      );
      add("node", node.id, { unknown }, questionReach);
    }
  }

  for (const edge of doc.edges) {
    if (!CAUSAL_TYPES.includes(edge.type)) continue;
    add(
      "edge",
      edge.id,
      { controversy: deviation(edge.scores) / MAX_SCORE },
      Math.max(reachOf(edge.sourceId), reachOf(edge.targetId)),
    );
  }

  return ranked.sort((a, b) => b.hot - a.hot || a.id.localeCompare(b.id));
}

/**
 * A question is as close to the topic as whatever it clarifies. That may be an implied claim,
 * which sits beside the causal web rather than in it, so the question inherits the reach of the
 * thing whose score is being argued about.
 */
function reachOfClarified(
  doc: Doc,
  targetId: string,
  byId: Map<string, Node>,
  reachOf: (id: string) => number,
): number {
  const target = byId.get(targetId);
  const referentId = target?.impliedForId ?? targetId;
  const edge = doc.edges.find((e) => e.id === referentId);
  if (edge) return Math.max(reachOf(edge.sourceId), reachOf(edge.targetId));
  return reachOf(referentId);
}
