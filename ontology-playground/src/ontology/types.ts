// Shared, ontology-agnostic data model and the contract every ontology implements.
// The UI shell only ever talks to these types + the registry, never to a concrete
// ontology (IBIS and the truth-and-relevance argument map today, "Contested Causal
// Diagrams" later).
//
// Node and edge types are strings rather than a fixed union: each ontology declares its
// own vocabulary (IBIS's question/idea/pro/con/note, a causal map's concept/action/
// criterion + causes/reduces/guides edges) via the tables below.
//
// An ontology whose semantics don't fit a plain node-and-edge graph is expected to flatten
// them itself on the way out of `parse` — see arg-map-truth-and-relevance/toGraph.ts, which
// turns links into nodes because a link there can be argued about like any other claim.

export interface GraphNode {
  id: string;
  type: string;
  text: string;
}

export interface GraphEdge {
  /** child / argument (the thing doing the supporting, objecting, answering) */
  from: string;
  /** parent / target (the thing being argued about) */
  to: string;
  /** id of one of the ontology's edge types */
  type: string;
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

export const LAYOUT_DIRECTIONS = ["TB", "BT", "LR", "RL"] as const;

export type LayoutDirection = (typeof LAYOUT_DIRECTIONS)[number];

export interface NodeTypeStyle {
  fill: string;
  stroke: string;
  /** text color */
  color: string;
}

/** Everything an ontology declares about one of its node types, in one place. */
export interface NodeTypeDef {
  id: string;
  /** shown in the style panel and the legend */
  label: string;
  icon: string;
  /** legend prose */
  description: string;
  /** mermaid wrapping delimiters: [open, close]. Text goes between them, quoted. */
  shape: [string, string];
  defaultStyle: NodeTypeStyle;
}

export interface EdgeTypeDef {
  id: string;
  /** mermaid connector, e.g. "-->" or "-.->" */
  connector: string;
}

export interface StyleConfig {
  direction: LayoutDirection;
  showIcons: boolean;
  /** keyed by node type id */
  types: Record<string, NodeTypeStyle>;
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
  renderedNodeTypes: NodeTypeDef[];
  renderedEdgeTypes: EdgeTypeDef[];
  sample: string;
  /** Placeholder shown in an empty editor, in this ontology's syntax. */
  placeholder: string;
  defaultConfig: StyleConfig;
}
