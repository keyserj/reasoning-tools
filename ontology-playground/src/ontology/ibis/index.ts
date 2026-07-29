import type { Ontology } from "../types.ts";
import { parse } from "./parse.ts";
import { toMermaid } from "./toMermaid.ts";
import { legend } from "./legend.ts";
import { nodeTypes } from "./nodeTypes.ts";
import { edgeTypes } from "./edgeTypes.ts";
import sample from "./example.txt?raw";
import { defaultConfig } from "./defaultConfig.ts";

const legendNote =
  "Indent a line to nest it under the line above. Edges point from a child up to the parent it supports, objects to, or answers.";

const placeholder = "? Your question here &q1\n  = An idea &i1\n    + A pro\n    - A con";

export const ibis: Ontology = {
  id: "ibis",
  label: "IBIS",
  parse,
  toMermaid,
  legend,
  legendNote,
  nodeTypes,
  edgeTypes,
  sample,
  placeholder,
  defaultConfig,
};
