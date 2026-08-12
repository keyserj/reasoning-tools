import type { NodeTypeDef } from "../types.ts";

// The single place a *rendered* node type is defined: icons, mermaid shapes, style defaults,
// style-panel labels and the legend's type rows all derive from this table. Syntax (which
// marker produces which type) lives in ./markers.ts instead.
//
// These are not the ontology's own types — see ontology.md for those, and rendering.md for how
// one becomes the other. `pro` and `con` are *placements* of a claim, drawn as boxes only where
// a claim has exactly one of them; `claim` is what a box falls back to when it can't carry one
// stance, which is a thesis or a claim placed twice. There is no `thesis` type for that reason.
// `topic` is the header carrying `%description` and the `%perspectives` key, without which a
// score row like [3,1] can't be decoded.
//
// One color per type: the fill, border and text it's drawn in are derived from it, per theme
// (../typeColors.ts). The palette is the one the other ontologies use, so the same topic stays
// comparable across lenses — `pro` blue and `con` red from ameliorate-v2's colorblind-safe
// `RB = { neg: "#b2182b", pos: "#2166ac" }`, `claim` amber and `note` yellow on the warm-band
// split argued in ../arg-map-truth-and-relevance/rendering.md, and `question` grey because a
// question is a prompt rather than something to take a position on.
//
// Icons carry the pro/con distinction by silhouette as well as by hue: ✅ against ⛔ reads as a
// check against a barred circle at the ~12px they render at, which is what separates them when
// color can't. Everything else takes an unrelated pictogram so nothing competes with that pair.
export const renderedNodeTypes: NodeTypeDef[] = [
  {
    id: "question",
    label: "Question",
    icon: "❓",
    description: "What the theses under it are competing answers to.",
    shape: ['{{"', '"}}'],
    defaultColor: "#71717a",
  },
  {
    id: "claim",
    label: "Claim",
    icon: "💬",
    description: "A thesis, or a claim placed in more than one spot — a box with no one stance.",
    shape: ['["', '"]'],
    defaultColor: "#d97706",
  },
  {
    id: "pro",
    label: "Pro",
    icon: "✅",
    description: "A claim placed as a reason to believe the claim above it.",
    shape: ['["', '"]'],
    defaultColor: "#2166ac",
  },
  {
    id: "con",
    label: "Con",
    icon: "⛔",
    description: "A claim placed as a reason to doubt the claim above it.",
    shape: ['["', '"]'],
    defaultColor: "#b2182b",
  },
  {
    id: "note",
    label: "Note",
    icon: "📝",
    description: "An aside attached to a claim. Drawn in the diagram, but never voted on.",
    shape: ['[/"', '"/]'],
    defaultColor: "#d3ad20",
  },
  {
    id: "topic",
    label: "Topic",
    icon: "📋",
    description: "The header box: what this discussion is and whose votes the slots are.",
    shape: ['[["', '"]]'],
    defaultColor: "#7c3aed",
  },
];

export const renderedNodeTypesById: Record<string, NodeTypeDef> = Object.fromEntries(
  renderedNodeTypes.map((t) => [t.id, t]),
);
