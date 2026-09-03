// Combining several perspectives' scores into one number, and putting that number on the scale a
// calculation needs. `UX-design.md` -> Common calculations -> Score normalization owns which
// normalization belongs to which purpose; `ontology.md` -> Individual: Scores -> Notes owns the
// defaults.

import { MAX_SCORE, type Scores } from "./scores.ts";

/** A concept nobody scored is not important to change. */
export const DEFAULT_CONCEPT_SCORE = 0;
/** An edge nobody scored still relates its endpoints, so it reads as the 0..8 midpoint. */
export const DEFAULT_EDGE_SCORE = 4;

/** Half of a 0..8 range: the spread that counts as complete disagreement. */
const FULL_CONTROVERSY = 4;

const present = (scores: Scores | null): number[] =>
  scores === null ? [] : scores.filter((score): score is number => score !== null);

/**
 * Average of the perspectives that scored, or null when none did. A `-` is left out rather than
 * counted as a 0, so a person who hasn't scored yet doesn't drag the numbers down - see
 * `UX-design.md` -> Hottest Details -> Calculations -> Basic -> Questions - answered.
 */
export function average(scores: Scores | null): number | null {
  const values = present(scores);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Population (not sample) standard deviation, so one perspective reads as no disagreement rather
 * than a divide-by-zero.
 */
export function popStdDev(scores: Scores | null): number {
  const values = present(scores);
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** 0..1 by magnitude, so different score types can sort in one list. -8 and 8 are equally hot. */
export function normalizeForSorting(score: number): number {
  return Math.abs(score) / MAX_SCORE;
}

/** -1..1 keeping the sign, so `A causes B reduces C` multiplies out to A reducing C. */
export function normalizeForChaining(score: number): number {
  return score / MAX_SCORE;
}

/**
 * How much the perspectives disagree, 0..1. A -8..8 spread can exceed {@link FULL_CONTROVERSY},
 * and a range of 9-16 reads the same as a range of 8 - see `UX-design.md` -> Hottest Details ->
 * Notes.
 */
export function controversy(scores: Scores | null): number {
  return Math.min(1, popStdDev(scores) / FULL_CONTROVERSY);
}
