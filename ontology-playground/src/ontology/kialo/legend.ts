import type { LegendEntry } from "../types.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";
import { MAX_SCORE, MIN_SCORE } from "./scores.ts";

// Which bit of syntax produces each node type. `claim` is absent on purpose: nothing writes a
// neutral box directly, it's what using a claim twice leaves behind, so its row shows no marker
// and the `$id` row below carries the consequence.
const markerByType: Record<string, string> = {
  question: "?",
  thesis: "=",
  pro: "+",
  con: "-",
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
    marker: "@url",
    label: "Source",
    meaning:
      "Evidence for the claim above. Shown as a 🔗 on that claim; add a label after the URL.",
    icon: "🔗",
  },
  {
    marker: "[3,1]",
    label: "Scores",
    meaning: `A thesis's veracity or a claim's impact, ${MIN_SCORE}-${MAX_SCORE}, one slot per perspective. Use - for unscored.`,
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
    meaning: "Give a claim an id so you can reuse it.",
    icon: "🏷️",
  },
  {
    marker: "$id",
    label: "Link",
    meaning:
      "Reuse an existing claim here. It keeps its own score in each spot. The box goes neutral unless the claim is also a thesis.",
    icon: "🔀",
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
