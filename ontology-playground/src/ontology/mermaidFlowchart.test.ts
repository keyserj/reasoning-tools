import { describe, expect, it } from "vitest";
import { flowchart } from "./mermaidFlowchart.ts";
import type { RenderEdge } from "./types.ts";

const render = (edges: RenderEdge[]) =>
  flowchart(
    { nodes: [{ id: "a-b", type: "claim", text: "Claim", lines: [1] }], edges },
    { direction: "BT", showIcons: false, typeColors: {} },
    { renderedNodeTypesById: {}, renderedEdgeTypesById: {}, defaultConnector: "-->" },
    "light",
  );
const loop = (lines?: number[]): RenderEdge => ({
  from: "a-b",
  to: "a-b",
  type: "relation",
  lines,
});

describe("self-loop source maps", () => {
  it("maps all three Dagre segments using the sanitized node ID", () => {
    const output = render([loop([2])]);
    expect(output.text).toContain("a_b e0@--> a_b");
    expect(output.sourceMap.edges).toEqual({
      "a_b-cyclic-special-1": [2],
      "a_b-cyclic-special-mid": [2],
      "a_b-cyclic-special-2": [2],
    });
  });

  it("maps repeated loops to the last one, which Mermaid draws", () => {
    const output = render([loop([2]), loop([3])]);
    expect(Object.values(output.sourceMap.edges)).toEqual([[3], [3], [3]]);
  });

  it("removes targets when an unmapped loop replaces a mapped one", () => {
    expect(render([loop([2]), loop()]).sourceMap.edges).toEqual({});
  });
});
