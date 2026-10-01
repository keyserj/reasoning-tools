import { describe, expect, it } from "vitest";
import { withoutLines } from "../testing.ts";
import { parse } from "./parse.ts";
import { toGraph } from "./toGraph.ts";

// Shape only — the lines every box and connector also carries have their own block at the bottom.
const graph = (source: string) => withoutLines(toGraph(parse(source).doc));

// The link names are the only thing this file decides, and mermaid can't show them: Arg map: basic gives
// every link the same `-->` and no color, so toMermaid.test.ts would pass either way.

describe("toGraph", () => {
  it("names each edge after the child it runs from", () => {
    const { edges } = graph("= Root &q1\n  = Claim &i1\n    + Support &p1\n    - Critique &c1");
    expect(edges).toContainEqual({ from: "i1", to: "q1", type: "relatesTo" });
    expect(edges).toContainEqual({ from: "p1", to: "i1", type: "supports" });
    expect(edges).toContainEqual({ from: "c1", to: "i1", type: "critiques" });
  });

  it("names a `$ref` edge after the referenced node, not the ref line's marker", () => {
    // `+` places the claim under `i2`; it can't restate what `i1` is, so the link is relatesTo.
    const { edges } = graph("= Claim &i1\n= Other &i2\n  + $i1");
    expect(edges).toContainEqual({ from: "i1", to: "i2", type: "relatesTo" });
  });

  it("turns a note into a box of its own, which is all a note is ever drawn as", () => {
    const { nodes, edges } = graph("= Claim &i1\n  ~ an aside &nt1");
    expect(nodes).toContainEqual({ id: "nt1", type: "note", text: "an aside" });
    expect(edges).toContainEqual({ from: "nt1", to: "i1", type: "note" });
  });

  it("anchors document notes above all roots without giving the anchors source lines", () => {
    const { nodes, edges } = toGraph(parse("~ Caption &note\n= A &a\n= B &b").doc);
    expect(nodes.find((n) => n.id === "note")).toEqual({
      id: "note",
      type: "note",
      text: "Caption",
      lines: [1],
    });
    expect(edges).toEqual([
      { from: "a", to: "note", type: "anchor" },
      { from: "b", to: "note", type: "anchor" },
    ]);
  });
});

describe("toGraph — source lines", () => {
  it("points a node's box and the connector it nests under at its own line", () => {
    const { nodes, edges } = toGraph(parse("= Root &q1\n  = Claim &i1").doc);
    expect(nodes.find((n) => n.id === "i1")?.lines).toEqual([2]);
    expect(edges.find((e) => e.from === "i1")?.lines).toEqual([2]);
  });

  it("points a `$ref` connector at the ref line rather than at the node it reuses", () => {
    const { edges } = toGraph(parse("= Claim &i1\n= Other &i2\n  + $i1").doc);
    expect(edges.find((e) => e.from === "i1" && e.to === "i2")?.lines).toEqual([3]);
  });

  it("adds each `$ref` line to the box it reuses, after the box's own", () => {
    // A click lands on `lines[0]`, so the declaring line leads; the ref lines are what let
    // the caret on any of them light the one shared box up.
    const { nodes } = toGraph(parse("= Claim &i1\n= Other &i2\n  + $i1").doc);
    expect(nodes.find((n) => n.id === "i1")?.lines).toEqual([1, 3]);
  });

  it("keeps a forward reference's declaration first and derives its edge from the declared type", () => {
    const { nodes, edges } = toGraph(parse("= A &a\n  - $later\n+ Support &later").doc);
    expect(nodes.find((n) => n.id === "later")?.lines).toEqual([3, 2]);
    expect(edges).toEqual([{ from: "later", to: "a", type: "supports", lines: [2] }]);
  });
});
