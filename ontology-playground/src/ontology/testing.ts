// Helpers shared by the per-ontology test files; nothing here ships in the app.

import type { RenderGraph } from "./types.ts";

/** Drop `lines` so shape tests aren't buried in source-map noise. */
export function withoutLines({ nodes, edges }: RenderGraph): RenderGraph {
  const drop = <T extends { lines?: number[] }>(items: T[]) =>
    items.map(({ lines: _lines, ...rest }) => rest);
  return { nodes: drop(nodes), edges: drop(edges) };
}
