// Hottest Details: which nodes and edges are worth a look, and which reason put each one there.
// `UX-design.md` -> Hottest Details owns the reasons and carries the worked example
// ./highlights.test.ts pins.
//
// The fourth signal, "Active", is hardcoded rather than calculated - see {@link Activity}.

import {
  DEFAULT_CONCEPT_SCORE,
  DEFAULT_EDGE_SCORE,
  average,
  controversy,
  normalizeForSorting,
} from "./aggregate.ts";
import type { Doc, Edge, Node } from "./model.ts";
import { isGuiding } from "./model.ts";

/** An item's signals are listed in this order. */
export const SIGNALS = ["change-importance", "controversy", "unknown", "active"] as const;

export type SignalName = (typeof SIGNALS)[number];

/** Each signal's strength, normalized to 0..1 so the signals compare directly. */
export type Signals = Record<SignalName, number>;

export interface Candidate {
  id: string;
  kind: "node" | "edge";
  signals: Signals;
}

/**
 * How active each node or edge is, 0..1. Hardcoded, because this prototype doesn't model comments
 * or edit history - the frequency and recency `UX-design.md` asks for have nothing to read.
 */
export type Activity = Record<string, number>;

const activeOf = (activity: Activity, id: string): number =>
  Math.min(1, Math.max(0, activity[id] ?? 0));

export interface Highlight extends Candidate {
  /** the signals that listed this item, which is what the section's pills filter on */
  categories: SignalName[];
  /** its strongest signal, which is what the combined list sorts by */
  hotness: number;
}

/** `UX-design.md` -> Hottest Details -> What: each signal contributes its top 5. */
const TOP_PER_SIGNAL = 5;

/**
 * Every node and edge that could be listed, with all four signals scored for each.
 *
 * An implied claim is left out: it and the thing it stands behind hold one score between them, so
 * listing both would say the same thing twice. An unscored edge stays in and scores 0, because
 * generate.ts needs a number for every node and edge in the bundle.
 */
export function candidates(doc: Doc, activity: Activity = {}): Candidate[] {
  const answered = new Set(
    doc.edges.filter((edge) => edge.type === "answers").map((edge) => edge.targetId),
  );
  const clarifiesBySource = new Map<string, Edge[]>();
  for (const edge of doc.edges) {
    if (edge.type !== "clarifies") continue;
    const existing = clarifiesBySource.get(edge.sourceId);
    if (existing) existing.push(edge);
    else clarifiesBySource.set(edge.sourceId, [edge]);
  }

  /**
   * A clarifying question asks for something nobody has established yet, so it stops being an
   * unknown once a claim answers it. Its `clarifies` score is how uncertain it says its subject
   * is, and the highest one wins when it clarifies several.
   */
  const unknown = (node: Node): number => {
    if (node.type !== "question" || isGuiding(node) || answered.has(node.id)) return 0;
    const clarifies = clarifiesBySource.get(node.id) ?? [];
    if (clarifies.length === 0) return 0;
    const strongest = Math.max(
      ...clarifies.map((edge) => average(edge.scores) ?? DEFAULT_EDGE_SCORE),
    );
    return normalizeForSorting(strongest);
  };

  const nodes: Candidate[] = doc.nodes
    .filter((node) => node.impliedForId === undefined)
    .map((node) => ({
      id: node.id,
      kind: "node",
      signals: {
        "change-importance":
          node.type === "concept"
            ? normalizeForSorting(average(node.scores) ?? DEFAULT_CONCEPT_SCORE)
            : 0,
        controversy: controversy(node.scores),
        unknown: unknown(node),
        active: activeOf(activity, node.id),
      },
    }));

  const edges: Candidate[] = doc.edges.map((edge) => ({
    id: edge.id,
    kind: "edge",
    signals: {
      "change-importance": 0,
      controversy: controversy(edge.scores),
      unknown: 0,
      active: activeOf(activity, edge.id),
    },
  }));

  return [...nodes, ...edges];
}

/**
 * The union of each signal's top 5, sorted by strongest signal. A signal contributes fewer than
 * five when fewer than five apply, since a 0 means the signal doesn't apply at all.
 *
 * Ties are broken by declaration order, which is what makes the generated bundle diffable.
 */
export function highlights(doc: Doc, activity: Activity = {}): Highlight[] {
  const all = candidates(doc, activity);
  const categories = new Map<string, SignalName[]>();

  for (const signal of SIGNALS) {
    const top = all
      .filter((candidate) => candidate.signals[signal] > 0)
      .toSorted((a, b) => b.signals[signal] - a.signals[signal])
      .slice(0, TOP_PER_SIGNAL);
    for (const candidate of top) {
      const listed = categories.get(candidate.id);
      if (listed) listed.push(signal);
      else categories.set(candidate.id, [signal]);
    }
  }

  return all
    .filter((candidate) => categories.has(candidate.id))
    .map((candidate) => ({
      ...candidate,
      categories: categories.get(candidate.id) ?? [],
      hotness: Math.max(...SIGNALS.map((signal) => candidate.signals[signal])),
    }))
    .toSorted((a, b) => b.hotness - a.hotness);
}
