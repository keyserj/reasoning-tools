import type { LinkType } from "./markers.ts";
import type { Scores } from "./scores.ts";

// The ontology's own model, which is richer than the shared `Graph`: a link is a first-class
// thing with an id and a score, and a link's source or target may be *another link* (that's
// what a `= $some-link-id` block argues about). `Graph` can't express that, so ./toGraph.ts
// flattens this down to something mermaid can draw.

export interface Claim {
  id: string;
  text: string;
  /** `null` = nobody scored it (no brackets at all) */
  scores: Scores | null;
  line: number;
}

export interface Link {
  id: string;
  type: LinkType;
  /** id of a claim *or* of another link */
  sourceId: string;
  /** id of a claim *or* of another link */
  targetId: string;
  scores: Scores | null;
  line: number;
}

export interface Note {
  id: string;
  text: string;
  /** id of the claim or link this note hangs off */
  attachedTo: string;
  line: number;
}

export interface ArgDoc {
  /** `%description` — why the topic is being discussed */
  description?: string;
  /** `%perspectives` — whose scores appear, and in what order the slots are read */
  perspectives: string[];
  claims: Claim[];
  links: Link[];
  notes: Note[];
}
