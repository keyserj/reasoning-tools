import { defineOntology } from "../types.ts";
import { parse } from "./parse.ts";
import { toMermaid } from "./toMermaid.ts";
import type { ArgDoc } from "./model.ts";
import { legend } from "./legend.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";
import { renderedEdgeTypes } from "./renderedEdgeTypes.ts";
import { features } from "./features.ts";
import sessionStorage from "./examples/session-storage.txt?raw";
import buildAWall from "./examples/build-a-wall.txt?raw";
import { defaultConfig } from "./defaultConfig.ts";

const legendNote =
  "Claims are the only node type; a supports/critiques edge makes a claim of its own, which the Edge claims feature draws as a labeled connector or as a box — nest a `< critiques` under a `= $edge-id` block to attack an edge's relevance rather than its claim. Every score is belief in some claim, 0-8.";

const placeholder =
  "%perspectives: [you]\n= Your thesis here &thesis\n  < supports[8]\n    = A reason to believe it";

export const argMapTruthAndRelevance = defineOntology<ArgDoc>({
  id: "arg-map-truth-and-relevance",
  label: "Arg map: truth & relevance",
  parse,
  toMermaid,
  legend,
  legendNote,
  renderedNodeTypes,
  renderedEdgeTypes,
  // Session storage first: it's the minimal, syntax-teaching one, and it's the example IBIS
  // also ships, so both ontologies land on the same topic before anything is switched.
  examples: [
    { id: "session-storage", source: sessionStorage },
    { id: "build-a-wall", source: buildAWall },
  ],
  features,
  placeholder,
  defaultConfig,
});
