// How a drawn element in mermaid's SVG is matched back to the `SourceMap` that describes it.
// Mermaid spells the two kinds differently — a node's key is buried in its DOM id, an edge's is
// already a `data-id` — so this normalizes them onto one attribute, and everything downstream
// (marking, clicking, the pointer cursor) reads `data-id` alone.

import type { SourceMap } from "../ontology/types.ts";

/** Marks an element the map knows, which is exactly what is clickable. */
const LINKED_CLASS = "is-linked";

/** Marks the element(s) the active line drew. */
export const ACTIVE_CLASS = "is-active";

/**
 * The key mermaid gave a node, out of `<svgId>-flowchart-<key>-<n>`. The trailing number is
 * mermaid's own render counter, not part of the key; ids are sanitized to `[A-Za-z0-9_]` before
 * they get here (see ../ontology/mermaidFlowchart.ts), so no separator is ambiguous.
 */
export function nodeKeyOf(domId: string, svgId: string): string | null {
  const match = new RegExp(`^${svgId}-flowchart-([A-Za-z0-9_]+)-\\d+$`).exec(domId);
  return match ? match[1] : null;
}

/** One drawn element and the source lines behind it. */
export interface LinkedElement {
  el: Element;
  lines: number[];
}

/**
 * Tag everything the map knows. Nodes get the `data-id` mermaid only gives edges; edge labels
 * are included because a labeled connector's midpoint is the label, not the 1.5px path.
 */
export function linkDrawnElements(svg: SVGElement, sourceMap: SourceMap): LinkedElement[] {
  const linked: LinkedElement[] = [];

  for (const el of svg.querySelectorAll("g.node")) {
    const key = nodeKeyOf(el.id, svg.id);
    if (key === null) continue;
    el.setAttribute("data-id", key);
    const lines = sourceMap.nodes[key];
    if (lines) {
      el.classList.add(LINKED_CLASS);
      linked.push({ el, lines });
    }
  }

  for (const el of svg.querySelectorAll("path.flowchart-link[data-id], g.edgeLabels g.label")) {
    const lines = sourceMap.edges[el.getAttribute("data-id") ?? ""];
    if (lines) {
      el.classList.add(LINKED_CLASS);
      linked.push({ el, lines });
    }
  }

  return linked;
}

/**
 * The line a click on `target` points at, or `null` for anywhere that draws nothing. Read off
 * what was tagged rather than the map in hand, which may already describe the next SVG.
 */
export function lineAtTarget(target: EventTarget | null, linked: LinkedElement[]): number | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest(`.${LINKED_CLASS}`);
  if (el === null) return null;
  return linked.find((candidate) => candidate.el === el)?.lines[0] ?? null;
}

/** Still on screen, but out of date — stop treating it as clickable. */
export function unlinkDrawnElements(container: Element): void {
  for (const el of container.querySelectorAll(`.${LINKED_CLASS}, .${ACTIVE_CLASS}`)) {
    el.classList.remove(LINKED_CLASS, ACTIVE_CLASS);
  }
}
