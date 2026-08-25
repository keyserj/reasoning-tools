// Walking relations and multiplying their weights, which is the machinery nearly every derived
// view sits on: `ontology.md` prices a chain by multiplying normalized edge weights so that
// chained relations attenuate rather than compound.
//
// Reversing a step doesn't reverse what it asserts. "A causes B" says the same thing whether it
// was reached from A or from B, so a route's sign is the product of its steps' own signs and
// owes nothing to which way each was walked - two reductions in a row compose into an increase.

import type { Doc, Edge } from "./model.ts";
import { type EdgeTypeDef, type EdgeTypeName, edgeTypeDef } from "./markers.ts";
import { MAX_SCORE, UNSCORED_RELATION, averageMagnitude, averageOr, normalize } from "./scores.ts";

/** `ontology.md`'s causal core: the relations a "how does this move that" question follows. */
export const CAUSAL_TYPES: EdgeTypeName[] = ["causes", "reduces", "impedes"];

/** How a claim hangs off the score it argues about, and off other claims. */
export const ARGUMENT_TYPES: EdgeTypeName[] = ["supports", "critiques"];

export interface Step {
  edge: Edge;
  /** where this step arrived, which is the edge's source when it was walked against the arrow */
  toId: string;
}

export interface Path {
  steps: Step[];
  toId: string;
}

export interface WalkOptions {
  types: EdgeTypeName[];
  /** `forward` follows the arrow, `backward` opposes it, `either` ignores it */
  direction?: "forward" | "backward" | "either";
  /** a route is abandoned once its strength falls below this - see {@link MIN_ROUTE_STRENGTH} */
  minStrength?: number;
}

/**
 * Where a route stops being worth following. Weights never exceed 1, so a route's strength only
 * falls, and a thousandth is already below what any view's rounding can show. Cutting on strength
 * rather than on length means a long strong chain is followed and a short dead one is not, which
 * is the opposite of what a depth cap does.
 */
export const MIN_ROUTE_STRENGTH = 0.001;

/**
 * Enumeration is exponential in branching factor, and {@link MIN_ROUTE_STRENGTH} only prunes a
 * document whose scores attenuate. Rather than truncate and return a quietly incomplete answer,
 * {@link walk} refuses: a wrong number nobody is told about is worse than a failed run.
 */
const MAX_ROUTES = 20_000;

/** Every simple path out of `fromId` - one entry per route, so a node reached two ways appears twice. */
export function walk(doc: Doc, fromId: string, options: WalkOptions): Path[] {
  const { types, direction = "forward", minStrength = MIN_ROUTE_STRENGTH } = options;
  const allowed = new Set<string>(types);
  const usable = doc.edges.filter((edge) => allowed.has(edge.type));
  const paths: Path[] = [];

  const extend = (currentId: string, steps: Step[], strength: number, seen: Set<string>): void => {
    for (const edge of usable) {
      const forward = edge.sourceId === currentId;
      const backward = edge.targetId === currentId;
      if (forward && direction === "backward") continue;
      if (backward && direction === "forward") continue;
      if (!forward && !backward) continue;
      const nextId = forward ? edge.targetId : edge.sourceId;
      if (seen.has(nextId)) continue;
      // Strength is the ceiling on what a route can be worth signed, since a step's magnitude
      // average is never below its signed average, so pruning on it can't cut a strong route.
      const nextStrength = strength * stepStrength(edge);
      if (nextStrength < minStrength) continue;
      if (paths.length >= MAX_ROUTES) {
        throw new Error(
          `Over ${MAX_ROUTES} routes out of "${fromId}" - raise minStrength or narrow types`,
        );
      }
      const nextSteps = [...steps, { edge, toId: nextId }];
      paths.push({ steps: nextSteps, toId: nextId });
      seen.add(nextId);
      extend(nextId, nextSteps, nextStrength, seen);
      seen.delete(nextId);
    }
  };

  extend(fromId, [], 1, new Set([fromId]));
  return paths;
}

/** `has` / `categorizes` / `criterion for` carry no belief, so there is no honest weight to give them. */
function weighable(edge: Edge): EdgeTypeDef {
  const def = edgeTypeDef(edge.type);
  if (!def.scoreable) throw new Error(`"${edge.type}" isn't scoreable, so it has no weight`);
  return def;
}

/**
 * What one step contributes, as a -1..1 weight. `reduces[8]` and `causes[-8]` both come out at
 * -1, which is what makes the two spellings interchangeable.
 */
export function stepWeight(edge: Edge): number {
  return normalize(averageOr(edge.scores, UNSCORED_RELATION)) * weighable(edge).sign;
}

/**
 * The same step's 0..1 strength. Not `Math.abs(stepWeight(...))`: the perspectives' magnitudes are
 * averaged rather than their signed scores, so this is at or above `|stepWeight|` and only equals
 * it when they agree on direction. `UX-design.md`'s "how to normalize scores?" has why.
 */
export function stepStrength(edge: Edge): number {
  weighable(edge);
  return averageMagnitude(edge.scores, UNSCORED_RELATION) / MAX_SCORE;
}

/** A route's -1..1 weight. Multiplied, so extending a route can never make it say more. */
export function pathWeight(path: Path): number {
  return path.steps.reduce((total, step) => total * stepWeight(step.edge), 1);
}

/** A route's 0..1 strength, on {@link stepStrength}'s reading of each step. */
export function pathStrength(path: Path): number {
  return path.steps.reduce((total, step) => total * stepStrength(step.edge), 1);
}

/**
 * How strongly `fromId` reaches every node, as the best single route rather than a sum: this
 * answers "how close is this", and a second, weaker route doesn't make a thing closer. Summing
 * would also double-count exactly the way `ontology.md` warns duplicate edges do. Contributions
 * that genuinely add up - a node argued for along two chains - are summed at their own call site.
 *
 * Since weights are at most 1, the best route to the strongest node known so far can't be beaten
 * later, so this settles nodes strongest-first and never enumerates a path.
 */
export function reachFrom(doc: Doc, fromId: string, options: WalkOptions): Map<string, number> {
  return spreadFrom(doc, new Map([[fromId, 1]]), options);
}

/** {@link reachFrom} from several starting points at once, each with its own starting strength. */
function spreadFrom(
  doc: Doc,
  seeds: Map<string, number>,
  options: WalkOptions,
): Map<string, number> {
  const { types, direction = "forward", minStrength = MIN_ROUTE_STRENGTH } = options;
  const allowed = new Set<string>(types);
  const usable = doc.edges.filter((edge) => allowed.has(edge.type));
  const best = new Map(seeds);
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
      const candidate = currentBest * stepStrength(edge);
      if (candidate < minStrength) continue;
      const reachable: string[] = [];
      if (edge.sourceId === current && direction !== "backward") reachable.push(edge.targetId);
      if (edge.targetId === current && direction !== "forward") reachable.push(edge.sourceId);
      for (const nextId of reachable) {
        if (candidate > (best.get(nextId) ?? 0)) best.set(nextId, candidate);
      }
    }
  }

  return best;
}

/**
 * How close one part - a node or an edge - sits, given a map that only holds nodes. An edge takes
 * its nearer end: the relation is equally visible from either side of itself, so the shorter way
 * to it is the one that counts.
 */
export function partReach(doc: Doc, id: string, reaches: Map<string, number>): number {
  const direct = reaches.get(id);
  if (direct !== undefined) return direct;
  const edge = doc.edges.find((other) => other.id === id);
  if (!edge) return 0;
  return Math.max(reaches.get(edge.sourceId) ?? 0, reaches.get(edge.targetId) ?? 0);
}

/**
 * How far everything sits from the topic - the one answer to "how much does this matter here",
 * so no view has to re-derive it and none of them can disagree. See `UX-design.md`'s "how to
 * scale scores by distance to topic node?" for what does and doesn't carry distance.
 *
 * Claims reach through the score they argue about rather than through the causal web: an implied
 * claim *is* its referent's score, so it sits exactly where the referent does, and the claims
 * arguing with it attenuate outward from there.
 */
export function topicReach(doc: Doc, topicId: string): Map<string, number> {
  const reaches = spreadFrom(doc, new Map([[topicId, 1]]), {
    types: CAUSAL_TYPES,
    direction: "either",
  });

  const claims = new Map<string, number>();
  for (const node of doc.nodes) {
    if (node.impliedForId === undefined) continue;
    claims.set(node.id, partReach(doc, node.impliedForId, reaches));
  }
  for (const [id, value] of spreadFrom(doc, claims, {
    types: ARGUMENT_TYPES,
    direction: "either",
  })) {
    if (value > (reaches.get(id) ?? 0)) reaches.set(id, value);
  }

  return reaches;
}
