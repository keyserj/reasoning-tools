import { defineOntology } from "../types.ts";
import { parse } from "./parse.ts";
import { toGraph } from "./toGraph.ts";
import type { IbisDoc } from "./model.ts";
import { highlightLine } from "./highlight.ts";
import { legend } from "./legend.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";
import { renderedEdgeTypes } from "./renderedEdgeTypes.ts";
import minimalDaylightSavings from "./examples/minimal-daylight-savings.txt?raw";
import sessionStorage from "./examples/session-storage.txt?raw";
import { defaultConfig } from "./defaultConfig.ts";

const description =
  'Similar to the "Basic argument map" ontology, except that initial Claims are treated as responses to a Question. This is intended to allow modeling of discussions, rather than just modeling arguments. Questions can guide / provide context to a discussion, and can also specify clear unknowns. Another advantage is that Questions can be responded to with competing answers, which is not easily supported in a basic argument map.';

const legendNote =
  "Indent a line to nest it under the line above. Edges point from a child up to the parent it supports, objects to, or answers.";

const placeholder = "? Your question here &q1\n  = An idea &i1\n    + A pro\n    - A con";

export const ibis = defineOntology<IbisDoc>({
  id: "ibis",
  label: "IBIS",
  description,
  parse,
  toGraph,
  highlightLine,
  legend,
  legendNote,
  renderedNodeTypes,
  renderedEdgeTypes,
  examples: [
    { id: "minimal-daylight-savings", source: minimalDaylightSavings },
    { id: "session-storage", source: sessionStorage },
  ],
  // No rendering questions worth switching between yet.
  features: [],
  placeholder,
  defaultConfig,
});
