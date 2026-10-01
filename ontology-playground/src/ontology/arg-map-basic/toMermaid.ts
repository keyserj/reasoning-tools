import type { FeatureState, MermaidOutput, StyleConfig, Theme } from "../types.ts";
import { flowchart } from "../mermaidFlowchart.ts";
import type { BasicArgDoc } from "./model.ts";
import { toGraph } from "./toGraph.ts";
import { renderedNodeTypesById } from "./renderedNodeTypes.ts";
import { renderedEdgeTypesById } from "./renderedEdgeTypes.ts";

/**
 * Convert an {@link BasicArgDoc} into mermaid: flatten it into a {@link RenderGraph}, then run the
 * shared walk over it.
 *
 * Arg map: basic declares no feature to vary that flattening by; the features argument is named only
 * because `theme` follows it.
 */
export function toMermaid(
  doc: BasicArgDoc,
  config: StyleConfig,
  _features: FeatureState,
  theme: Theme,
): MermaidOutput {
  return flowchart(toGraph(doc), config, { renderedNodeTypesById, renderedEdgeTypesById }, theme);
}
