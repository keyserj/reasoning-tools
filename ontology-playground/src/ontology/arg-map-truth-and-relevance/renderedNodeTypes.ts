import type { NodeTypeDef } from "../types.ts";
import { noteNodeType } from "../notes.ts";

// The single place a *rendered* node type is defined: icons, mermaid shapes, style defaults,
// style-panel labels and the legend's type rows all derive from this table. Syntax (which
// marker produces which type) lives in ./markers.ts instead.
//
// These are deliberately not the ontology's semantic types — see ./ontology.md for those. A
// rendered type is whatever can end up as a box in the diagram, which here means: `claim` (the
// ontology's only real node type), `supports`/`critiques` (ontology *edge* types, which
// ./toGraph.ts reifies into nodes so they can be argued about), `note`, and `topic` (the header
// carrying `%description` and the `%perspectives` key).
//
// One color per type, which the fill, border and text are derived from per theme
// (../typeColors.ts). Which color and which icon is argued in ./rendering.md.
export const renderedNodeTypes: NodeTypeDef[] = [
  {
    id: "claim",
    label: "Claim",
    icon: "💬",
    description: "A statement phrased so a reader can say how much they believe it.",
    shape: ['["', '"]'],
    defaultColor: "#d97706",
  },
  {
    id: "supports",
    label: "Supports",
    icon: "✅",
    description: "An edge saying its source claim is a reason to believe its target.",
    shape: ['(["', '"])'],
    defaultColor: "#2166ac",
  },
  {
    id: "critiques",
    label: "Critiques",
    icon: "⛔",
    description: "An edge saying its source claim is a reason to doubt its target.",
    shape: ['(["', '"])'],
    defaultColor: "#b2182b",
  },
  {
    ...noteNodeType,
    description: "An aside attached to its parent. Drawn in the diagram, but never scored.",
  },
  {
    id: "topic",
    label: "Topic",
    icon: "📋",
    description: "The header box: what this topic is and why it's worth discussing.",
    shape: ['[["', '"]]'],
    defaultColor: "#7c3aed",
  },
];

export const renderedNodeTypesById: Record<string, NodeTypeDef> = Object.fromEntries(
  renderedNodeTypes.map((t) => [t.id, t]),
);
