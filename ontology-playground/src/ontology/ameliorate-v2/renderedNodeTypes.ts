import type { NodeTypeDef } from "../types.ts";
import { noteNodeType } from "../notes.ts";
import type { EdgeTypeName } from "./markers.ts";

export function relationType(type: EdgeTypeName): string {
  if (type === "supports" || type === "causes") return "positive-relation";
  if (type === "critiques" || type === "reduces" || type === "impedes") return "negative-relation";
  return "relation";
}

export const relationNodeTypes: NodeTypeDef[] = [
  {
    id: "positive-relation",
    label: "Positive relation",
    icon: "✅",
    description: "Supports or causes, colored by wording regardless of score signs.",
    shape: ['(["', '"])'],
    defaultColor: "#2166ac",
  },
  {
    id: "negative-relation",
    label: "Negative relation",
    icon: "⛔",
    description: "Critiques, reduces, or impedes, colored by wording regardless of score signs.",
    shape: ['(["', '"])'],
    defaultColor: "#b2182b",
  },
  {
    id: "relation",
    label: "Other relation",
    icon: "🔗",
    description: "Other relations in their written phrasing, with any written scores.",
    shape: ['(["', '"])'],
    defaultColor: "#64748b",
  },
];

export const renderedNodeTypes: NodeTypeDef[] = [
  {
    id: "concept",
    label: "Concept",
    icon: "🔎",
    description: "A thing or phenomenon, with its tags and relation-derived subtypes.",
    shape: ['("', '")'],
    defaultColor: "#2166ac",
  },
  {
    id: "question",
    label: "Question",
    icon: "❓",
    description: "A guiding or clarifying question.",
    shape: ['{"', '"}'],
    defaultColor: "#7c3aed",
  },
  {
    id: "claim",
    label: "Claim",
    icon: "💬",
    description: "An explicit claim or the implied claim behind a concept or relation's score.",
    shape: ['["', '"]'],
    defaultColor: "#d97706",
  },
  {
    id: "source",
    label: "Source",
    icon: "📄",
    description: "A source mentioning a claim.",
    shape: ['[["', '"]]'],
    defaultColor: "#7c3aed",
  },
  ...relationNodeTypes,
  noteNodeType,
  {
    id: "context",
    label: "Score context",
    icon: "📋",
    description: "The order of perspectives in each score row.",
    shape: ['["', '"]'],
    defaultColor: "#64748b",
  },
];

export const renderedNodeTypesById: Record<string, NodeTypeDef> = Object.fromEntries(
  renderedNodeTypes.map((type) => [type.id, type]),
);
