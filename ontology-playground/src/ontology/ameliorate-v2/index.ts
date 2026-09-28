import { defineOntology } from "../types.ts";
import { parse } from "./parse.ts";
import { toMermaid } from "./toMermaid.ts";
import { highlightLine } from "./highlight.ts";
import type { Doc } from "./model.ts";
import { legend } from "./legend.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";
import { renderedEdgeTypes } from "./renderedEdgeTypes.ts";
import { features } from "./features.ts";
import { defaultConfig } from "./defaultConfig.ts";
import sessionStorage from "./examples/session-storage.txt?raw";
import buildAWall from "../../../../ameliorate-v2/examples/build-a-wall.txt?raw";

const legendNote =
  "Scores stay with their written owner; arguments about an implied claim discuss that same score. Causal only shows causes, reduces, and impedes relations between concepts, so an argument-only example retains just its document notes and score context.";

const placeholder =
  "%perspectives: [you]\n*[6] Clean air &air #topic\n  < causes[5]\n    * Air filters #action";

export const ameliorateV2 = defineOntology<Doc>({
  id: "ameliorate-v2",
  label: "Ameliorate v2",
  parse,
  toMermaid,
  highlightLine,
  legend,
  legendNote,
  renderedNodeTypes,
  renderedEdgeTypes,
  examples: [
    { id: "session-storage", source: sessionStorage },
    { id: "build-a-wall", source: buildAWall },
  ],
  features,
  placeholder,
  defaultConfig,
});
