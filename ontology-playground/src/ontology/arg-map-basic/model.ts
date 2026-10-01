import type { SourceLines } from "../types.ts";
import type { Note } from "../notes.ts";
import type { NodeType } from "./markers.ts";

// Edge types follow their child, so only toGraph.ts derives them. Source positions stay on the
// document per ../pipeline.md, and notes use the playground's shared model in ../notes.ts.

export interface BasicArgNode {
  id: string;
  type: NodeType;
  text: string;
  notes: Note[];
}

export interface BasicArgEdge {
  /** its own, since a node can attach to multiple parents */
  id: string;
  /** the child */
  from: string;
  /** the parent */
  to: string;
}

export interface BasicArgDoc {
  nodes: BasicArgNode[];
  edges: BasicArgEdge[];
  /** `~` lines with nothing above them: notes about the document rather than about a node. */
  notes: Note[];
  /** Where each of the above was written, by id. */
  sourceLines: SourceLines;
}

export type EdgeType = "relatesTo" | "supports" | "critiques";

export const EDGE_TYPE_BY_NODE_TYPE: Record<NodeType, EdgeType> = {
  claim: "relatesTo",
  support: "supports",
  critique: "critiques",
};
