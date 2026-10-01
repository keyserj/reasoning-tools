import type { FeatureState, MermaidOutput, StyleConfig, Theme } from "../types.ts";
import { flowchart } from "../mermaidFlowchart.ts";
import type { Doc } from "./model.ts";
import { toGraph } from "./toGraph.ts";
import { renderedNodeTypesById } from "./renderedNodeTypes.ts";
import { renderedEdgeTypesById } from "./renderedEdgeTypes.ts";

export function toMermaid(
  doc: Doc,
  config: StyleConfig,
  features: FeatureState,
  theme: Theme,
): MermaidOutput {
  return flowchart(
    toGraph(doc, features),
    config,
    { renderedNodeTypesById, renderedEdgeTypesById },
    theme,
  );
}
