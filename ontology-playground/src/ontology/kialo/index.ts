import { defineOntology } from "../types.ts";
import { parse } from "./parse.ts";
import { toGraph } from "./toGraph.ts";
import { highlightLine } from "./highlight.ts";
import type { KialoDoc } from "./model.ts";
import { legend } from "./legend.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";
import { renderedEdgeTypes } from "./renderedEdgeTypes.ts";
import minimalDaylightSavings from "./examples/minimal-daylight-savings.txt?raw";
import sessionStorage from "./examples/session-storage.txt?raw";
import buildAWall from "./examples/build-a-wall.txt?raw";
import { defaultConfig } from "./defaultConfig.ts";

const description =
  'Similar to the "IBIS" ontology, except that Questions can only be used at the root. This makes the ontology more about representing an argument than a discussion, but with the advantage of being able to represent competing answers.';

const legendNote =
  "Every claim is a pro or con of the claim above it, and its score is impact — how true it is and how much it bears on that parent, in one number 0-4. The score for a thesis is veracity, and the score for an argument is impact.";

const placeholder =
  "%perspectives: [you]\n=[3] Your thesis here &thesis\n  +[4] A reason to believe it\n  -[2] A reason to doubt it";

export const kialo = defineOntology<KialoDoc>({
  id: "kialo",
  label: "Kialo",
  description,
  parse,
  toGraph: (doc, config) => toGraph(doc, config.showIcons),
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
  // Nothing here poses a rendering question worth switching between — how a reused claim is
  // drawn is settled in ./rendering.md, not offered as a lens.
  features: [],
  placeholder,
  defaultConfig,
});
