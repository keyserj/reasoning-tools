import { defineOntology } from "../types.ts";
import { parse } from "./parse.ts";
import { toGraph } from "./toGraph.ts";
import { highlightLine } from "./highlight.ts";
import type { RelevanceArgDoc } from "./model.ts";
import { legend } from "./legend.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";
import { renderedEdgeTypes } from "./renderedEdgeTypes.ts";
import { features } from "./features.ts";
import minimalDaylightSavings from "./examples/minimal-daylight-savings.txt?raw";
import sessionStorage from "./examples/session-storage.txt?raw";
import buildAWall from "./examples/build-a-wall.txt?raw";
import { defaultConfig } from "./defaultConfig.ts";

const legendNote =
  "Claims are the only node type; a supports/critiques edge makes a claim of its own, which the Edge claims feature draws as a labeled connector or as a box — nest a `< critiques` under a `= $edge-id` block to attack an edge's relevance rather than its claim. Every score is belief in some claim, 0-8.";

const placeholder =
  "%perspectives: [you]\n= Your thesis here &thesis\n  < supports[8]\n    = A reason to believe it";

export const relevanceArgumentMap = defineOntology<RelevanceArgDoc>({
  id: "relevance-argument-map",
  label: "Relevance argument map",
  parse,
  toGraph: (doc, _config, lens) => toGraph(doc, lens),
  highlightLine,
  legend,
  legendNote,
  renderedNodeTypes,
  renderedEdgeTypes,
  examples: [
    { id: "minimal-daylight-savings", source: minimalDaylightSavings },
    { id: "session-storage", source: sessionStorage },
    { id: "build-a-wall", source: buildAWall },
  ],
  features,
  placeholder,
  defaultConfig,
});
