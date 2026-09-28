import type { LegendEntry } from "../types.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";

const markerByType: Record<string, string> = {
  concept: "*",
  question: "?",
  claim: "=",
  source: "@",
  relation: "causes, supports, …",
  note: "~",
  context: "%perspectives",
};

export const legend: LegendEntry[] = [
  ...renderedNodeTypes.map((type) => ({
    marker: markerByType[type.id],
    label: type.label,
    meaning: type.description,
    icon: type.icon,
  })),
  {
    marker: "<",
    label: "Relation from child",
    meaning: "The nested node is the source; the line above is the target.",
    icon: "⬆️",
  },
  {
    marker: ">",
    label: "Relation to child",
    meaning: "The line above is the source; the nested node is the target.",
    icon: "⬇️",
  },
  {
    marker: "[4,-2,-]",
    label: "Scores",
    meaning:
      "One score per perspective: importance, influence, fulfillment, or belief depending on the owner. Ranges are -8..8 or 0..8; - means unscored.",
    icon: "🔢",
  },
  {
    marker: "&id",
    label: "Label",
    meaning: "Give a node or relation an ID so it can be referenced.",
    icon: "🏷️",
  },
  {
    marker: "$id",
    label: "Reference",
    meaning:
      "Reuse a node with its own marker. = $id reuses a claim or refers to the implied claim behind a concept or scoreable relation.",
    icon: "🔗",
  },
  {
    marker: "#tag",
    label: "Subtype",
    meaning:
      "Explicit subtypes such as #topic, #action, or #guiding. Category, component, and criterion are derived from relations.",
    icon: "🏷️",
  },
  {
    marker: "%description",
    label: "Description",
    meaning: "A description nested under a concept, displayed in its box.",
    icon: "📝",
  },
  {
    marker: "%opposite",
    label: "Opposite",
    meaning: "Opposite wording nested under a concept or claim, displayed in its box.",
    icon: "↔️",
  },
  { marker: "/", label: "Meta-comment", meaning: "A comment hidden from the diagram.", icon: "🚫" },
  {
    marker: "⇥",
    label: "Indent",
    meaning: "Indent two spaces to nest a line under its parent.",
    icon: "↳",
  },
];
