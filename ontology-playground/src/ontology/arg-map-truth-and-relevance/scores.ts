import { type ScoreRange, type TakeScoresResult, takeScores as take } from "../scores.ts";

// Every score in this ontology is belief in some claim on the same 0..8 scale — a claim's
// reads as "truth", an edge's as "relevance", purely because of what the edge's implied
// claim says. Nothing here distinguishes the two. How a `[6,-,8]` row is lexed is shared
// with the other scoring ontologies, in ../scores.ts.

export const MIN_SCORE = 0;
export const MAX_SCORE = 8;

const RANGE: ScoreRange = { min: MIN_SCORE, max: MAX_SCORE };

export { type Scores, LEADING_BRACKET, formatScores } from "../scores.ts";

/** {@link take} bound to this ontology's range. */
export function takeScores(text: string): TakeScoresResult {
  return take(text, RANGE);
}
