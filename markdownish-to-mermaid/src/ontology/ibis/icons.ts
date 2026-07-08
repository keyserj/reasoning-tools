import type { NodeType } from "../types.ts";

export const ICONS: Record<NodeType, string> = {
  question: "❓",
  idea: "💡",
  pro: "✅",
  con: "⛔",
  note: "📝",
};

/** Markers that create a node, mapped to the node type they produce. */
export const MARKER_TO_TYPE: Record<string, NodeType> = {
  "?": "question",
  "=": "idea",
  "+": "pro",
  "-": "con",
  "~": "note",
};

/** Marker for a meta-comment: parsed but dropped from the diagram entirely. */
export const META_MARKER = "/";
