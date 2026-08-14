import type { FeatureState, StyleConfig, Theme } from "../types.ts";
import { flowchart } from "../mermaidFlowchart.ts";
import type { IbisDoc } from "./model.ts";
import { toGraph } from "./toGraph.ts";
import { renderedNodeTypesById } from "./renderedNodeTypes.ts";
import { DEFAULT_CONNECTOR, renderedEdgeTypesById } from "./renderedEdgeTypes.ts";

/**
 * Convert an {@link IbisDoc} into mermaid: flatten it into a {@link RenderGraph}, then run the
 * shared walk over it.
 *
 * IBIS declares no feature to vary that flattening by; the features argument is named only
 * because `theme` follows it.
 */
export function toMermaid(
  doc: IbisDoc,
  config: StyleConfig,
  _features: FeatureState,
  theme: Theme,
): string {
  return flowchart(
    toGraph(doc),
    config,
    { renderedNodeTypesById, renderedEdgeTypesById, defaultConnector: DEFAULT_CONNECTOR },
    theme,
  );
}
