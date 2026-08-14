import type { Note } from "../notes.ts";
import type { Stance } from "./markers.ts";
import type { Scores } from "./scores.ts";

// The ontology's own model. Its shape is Kialo's two vote types: a thesis is a claim answering a
// question (or the root of a question-less discussion), scored on **veracity**; an argument is a
// pro supporting or a con critiquing another claim, scored on **impact**. The score belongs to
// the thesis or argument rather than to the claim, which is what lets one claim be reused and
// scored differently in each spot — as Kialo does, and as ./ontology.md explains.
//
// Two relations rather than one because their rules differ and are worth stating: a thesis's
// parent is a question or nothing, an argument's parent is a claim, and neither can take the
// other's. A `Claim` is then pure content.
//
// Nothing here records where in the source a thing was written: line numbers are a fact about
// the syntax, and the only place they belong is `ParseError`.

/** Evidence for a claim. Follows the claim to every usage of it, as it does in Kialo. */
export interface Source {
  url: string;
  /** the `@` line's text after the URL, if it gave one */
  label?: string;
}

export interface Claim {
  id: string;
  text: string;
  sources: Source[];
  notes: Note[];
}

export interface Question {
  id: string;
  text: string;
}

/** A claim used as an answer to a question, or as the root of a question-less document. */
export interface Thesis {
  id: string;
  claimId: string;
  /** `null` in a document with no `?` line, which is Kialo's single-thesis discussion */
  questionId: string | null;
  /**
   * how true, on its own terms; `null` = nobody voted.
   * 
   * This _could_ be on Claim, since it's unrelated to where the claim is used (unlike argument's
   * impact). BUT Kialo scores the thesis directly, so we're putting it here to match.
   */
  veracity: Scores | null;
}

/** A claim used to support or critique another claim. */
export interface Argument {
  id: string;
  claimId: string;
  parentClaimId: string;
  stance: Stance;
  /** veracity and relevance to the parent, folded into one number; `null` = nobody voted */
  impact: Scores | null;
}

export interface KialoDoc {
  /** `%description` — why the topic is being discussed */
  description?: string;
  /** `%perspectives` — whose scores appear, and in what order the slots are read */
  perspectives: string[];
  questions: Question[];
  claims: Claim[];
  theses: Thesis[];
  arguments: Argument[];
  /** `~` lines with no claim above them: notes about the document rather than about a claim. */
  notes: Note[];
}

/** One use of a claim, which is the unit both the score and the stance belong to. */
export type ClaimUsage = Thesis | Argument;

export function isArgument(usage: ClaimUsage): usage is Argument {
  return "stance" in usage;
}

export function isThesis(usage: ClaimUsage): usage is Thesis {
  return !isArgument(usage);
}

/** Every usage of each claim, keyed by claim id — what ./toGraph.ts decides a box from. */
export function usagesByClaim(doc: KialoDoc): Map<string, ClaimUsage[]> {
  const byClaim = new Map<string, ClaimUsage[]>();
  for (const usage of [...doc.theses, ...doc.arguments]) {
    const found = byClaim.get(usage.claimId);
    if (found) found.push(usage);
    else byClaim.set(usage.claimId, [usage]);
  }
  return byClaim;
}
