// This ontology's syntax: which leading character starts which kind of line, and the shapes the
// rest of a line can take. Semantics (icons, shapes, colors, labels) live in
// ./renderedNodeTypes.ts instead. ./parse.ts and ./highlight.ts both read a line through these,
// so the two can't drift on what the syntax is.

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

/** Indentation, which is how a line says what it belongs to. */
export const LEADING_WS = /^[ \t]*/;

// Ids are kebab-case here (`&wall-reduces`), so `-` is part of the charset.

/** A trailing `&id`, naming the claim or edge the line declares. */
export const ID_SUFFIX = /\s*&([A-Za-z0-9_-]+)\s*$/;

/** A body that is only `$id`: a reference to something declared elsewhere. */
export const REF_BODY = /^\$([A-Za-z0-9_-]+)$/;

/** A `%key: value` line, split into its key and its value. */
export const PROPERTY = /^%([A-Za-z0-9_-]+)\s*:\s*(.*)$/;

/** The word a `<` or `>` line opens with, which should name one of the {@link EDGE_TYPES}. */
export const EDGE_TYPE_HEAD = /^([A-Za-z]+)/;
