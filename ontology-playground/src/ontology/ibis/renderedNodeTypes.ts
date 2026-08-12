import type { NodeTypeDef } from "../types.ts";

// The single place an IBIS node type is defined. Icons, mermaid shapes, style defaults,
// style-panel labels and the legend's type rows are all derived from this table, so
// adding a node type means editing exactly one place.
//
// Syntax (which marker produces which type) intentionally lives in ./parse.ts instead:
// markers are this ontology's syntax, not its semantics.
//
// One color per type: the fill, border and text it's drawn in are derived from it, per theme
// (../typeColors.ts). Colors avoid a red-green pro/con pair, which is the one distinction a
// reader most needs and the hardest for the ~6% of men with deuteranomaly to make. They follow
// the same red/blue axis as ameliorate-v2's wireframes (`RB = { neg: "#b2182b", ..., pos:
// "#2166ac" }`) and the arg-map ontology, so the ontologies are comparable on the same topic.
// The warm end of the palette is shared with them too, and how it is divided is argued in
// ./rendering.md: `idea` amber, `note` sticky-note yellow. `question` is grey because a question
// is a prompt rather than something to take a position on.
export const renderedNodeTypes: NodeTypeDef[] = [
  {
    id: "question",
    label: "Question / Issue",
    icon: "❓",
    description: "A question or issue to resolve.",
    shape: ['{{"', '"}}'],
    defaultColor: "#71717a",
  },
  {
    id: "idea",
    label: "Idea / Position",
    icon: "💡",
    description: "A possible answer to its parent question.",
    shape: ['["', '"]'],
    defaultColor: "#d97706",
  },
  {
    id: "pro",
    label: "Pro",
    icon: "✅",
    description: "An argument supporting its parent.",
    shape: ['["', '"]'],
    defaultColor: "#2166ac",
  },
  {
    id: "con",
    label: "Con",
    icon: "⛔",
    description: "An argument objecting to its parent.",
    shape: ['["', '"]'],
    defaultColor: "#b2182b",
  },
  {
    id: "note",
    label: "Note",
    icon: "📝",
    description: "A note shown attached to its parent.",
    shape: ['[/"', '"/]'],
    defaultColor: "#d3ad20",
  },
];

export const renderedNodeTypesById: Record<string, NodeTypeDef> = Object.fromEntries(
  renderedNodeTypes.map((t) => [t.id, t]),
);
