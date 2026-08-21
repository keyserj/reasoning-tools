import { describe, expect, it } from "vitest";
import type { FeatureState } from "../types.ts";
import { withoutLines } from "../testing.ts";
import { parse } from "./parse.ts";
import { toGraph } from "./toGraph.ts";
import { EDGE_CLAIMS, EDGE_DISPLAY, EDGE_DISPLAY_SAME, IMPLIED } from "./features.ts";

// The two renderings the `Edge claims` feature switches between. An empty state is the
// default one, which is what an old shared URL and a fresh document both decode to.

const spelledOut = (): FeatureState => ({});

const implied: FeatureState = { [EDGE_CLAIMS]: { option: IMPLIED } };

const impliedSame: FeatureState = {
  [EDGE_CLAIMS]: { option: IMPLIED, params: { [EDGE_DISPLAY]: EDGE_DISPLAY_SAME } },
};

// Shape only — the lines every box and connector also carries have their own block at the bottom.
const graphOf = (text: string, features: FeatureState) =>
  withoutLines(toGraph(parse(text).doc, features));

/** The same graph with the lines left on, which the block at the bottom is about. */
const withLines = (text: string, features: FeatureState) => toGraph(parse(text).doc, features);

describe("toGraph — spelled out (default)", () => {
  it("draws a plain edge as a labeled connector, with no node of its own", () => {
    const graph = graphOf("= Thesis &t\n  < supports[8] &sup\n    = Reason &r", spelledOut());
    expect(graph.nodes).toEqual([
      { id: "t", type: "claim", text: "Thesis" },
      { id: "r", type: "claim", text: "Reason" },
    ]);
    expect(graph.edges).toEqual([{ from: "r", to: "t", type: "supports", label: "supports [8]" }]);
  });

  it("spells the claim out in a detached node when something argues about the edge", () => {
    const graph = graphOf(
      [
        "= Thesis &t",
        "  < supports[8] &sup",
        "    = Reason &r",
        "= $sup",
        "  < critiques[2] &crit",
        "    = Beside the point &btp",
      ].join("\n"),
      spelledOut(),
    );
    // A plain claim, not a `supports` box: its own text says which it is, and the edge it
    // describes carries the color.
    expect(graph.nodes).toContainEqual({
      id: "sup",
      type: "claim",
      text: '① "Reason" supports "Thesis"\n[8]',
    });
    // The edge is still drawn as a connector between its endpoints, marked so the detached node
    // can be matched to it; the critique lands on that node instead of on either claim.
    expect(graph.edges).toContainEqual({
      from: "r",
      to: "t",
      type: "supports",
      label: "① supports [8]",
    });
    expect(graph.edges).toContainEqual({
      from: "btp",
      to: "sup",
      type: "critiques",
      label: "critiques [2]",
    });
  });

  it("anchors a detached node to the edge's target so dagre puts it nearby", () => {
    const graph = graphOf(
      "= Thesis &t\n  < supports &sup\n    = Reason &r\n= $sup\n  < critiques &c\n    = No &n",
      spelledOut(),
    );
    expect(graph.edges).toContainEqual({ from: "sup", to: "t", type: "anchor" });
    // Not the source end: see toGraph.ts on why pinning both is worse.
    expect(graph.edges).not.toContainEqual({ from: "r", to: "sup", type: "anchor" });
  });

  it("gives a note-bearing edge a node too, so the note has something to hang off", () => {
    const graph = graphOf("= A &a\n  < supports &l\n    ~ why &nt\n    = B &b", spelledOut());
    expect(graph.nodes.map((n) => n.id)).toContain("l");
    expect(graph.edges).toContainEqual({ from: "nt", to: "l", type: "note" });
  });

  it("falls back to the endpoint's id for a nested edge claim, rather than recursing", () => {
    const graph = graphOf(
      [
        "= Thesis &t",
        "  < supports &sup",
        "    = Reason &r",
        "= $sup",
        "  < critiques &crit",
        "    = Beside the point &btp",
        "= $crit",
        "  < critiques &meta",
        "    = Not so &ns",
      ].join("\n"),
      spelledOut(),
    );
    // `crit`'s target is an edge, which has no claim text to quote. Its ② also shows markers
    // being numbered in source order — `sup` is argued about first, so it took ①.
    expect(graph.nodes).toContainEqual({
      id: "crit",
      type: "claim",
      text: '② "Beside the point" critiques "sup"',
    });
  });

  it("truncates a long side rather than quoting a whole paragraph", () => {
    const long = "A claim long enough that quoting all of it would be unreadable";
    const graph = graphOf(
      `= ${long} &t\n  < supports &sup\n    = Reason &r\n= $sup\n  < critiques &c\n    = Nope &n`,
      spelledOut(),
    );
    const node = graph.nodes.find((n) => n.id === "sup");
    expect(node?.text).toBe('① "Reason" supports "A claim long enough that quoting all of…"');
  });

  it("labels an edge with its type, plus its score row when someone scored it", () => {
    const labelOf = (source: string) => graphOf(source, spelledOut()).edges[0].label;
    expect(labelOf("= A &a\n  < supports[8] &sup\n    = B &b")).toBe("supports [8]");
    expect(labelOf("= A &a\n  < supports &sup\n    = B &b")).toBe("supports");
  });

  it("drops an edge whose endpoint never resolved, as the other rendering does", () => {
    const graph = graphOf("= A &a\n  < supports &l\n    = $nope", spelledOut());
    expect(graph.edges).toEqual([]);
  });

  it("keeps the topic header and its invisible anchor", () => {
    const graph = graphOf(
      "%perspectives: [alice]\n= Thesis &t\n  < supports[8] &sup\n    = Reason &r",
      spelledOut(),
    );
    expect(graph.nodes[0]).toMatchObject({ id: "_topic", type: "topic" });
    expect(graph.edges).toContainEqual({ from: "t", to: "_topic", type: "anchor" });
  });
});

describe("toGraph — implied", () => {
  it("reifies an edge into a node between its child source and parent target", () => {
    const graph = graphOf("= Thesis &t\n  < supports[8] &sup\n    = Reason &r", implied);
    expect(graph.nodes).toEqual([
      { id: "t", type: "claim", text: "Thesis" },
      { id: "r", type: "claim", text: "Reason" },
      { id: "sup", type: "supports", text: "supports\n[8]" },
    ]);
    // Under the default `Edge display`, the way *into* the box is half of one arrow and
    // carries no arrowhead of its own.
    expect(graph.edges).toEqual([
      { from: "r", to: "sup", type: "edge-half" },
      { from: "sup", to: "t", type: "link" },
    ]);
  });

  it("draws both halves as plain arrows under `all edges same`", () => {
    const graph = graphOf("= Thesis &t\n  < supports[8] &sup\n    = Reason &r", impliedSame);
    expect(graph.edges).toEqual([
      { from: "r", to: "sup", type: "link" },
      { from: "sup", to: "t", type: "link" },
    ]);
  });

  it("gives every edge a node, argued about or not", () => {
    const graph = graphOf(
      [
        "= Thesis &t",
        "  < supports[8] &sup",
        "    = Reason &r",
        "= $sup",
        "  < critiques[2] &crit",
        "    = Beside the point &btp",
      ].join("\n"),
      implied,
    );
    // `crit` targets an edge rather than a claim — the case the ontology exists for, and the
    // one the reified rendering otherwise draws like any other edge.
    expect(graph.edges).toEqual([
      { from: "r", to: "sup", type: "edge-half" },
      { from: "sup", to: "t", type: "link" },
      { from: "btp", to: "crit", type: "edge-half" },
      { from: "crit", to: "sup", type: "edge-to-edge" },
    ]);
    expect(graph.nodes.filter((n) => n.id === "sup")).toHaveLength(1);
  });

  it("reuses a claim referenced from two places without duplicating the node", () => {
    const graph = graphOf(
      [
        "= A &a",
        "  < supports &l1",
        "    = Shared &s",
        "= B &b",
        "  < supports &l2",
        "    = $s",
      ].join("\n"),
      implied,
    );
    expect(graph.nodes.filter((n) => n.id === "s")).toHaveLength(1);
    expect(graph.edges).toContainEqual({ from: "s", to: "l1", type: "edge-half" });
    expect(graph.edges).toContainEqual({ from: "s", to: "l2", type: "edge-half" });
  });

  it("keeps notes and drops half-edges from unresolved references", () => {
    const graph = graphOf("= A &a\n  < supports &l\n    ~ a note &nt\n    = B &b", implied);
    expect(graph.nodes).toContainEqual({ id: "nt", type: "note", text: "a note" });
    expect(graph.edges).toContainEqual({ from: "nt", to: "l", type: "note" });

    const dangling = graphOf("= A &a\n  < supports &l\n    = $nope", implied);
    expect(dangling.edges).toEqual([{ from: "l", to: "a", type: "link" }]);
  });

  it("builds a topic header from %description and %perspectives", () => {
    const graph = graphOf(
      "%description: Why we care\n%perspectives: [alice, bob]\n= A &a",
      implied,
    );
    expect(graph.nodes[0]).toEqual({
      id: "_topic",
      type: "topic",
      text: "Why we care\nScores: [alice, bob]",
    });
  });

  it("omits the topic header when the document declares neither property", () => {
    const graph = graphOf("= A &a", implied);
    expect(graph.nodes.map((n) => n.type)).not.toContain("topic");
    expect(graph.edges).toEqual([]);
  });
});

describe("toGraph — source lines", () => {
  const source = ["%description: D", "= Thesis &t", "  < supports[8] &sup", "    = Reason &r"].join(
    "\n",
  );

  it("points a claim's box at the line that wrote it", () => {
    const { nodes } = withLines(source, spelledOut());
    expect(nodes.find((n) => n.id === "r")?.lines).toEqual([4]);
  });

  it("points a labeled connector at the edge line, not at either endpoint's", () => {
    const { edges } = withLines(source, spelledOut());
    expect(edges.find((e) => e.type === "supports")?.lines).toEqual([3]);
  });

  it("gives a reified edge and both its halves the same line under `implied`", () => {
    const { nodes, edges } = withLines(source, implied);
    expect(nodes.find((n) => n.id === "sup")?.lines).toEqual([3]);
    expect(edges.filter((e) => e.from === "sup" || e.to === "sup").map((e) => e.lines)).toEqual([
      [3],
      [3],
    ]);
  });

  it("adds a `$ref` line to the claim's box, after the box's own", () => {
    // A click lands on `lines[0]`, so the declaring line leads; the ref lines are what let
    // the caret on any use light the one shared box up.
    const src = "= A &a\n= B &b\n  < supports &l\n    = $a";
    const { nodes } = withLines(src, spelledOut());
    expect(nodes.find((n) => n.id === "a")?.lines).toEqual([1, 4]);
  });

  it("adds a `= $edge` block's line to the edge it argues about", () => {
    const src = "= T &t\n  < supports &sup\n    = R &r\n= $sup\n  < critiques &c\n    = N &n";
    const { nodes, edges } = withLines(src, spelledOut());
    expect(edges.find((e) => e.type === "supports")?.lines).toEqual([2, 4]);
    // The argued edge's detached node is the same edge drawn again, so it lights up too.
    expect(nodes.find((n) => n.id === "sup")?.lines).toEqual([2, 4]);
  });

  it("leaves the anchor without one: nothing wrote it", () => {
    const { edges } = withLines(source, spelledOut());
    expect(edges.find((e) => e.type === "anchor")).toEqual({
      from: "t",
      to: "_topic",
      type: "anchor",
    });
  });
});
