import type { NodeTypeDef } from "../types.ts";
import { noteNodeType } from "../notes.ts";

// The single place a *rendered* node type is defined: icons, mermaid shapes, style defaults,
// style-panel labels and the legend's type rows all derive from this table. Syntax (which
// marker produces which type) lives in ./markers.ts instead.
//
// IBIS's four types plus `note`, which is the playground's rather than IBIS's — see ../notes.ts.
//
// One color per type, which the fill, border and text are derived from per theme
// (../typeColors.ts). Which color and which icon is argued in ./rendering.md.
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
    ...noteNodeType,
    description: "A note shown attached to its parent.",
  },
];

export const renderedNodeTypesById: Record<string, NodeTypeDef> = Object.fromEntries(
  renderedNodeTypes.map((t) => [t.id, t]),
);
