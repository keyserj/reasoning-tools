import type { NodeTypeDef } from "../types.ts";
import { noteNodeType } from "../notes.ts";

// The single place a *rendered* node type is defined: icons, mermaid shapes, style defaults,
// style-panel labels and the legend's type rows all derive from this table. Syntax (which
// marker produces which type) lives in ./markers.ts instead.
//
// These are not the ontology's own types — see ./ontology.md for those, and ./rendering.md for
// how one becomes the other.
//
// One color per type, which the fill, border and text are derived from per theme
// (../typeColors.ts). Which color and which icon is argued in ./rendering.md.
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
    id: "thesis",
    label: "Thesis",
    icon: "💬",
    description: "An answer to the question above it, or the root of a question-less discussion.",
    shape: ['["', '"]'],
    defaultColor: "#d97706",
  },
  // Drawn exactly as a `thesis` on purpose because both are neutral. Can consider unique coloring
  // later.
  {
    id: "claim",
    label: "Claim",
    icon: "💬",
    description: "A claim reused in more than one spot, so its box can't take one stance.",
    shape: ['["', '"]'],
    defaultColor: "#d97706",
  },
  {
    id: "pro",
    label: "Pro",
    icon: "✅",
    description: "A reason to believe the claim above it.",
    shape: ['["', '"]'],
    defaultColor: "#2166ac",
  },
  {
    id: "con",
    label: "Con",
    icon: "⛔",
    description: "A reason to doubt the claim above it.",
    shape: ['["', '"]'],
    defaultColor: "#b2182b",
  },
  {
    ...noteNodeType,
    description: "An aside attached to a claim. Drawn in the diagram, but never voted on.",
  },
  {
    id: "topic",
    label: "Topic",
    icon: "📋",
    description: "The header box: what this discussion is and whose scores the slots are.",
    shape: ['[["', '"]]'],
    defaultColor: "#7c3aed",
  },
];

export const renderedNodeTypesById: Record<string, NodeTypeDef> = Object.fromEntries(
  renderedNodeTypes.map((t) => [t.id, t]),
);
