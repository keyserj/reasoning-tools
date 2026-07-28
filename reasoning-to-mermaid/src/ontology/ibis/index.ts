import type { NodeType, Ontology } from "../types.ts";
import { parse } from "./parse.ts";
import { toMermaid } from "./toMermaid.ts";
import { legend } from "./legend.ts";
import { sample } from "./sample.ts";
import { defaultConfig } from "./defaultConfig.ts";

const typeLabels: Record<NodeType, string> = {
  question: "Question",
  idea: "Idea",
  pro: "Pro",
  con: "Con",
  note: "Note",
};

const legendNote =
  "Indent a line to nest it under the line above. Edges point from a child up to the parent it supports, objects to, or answers.";

export const ibis: Ontology = {
  id: "ibis",
  label: "IBIS",
  parse,
  toMermaid,
  legend,
  legendNote,
  typeLabels,
  sample,
  defaultConfig,
};
