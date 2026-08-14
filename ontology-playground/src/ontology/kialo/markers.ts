// This ontology's syntax: which leading character starts which kind of line, and the shapes the
// rest of a line can take. Semantics (icons, shapes, colors, labels) live in
// ./renderedNodeTypes.ts instead. ./parse.ts and ./highlight.ts both read a line through these,
// so the two can't drift on what the syntax is.

/** What a line declares, keyed by the character it starts with. */
export const MARKER_TO_KIND: Record<string, LineKind | undefined> = {
  "?": "question",
  "=": "thesis",
  "+": "pro",
  "-": "con",
  "@": "source",
  "~": "note",
  "%": "property",
  "/": "meta",
};

export type LineKind =
  /** `?` — a discussion question, which only theses may nest under */
  | "question"
  /** `=` — a claim used as an answer, carrying its veracity */
  | "thesis"
  /** `+` / `-` — a claim supporting or critiquing the claim above, carrying its impact */
  | "pro"
  | "con"
  /** `@` — a source for the claim above */
  | "source"
  | "note"
  | "property"
  /** `/` — a comment about the document, dropped from the diagram entirely */
  | "meta";

export const EXPECTED_MARKERS = "? = + - @ ~ % /";

/** The two stances an argument can take; also the ids of the types they render as. */
export type Stance = "pro" | "con";

export function isStance(kind: LineKind): kind is Stance {
  return kind === "pro" || kind === "con";
}

/** Document-level `%key: value` properties recognized today. */
export const DESCRIPTION_KEY = "description";
export const PERSPECTIVES_KEY = "perspectives";

/** Indentation, which is how a line says what it belongs to. */
export const LEADING_WS = /^[ \t]*/;

// Ids are kebab-case here (`&ops-cost`), so `-` is part of the charset.

/** A trailing `&id`, naming the claim the line declares. */
export const ID_SUFFIX = /\s*&([A-Za-z0-9_-]+)\s*$/;

/** A body that is only `$id`: reusing a claim declared elsewhere. */
export const REF_BODY = /^\$([A-Za-z0-9_-]+)$/;

/** A `%key: value` line, split into its key and its value. */
export const PROPERTY = /^%([A-Za-z0-9_-]+)\s*:\s*(.*)$/;

/** A `@` line: a URL, then an optional label for it. */
export const SOURCE_BODY = /^(\S+)(?:\s+(.*))?$/;
