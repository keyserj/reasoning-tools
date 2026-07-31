import type { Graph, StyleConfig } from "../types.ts";
import { flowchart } from "../mermaidFlowchart.ts";
import { renderedNodeTypesById } from "./renderedNodeTypes.ts";
import { DEFAULT_CONNECTOR, renderedEdgeTypesById } from "./renderedEdgeTypes.ts";

/**
 * Convert an IBIS {@link Graph} + {@link StyleConfig} into a mermaid flowchart string.
 *
 * IBIS parses straight into a `Graph`, so there is nothing to flatten here and no feature
 * to vary it by — the argument the contract passes third is simply not taken.
 */
export function toMermaid(graph: Graph, config: StyleConfig): string {
  return flowchart(graph, config, {
    renderedNodeTypesById,
    renderedEdgeTypesById,
    defaultConnector: DEFAULT_CONNECTOR,
  });
}
