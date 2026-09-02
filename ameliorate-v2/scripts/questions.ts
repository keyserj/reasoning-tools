// The Guiding Score: how strongly a question drives the topic, which is what ranks the agenda
// pane's Guiding Questions section. `UX-design.md` -> Guiding Questions -> Calculations owns the
// rule and carries the worked example ./questions.test.ts pins.

import { DEFAULT_EDGE_SCORE, average, normalizeForChaining } from "./aggregate.ts";
import type { Doc, Edge } from "./model.ts";
import { isGuiding, topicNode } from "./model.ts";

/** The only relations a Guiding Score path may run along, since they're the ones that carry an agenda. */
const AGENDA_TYPES = new Set<Edge["type"]>(["guides", "clarifies"]);

export interface GuidingQuestion {
  id: string;
  /** 0..1; 0 when no path from this question reaches the topic */
  score: number;
}

/**
 * Score every question tagged `#guiding`, strongest first. Every one is emitted, not just the
 * three the section shows, so the wireframe decides how many to render.
 */
export function guidingQuestions(doc: Doc): GuidingQuestion[] {
  return doc.nodes
    .filter(isGuiding)
    .map((node) => ({ id: node.id, score: guidingScore(node.id, doc) }))
    .toSorted((a, b) => b.score - a.score);
}

/**
 * Multiply the normalized agenda-edge scores along each path from the question to the topic and
 * take the best one. A path has to end with `guides` into the topic, so a question that only
 * guides some concept, or only clarifies the topic, scores 0.
 */
export function guidingScore(questionId: string, doc: Doc): number {
  const topic = topicNode(doc);
  if (topic === undefined) return 0;
  const outgoing = agendaEdgesBySource(doc);

  // `onPath` keeps a cycle from being walked forever. It's per-path rather than global, so a
  // question that sits on two paths is scored on each of them.
  const walk = (fromId: string, onPath: Set<string>): number => {
    let best = 0;
    for (const edge of outgoing.get(fromId) ?? []) {
      const weight = normalizeForChaining(average(edge.scores) ?? DEFAULT_EDGE_SCORE);
      if (edge.targetId === topic.id) {
        if (edge.type === "guides") best = Math.max(best, weight);
        continue;
      }
      if (onPath.has(edge.targetId)) continue;
      onPath.add(edge.targetId);
      best = Math.max(best, weight * walk(edge.targetId, onPath));
      onPath.delete(edge.targetId);
    }
    return best;
  };

  return walk(questionId, new Set([questionId]));
}

function agendaEdgesBySource(doc: Doc): Map<string, Edge[]> {
  const bySource = new Map<string, Edge[]>();
  for (const edge of doc.edges) {
    if (!AGENDA_TYPES.has(edge.type)) continue;
    const existing = bySource.get(edge.sourceId);
    if (existing) existing.push(edge);
    else bySource.set(edge.sourceId, [edge]);
  }
  return bySource;
}
