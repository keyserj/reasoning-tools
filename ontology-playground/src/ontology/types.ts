// Shared, ontology-agnostic data model and the contract every ontology implements.
// The UI shell only ever talks to these types + the registry, never to a concrete
// ontology (IBIS and the truth-and-relevance argument map today, "Contested Causal
// Diagrams" later).
//
// Node and edge types are strings rather than a fixed union: each ontology declares its
// own vocabulary (IBIS's question/idea/pro/con/note, a causal map's concept/action/
// criterion + causes/reduces/guides edges) via the tables below.
//
// `parse` produces the ontology's *own* model, and `toMermaid` flattens it into the shared
// `Graph` on the way out — see arg-map-truth-and-relevance/toGraph.ts, which turns edges
// into nodes because an edge there can be argued about like any other claim. Flattening sits
// on the render side because how a model is drawn is a rendering decision: it can depend on
// the features below, and an ontology whose model *is* a `Graph` simply hands it through.

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
  /** drawn on the connector; how an ontology says something about an edge without a box */
  label?: string;
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

/**
 * `doc` is the ontology's own model, opaque to the shell: it is only ever handed back to the
 * ontology that produced it (as `toMermaid`'s first argument), never inspected here.
 */
export interface ParseResult {
  doc: unknown;
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
  /**
   * Line color, emitted as a `linkStyle`. Unlike node styles this isn't in `StyleConfig`:
   * an edge type carries no fill or text color, so there'd be nothing for the style panel
   * to offer beyond the one swatch.
   */
  stroke?: string;
  /** Prefixed to a labeled edge's label when `showIcons` is on, as a node's icon is. */
  icon?: string;
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

// --- Features -------------------------------------------------------------------------
//
// A feature is a switchable rendering lens an ontology declares and the shell renders
// generically (see components/RenderingStrip.tsx): the shell knows nothing beyond these
// shapes, and only `toMermaid` gives an option meaning. That's what lets an ontology pose
// a rendering question as something you can answer by looking, rather than by rebuilding.
//
// Deliberately narrow for now — one option per feature, chosen from a fixed list — but the
// shape shouldn't have to break for what's coming: options derived from the document
// (perspectives) and multi-select (which perspectives to show) both fit by adding fields
// rather than by re-typing what's here.

export interface FeatureOption {
  id: string;
  /** short enough for a `<select>` sitting above the diagram */
  label: string;
  /** the full phrasing: shown in the feature panel and as the chip's tooltip */
  description?: string;
}

/** A secondary choice that only refines a feature, e.g. how much a labeled edge says. */
export interface FeatureParam {
  id: string;
  label: string;
  /** selects only for now */
  options: FeatureOption[];
  defaultOption: string;
  /** only meaningful while the feature sits on one of these options */
  onlyForOptions?: string[];
}

export interface FeatureDef {
  id: string;
  /** chip label, e.g. "Edge claims" */
  label: string;
  description: string;
  options: FeatureOption[];
  defaultOption: string;
  params?: FeatureParam[];
}

/** Which option each feature is on, plus its params. Keyed by feature id. */
export type FeatureState = Record<string, { option: string; params?: Record<string, string> }>;

export interface Ontology {
  id: string;
  label: string;
  parse: (text: string) => ParseResult;
  toMermaid: (doc: unknown, config: StyleConfig, features: FeatureState) => string;
  legend: LegendEntry[];
  /** Optional prose shown beneath the legend table. */
  legendNote?: string;
  renderedNodeTypes: NodeTypeDef[];
  renderedEdgeTypes: EdgeTypeDef[];
  /**
   * This ontology's writing of the shared examples (see ./examples.ts). Ids come from that
   * table; an ontology ships only the ones it can express. `examples[0]` is what loads by
   * default, so put the example that teaches the syntax first.
   */
  examples: OntologyExample[];
  /** Rendering lenses, rendered generically by the shell. Empty = no feature strip. */
  features: FeatureDef[];
  /** Placeholder shown in an empty editor, in this ontology's syntax. */
  placeholder: string;
  defaultConfig: StyleConfig;
}

export interface OntologyExample {
  /** an id from ./examples.ts */
  id: string;
  source: string;
}

/**
 * An ontology's own `parse`/`toMermaid` speak in its own model; the shell's `Ontology` says
 * `unknown`. This is the one place that gap is bridged, so every ontology module stays
 * cast-free. It is sound because the shell never inspects a doc — it hands the value from
 * `parse` straight back to the same ontology's `toMermaid`, which is the only function that
 * ever sees it.
 */
export function defineOntology<Doc>(
  spec: Omit<Ontology, "parse" | "toMermaid"> & {
    parse: (text: string) => { doc: Doc; errors: ParseError[] };
    toMermaid: (doc: Doc, config: StyleConfig, features: FeatureState) => string;
  },
): Ontology {
  return spec as Ontology;
}
