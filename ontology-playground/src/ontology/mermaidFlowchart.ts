import type { EdgeTypeDef, Graph, NodeTypeDef, StyleConfig } from "./types.ts";

// Shared mermaid-flowchart renderer. Every ontology's `toMermaid` is the same walk over
// nodes and edges; only the lookup tables differ, so they live in the ontology and the
// walk lives here.
//
// A node's `text` may contain newlines: they become `<br/>`, which is how an ontology
// puts a second line (scores, say) into a label without this file knowing what it means.

const FALLBACK_SHAPE: [string, string] = ['["', '"]'];

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
 * 2. Documents arrive from other people, as a whole `DocState` in the URL hash (see
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
function buildIdMap(graph: Graph): Map<string, string> {
  const map = new Map<string, string>();
  const used = new Set<string>();
  for (const node of graph.nodes) {
    let base = node.id.replace(/[^A-Za-z0-9_]/g, "_");
    if (!/^[A-Za-z_]/.test(base)) base = `n_${base}`;
    let candidate = base;
    let k = 1;
    while (used.has(candidate)) candidate = `${base}_${k++}`;
    used.add(candidate);
    map.set(node.id, candidate);
  }
  return map;
}

/** Convert a {@link Graph} + {@link StyleConfig} into a mermaid flowchart string. */
export function flowchart(graph: Graph, config: StyleConfig, tables: FlowchartTables): string {
  if (graph.nodes.length === 0) {
    return `flowchart ${config.direction}\n  _empty["(nothing to show yet — start typing on the left)"]`;
  }

  const { renderedNodeTypesById, renderedEdgeTypesById, defaultConnector } = tables;
  const idMap = buildIdMap(graph);
  const lines: string[] = [`flowchart ${config.direction}`];

  for (const node of graph.nodes) {
    const def = renderedNodeTypesById[node.type];
    const [open, close] = def?.shape ?? FALLBACK_SHAPE;
    const icon = config.showIcons && def ? `${def.icon} ` : "";
    const label = escapeLabel(`${icon}${node.text}`);
    lines.push(`  ${idMap.get(node.id)}${open}${label}${close}:::${node.type}`);
  }

  for (const edge of graph.edges) {
    const from = idMap.get(edge.from);
    const to = idMap.get(edge.to);
    if (!from || !to) continue;
    const connector = renderedEdgeTypesById[edge.type]?.connector ?? defaultConnector;
    lines.push(`  ${from} ${connector} ${to}`);
  }

  for (const [type, style] of Object.entries(config.types)) {
    lines.push(
      `  classDef ${type} fill:${style.fill},stroke:${style.stroke},color:${style.color},stroke-width:1.5px`,
    );
  }

  return lines.join("\n");
}
