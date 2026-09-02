// This ontology's syntax: which leading character starts which kind of line, and what an edge
// line's opening words may say. `ontology.md`'s Example -> Context legend is the spec; this is
// that legend in code, and ./parse.ts reads every line through it.

import type { NodeType } from "./model.ts";

export const MARKER_TO_NODE_TYPE: Record<string, NodeType | undefined> = {
  "*": "concept",
  "?": "question",
  "=": "claim",
  "@": "source",
};

export const NODE_TYPE_TO_MARKER: Record<NodeType, string> = {
  concept: "*",
  question: "?",
  claim: "=",
  source: "@",
};

export type LineKind =
  | "node"
  /** `<` - the nested child is the edge's source, the parent line its target */
  | "edge-from-child"
  /** `>` - the parent line is the edge's source, the nested child its target */
  | "edge-to-child"
  | "note"
  | "property"
  /** `/` - a comment about the example itself, which never reaches the model */
  | "meta";

export const MARKER_TO_KIND: Record<string, LineKind | undefined> = {
  "*": "node",
  "?": "node",
  "=": "node",
  "@": "node",
  "<": "edge-from-child",
  ">": "edge-to-child",
  "~": "note",
  "%": "property",
  "/": "meta",
};

export const EXPECTED_MARKERS = "* ? = @ < > ~ % /";

/**
 * `causes` / `reduces` / `impedes` are three spellings of one relation, so each phrasing names
 * the `canonical` relation it belongs to and the `sign` it contributes: `reduces[8]` and
 * `causes[-8]` say the same thing. `opposite` is the phrasing a negative score reads as, and
 * having one is what makes a type bipolar (-8..8); the rest stay 0..8.
 */
export interface EdgeTypeDef {
  canonical: string;
  sign: 1 | -1;
  /** absent on a unipolar type, which has no meaningful opposite */
  opposite?: string;
  /** `ontology.md`: categorizes / has / criterion for don't take a score */
  scoreable: boolean;
  /** node types this may run `from` and `to`, per `ontology.md`'s Structure */
  from: readonly NodeType[];
  to: readonly NodeType[];
}

// The endpoint pairs, spread in below so each relation still reads as one line. A guiding
// question sets an agenda, so it points at a concept or at another guiding question; a
// clarifying question can hang off anything, including the implied claim behind an edge's score.
const CONCEPTS = { from: ["concept"], to: ["concept"] } as const;
const CLAIMS = { from: ["claim"], to: ["claim"] } as const;
const AGENDA = { from: ["question"], to: ["concept", "question"] } as const;
const ANYTHING = {
  from: ["question"],
  to: ["concept", "question", "claim", "source"],
} as const;

export const EDGE_TYPES = {
  causes: {
    canonical: "causes",
    sign: 1,
    opposite: "reduces",
    scoreable: true,
    ...CONCEPTS,
  },
  reduces: {
    canonical: "causes",
    sign: -1,
    opposite: "causes",
    scoreable: true,
    ...CONCEPTS,
  },
  impedes: {
    canonical: "causes",
    sign: -1,
    opposite: "causes",
    scoreable: true,
    ...CONCEPTS,
  },
  "positively correlates with": {
    canonical: "positively correlates with",
    sign: 1,
    opposite: "negatively correlates with",
    scoreable: true,
    ...CONCEPTS,
  },
  "negatively correlates with": {
    canonical: "positively correlates with",
    sign: -1,
    opposite: "positively correlates with",
    scoreable: true,
    ...CONCEPTS,
  },
  fulfills: {
    canonical: "fulfills",
    sign: 1,
    opposite: "works against",
    scoreable: true,
    ...CONCEPTS,
  },
  supports: {
    canonical: "supports",
    sign: 1,
    opposite: "critiques",
    scoreable: true,
    ...CLAIMS,
  },
  critiques: {
    canonical: "supports",
    sign: -1,
    opposite: "supports",
    scoreable: true,
    ...CLAIMS,
  },
  guides: { canonical: "guides", sign: 1, scoreable: true, ...AGENDA },
  clarifies: { canonical: "clarifies", sign: 1, scoreable: true, ...ANYTHING },
  answers: {
    canonical: "answers",
    sign: 1,
    scoreable: true,
    from: ["claim"],
    to: ["question"],
  },
  mentions: {
    canonical: "mentions",
    sign: 1,
    scoreable: true,
    from: ["source"],
    to: ["claim"],
  },
  categorizes: {
    canonical: "categorizes",
    sign: 1,
    scoreable: true,
    ...CONCEPTS,
  },
  has: { canonical: "has", sign: 1, scoreable: false, ...CONCEPTS },
  "criterion for": {
    canonical: "criterion for",
    sign: 1,
    scoreable: true,
    from: ["concept"],
    to: ["question"],
  },
} as const satisfies Record<string, EdgeTypeDef>;

export type EdgeTypeName = keyof typeof EDGE_TYPES;

/** Longest first, so `positively correlates with` wins over any shorter phrasing it starts with. */
const EDGE_TYPE_NAMES = (Object.keys(EDGE_TYPES) as EdgeTypeName[]).sort(
  (a, b) => b.length - a.length,
);

export function edgeTypeDef(name: EdgeTypeName): EdgeTypeDef {
  return EDGE_TYPES[name];
}

export function isBipolar(name: EdgeTypeName): boolean {
  return edgeTypeDef(name).opposite !== undefined;
}

/**
 * Read the edge type an edge line opens with. Types are multi-word here (`criterion for`), so
 * this can't be one word off the front the way a single-word syntax reads it.
 */
export function takeEdgeType(body: string): {
  type: EdgeTypeName | null;
  rest: string;
} {
  for (const name of EDGE_TYPE_NAMES) {
    if (!body.startsWith(name)) continue;
    const after = body[name.length];
    // a following letter means this is a longer word that merely starts the same way
    if (after !== undefined && /[A-Za-z]/.test(after)) continue;
    return { type: name, rest: body.slice(name.length) };
  }
  return { type: null, rest: body };
}

/** Document-level `%key: value` properties. */
export const PERSPECTIVES_KEY = "perspectives";
/** Node-level `%key: value` properties. */
export const DESCRIPTION_KEY = "description";
export const OPPOSITE_KEY = "opposite";

export const LEADING_WS = /^[ \t]*/;

export const PROPERTY = /^%([A-Za-z0-9_-]+)\s*:\s*(.*)$/;

// Both suffixes need whitespace in front of the marker, or text ending in "R&D" loses its tail
// to an id named D.
export const ID_SUFFIX = /(?:^|\s)&([A-Za-z0-9_-]+)\s*$/;

/** Only subtypes an edge can't imply are tagged; category/component/criterion come from relations. */
export const TAG_SUFFIX = /(?:^|\s)#([A-Za-z0-9_-]+)\s*$/;

export const REF_BODY = /^\$([A-Za-z0-9_-]+)$/;

/** Matches a body that starts `$id` but carries more, which a reference line may not. */
export const REF_HEAD = /^\$([A-Za-z0-9_-]+)/;
