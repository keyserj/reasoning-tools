import type { Graph, StyleConfig } from "../types.ts";
import { flowchart } from "../mermaidFlowchart.ts";
import { renderedNodeTypesById } from "./renderedNodeTypes.ts";
import { DEFAULT_CONNECTOR, renderedEdgeTypesById } from "./renderedEdgeTypes.ts";

/** Convert a reified argument-map {@link Graph} + {@link StyleConfig} into mermaid. */
export function toMermaid(graph: Graph, config: StyleConfig): string {
  return flowchart(graph, config, {
    renderedNodeTypesById,
    renderedEdgeTypesById,
    defaultConnector: DEFAULT_CONNECTOR,
  });
}
