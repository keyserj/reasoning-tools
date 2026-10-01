import { defineOntology } from "../types.ts";
import { parse } from "./parse.ts";
import { toGraph } from "./toGraph.ts";
import type { BasicArgDoc } from "./model.ts";
import { highlightLine } from "./highlight.ts";
import { legend } from "./legend.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";
import { renderedEdgeTypes } from "./renderedEdgeTypes.ts";
import sessionStorage from "./examples/session-storage.txt?raw";
import { defaultConfig } from "./defaultConfig.ts";

const legendNote =
  "Indent a line to nest it under the line above. Edges point from child to parent. References keep the original node's type regardless of their marker.";

const placeholder = "= Your claim here &claim1\n  + A supporting argument\n  - A critique";

export const argMapBasic = defineOntology<BasicArgDoc>({
  id: "arg-map-basic",
  label: "Arg map: basic",
  parse,
  toGraph,
  highlightLine,
  legend,
  legendNote,
  renderedNodeTypes,
  renderedEdgeTypes,
  examples: [{ id: "session-storage", source: sessionStorage }],
  features: [],
  placeholder,
  defaultConfig,
});
