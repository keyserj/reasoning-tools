import { defineOntology } from "../types.ts";
import { parse } from "./parse.ts";
import { toGraph } from "./toGraph.ts";
import { highlightLine } from "./highlight.ts";
import type { Doc } from "./model.ts";
import { legend } from "./legend.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";
import { renderedEdgeTypes } from "./renderedEdgeTypes.ts";
import { features } from "./features.ts";
import { defaultConfig } from "./defaultConfig.ts";
import minimalDaylightSavings from "./examples/minimal-daylight-savings.txt?raw";
import sessionStorage from "./examples/session-storage.txt?raw";
import buildAWall from "../../../../ameliorate-v2/examples/build-a-wall.txt?raw";

const description =
  "Centered around a cause-effect map. Most information is in nodes and edges, each of which can have its own Questions and also implies a Claim which can have its own argument map. Questions can be used to guide discussion or specify unknowns. A Question can have Criteria for evaluating trade-offs between competing answers. This ontology's main unique aspect is its intertwining of cause-effect mapping for understanding reality, with criteria for evaluating decisions, and with argument maps for specifying precise reasoning.";

const legendNote =
  "Scores stay with their written owner; arguments about an implied claim discuss that same score. Causal only shows causes, reduces, and impedes relations between concepts, so an argument-only example retains just its document notes and score context.";

const placeholder =
  "%perspectives: [you]\n*[6] Clean air &air #topic\n  < causes[5]\n    * Air filters #action";

export const ameliorateV2 = defineOntology<Doc>({
  id: "ameliorate-v2",
  label: "Ameliorate v2",
  description,
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
