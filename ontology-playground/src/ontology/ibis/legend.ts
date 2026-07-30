import type { LegendEntry } from "../types.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";
import { MARKER_TO_TYPE } from "./markers.ts";

const markerByType: Record<string, string> = Object.fromEntries(
  Object.entries(MARKER_TO_TYPE).map(([marker, type]) => [type, marker]),
);

// Node-type rows come from the one table; the rest are syntax that produces no node.
const typeEntries: LegendEntry[] = renderedNodeTypes.map((t) => ({
  marker: markerByType[t.id] ?? "",
  label: t.label,
  meaning: t.description,
  icon: t.icon,
}));

const syntaxEntries: LegendEntry[] = [
  { marker: "/", label: "Meta-comment", meaning: "A comment hidden from the diagram.", icon: "🚫" },
  {
    marker: "&id",
    label: "Label",
    meaning: "Give a node an id so you can reference it.",
    icon: "🏷️",
  },
  {
    marker: "$id",
    label: "Reference",
    meaning: "Point at an existing node instead of making a new one.",
    icon: "🔗",
  },
  {
    marker: "⇥",
    label: "Indent",
    meaning: "Indent a line to nest it under the line above.",
    icon: "↳",
  },
];

export const legend: LegendEntry[] = [...typeEntries, ...syntaxEntries];
