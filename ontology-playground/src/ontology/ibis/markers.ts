// IBIS syntax: which leading marker produces which node type, and the shapes a line's body can
// take. This is the parser's business, kept separate from ./renderedNodeTypes.ts (semantics)
// because another ontology may not use single-character markers at all. ./parse.ts and
// ./highlight.ts both read a line through these, so the two can't drift on what the syntax is.

/** What a marker declares, which is IBIS's whole vocabulary — an edge adds nothing to it. */
export type NodeType = "question" | "idea" | "pro" | "con";

/** Markers that create a node, mapped to the node type id they produce. */
export const MARKER_TO_TYPE: Record<string, NodeType | undefined> = {
  "?": "question",
  "=": "idea",
  "+": "pro",
  "-": "con",
};

/** Marker for a meta-comment: parsed but dropped from the diagram entirely. */
export const META_MARKER = "/";

/** Marker for a note: drawn in the diagram, but no part of IBIS — see ../notes.ts. */
export const NOTE_MARKER = "~";

/** Indentation, which is how a line says what it belongs to. */
export const LEADING_WS = /^[ \t]*/;

/** A trailing `&id`, naming the node the line declares. */
export const ID_SUFFIX = /\s*&([A-Za-z0-9_]+)\s*$/;

/** A body that is only `$id`: a reference to an existing node instead of a new one. */
export const REF_BODY = /^\$([A-Za-z0-9_]+)$/;
