import type { SourceLines } from "../types.ts";
import type { Note } from "../notes.ts";
import type { EdgeType } from "./markers.ts";
import type { Scores } from "./scores.ts";

// The ontology's own model, which is richer than the shared `RenderGraph`: an edge is a
// first-class thing with an id and a score, and an edge's source or target may be *another edge*
// (that's what a `= $some-edge-id` block argues about). `RenderGraph` can't express that, so
// ./toGraph.ts flattens this down to something mermaid can draw.
//
// Where a thing was written stays off the entities and rides on the doc instead — see
// ../pipeline.md.

export interface Claim {
  id: string;
  text: string;
  /** `null` = nobody scored it (no brackets at all) */
  scores: Scores | null;
  notes: Note[];
}

export interface Edge {
  id: string;
  type: EdgeType;
  /** id of a claim *or* of another edge */
  sourceId: string;
  /** id of a claim *or* of another edge */
  targetId: string;
  scores: Scores | null;
  notes: Note[];
}

export interface ArgDoc {
  /** `%description` — why the topic is being discussed */
  description?: string;
  /** `%perspectives` — whose scores appear, and in what order the slots are read */
  perspectives: string[];
  claims: Claim[];
  edges: Edge[];
  /** `~` lines with nothing above them: notes about the document rather than about a line. */
  notes: Note[];
  /** Where each of the above was written, by id; the `%` lines file under the topic's. */
  sourceLines: SourceLines;
}
