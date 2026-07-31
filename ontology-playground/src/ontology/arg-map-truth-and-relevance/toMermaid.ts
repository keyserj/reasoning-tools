import type { FeatureState, StyleConfig } from "../types.ts";
import { flowchart } from "../mermaidFlowchart.ts";
import type { ArgDoc } from "./model.ts";
import { toGraph } from "./toGraph.ts";
import { renderedNodeTypesById } from "./renderedNodeTypes.ts";
import { DEFAULT_CONNECTOR, renderedEdgeTypesById } from "./renderedEdgeTypes.ts";

/**
 * Convert an {@link ArgDoc} into mermaid: flatten it into a {@link Graph} the way the
 * features ask for, then run the shared walk over it.
 */
export function toMermaid(doc: ArgDoc, config: StyleConfig, features: FeatureState): string {
  return flowchart(toGraph(doc, features), config, {
    renderedNodeTypesById,
    renderedEdgeTypesById,
    defaultConnector: DEFAULT_CONNECTOR,
  });
}
