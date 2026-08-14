import { type ScoreRange, type TakeScoresResult, takeScores as take } from "../scores.ts";

// Kialo votes on a 0..4 scale, and which of its two questions a number answers is decided by
// where it sits: a thesis carries **veracity** (how true, with nothing above it to be relevant
// to), a pro or con carries **impact**, which folds veracity and relevance to the parent into
// one number. See ./ontology.md. How a `[3,1]` row is lexed is shared, in ../scores.ts.

export const MIN_SCORE = 0;
export const MAX_SCORE = 4;

const RANGE: ScoreRange = { min: MIN_SCORE, max: MAX_SCORE };

export { type Scores, formatScores } from "../scores.ts";

/** {@link take} bound to this ontology's range. */
export function takeScores(text: string): TakeScoresResult {
  return take(text, RANGE);
}
