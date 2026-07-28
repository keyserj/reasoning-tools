import type { NodeTypeDef } from "../types.ts";

// The single place an IBIS node type is defined. Icons, mermaid shapes, style defaults,
// style-panel labels and the legend's type rows are all derived from this table, so
// adding a node type means editing exactly one place.
//
// Syntax (which marker produces which type) intentionally lives in ./parse.ts instead:
// markers are this ontology's syntax, not its semantics.
export const nodeTypes: NodeTypeDef[] = [
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
    defaultStyle: { fill: "#dbeafe", stroke: "#2563eb", color: "#0c1e3e" },
  },
  {
    id: "pro",
    label: "Pro",
    icon: "✅",
    description: "An argument supporting its parent.",
    shape: ['["', '"]'],
    defaultStyle: { fill: "#dcfce7", stroke: "#16a34a", color: "#052e16" },
  },
  {
    id: "con",
    label: "Con",
    icon: "⛔",
    description: "An argument objecting to its parent.",
    shape: ['["', '"]'],
    defaultStyle: { fill: "#fee2e2", stroke: "#dc2626", color: "#450a0a" },
  },
  {
    id: "note",
    label: "Note",
    icon: "📝",
    description: "A note shown attached to its parent.",
    shape: ['[/"', '"/]'],
    defaultStyle: { fill: "#fef9c3", stroke: "#ca8a04", color: "#422006" },
  },
];

export const nodeTypesById: Record<string, NodeTypeDef> = Object.fromEntries(
  nodeTypes.map((t) => [t.id, t]),
);
