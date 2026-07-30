import type { NodeTypeDef } from "../types.ts";

// The single place an IBIS node type is defined. Icons, mermaid shapes, style defaults,
// style-panel labels and the legend's type rows are all derived from this table, so
// adding a node type means editing exactly one place.
//
// Syntax (which marker produces which type) intentionally lives in ./parse.ts instead:
// markers are this ontology's syntax, not its semantics.
//
// Colors avoid a red-green pro/con pair, which is the one distinction a reader most needs and
// the hardest for the ~6% of men with deuteranomaly to make. They follow the same red/blue axis
// as ameliorate-v2's wireframes (`RB = { neg: "#b2182b", ..., pos: "#2166ac" }`) and the
// arg-map ontology, so the two ontologies are comparable on the same topic. `idea` takes the
// yellow that `note` used to hold: it suits the 💡 icon, and blue-vs-yellow is the second
// colorblind-safe axis, so ideas stay distinct from both pros and cons.
export const renderedNodeTypes: NodeTypeDef[] = [
  {
    id: "question",
    label: "Question / Issue",
    icon: "❓",
    description: "A question or issue to resolve.",
    shape: ['{{"', '"}}'],
    defaultStyle: { fill: "#ede9fe", stroke: "#7c3aed", color: "#2e1065" },
  },
  {
    id: "idea",
    label: "Idea / Position",
    icon: "💡",
    description: "A possible answer to its parent question.",
    shape: ['["', '"]'],
    defaultStyle: { fill: "#fef9c3", stroke: "#ca8a04", color: "#422006" },
  },
  {
    id: "pro",
    label: "Pro",
    icon: "✅",
    description: "An argument supporting its parent.",
    shape: ['["', '"]'],
    defaultStyle: { fill: "#e7f0ff", stroke: "#2166ac", color: "#1b4fa8" },
  },
  {
    id: "con",
    label: "Con",
    icon: "⛔",
    description: "An argument objecting to its parent.",
    shape: ['["', '"]'],
    defaultStyle: { fill: "#fdecea", stroke: "#b2182b", color: "#7f1d1d" },
  },
  {
    id: "note",
    label: "Note",
    icon: "📝",
    description: "A note shown attached to its parent.",
    shape: ['[/"', '"/]'],
    defaultStyle: { fill: "#f1f5f9", stroke: "#64748b", color: "#0f172a" },
  },
];

export const renderedNodeTypesById: Record<string, NodeTypeDef> = Object.fromEntries(
  renderedNodeTypes.map((t) => [t.id, t]),
);
