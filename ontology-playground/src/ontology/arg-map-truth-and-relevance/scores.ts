// Every score in this ontology is belief in some claim on the same 0..8 scale — a claim's
// reads as "truth", a link's as "relevance", purely because of what the link's implied
// claim says. Nothing here distinguishes the two.

export const MIN_SCORE = 0;
export const MAX_SCORE = 8;

/** One score per perspective, in `%perspectives` order. `null` = that person didn't score it. */
export type Scores = (number | null)[];

const LEADING_BRACKET = /^\[([^\]]*)\]/;
const UNSCORED_SLOT = "-";
const DIGITS = /^\d+$/;

export interface TakeScoresResult {
  /** `null` when the text carried no brackets at all, i.e. nobody scored it. */
  scores: Scores | null;
  /** the input with the leading `[...]` removed */
  rest: string;
  messages: string[];
}

/**
 * Pull a leading `[6,-,8]` off `text`. Scores attach immediately after their marker
 * (`=[4,1,8]`, `supports[6,2,-]`), so only the very start of `text` is considered.
 */
export function takeScores(text: string): TakeScoresResult {
  const match = LEADING_BRACKET.exec(text);
  if (!match) {
    const messages = text.startsWith("[") ? ['Unclosed score bracket — expected a "]"'] : [];
    return { scores: null, rest: text, messages };
  }

  const messages: string[] = [];
  const body = match[1].trim();
  const rest = text.slice(match[0].length);
  if (body === "") return { scores: [], rest, messages: ["Empty scores — expected e.g. [4,1,8]"] };

  const scores: Scores = body.split(",").map((slot) => {
    const value = slot.trim();
    if (value === UNSCORED_SLOT) return null;
    if (!DIGITS.test(value)) {
      messages.push(`Score "${value}" is not a number ${MIN_SCORE}-${MAX_SCORE} or "-"`);
      return null;
    }
    const parsed = Number(value);
    if (parsed < MIN_SCORE || parsed > MAX_SCORE) {
      messages.push(`Score "${value}" is out of range ${MIN_SCORE}-${MAX_SCORE}`);
      return null;
    }
    return parsed;
  });

  return { scores, rest, messages };
}

/** Render scores back into the `[6,-,8]` form used in labels. */
export function formatScores(scores: Scores): string {
  return `[${scores.map((s) => (s === null ? UNSCORED_SLOT : String(s))).join(",")}]`;
}
