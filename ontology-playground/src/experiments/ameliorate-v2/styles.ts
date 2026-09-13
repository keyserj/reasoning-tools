import type { EdgeTypeDef, NodeTypeDef, StyleConfig } from "../../ontology/types.ts";
import { anchorEdgeType } from "../../ontology/anchoring.ts";
import { noteEdgeType, noteNodeType } from "../../ontology/notes.ts";
import type { FlowchartTables } from "../../ontology/mermaidFlowchart.ts";

export const nodeTypes: NodeTypeDef[] = [
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
  {
    id: "relation",
    label: "Relation",
    icon: "🔗",
    description: "A relation in its written phrasing, with any written scores.",
    shape: ['(["', '"])'],
    defaultColor: "#64748b",
  },
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

const edgeTypes: EdgeTypeDef[] = [
  { id: "relation", connector: "-->", colorTypeId: "relation" },
  { id: "half", connector: "---", colorTypeId: "relation" },
  noteEdgeType,
  anchorEdgeType,
];

export const tables: FlowchartTables = {
  renderedNodeTypesById: Object.fromEntries(nodeTypes.map((type) => [type.id, type])),
  renderedEdgeTypesById: Object.fromEntries(edgeTypes.map((type) => [type.id, type])),
  defaultConnector: "-->",
};

export const defaultConfig: StyleConfig = {
  direction: "BT",
  showIcons: true,
  typeColors: Object.fromEntries(nodeTypes.map((type) => [type.id, type.defaultColor])),
};
