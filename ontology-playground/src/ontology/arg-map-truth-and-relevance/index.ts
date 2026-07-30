import type { Ontology } from "../types.ts";
import { parse } from "./parse.ts";
import { toMermaid } from "./toMermaid.ts";
import { legend } from "./legend.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";
import { renderedEdgeTypes } from "./renderedEdgeTypes.ts";
import sample from "./example.txt?raw";
import { defaultConfig } from "./defaultConfig.ts";

const legendNote =
  "Claims are the only node type; supports/critiques links are drawn as boxes because a link is argued about like anything else — nest a `< critiques` under a `= $link-id` block to attack a link's relevance rather than its claim. Every score is belief in some claim, 0-8.";

const placeholder =
  "%perspectives: [you]\n= Your thesis here &thesis\n  < supports[8]\n    = A reason to believe it";

export const argMapTruthAndRelevance: Ontology = {
  id: "arg-map-truth-and-relevance",
  label: "Arg map: truth & relevance",
  parse,
  toMermaid,
  legend,
  legendNote,
  renderedNodeTypes,
  renderedEdgeTypes,
  sample,
  placeholder,
  defaultConfig,
};
