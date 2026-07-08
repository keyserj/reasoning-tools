// Shared, ontology-agnostic data model and the contract every ontology implements.
// The UI shell only ever talks to these types + the registry, never to a concrete
// ontology (IBIS today, "Contested Causal Diagrams" later).

export type NodeType = "question" | "idea" | "pro" | "con" | "note";

export interface GraphNode {
  id: string;
  type: NodeType;
  text: string;
}

export interface GraphEdge {
  /** child / argument (the thing doing the supporting, objecting, answering) */
  from: string;
  /** parent / target (the thing being argued about) */
  to: string;
  /** typed by the child's marker; "note" edges render dotted */
  type: NodeType;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ParseError {
  /** 1-based line number in the source */
  line: number;
  message: string;
}

export interface ParseResult {
  graph: Graph;
  errors: ParseError[];
}

export type LayoutDirection = "TB" | "BT" | "LR" | "RL";

export interface NodeTypeStyle {
  fill: string;
  stroke: string;
  /** text color */
  color: string;
}

export interface StyleConfig {
  direction: LayoutDirection;
  showIcons: boolean;
  types: Record<NodeType, NodeTypeStyle>;
}

export interface LegendEntry {
  marker: string;
  label: string;
  meaning: string;
  icon: string;
}

export interface Ontology {
  id: string;
  label: string;
  parse: (text: string) => ParseResult;
  toMermaid: (graph: Graph, config: StyleConfig) => string;
  legend: LegendEntry[];
  /** Optional prose shown beneath the legend table. */
  legendNote?: string;
  /** Human-readable label per node type, used by the style panel. */
  typeLabels: Record<NodeType, string>;
  sample: string;
  defaultConfig: StyleConfig;
}
