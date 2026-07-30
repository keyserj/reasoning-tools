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
      "Belief in a claim (its truth) or in a link (its relevance), 0-8, one slot per perspective. Use - for unscored.",
    icon: "🔢",
  },
  {
    marker: "%perspectives",
    label: "Perspectives",
    meaning: "Whose scores appear, and the order the score slots are read in.",
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
    meaning:
      "Point at an existing claim, or at a link — which is how you argue about a link's relevance.",
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
