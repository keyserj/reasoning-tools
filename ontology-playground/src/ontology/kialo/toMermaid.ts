import type { FeatureState, StyleConfig, Theme } from "../types.ts";
import { flowchart } from "../mermaidFlowchart.ts";
import type { KialoDoc } from "./model.ts";
import { toGraph } from "./toGraph.ts";
import { renderedNodeTypesById } from "./renderedNodeTypes.ts";
import { DEFAULT_CONNECTOR, renderedEdgeTypesById } from "./renderedEdgeTypes.ts";

/**
 * Convert a {@link KialoDoc} + {@link StyleConfig} into a mermaid flowchart string.
 *
 * `showIcons` reaches ./toGraph.ts because a claim's sources are drawn as a 🔗 inside its text,
 * which is the one icon this ontology adds itself rather than leaving to the shared renderer.
 * The features argument is this ontology's unused one; `theme` is what the two after it are for.
 */
export function toMermaid(
  doc: KialoDoc,
  config: StyleConfig,
  _features: FeatureState,
  theme: Theme,
): string {
  return flowchart(
    toGraph(doc, config.showIcons),
    config,
    { renderedNodeTypesById, renderedEdgeTypesById, defaultConnector: DEFAULT_CONNECTOR },
    theme,
  );
}
