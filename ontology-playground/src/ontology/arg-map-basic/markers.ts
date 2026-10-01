// The parser and highlighter share these definitions so they agree on the syntax.

export type NodeType = "claim" | "support" | "critique";

/** Markers that create a node, mapped to the node type id they produce. */
export const MARKER_TO_TYPE: Record<string, NodeType | undefined> = {
  "=": "claim",
  "+": "support",
  "-": "critique",
};

/** Marker for a meta-comment: parsed but dropped from the diagram entirely. */
export const META_MARKER = "/";

/** Marker for a note: drawn in the diagram, but no part of Arg map: basic — see ../notes.ts. */
export const NOTE_MARKER = "~";

/** Indentation, which is how a line says what it belongs to. */
export const LEADING_WS = /^[ \t]*/;

/** A trailing `&id`, naming the node the line declares. */
export const ID_SUFFIX = /\s*&([A-Za-z0-9_]+)\s*$/;

/** A body that is only `$id`: a reference to an existing node instead of a new one. */
export const REF_BODY = /^\$([A-Za-z0-9_]+)$/;
