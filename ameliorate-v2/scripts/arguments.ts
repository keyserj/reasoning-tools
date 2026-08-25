// Pros and cons, calculated rather than written down.
//
// `ontology.md`'s Calculated arguments: what a node causes and reduces, weighed against how each
// of those is scored, already *is* the argument about it - "the wall costs billions" needs no
// claim, because `wall causes wall-cost` plus `wall-cost`'s negative score says it. The decisions
// behind which relations count, and why paths add, are recorded there.

import { CAUSAL_TYPES, pathWeight, walk } from "./chains.ts";
import type { Doc } from "./model.ts";
import { UNSCORED_CONCEPT, averageOr, normalize } from "./scores.ts";

export interface CalculatedArgument {
  /** the scored concept that makes this an argument */
  aboutId: string;
  /** what the subject does to it, once every path between them is combined */
  effect: "increases" | "decreases";
  /** a sum over paths, so it has no ceiling: two mechanisms onto one outcome argue twice as hard */
  strength: number;
}

export interface CalculatedArguments {
  /** it causes something wanted, or reduces something unwanted */
  pros: CalculatedArgument[];
  cons: CalculatedArgument[];
}

const downstream = { types: CAUSAL_TYPES, direction: "forward" } as const;

/**
 * Everything `subjectId` causally reaches, sorted into arguments for and against it. Only edge
 * weights compound along the way; the score that decides pro from con is the one at the far end.
 *
 * Bounded by `walk`'s strength floor rather than by a chain length, so distance costs an argument
 * nothing beyond the attenuation the scores already impose.
 */
export function calculatedArguments(doc: Doc, subjectId: string): CalculatedArguments {
  const byId = new Map(doc.nodes.map((node) => [node.id, node]));
  const effects = new Map<string, number>();

  for (const path of walk(doc, subjectId, downstream)) {
    const target = byId.get(path.toId);
    if (target?.type !== "concept") continue;
    effects.set(path.toId, (effects.get(path.toId) ?? 0) + pathWeight(path));
  }

  const pros: CalculatedArgument[] = [];
  const cons: CalculatedArgument[] = [];
  for (const [aboutId, effect] of effects) {
    const scores = byId.get(aboutId)?.scores ?? null;
    const weight = effect * normalize(averageOr(scores, UNSCORED_CONCEPT));
    // Nothing to argue about when the far end cancels out - which also swallows the case where
    // the perspectives disagree so completely that they average to zero. Group-average scoring
    // can't say "a pro for alice, a con for casey"; per-perspective arguments would.
    if (weight === 0) continue;
    const argument: CalculatedArgument = {
      aboutId,
      effect: effect > 0 ? "increases" : "decreases",
      strength: Math.abs(weight),
    };
    (weight > 0 ? pros : cons).push(argument);
  }

  const strongestFirst = (a: CalculatedArgument, b: CalculatedArgument): number =>
    b.strength - a.strength || a.aboutId.localeCompare(b.aboutId);
  return { pros: pros.sort(strongestFirst), cons: cons.sort(strongestFirst) };
}
