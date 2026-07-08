import type { Graph, NodeType, StyleConfig } from "../types.ts";
import { ICONS } from "./icons.ts";

/** Wrapping delimiters per node type: [open, close]. Text goes between them, quoted. */
const SHAPES: Record<NodeType, [string, string]> = {
  question: ['{{"', '"}}'],
  idea: ['["', '"]'],
  pro: ['["', '"]'],
  con: ['["', '"]'],
  note: ['[/"', '"/]'],
};

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
    const [open, close] = SHAPES[node.type];
    const icon = config.showIcons ? `${ICONS[node.type]} ` : "";
    const label = escapeLabel(`${icon}${node.text}`);
    lines.push(`  ${idMap.get(node.id)}${open}${label}${close}:::${node.type}`);
  }

  for (const edge of graph.edges) {
    const from = idMap.get(edge.from);
    const to = idMap.get(edge.to);
    if (!from || !to) continue;
    const connector = edge.type === "note" ? "-.->" : "-->";
    lines.push(`  ${from} ${connector} ${to}`);
  }

  for (const type of Object.keys(config.types) as NodeType[]) {
    const s = config.types[type];
    lines.push(
      `  classDef ${type} fill:${s.fill},stroke:${s.stroke},color:${s.color},stroke-width:1.5px`,
    );
  }

  return lines.join("\n");
}
