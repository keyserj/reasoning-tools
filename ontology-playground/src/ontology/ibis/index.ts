import { type Graph, defineOntology } from "../types.ts";
import { parse } from "./parse.ts";
import { toMermaid } from "./toMermaid.ts";
import { highlightLine } from "./highlight.ts";
import { legend } from "./legend.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";
import { renderedEdgeTypes } from "./renderedEdgeTypes.ts";
import sessionStorage from "./examples/session-storage.txt?raw";
import { defaultConfig } from "./defaultConfig.ts";

const legendNote =
  "Indent a line to nest it under the line above. Edges point from a child up to the parent it supports, objects to, or answers.";

const placeholder = "? Your question here &q1\n  = An idea &i1\n    + A pro\n    - A con";

export const ibis = defineOntology<Graph>({
  id: "ibis",
  label: "IBIS",
  parse,
  toMermaid,
  highlightLine,
  legend,
  legendNote,
  renderedNodeTypes,
  renderedEdgeTypes,
  examples: [{ id: "session-storage", source: sessionStorage }],
  // No rendering questions worth switching between yet, which is also the case the feature
  // strip has to degrade to: it renders nothing at all for an ontology with no features.
  features: [],
  placeholder,
  defaultConfig,
});
