// Shared, ontology-agnostic types: the renderer's data model plus the contract every ontology
// implements. The UI shell only ever talks to these types + the registry, never to a concrete
// ontology (IBIS and the truth-and-relevance argument map today, "Contested Causal
// Diagrams" later).
//
// Node and edge types are strings rather than a fixed union: each ontology declares its
// own vocabulary (IBIS's question/idea/pro/con/note, a causal map's concept/action/
// criterion + causes/reduces/guides edges) via the tables below.
//
// `parse` produces the ontology's *own* semantic model, and `toMermaid` flattens it into a
// `RenderGraph` on the way out — see arg-map-truth-and-relevance/toGraph.ts, which turns edges
// into nodes because an edge there can be argued about like any other claim. Which layer may
// know what, and why the flattening sits on the render side, is ./pipeline.md's.

export interface RenderNode {
  id: string;
  type: string;
  text: string;
  /**
   * Draw this one box's border dashed. The only per-*node* styling there is: everything else a
   * box looks like comes from its type's row in `NodeTypeDef`, and this can't, because what it
   * marks (kialo's copy of a reused claim) crosses several types at once.
   */
  dashed?: boolean;
  /**
   * {@link SourceLines} for this box, its own first — where a click lands. A box whose
   * declaration is reused (`$ref`) also carries the reusing lines, so the caret on any of
   * them lights up every copy at once. Absent when the document didn't write it.
   */
  lines?: number[];
}

export interface RenderEdge {
  /** child / argument (the thing doing the supporting, objecting, answering) */
  from: string;
  /** parent / target (the thing being argued about) */
  to: string;
  /** id of one of the ontology's edge types */
  type: string;
  /** drawn on the connector; how an ontology says something about an edge without a box */
  label?: string;
  /** {@link SourceLines} for this connector, which is the line that says the two are related. */
  lines?: number[];
}

/**
 * Where each thing a document declares was written, per id, 1-based as `ParseError.line` is.
 * It rides on the doc rather than on the entities because a line number is a fact about the
 * *syntax* an entity was written in, not about what the entity means — see ./pipeline.md.
 */
export type SourceLines = Record<string, number[]>;

/** Drawn element → source lines, keyed by the id mermaid gives it in the SVG */
export interface SourceMap {
  /** mermaid node id — the `<id>` in the SVG's `flowchart-<id>-<n>` */
  nodes: Record<string, number[]>;
  /** the id emitted for the edge, which mermaid writes onto the path as `data-id` */
  edges: Record<string, number[]>;
}

/** The drawn document: mermaid to render, plus the way back from it to the text. */
export interface MermaidOutput {
  text: string;
  sourceMap: SourceMap;
}

/**
 * The renderer's projection of an ontology model. It holds only what `flowchart` needs to emit
 * Mermaid; an ontology's semantic model may preserve richer meaning before it reaches here.
 */
export interface RenderGraph {
  nodes: RenderNode[];
  edges: RenderEdge[];
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

export type Theme = "light" | "dark";

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
  /** `#rrggbb`; fill, border and text are derived from it — see ./typeColors.ts */
  defaultColor: string;
}

export interface EdgeTypeDef {
  id: string;
  /** mermaid connector, e.g. "-->" or "-.->" */
  connector: string;
  /**
   * Draw this connector in the color the document configures for that *node* type, derived per
   * theme like a node's border and emitted as a `linkStyle`. A connector and a box are two forms
   * of one concept wherever an ontology can render a type either way, so they read one entry in
   * `StyleConfig` and restyling that type moves both. Absent = the connector takes no color.
   */
  colorTypeId?: string;
  /** Prefixed to a labeled edge's label when `showIcons` is on, as a node's icon is. */
  icon?: string;
}

export interface StyleConfig {
  direction: LayoutDirection;
  showIcons: boolean;
  /** `#rrggbb` per node type id; how one becomes a fill, a border and a text color is
   * ./typeColors.ts's business, and depends on the theme the diagram is drawn in. */
  typeColors: Record<string, string>;
}

export interface LegendEntry {
  marker: string;
  label: string;
  meaning: string;
  icon: string;
}

// --- Syntax highlighting --------------------------------------------------------------
//
// The kinds are a fixed shell vocabulary: each ontology's tokenizer says which of them a
// stretch of text is, and src/index.css alone says how a kind is painted, so no ontology
// knows a color and the shell knows no ontology's words. `type` is the reason this exists —
// a marker is drawn in the color its rendered type carries in the document's `StyleConfig`,
// so the editor, the legend and the diagram can't disagree.
//
// `keyword` and `tag` are emitted by nobody today; they're the slots the Ameliorate syntax
// (multiword edge words, `#action` subtype tags) needs, kept here so adding it isn't a change
// to this contract.

export type HighlightKind =
  /** a marker or word that produces one of the ontology's rendered types */
  | "type"
  /** structural word with no type identity of its own */
  | "keyword"
  /** a whole meta-comment line */
  | "comment"
  /** `&id`: names the thing on this line */
  | "id-decl"
  /** `$id`: refers to something named elsewhere */
  | "id-ref"
  /** the `[`, `]` and `,` of a score bracket */
  | "score-punct"
  /** one score slot, digits or the unscored `-` */
  | "score-value"
  /** the `%key:` head of a property line; its value stays plain */
  | "property"
  /** a subtype tag, e.g. `#action` */
  | "tag";

export interface HighlightToken {
  text: string;
  /** absent = plain body text */
  kind?: HighlightKind;
  /** a `StyleConfig.typeColors` key; present exactly when `kind` is `"type"` */
  typeId?: string;
  /**
   * This marker is the only thing on its line carrying its type's color, so the color has one
   * glyph's worth of area to register in, and could use some help from an optional tint.
   * This suits the two current ontologies and is worth revisiting once there are more to keep
   * consistent.
   */
  loneMarker?: boolean;
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
  /**
   * `theme` decides how each type's one configured color becomes a fill, a border and a text
   * color (./typeColors.ts). It is an argument rather than a `StyleConfig` field because it
   * isn't part of the document: it's a local preference, and a document that carried one would
   * impose the sender's theme on everyone they share a link with.
   */
  toMermaid: (
    doc: unknown,
    config: StyleConfig,
    features: FeatureState,
    theme: Theme,
  ) => MermaidOutput;
  /**
   * Tokenize one line for the editor's highlight overlay. Line-local by contract: no state
   * carries between lines, since the overlay re-tokenizes only what changed. The tokens' texts
   * must concatenate back to `line` exactly — the overlay renders them in order and does no
   * index math of its own.
   */
  highlightLine: (line: string) => HighlightToken[];
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
    toMermaid: (
      doc: Doc,
      config: StyleConfig,
      features: FeatureState,
      theme: Theme,
    ) => MermaidOutput;
  },
): Ontology {
  return spec as Ontology;
}
