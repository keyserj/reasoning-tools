import type { LaidOutEdge, LaidOutNode } from "./layout.ts";
import type { Point } from "./shapes.ts";

export interface SelectionItem {
  key: string;
  kind: "node" | "edge";
  label: string;
  endpoints: string[];
}

export type SelectableNode = LaidOutNode & { selectionKey: string };
export type SelectableEdge = LaidOutEdge & { selectionKey: string };

export const nodeKey = (id: string) => JSON.stringify(["node", id]);

export function selectableDiagram(nodes: LaidOutNode[], edges: LaidOutEdge[]) {
  const byId = new Map(nodes.map((node) => [node.id, node.label.text]));
  const occurrences = new Map<string, number>();
  const selectableNodes = nodes.map((node) => ({ ...node, selectionKey: nodeKey(node.id) }));
  const selectableEdges = edges.map((edge) => {
    // Parallel edges need distinct identities; labels and source lines can change while editing.
    const identity = JSON.stringify([edge.from, edge.to, edge.type]);
    const occurrence = occurrences.get(identity) ?? 0;
    occurrences.set(identity, occurrence + 1);
    return { ...edge, selectionKey: JSON.stringify(["edge", identity, occurrence]) };
  });
  const items: SelectionItem[] = [
    ...selectableNodes.map((node) => ({
      key: node.selectionKey,
      kind: "node" as const,
      label: node.label.text,
      endpoints: [],
    })),
    ...selectableEdges.map((edge) => ({
      key: edge.selectionKey,
      kind: "edge" as const,
      label: `${byId.get(edge.from) ?? edge.from} → ${byId.get(edge.to) ?? edge.to} (${edge.label?.text ?? edge.type})`,
      endpoints: [nodeKey(edge.from), nodeKey(edge.to)],
    })),
  ];
  return { nodes: selectableNodes, edges: selectableEdges, items };
}

export function hiddenItems(items: SelectionItem[], hidden: ReadonlySet<string>): Set<string> {
  return new Set(
    items
      .filter((item) => hidden.has(item.key) || item.endpoints.some((key) => hidden.has(key)))
      .map((item) => item.key),
  );
}

export function restoreItem(item: SelectionItem, hidden: ReadonlySet<string>): Set<string> {
  const next = new Set(hidden);
  next.delete(item.key);
  // A visible edge needs both endpoints; other explicitly hidden edges stay hidden.
  for (const key of item.endpoints) next.delete(key);
  return next;
}

export interface SelectionBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function selectionBox(a: Point, b: Point): SelectionBox {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    right: Math.max(a.x, b.x),
    bottom: Math.max(a.y, b.y),
  };
}

export function boxesIntersect(a: SelectionBox, b: SelectionBox): boolean {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

export function segmentIntersectsBox(a: Point, b: Point, box: SelectionBox): boolean {
  let start = 0;
  let end = 1;
  for (const [origin, delta, low, high] of [
    [a.x, b.x - a.x, box.left, box.right],
    [a.y, b.y - a.y, box.top, box.bottom],
  ]) {
    if (delta === 0) {
      if (origin < low || origin > high) return false;
    } else {
      const first = (low - origin) / delta;
      const last = (high - origin) / delta;
      start = Math.max(start, Math.min(first, last));
      end = Math.min(end, Math.max(first, last));
      if (start > end) return false;
    }
  }
  return true;
}

export function elementsInBox(viewport: SVGGElement, box: SelectionBox): Set<string> {
  const selected = new Set<string>();
  for (const element of viewport.querySelectorAll<SVGGraphicsElement>(
    "[data-selection-key]:not(.diagram-edge-hit)",
  )) {
    const key = element.getAttribute("data-selection-key")!;
    if (selected.has(key) || !boxesIntersect(box, element.getBoundingClientRect())) continue;
    if (!(element instanceof SVGPathElement)) {
      selected.add(key);
      continue;
    }
    const matrix = element.getScreenCTM();
    if (!matrix) continue;
    const length = element.getTotalLength();
    // Sample the actual curve in screen pixels: a path's bounding box includes empty corners.
    const steps = Math.max(1, Math.ceil((length * Math.hypot(matrix.a, matrix.b)) / 4));
    let previous = element.getPointAtLength(0).matrixTransform(matrix);
    for (let i = 1; i <= steps; i++) {
      const point = element.getPointAtLength((length * i) / steps).matrixTransform(matrix);
      if (segmentIntersectsBox(previous, point, box)) {
        selected.add(key);
        break;
      }
      previous = point;
    }
  }
  return selected;
}
