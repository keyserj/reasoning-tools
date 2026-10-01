import type { Connector, NodeShape, RenderGraph, StyleConfig, Theme, TypeTables } from "./types.ts";
import { RESERVED_ID_PREFIX } from "./ids.ts";
import { deriveTypeStyle } from "./typeColors.ts";

// The diagram as mermaid flowchart source, for pasting elsewhere. Nothing in the app renders it.
//
// A node's `text` may contain newlines: they become `<br/>`, which is how an ontology
// puts a second line (scores, say) into a label without this file knowing what it means.

/** Wrapping delimiters: text goes between them, quoted. */
const SHAPES: Record<NodeShape, [string, string]> = {
  rect: ['["', '"]'],
  rounded: ['("', '")'],
  stadium: ['(["', '"])'],
  subroutine: ['[["', '"]]'],
  hexagon: ['{{"', '"}}'],
  diamond: ['{"', '"}'],
  parallelogram: ['[/"', '"/]'],
};

const CONNECTORS: Record<Connector, string> = {
  arrow: "-->",
  line: "---",
  "dotted-arrow": "-.->",
  invisible: "~~~",
};

/**
 * `RenderNode.dashed` rides on a second class rather than on the node's `:::type`, since a node
 * may only name one there. Mermaid appends both to the same list and concatenates their styles,
 * so the type's fill and stroke survive and only the dash is added. The dasharray is
 * space-separated because `classDef` splits its style list on commas — see ./typeColors.ts.
 */
const DASHED_CLASS = "dashed";

/**
 * Escape text for use inside a mermaid quoted label.
 *
 * Mermaid renders labels as HTML by default, so unescaped markup in a node's text renders as
 * markup wherever the export is drawn. Someone writing `R&D` or `&lt;b&gt;` should see what they
 * typed there, and a document can arrive from someone else as a shared link (../share/url.ts),
 * which must not be able to slip an `<img>` beacon into whatever renders the export.
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

/** Convert a {@link RenderGraph} + {@link StyleConfig} into mermaid flowchart source. */
export function mermaidExport(
  graph: RenderGraph,
  config: StyleConfig,
  types: TypeTables,
  theme: Theme,
): string {
  const lines: string[] = [`flowchart ${config.direction}`];
  if (graph.nodes.length === 0) return lines[0];

  const nodeTypes = new Map(types.renderedNodeTypes.map((t) => [t.id, t]));
  const edgeTypes = new Map(types.renderedEdgeTypes.map((t) => [t.id, t]));
  const idMap = buildIdMap(graph);

  const dashedIds: string[] = [];
  for (const node of graph.nodes) {
    const def = nodeTypes.get(node.type);
    const [open, close] = SHAPES[def?.shape ?? "rect"];
    const icon = config.showIcons && def ? `${def.icon} ` : "";
    const label = escapeLabel(`${icon}${node.text}`);
    const id = idMap.get(node.id);
    if (node.dashed && id) dashedIds.push(id);
    lines.push(`  ${id}${open}${label}${close}:::${node.type}`);
  }

  // `linkStyle` targets edges by the position they were *declared* in, so the indices are
  // collected as the lines are emitted. An edge whose endpoint is missing (a dropped half-edge
  // from an unresolved `$ref` — the normal state mid-typing) emits nothing, which is why this
  // can't just be the index in `graph.edges`: that would paint the wrong edges.
  const colorIndices = new Map<string, number[]>();
  let emitted = 0;
  for (const edge of graph.edges) {
    const from = idMap.get(edge.from);
    const to = idMap.get(edge.to);
    if (!from || !to) continue;
    const def = edgeTypes.get(edge.type);
    const connector = CONNECTORS[def?.connector ?? "arrow"];
    // The pipe form composes with any connector (including `-.->`) without having to take
    // the connector string apart, which the `-- "text" -->` form would need. An edge icon
    // rides on `showIcons` exactly as a node's does.
    const icon = config.showIcons && def?.icon ? `${def.icon} ` : "";
    const label = edge.label ? `|"${escapeLabel(`${icon}${edge.label}`)}"|` : "";
    lines.push(`  ${from} ${connector}${label} ${to}`);
    // Grouping by the resolved color means two edge types pointing at one node type share a
    // `linkStyle`, which is what they should do.
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

  return lines.join("\n");
}
