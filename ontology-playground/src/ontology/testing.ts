// Helpers shared by the per-ontology test files; nothing here ships in the app.

import type { RenderGraph } from "./types.ts";

/**
 * The graph without its source lines. Shape tests assert boxes and connectors, and every one of
 * them also carrying the line it was written on would bury what each case is about — lines get
 * a describe block of their own per suite instead.
 */
export function withoutLines({ nodes, edges }: RenderGraph): RenderGraph {
  const drop = <T extends { lines?: number[] }>(items: T[]) =>
    items.map(({ lines: _lines, ...rest }) => rest);
  return { nodes: drop(nodes), edges: drop(edges) };
}
