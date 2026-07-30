// IBIS syntax: which leading marker produces which node type. This is the parser's
// business, kept separate from ./renderedNodeTypes.ts (semantics) because another ontology may
// not use single-character markers at all.

/** Markers that create a node, mapped to the node type id they produce. */
export const MARKER_TO_TYPE: Record<string, string> = {
  "?": "question",
  "=": "idea",
  "+": "pro",
  "-": "con",
  "~": "note",
};

/** Marker for a meta-comment: parsed but dropped from the diagram entirely. */
export const META_MARKER = "/";
