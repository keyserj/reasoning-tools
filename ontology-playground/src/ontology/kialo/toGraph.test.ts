import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import { toGraph } from "./toGraph.ts";

// A box per usage, case by case. A score and a stance belong to one usage of a claim, so a `$id`
// usage gets a copy of the box rather than another connector into one — see ./rendering.md. A
// mermaid snapshot records what happened without saying what was meant, which is why these are
// separate from ./toMermaid.test.ts.

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
      lines: [2],
    });
  });

  it("gives a claim used once a box in its own stance, on a plain connector", () => {
    const source = "= T &t\n  -[1] Only &o";
    expect(node(source, "o")).toEqual({ id: "o", type: "con", text: "Only\n[1]", lines: [2] });
    // The `-` line writes the claim *and* attaches it, so it draws the connector too.
    expect(edgesFrom(source, "o")).toEqual([{ from: "o", to: "t", type: "link", lines: [2] }]);
  });

  it("draws a `$ref` usage as a dashed copy taking its own stance and score", () => {
    // The two usages disagree about both, which is exactly what a box per usage can say.
    const source = "= A &a\n  -[1] Shared &s\n= B &b\n  +[4] $s";
    expect(node(source, "s")).toEqual({
      id: "s",
      type: "con",
      text: "Shared 🔀\n[1]",
      lines: [2],
    });
    // The copy points at the `$s` line that reuses the claim, not at the one declaring it.
    expect(node(source, "a2")).toEqual({
      id: "a2",
      type: "pro",
      text: "Shared 🔀\n[4]",
      dashed: true,
      lines: [4],
    });
    expect(edgesFrom(source, "s")).toEqual([{ from: "s", to: "a", type: "link", lines: [2] }]);
    expect(edgesFrom(source, "a2")).toEqual([{ from: "a2", to: "b", type: "link", lines: [4] }]);
  });

  it("hangs a reused claim's children off the box that declares it, not off a copy", () => {
    const source = "= A &a\n  - Shared &s\n    + Child &c\n= B &b\n  + $s";
    expect(edgesFrom(source, "c")).toEqual([{ from: "c", to: "s", type: "link", lines: [3] }]);
  });

  it("marks every box of a reused claim, and only while icons are on", () => {
    const source = "= A &a\n  - Shared &s\n= B &b\n  + $s";
    expect(node(source, "s")?.text).toBe("Shared 🔀");
    expect(node(source, "a2")?.text).toBe("Shared 🔀");
    expect(node(source, "s", false)?.text).toBe("Shared");
  });

  it("draws a thesis reused as an argument as a copy, like any other `$ref`", () => {
    const source = "=[3] A &a\n=[2] B &b\n  +[4] $a";
    expect(node(source, "a")).toEqual({ id: "a", type: "thesis", text: "A 🔀\n[3]", lines: [1] });
    expect(node(source, "a1")).toEqual({
      id: "a1",
      type: "pro",
      text: "A 🔀\n[4]",
      dashed: true,
      lines: [3],
    });
  });

  it("draws a `= $ref` thesis as a dashed thesis", () => {
    // The compromise ./rendering.md accepts: the box under the question is the copy, and the
    // arguments hang off the `+` that declared the text.
    const source = "? Q &q\n  =[2] $s\n= T &t\n  +[1] Shared &s";
    expect(node(source, "t1")).toEqual({
      id: "t1",
      type: "thesis",
      text: "Shared 🔀\n[2]",
      dashed: true,
      lines: [2],
    });
    expect(edgesFrom(source, "t1")).toEqual([{ from: "t1", to: "q", type: "link", lines: [2] }]);
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

  it("points a note's box and connector at the `~` line that wrote both", () => {
    const source = "= T &t\n  ~ an aside &nt";
    expect(node(source, "nt")).toEqual({ id: "nt", type: "note", text: "an aside", lines: [2] });
    expect(edgesFrom(source, "nt")).toEqual([{ from: "nt", to: "t", type: "note", lines: [2] }]);
  });

  it("gives the header every `%` line it was built from", () => {
    const source = "%description: D\n%perspectives: [a]\n= T &t";
    expect(node(source, "_topic")?.lines).toEqual([1, 2]);
  });

  it("omits the header entirely when there is nothing for it to say", () => {
    const { nodes, edges } = graph("= T &t");
    expect(nodes.map((n) => n.id)).toEqual(["t"]);
    expect(edges).toEqual([]);
  });
});
