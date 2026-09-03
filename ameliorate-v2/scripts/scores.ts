// The `[6,2,-]` score row: one slot per perspective, in `%perspectives` order.
//
// Slots are lexed against the widest range any score in this ontology uses. Which things may
// actually hold a negative is narrower and depends on what is being scored — a unipolar edge
// or a claim without an `%opposite` stays 0..8 — but a claim's `%opposite` is written on a
// child line, so that rule can only be applied once the whole document is read: ./validate.ts.

/** One score per perspective, in `%perspectives` order. `null` = that person didn't score it. */
export type Scores = (number | null)[];

export const MIN_SCORE = -8;
export const MAX_SCORE = 8;
const LEADING_BRACKET = /^\[([^\]]*)\]/;
const UNSCORED_SLOT = "-";
const INTEGER = /^-?\d+$/;

export interface TakeScoresResult {
  /** `null` when the text carried no brackets at all, i.e. nobody scored it. */
  scores: Scores | null;
  /** the input with the leading `[...]` removed */
  rest: string;
  messages: string[];
}

/**
 * Pull a leading `[6,2,-]` off `text`. Scores attach immediately after their marker
 * (`*[-4,0,-8]`, `causes[6,2,-]`), so only the very start of `text` is considered.
 */
export function takeScores(text: string): TakeScoresResult {
  const match = LEADING_BRACKET.exec(text);
  if (!match) {
    const messages = text.startsWith("[") ? ['Unclosed score bracket - expected a "]"'] : [];
    return { scores: null, rest: text, messages };
  }

  const messages: string[] = [];
  const body = match[1].trim();
  const rest = text.slice(match[0].length);
  if (body === "") {
    return { scores: [], rest, messages: ["Empty scores - expected e.g. [6,2,-]"] };
  }

  const scores: Scores = body.split(",").map((slot) => {
    const value = slot.trim();
    if (value === UNSCORED_SLOT) return null;
    if (!INTEGER.test(value)) {
      messages.push(`Score "${value}" is not a number ${MIN_SCORE}..${MAX_SCORE} or "-"`);
      return null;
    }
    const parsed = Number(value);
    if (parsed < MIN_SCORE || parsed > MAX_SCORE) {
      messages.push(`Score "${value}" is out of range ${MIN_SCORE}..${MAX_SCORE}`);
      return null;
    }
    return parsed;
  });

  return { scores, rest, messages };
}
