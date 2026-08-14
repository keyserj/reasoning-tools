import type { Note } from "../notes.ts";
import type { Stance } from "./markers.ts";
import type { Scores } from "./scores.ts";

// The ontology's own model. Its shape is Kialo's two vote types: a claim is placed either as a
// thesis (answering a question, scored on **veracity**) or as an argument (a pro or con of
// another claim, scored on **impact**), and the score lives on the placement rather than on the
// claim. That is what lets one claim be placed twice and scored differently in each spot, which
// Kialo does and which ./ontology.md explains.
//
// Two relations rather than one because their rules differ and are worth stating: a thesis's
// parent is a question or nothing, an argument's parent is a claim, and neither can take the
// other's. A `Claim` is then pure content.
//
// Nothing here records where in the source a thing was written: line numbers are a fact about
// the syntax, and the only place they belong is `ParseError`.

/** Evidence for a claim. Follows the claim to every place it is placed, as it does in Kialo. */
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

/** A claim placed as an answer to a question, or as the root of a question-less document. */
export interface Thesis {
  id: string;
  claimId: string;
  /** `null` in a document with no `?` line, which is Kialo's single-thesis discussion */
  questionId: string | null;
  /** how true, on its own terms; `null` = nobody voted */
  veracity: Scores | null;
}

/** A claim placed as a pro or con of another claim. */
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
  /** `%perspectives` — whose votes appear, and in what order the slots are read */
  perspectives: string[];
  questions: Question[];
  claims: Claim[];
  theses: Thesis[];
  arguments: Argument[];
}

/** Where a claim sits, which is the unit both the score and the stance belong to. */
export type Placement = Thesis | Argument;

export function isArgument(placement: Placement): placement is Argument {
  return "stance" in placement;
}

export function isThesis(placement: Placement): placement is Thesis {
  return !isArgument(placement);
}

/** Every placement of each claim, keyed by claim id — what ./toGraph.ts decides a box from. */
export function placementsByClaim(doc: KialoDoc): Map<string, Placement[]> {
  const byClaim = new Map<string, Placement[]>();
  for (const placement of [...doc.theses, ...doc.arguments]) {
    const found = byClaim.get(placement.claimId);
    if (found) found.push(placement);
    else byClaim.set(placement.claimId, [placement]);
  }
  return byClaim;
}
