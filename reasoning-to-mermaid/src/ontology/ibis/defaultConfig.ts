import type { StyleConfig } from "../types.ts";

// Default layout is bottom-to-top so parent questions sit at the top of the diagram
// while argument-map edges (child -> parent) point upward toward them.
export const defaultConfig: StyleConfig = {
  direction: "BT",
  showIcons: true,
  types: {
    question: { fill: "#ede9fe", stroke: "#7c3aed", color: "#2e1065" },
    idea: { fill: "#dbeafe", stroke: "#2563eb", color: "#0c1e3e" },
    pro: { fill: "#dcfce7", stroke: "#16a34a", color: "#052e16" },
    con: { fill: "#fee2e2", stroke: "#dc2626", color: "#450a0a" },
    note: { fill: "#fef9c3", stroke: "#ca8a04", color: "#422006" },
  },
};
