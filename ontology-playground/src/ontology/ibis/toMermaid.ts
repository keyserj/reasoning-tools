import type { Graph, StyleConfig } from "../types.ts";
import { nodeTypesById } from "./nodeTypes.ts";
import { DEFAULT_CONNECTOR, edgeTypesById } from "./edgeTypes.ts";

const FALLBACK_SHAPE: [string, string] = ['["', '"]'];

/** Escape text for use inside a mermaid quoted label. */
function escapeLabel(text: string): string {
  return text.replace(/"/g, "&quot;").replace(/\r?\n/g, " ");
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

/** Convert an IBIS {@link Graph} + {@link StyleConfig} into a mermaid flowchart string. */
export function toMermaid(graph: Graph, config: StyleConfig): string {
  if (graph.nodes.length === 0) {
    return `flowchart ${config.direction}\n  _empty["(nothing to show yet — start typing on the left)"]`;
  }

  const idMap = buildIdMap(graph);
  const lines: string[] = [`flowchart ${config.direction}`];

  for (const node of graph.nodes) {
    const def = nodeTypesById[node.type];
    const [open, close] = def?.shape ?? FALLBACK_SHAPE;
    const icon = config.showIcons && def ? `${def.icon} ` : "";
    const label = escapeLabel(`${icon}${node.text}`);
    lines.push(`  ${idMap.get(node.id)}${open}${label}${close}:::${node.type}`);
  }

  for (const edge of graph.edges) {
    const from = idMap.get(edge.from);
    const to = idMap.get(edge.to);
    if (!from || !to) continue;
    const connector = edgeTypesById[edge.type]?.connector ?? DEFAULT_CONNECTOR;
    lines.push(`  ${from} ${connector} ${to}`);
  }

  for (const [type, style] of Object.entries(config.types)) {
    lines.push(
      `  classDef ${type} fill:${style.fill},stroke:${style.stroke},color:${style.color},stroke-width:1.5px`,
    );
  }

  return lines.join("\n");
}
