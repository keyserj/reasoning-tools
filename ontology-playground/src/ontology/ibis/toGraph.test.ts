import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import { toGraph } from "./toGraph.ts";

// Shape only: every box and connector also carries the line it was written on, which the block
// at the bottom is about.
const graph = (source: string) => {
  const { nodes, edges } = toGraph(parse(source).doc);
  const drop = <T extends { lines?: number[] }>(items: T[]) =>
    items.map(({ lines: _lines, ...rest }) => rest);
  return { nodes: drop(nodes), edges: drop(edges) };
};

// The link names are the only thing this file decides, and mermaid can't show them: IBIS gives
// every link the same `-->` and no color, so ../ibis/toMermaid.test.ts would pass either way.

describe("toGraph", () => {
  it("names each edge after the child it runs from", () => {
    const { edges } = graph("? Q &q1\n  = Idea &i1\n    + Pro &p1\n    - Con &c1\n  ? Sub &q2");
    expect(edges).toContainEqual({ from: "i1", to: "q1", type: "respondsTo" });
    expect(edges).toContainEqual({ from: "p1", to: "i1", type: "supports" });
    expect(edges).toContainEqual({ from: "c1", to: "i1", type: "objectsTo" });
    expect(edges).toContainEqual({ from: "q2", to: "q1", type: "questions" });
  });

  it("names a `$ref` edge after the referenced node, not the ref line's marker", () => {
    // `+` places the idea under `i2`; it can't restate what `i1` is, so the link is respondsTo.
    const { edges } = graph("= Idea &i1\n= Other &i2\n  + $i1");
    expect(edges).toContainEqual({ from: "i1", to: "i2", type: "respondsTo" });
  });

  it("turns a note into a box of its own, which is all a note is ever drawn as", () => {
    const { nodes, edges } = graph("= Idea &i1\n  ~ an aside &nt1");
    expect(nodes).toContainEqual({ id: "nt1", type: "note", text: "an aside" });
    expect(edges).toContainEqual({ from: "nt1", to: "i1", type: "note" });
  });
});

describe("toGraph — source lines", () => {
  it("points a node's box and the connector it nests under at its own line", () => {
    const { nodes, edges } = toGraph(parse("? Q &q1\n  = Idea &i1").doc);
    expect(nodes.find((n) => n.id === "i1")?.lines).toEqual([2]);
    expect(edges.find((e) => e.from === "i1")?.lines).toEqual([2]);
  });

  it("points a `$ref` connector at the ref line rather than at the node it reuses", () => {
    const { edges } = toGraph(parse("= Idea &i1\n= Other &i2\n  + $i1").doc);
    expect(edges.find((e) => e.from === "i1" && e.to === "i2")?.lines).toEqual([3]);
  });
});
