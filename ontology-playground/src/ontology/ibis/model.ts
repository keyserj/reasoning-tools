import type { SourceLines } from "../types.ts";
import type { Note } from "../notes.ts";
import type { NodeType } from "./markers.ts";

// The ontology's own model. IBIS is nodes and one relation — a child responds to the parent it
// is nested under — and an edge carries nothing of its own: what kind of response it is follows
// from the child's type, so a `$ref` line's marker says nothing the referenced node doesn't
// already say. Giving an edge the type its connector is drawn from is therefore ./toGraph.ts's
// job rather than a fact to store here.
//
// A `~` note is not one of the four things IBIS names, so it hangs off a node rather than being
// one — see ../notes.ts, which every ontology here shares.
//
// Where a thing was written stays off the entities and rides on the doc instead — see
// ../pipeline.md.

export interface IbisNode {
  id: string;
  type: NodeType;
  text: string;
  notes: Note[];
}

export interface IbisEdge {
  /** its own, since a node can be answered in one place and `$ref`d under another */
  id: string;
  /** the responding child */
  from: string;
  /** what is being responded to */
  to: string;
}

export interface IbisDoc {
  nodes: IbisNode[];
  edges: IbisEdge[];
  /** `~` lines with nothing above them: notes about the document rather than about a node. */
  notes: Note[];
  /** Where each of the above was written, by id. */
  sourceLines: SourceLines;
}

/** IBIS's link vocabulary: what a child says to the parent it hangs under. */
export type EdgeType = "questions" | "respondsTo" | "supports" | "objectsTo";

/**
 * An edge's meaning read off the child it runs from — total, which is what "the edge carries no
 * information of its own" amounts to in code. ./toGraph.ts applies it; nothing stores the result.
 */
export const EDGE_TYPE_BY_NODE_TYPE: Record<NodeType, EdgeType> = {
  question: "questions", // asks something about what it hangs under
  idea: "respondsTo", // offers a possible answer to it
  pro: "supports", // argues for it
  con: "objectsTo", // argues against it
};
