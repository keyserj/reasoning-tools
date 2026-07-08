import type { LegendEntry } from "../types.ts";
import { ICONS } from "./icons.ts";

export const legend: LegendEntry[] = [
  {
    marker: "?",
    label: "Question / Issue",
    meaning: "A question or issue to resolve.",
    icon: ICONS.question,
  },
  {
    marker: "=",
    label: "Idea / Position",
    meaning: "A possible answer to its parent question.",
    icon: ICONS.idea,
  },
  { marker: "+", label: "Pro", meaning: "An argument supporting its parent.", icon: ICONS.pro },
  { marker: "-", label: "Con", meaning: "An argument objecting to its parent.", icon: ICONS.con },
  { marker: "~", label: "Note", meaning: "A note shown attached to its parent.", icon: ICONS.note },
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
