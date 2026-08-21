import type {
  EdgeTypeDef,
  MermaidOutput,
  NodeTypeDef,
  RenderGraph,
  SourceMap,
  StyleConfig,
  Theme,
} from "./types.ts";
import { RESERVED_ID_PREFIX, idTable } from "./ids.ts";
import { deriveTypeStyle } from "./typeColors.ts";

// Shared mermaid-flowchart renderer. Every ontology's `toMermaid` is the same walk over
// nodes and edges; only the lookup tables differ, so they live in the ontology and the
// walk lives here.
//
// A node's `text` may contain newlines: they become `<br/>`, which is how an ontology
// puts a second line (scores, say) into a label without this file knowing what it means.

const FALLBACK_SHAPE: [string, string] = ['["', '"]'];

/**
 * `RenderNode.dashed` rides on a second class rather than on the node's `:::type`, since a node
 * may only name one there. Mermaid appends both to the same list and concatenates their styles,
 * so the type's fill and stroke survive and only the dash is added. The dasharray is
 * space-separated because `classDef` splits its style list on commas — see ./typeColors.ts.
 */
const DASHED_CLASS = "dashed";

export interface FlowchartTables {
  renderedNodeTypesById: Record<string, NodeTypeDef>;
  renderedEdgeTypesById: Record<string, EdgeTypeDef>;
  defaultConnector: string;
}

/**
 * Escape text for use inside a mermaid quoted label.
 *
 * Labels render as HTML (`flowchart.htmlLabels`), so unescaped markup in a node's text
 * renders as markup. Two reasons that matters, and the second is the load-bearing one:
 *
 * 1. Fidelity: someone writing `R&D` or `&lt;b&gt;` in a node should see what they typed.
 * 2. Documents arrive from other people, as a whole `ShareState` in the URL hash (see
 *    ../share/url.ts), so node text is untrusted. Before this escaping, a link you were
 *    sent could put `<img src=https://attacker.example/pixel.png>` in a node and your
 *    browser would fetch it on load — an IP/user-agent beacon firing with no interaction,
 *    from a diagram that looks ordinary. Styled `<div>`s could likewise overlay the
 *    diagram with content that isn't in the document.
 *
 * This is not the XSS defense: mermaid's `securityLevel: "strict"` (see ../../mermaidClient.ts)
 * DOMPurifies away scripts, event handlers, `javascript:` hrefs and iframes, and it still
 * would if this function were deleted. But DOMPurify deliberately allows `<img>`, so the
 * beacon above survived it — escaping here is what stops that, not defense in depth.
 *
 * Order matters: `&` first so the entities below aren't double-escaped, and the newline
 * `<br/>` last so it survives as the one tag this function does emit.
 */
function escapeLabel(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\r?\n/g, "<br/>");
}

/** Map arbitrary node ids to safe mermaid identifiers, preserving uniqueness. */
function buildIdMap(graph: RenderGraph): Map<string, string> {
  const map = new Map<string, string>();
  const used = new Set<string>();
  for (const node of graph.nodes) {
    let base = node.id.replace(/[^A-Za-z0-9_]/g, "_");
    if (!/^[A-Za-z_]/.test(base)) base = `n_${base}`;
    // Mermaid keys its own node tables on plain objects, so an id naming a member of
    // `Object.prototype` — `constructor`, `toString` — reads back an inherited function and the
    // layout throws before drawing anything. The `_` prefix is safe to rename into: no document
    // can write one (./ids.ts), and the id a reader sees is the `&id` in their own text.
    if (base in Object.prototype) base = `${RESERVED_ID_PREFIX}${base}`;
    let candidate = base;
    let k = 1;
    while (used.has(candidate)) candidate = `${base}_${k++}`;
    used.add(candidate);
    map.set(node.id, candidate);
  }
  return map;
}

/** Convert a {@link RenderGraph} + {@link StyleConfig} into mermaid, and the way back to the text. */
export function flowchart(
  graph: RenderGraph,
  config: StyleConfig,
  tables: FlowchartTables,
  theme: Theme,
): MermaidOutput {
  const sourceMap: SourceMap = { nodes: idTable(), edges: idTable() };

  if (graph.nodes.length === 0) {
    return {
      text: `flowchart ${config.direction}\n  _empty["(nothing to show yet — start typing on the left)"]`,
      sourceMap,
    };
  }

  const { renderedNodeTypesById, renderedEdgeTypesById, defaultConnector } = tables;
  const idMap = buildIdMap(graph);
  const lines: string[] = [`flowchart ${config.direction}`];

  const dashedIds: string[] = [];
  for (const node of graph.nodes) {
    const def = renderedNodeTypesById[node.type];
    const [open, close] = def?.shape ?? FALLBACK_SHAPE;
    const icon = config.showIcons && def ? `${def.icon} ` : "";
    const label = escapeLabel(`${icon}${node.text}`);
    const id = idMap.get(node.id);
    if (node.dashed && id) dashedIds.push(id);
    if (id && node.lines?.length) sourceMap.nodes[id] = node.lines;
    lines.push(`  ${id}${open}${label}${close}:::${node.type}`);
  }

  // `linkStyle` targets edges by the position they were *declared* in, so the indices are
  // collected as the lines are emitted. An edge whose endpoint is missing (a dropped half-edge
  // from an unresolved `$ref` — the normal state mid-typing) emits nothing, which is why this
  // can't just be the index in `graph.edges`: that would paint the wrong edges, and shift the
  // colors around as you type.
  const colorIndices = new Map<string, number[]>();
  let emitted = 0;
  for (const edge of graph.edges) {
    const from = idMap.get(edge.from);
    const to = idMap.get(edge.to);
    if (!from || !to) continue;
    const def = renderedEdgeTypesById[edge.type];
    const connector = def?.connector ?? defaultConnector;
    // The pipe form composes with any connector (including `-.->`) without having to take
    // the connector string apart, which the `-- "text" -->` form would need. An edge icon
    // rides on `showIcons` exactly as a node's does.
    const icon = config.showIcons && def?.icon ? `${def.icon} ` : "";
    const label = edge.label ? `|"${escapeLabel(`${icon}${edge.label}`)}"|` : "";
    // Named so the SVG can be asked which edge it is: mermaid's invented `L_<from>_<to>_<n>` is
    // ambiguous because ids contain `_`. Anchors stay unnamed — nothing looks them up.
    const name = edge.lines?.length ? `e${emitted}` : undefined;
    if (name && edge.lines) sourceMap.edges[name] = edge.lines;
    lines.push(`  ${from} ${name ? `${name}@` : ""}${connector}${label} ${to}`);
    // A colored connector reads the same `StyleConfig` entry its node-type twin does, so the
    // two forms of one concept can't be styled apart. Grouping by the resolved color means two
    // edge types pointing at one node type share a `linkStyle`, which is what they should do.
    const color = def?.colorTypeId ? config.typeColors[def.colorTypeId] : undefined;
    if (color) {
      const forColor = colorIndices.get(color) ?? [];
      forColor.push(emitted);
      colorIndices.set(color, forColor);
    }
    emitted++;
  }

  for (const [type, color] of Object.entries(config.typeColors)) {
    const style = deriveTypeStyle(color, theme);
    lines.push(
      `  classDef ${type} fill:${style.fill},stroke:${style.border},color:${style.text},stroke-width:1.5px`,
    );
  }

  if (dashedIds.length > 0) {
    lines.push(`  classDef ${DASHED_CLASS} stroke-dasharray:4 3`);
    lines.push(`  class ${dashedIds.join(",")} ${DASHED_CLASS}`);
  }

  // A connector is a line, so it takes the border role: unchanged in light, lifted in dark,
  // where the colors these types are declared with would sit at ~2:1 against the canvas.
  for (const [color, indices] of colorIndices) {
    const { border } = deriveTypeStyle(color, theme);
    lines.push(`  linkStyle ${indices.join(",")} stroke:${border},stroke-width:1.5px`);
  }

  return { text: lines.join("\n"), sourceMap };
}
