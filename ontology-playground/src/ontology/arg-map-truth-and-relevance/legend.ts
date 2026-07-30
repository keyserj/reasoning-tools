import type { LegendEntry } from "../types.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";

// Which bit of syntax produces each node type. Link types are named by keyword rather than by
// a leading character, since `<` and `>` only say which end the nested line is.
const markerByType: Record<string, string> = {
  claim: "=",
  supports: "supports",
  critiques: "critiques",
  note: "~",
  topic: "%description",
};

// Type rows come from the one table; the rest is syntax that produces no node of its own.
const typeEntries: LegendEntry[] = renderedNodeTypes.map((t) => ({
  marker: markerByType[t.id] ?? "",
  label: t.label,
  meaning: t.description,
  icon: t.icon,
}));

const syntaxEntries: LegendEntry[] = [
  {
    marker: "<",
    label: "Link from child",
    meaning: "The nested claim is the link's source; the line above is its target.",
    icon: "⬆️",
  },
  {
    marker: ">",
    label: "Link to child",
    meaning: "The line above is the link's source; the nested claim is its target.",
    icon: "⬇️",
  },
  {
    marker: "[4,1,8]",
    label: "Scores",
    meaning:
      "How strongly each perspective believes this line, 0-8 — a claim's truth, a link's relevance. Use - for unscored.",
    icon: "🔢",
  },
  {
    marker: "%perspectives",
    label: "Perspectives",
    meaning: "Who the score slots belong to, in the order they're written.",
    icon: "👥",
  },
  {
    marker: "&id",
    label: "Label",
    meaning: "Give a claim or link an id so you can reference it.",
    icon: "🏷️",
  },
  {
    marker: "$id",
    label: "Reference",
    meaning: "Reuse an existing claim, or point at a link to argue about the link itself.",
    icon: "🔗",
  },
  { marker: "/", label: "Meta-comment", meaning: "A comment hidden from the diagram.", icon: "🚫" },
  {
    marker: "⇥",
    label: "Indent",
    meaning: "Indent a line to nest it under the line above.",
    icon: "↳",
  },
];

export const legend: LegendEntry[] = [...typeEntries, ...syntaxEntries];
