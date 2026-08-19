// Walking relations and multiplying their weights, which is the machinery nearly every derived
// view sits on: `ontology.md` prices a chain by multiplying normalized edge weights so that
// chained relations attenuate rather than compound.
//
// Signs matter and directions don't, which is the part worth getting right. `causes`, `reduces`
// and `impedes` are one relation written three ways, so a path's sign is the product of each
// step's - two reductions compose into an increase. Which way a step was *walked* changes
// nothing: "A causes B" asserts the same thing whether it was reached from A or from B.

import type { Doc, Edge } from "./model.ts";
import { type EdgeTypeName, edgeTypeDef } from "./markers.ts";
import { MAX_SCORE, UNSCORED_RELATION, averageMagnitude, averageOr, normalize } from "./scores.ts";

/** `ontology.md`'s causal core: the relations a "how does this move that" question follows. */
export const CAUSAL_TYPES: EdgeTypeName[] = ["causes", "reduces", "impedes"];

export interface Step {
  edge: Edge;
  /** the node this step arrived at */
  toId: string;
}

export interface Path {
  steps: Step[];
  /** where this path ended */
  toId: string;
}

export interface WalkOptions {
  types: EdgeTypeName[];
  /** `forward` follows the arrow, `backward` opposes it, `either` ignores it */
  direction?: "forward" | "backward" | "either";
  maxDepth?: number;
}

const DEFAULT_MAX_DEPTH = 6;

/**
 * Every simple path leading out of `fromId` - one entry per route, so a node reachable two ways
 * appears twice. Simple, meaning no node twice, so a cycle can't spin.
 *
 * The count is exponential in branching factor, which is fine for pulling apart one node's
 * neighbourhood and is not how to answer "how far apart are these two" - see {@link reachFrom},
 * which needs no enumeration.
 */
export function walk(doc: Doc, fromId: string, options: WalkOptions): Path[] {
  const { types, direction = "forward", maxDepth = DEFAULT_MAX_DEPTH } = options;
  const allowed = new Set<string>(types);
  const usable = doc.edges.filter((edge) => allowed.has(edge.type));
  const paths: Path[] = [];

  const extend = (currentId: string, steps: Step[], seen: Set<string>): void => {
    if (steps.length >= maxDepth) return;
    for (const edge of usable) {
      const forward = edge.sourceId === currentId;
      const backward = edge.targetId === currentId;
      if (forward && direction === "backward") continue;
      if (backward && direction === "forward") continue;
      if (!forward && !backward) continue;
      const nextId = forward ? edge.targetId : edge.sourceId;
      if (seen.has(nextId)) continue;
      const nextSteps = [...steps, { edge, toId: nextId }];
      paths.push({ steps: nextSteps, toId: nextId });
      seen.add(nextId);
      extend(nextId, nextSteps, seen);
      seen.delete(nextId);
    }
  };

  extend(fromId, [], new Set([fromId]));
  return paths;
}

/**
 * What one step contributes, as a -1..1 weight. `reduces[8]` and `causes[-8]` both come out at
 * -1, which is what makes the two spellings interchangeable.
 */
export function stepWeight(edge: Edge, fallback: number): number {
  const def = edgeTypeDef(edge.type);
  return normalize(averageOr(edge.scores, fallback)) * def.sign;
}

/** The path's weight: multiplied, so a longer chain says less than a shorter one. */
export function signedProduct(path: Path, fallback: number): number {
  return path.steps.reduce((total, step) => total * stepWeight(step.edge, fallback), 1);
}

/** The same, with direction thrown away - for "how much does this reach that". */
export function magnitudeProduct(path: Path, fallback: number): number {
  return path.steps.reduce((total, step) => total * stepMagnitude(step.edge, fallback), 1);
}

/** One step's 0..1 weight with direction discarded, which is what a distance multiplies. */
export function stepMagnitude(edge: Edge, fallback: number): number {
  return averageMagnitude(edge.scores, fallback) / MAX_SCORE;
}

/**
 * How strongly `fromId` reaches every node, as the best single route rather than a sum: this
 * answers "how close is this", and a second, weaker route doesn't make a thing closer. Summing
 * would also double-count exactly the way `ontology.md` warns duplicate edges do. Contributions
 * that genuinely add up - a node argued for along two chains - are summed at their own call site.
 *
 * Weights are at most 1, so extending a route can never strengthen it, and the best route can be
 * relaxed outward from the strongest node known so far. That takes no path enumeration, which
 * also means no depth cap: a long route that beats a short one is found rather than truncated.
 */
export function reachFrom(
  doc: Doc,
  fromId: string,
  options: WalkOptions,
  fallback = UNSCORED_RELATION,
): Map<string, number> {
  const { types, direction = "forward" } = options;
  const allowed = new Set<string>(types);
  const usable = doc.edges.filter((edge) => allowed.has(edge.type));
  const best = new Map<string, number>([[fromId, 1]]);
  const settled = new Set<string>();

  for (;;) {
    let current: string | undefined;
    let currentBest = 0;
    for (const [id, value] of best) {
      if (!settled.has(id) && value > currentBest) {
        current = id;
        currentBest = value;
      }
    }
    if (current === undefined) break;
    settled.add(current);

    for (const edge of usable) {
      const weight = stepMagnitude(edge, fallback);
      const reachable: string[] = [];
      if (edge.sourceId === current && direction !== "backward") reachable.push(edge.targetId);
      if (edge.targetId === current && direction !== "forward") reachable.push(edge.sourceId);
      for (const nextId of reachable) {
        const candidate = currentBest * weight;
        if (candidate > (best.get(nextId) ?? 0)) best.set(nextId, candidate);
      }
    }
  }

  return best;
}

/** {@link reachFrom} for a single destination. */
export function reach(
  doc: Doc,
  fromId: string,
  toId: string,
  options: WalkOptions,
  fallback = UNSCORED_RELATION,
): number {
  return reachFrom(doc, fromId, options, fallback).get(toId) ?? 0;
}

/**
 * How far everything sits from the topic - the one answer to "how much does this matter here",
 * so no view has to re-derive it and none of them can disagree.
 *
 * Relevance runs both ways along an edge. `ontology.md` leaves open whether an *incoming* edge
 * argues about a node's score; this isn't that question, since a cause of the topic is worth
 * reading about whether or not it also argues for a score, and following arrows only would
 * strand everything upstream of the topic.
 *
 * A criterion is then reached through whatever fulfils it, one step and never onward: two
 * options fulfilling the same criterion are being weighed against each other, not causally
 * connected, so routing through one would make every option look adjacent to every other. See
 * `UX-design.md`'s "how to scale scores by distance to topic node?".
 */
export function topicReach(doc: Doc, topicId: string): Map<string, number> {
  const reaches = reachFrom(doc, topicId, { types: CAUSAL_TYPES, direction: "either" });
  for (const edge of doc.edges) {
    if (edge.type !== "fulfils") continue;
    const candidate = (reaches.get(edge.sourceId) ?? 0) * stepMagnitude(edge, UNSCORED_RELATION);
    if (candidate > (reaches.get(edge.targetId) ?? 0)) reaches.set(edge.targetId, candidate);
  }
  return reaches;
}
