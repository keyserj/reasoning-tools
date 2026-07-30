// This ontology's syntax: which leading character starts which kind of line. Semantics
// (icons, shapes, colors, labels) live in ./renderedNodeTypes.ts instead.

/** What a line declares, keyed by the character it starts with. */
export const MARKER_TO_KIND: Record<string, LineKind | undefined> = {
  "=": "claim",
  "<": "link-from-child",
  ">": "link-to-child",
  "~": "note",
  "%": "property",
  "/": "meta",
};

export type LineKind =
  | "claim"
  /** `<` — the nested child is the link's source, the parent line its target */
  | "link-from-child"
  /** `>` — the parent line is the link's source, the nested child its target */
  | "link-to-child"
  | "note"
  | "property"
  /** `/` — a comment about the document, dropped from the diagram entirely */
  | "meta";

export const EXPECTED_MARKERS = "= < > ~ % /";

export const LINK_TYPES = ["supports", "critiques"] as const;

export type LinkType = (typeof LINK_TYPES)[number];

export function isLinkType(word: string): word is LinkType {
  return (LINK_TYPES as readonly string[]).includes(word);
}

/** Document-level `%key: value` properties recognized today. */
export const DESCRIPTION_KEY = "description";
export const PERSPECTIVES_KEY = "perspectives";
