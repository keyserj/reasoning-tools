// This ontology's syntax: which leading character starts which kind of line. Semantics
// (icons, shapes, colors, labels) live in ./renderedNodeTypes.ts instead.

/** What a line declares, keyed by the character it starts with. */
export const MARKER_TO_KIND: Record<string, LineKind | undefined> = {
  "=": "claim",
  "<": "edge-from-child",
  ">": "edge-to-child",
  "~": "note",
  "%": "property",
  "/": "meta",
};

export type LineKind =
  | "claim"
  /** `<` — the nested child is the edge's source, the parent line its target */
  | "edge-from-child"
  /** `>` — the parent line is the edge's source, the nested child its target */
  | "edge-to-child"
  | "note"
  | "property"
  /** `/` — a comment about the document, dropped from the diagram entirely */
  | "meta";

export const EXPECTED_MARKERS = "= < > ~ % /";

export const EDGE_TYPES = ["supports", "critiques"] as const;

export type EdgeType = (typeof EDGE_TYPES)[number];

export function isEdgeType(word: string): word is EdgeType {
  return (EDGE_TYPES as readonly string[]).includes(word);
}

/** Document-level `%key: value` properties recognized today. */
export const DESCRIPTION_KEY = "description";
export const PERSPECTIVES_KEY = "perspectives";
