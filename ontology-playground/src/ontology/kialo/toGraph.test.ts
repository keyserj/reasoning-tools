import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import { toGraph } from "./toGraph.ts";

// The fold rule, case by case. A score and a stance belong to one usage of a claim, but a reused
// claim is still one box, so which of its usages a box may speak for is the decision this
// ontology's rendering turns on — see ./rendering.md. A mermaid snapshot records what happened
// without saying what was meant, which is why these are separate from ./toMermaid.test.ts.

const graph = (source: string, showIcons = true) => toGraph(parse(source).doc, showIcons);
const node = (source: string, id: string, showIcons = true) =>
  graph(source, showIcons).nodes.find((n) => n.id === id);
const edgesFrom = (source: string, id: string) => graph(source).edges.filter((e) => e.from === id);

describe("toGraph", () => {
  it("draws a thesis carrying its veracity", () => {
    // A thesis has no stance to take: nothing sits above it to be a pro or a con of.
    expect(node("%perspectives: [a]\n=[3] Thesis &t", "t")).toEqual({
      id: "t",
      type: "thesis",
      text: "Thesis\n[3]",
    });
  });

  it("folds a claim's single argument into its box, leaving the connector plain", () => {
    const source = "= T &t\n  -[1] Only &o";
    expect(node(source, "o")).toEqual({ id: "o", type: "con", text: "Only\n[1]" });
    expect(edgesFrom(source, "o")).toEqual([{ from: "o", to: "t", type: "link" }]);
  });

  it("keeps a reused claim neutral, and puts each usage on its own connector", () => {
    // Two usages disagree about both stance and score, so the box can't speak for either.
    const source = "= A &a\n  -[1] Shared &s\n= B &b\n  +[4] $s";
    expect(node(source, "s")).toEqual({ id: "s", type: "claim", text: "Shared" });
    expect(edgesFrom(source, "s")).toEqual([
      { from: "s", to: "a", type: "con", label: "[1]" },
      { from: "s", to: "b", type: "pro", label: "[4]" },
    ]);
  });

  it("keeps a thesis a thesis when it is also reused as someone's argument", () => {
    const source = "=[3] A &a\n=[2] B &b\n  +[4] $a";
    expect(node(source, "a")).toEqual({ id: "a", type: "thesis", text: "A\n[3]" });
    expect(edgesFrom(source, "a")).toEqual([{ from: "a", to: "b", type: "pro", label: "[4]" }]);
  });

  it("leaves an unfolded connector unlabeled when nobody voted, since color still says which", () => {
    const source = "= A &a\n  - Shared &s\n= B &b\n  + $s";
    expect(edgesFrom(source, "s")).toEqual([
      { from: "s", to: "a", type: "con" },
      { from: "s", to: "b", type: "pro" },
    ]);
  });

  it("marks a claim that has sources, and only while icons are on", () => {
    const source = "= T &t\n  +[2] Claim &c\n    @ https://e.example A study";
    expect(node(source, "c")?.text).toBe("Claim 🔗\n[2]");
    expect(node(source, "c", false)?.text).toBe("Claim\n[2]");
  });

  it("anchors every root to the header, not just the first", () => {
    const anchors = graph("%description: D\n? A &qa\n? B &qb\n= Loose &l").edges.filter(
      (e) => e.type === "anchor",
    );
    // BT ranks an edge's target above its source, so the root is the source — see ./toGraph.ts.
    expect(anchors).toEqual([
      { from: "qa", to: "_topic", type: "anchor" },
      { from: "qb", to: "_topic", type: "anchor" },
      { from: "l", to: "_topic", type: "anchor" },
    ]);
  });

  it("omits the header entirely when there is nothing for it to say", () => {
    const { nodes, edges } = graph("= T &t");
    expect(nodes.map((n) => n.id)).toEqual(["t"]);
    expect(edges).toEqual([]);
  });
});
