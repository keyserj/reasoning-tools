import type { NodeType } from "./markers.ts";

// The ontology's own model. IBIS is nodes and one relation — a child responds to the parent it
// is nested under — and an edge carries nothing of its own: what kind of response it is follows
// from the child's type, so a `$ref` line's marker says nothing the referenced node doesn't
// already say. Giving an edge the type its connector is drawn from is therefore ./toGraph.ts's
// job rather than a fact to store here.
//
// Nothing here records where in the source a thing was written: line numbers are a fact about
// the syntax, and the only place they belong is `ParseError`.

export interface IbisNode {
  id: string;
  type: NodeType;
  text: string;
}

export interface IbisEdge {
  /** the responding child */
  from: string;
  /** what is being responded to */
  to: string;
}

export interface IbisDoc {
  nodes: IbisNode[];
  edges: IbisEdge[];
}
