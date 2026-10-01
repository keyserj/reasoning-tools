import type { NodeTypeDef } from "../types.ts";
import { noteNodeType } from "../notes.ts";

// The diagram, editor, legend, and Style dialog all derive their type styling from this table.
export const renderedNodeTypes: NodeTypeDef[] = [
  {
    id: "claim",
    label: "Claim",
    icon: "💡",
    description: "A statement without a supporting or critical stance toward its parent.",
    shape: "rect",
    defaultColor: "#d97706",
  },
  {
    id: "support",
    label: "Support",
    icon: "✅",
    description: "An argument supporting its parent.",
    shape: "rect",
    defaultColor: "#2166ac",
  },
  {
    id: "critique",
    label: "Critique",
    icon: "⛔",
    description: "An argument objecting to its parent.",
    shape: "rect",
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
