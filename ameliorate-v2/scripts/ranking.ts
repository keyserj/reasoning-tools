// What is worth looking at in a topic, ranked. `UX-design.md` asks two states for the same
// judgement - the agenda pane's Hottest Details and the structure pane's "top N nodes to the
// topic" - so the judgement is made once here and the two views differ only in what they filter
// and how many they take.
//
// This is a view-shaping question, not part of the ontology: `ontology.md` has no notion of a
// thing being "hot" or "controversial". What it does supply is every input - change importance,
// the spread between perspectives, and the causal distance a score is discounted by.

import { CAUSAL_TYPES, partReach, topicReach } from "./chains.ts";
import type { Doc, Edge } from "./model.ts";
import { findTopic } from "./model.ts";
import {
  MAX_SCORE,
  type Scores,
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
  /** 0..1: how much of a signal survives the distance to the topic */
  reach: number;
  /** 0..1: the reason to look at this, discounted by how far away it is */
  hot: number;
  /** every signal this scores on, strongest first */
  categories: Signal[];
}

const NO_SIGNALS: Record<Signal, number> = {
  "change-importance": 0,
  controversy: 0,
  unknown: 0,
};

/**
 * Below this the perspectives agree, and calling that "controversial" spends the word on nothing:
 * `[-8,-8,-6]` is a consensus. Written on the score's own 0..8 scale, so it reads as "at least a
 * couple of points apart". The other two signals need no floor - a small change importance is a
 * small amount of something, where a small deviation is the *absence* of controversy.
 */
const CONTROVERSY_FLOOR = 2 / MAX_SCORE;

function controversyOf(scores: Scores | null): number {
  const spread = deviation(scores) / MAX_SCORE;
  return spread < CONTROVERSY_FLOOR ? 0 : spread;
}

/**
 * One number out of several reasons to look at something, each of which would do on its own.
 *
 * A thing with a single signal keeps that signal's score, which matters because an edge only ever
 * has controversy and must still be able to top the list. Two middling reasons together beat one
 * strong-ish reason, which is the part `Math.max` couldn't say - and the case `UX-design.md`
 * cares about, since a contested *and* important concept is exactly what a reader should see.
 */
function combine(signals: Record<Signal, number>): number {
  return 1 - Object.values(signals).reduce((rest, signal) => rest * (1 - signal), 1);
}

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
  const ranked: Ranked[] = [];

  const add = (
    kind: "node" | "edge",
    id: string,
    signals: Partial<Record<Signal, number>>,
    reach: number,
  ): void => {
    const full = { ...NO_SIGNALS, ...signals };
    const hot = combine(full) * reach;
    if (hot === 0) return;
    const categories = (Object.keys(full) as Signal[])
      .filter((signal) => full[signal] > 0)
      .sort((a, b) => full[b] - full[a]);
    ranked.push({ kind, id, signals: full, reach, hot, categories });
  };

  for (const node of doc.nodes) {
    if (node.id === topic.id) continue;
    if (node.type === "concept") {
      add(
        "node",
        node.id,
        {
          "change-importance": averageMagnitude(node.scores, UNSCORED_CONCEPT) / MAX_SCORE,
          controversy: controversyOf(node.scores),
        },
        reachOf(node.id),
      );
    } else if (node.type === "question") {
      const clarifies = clarifiesBy.get(node.id);
      // a guiding question sets the agenda rather than marking a gap, and a clarifying question
      // that has been answered is no longer an unknown
      if (!clarifies || answered.has(node.id)) continue;
      // A question hanging over several things takes the most pressing of them - weight and
      // distance as one pair, since a strong doubt about something remote and a faint doubt about
      // the topic are different findings and the best of each would describe neither.
      let unknown = 0;
      let reach = 0;
      for (const edge of clarifies) {
        const weight = averageMagnitude(edge.scores, UNSCORED_RELATION) / MAX_SCORE;
        const at = reachOf(edge.targetId);
        if (weight * at > unknown * reach) {
          unknown = weight;
          reach = at;
        }
      }
      add("node", node.id, { unknown }, reach);
    }
  }

  for (const edge of doc.edges) {
    if (!CAUSAL_TYPES.includes(edge.type)) continue;
    add(
      "edge",
      edge.id,
      { controversy: controversyOf(edge.scores) },
      partReach(doc, edge.id, reaches),
    );
  }

  return ranked.sort((a, b) => b.hot - a.hot || a.id.localeCompare(b.id));
}
