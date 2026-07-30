import { describe, expect, it } from "vitest";
import type { Graph } from "../types.ts";
import { parse } from "./parse.ts";
import { toMermaid } from "./toMermaid.ts";
import { defaultConfig } from "./defaultConfig.ts";
import sample from "./example.txt?raw";

describe("toMermaid", () => {
  it("draws claims as rectangles and reified links as stadiums between them", () => {
    const { graph } = parse("= Thesis &t\n  < supports[8] &sup\n    = Reason &r");
    const out = toMermaid(graph, defaultConfig);
    expect(out.startsWith("flowchart BT")).toBe(true);
    expect(out).toContain('t["💬 Thesis"]:::claim');
    expect(out).toContain('sup(["✅ supports<br/>[8]"]):::supports');
    expect(out).toContain("r --> sup");
    expect(out).toContain("sup --> t");
    expect(out).toContain("classDef supports");
  });

  it("puts scores on a second line", () => {
    const { graph } = parse("=[6,-,8] A claim &a");
    expect(toMermaid(graph, defaultConfig)).toContain('a["💬 A claim<br/>[6,-,8]"]:::claim');
  });

  it("styles a critiques link distinctly from a supports link", () => {
    const { graph } = parse("= A &a\n  < critiques[2] &crit\n    = B &b");
    expect(toMermaid(graph, defaultConfig)).toContain('crit(["⛔ critiques<br/>[2]"]):::critiques');
  });

  it("uses a dotted edge and parallelogram shape for notes", () => {
    const { graph } = parse("= A &a\n  ~ a note &nt");
    const out = toMermaid(graph, defaultConfig);
    expect(out).toContain('nt[/"📝 a note"/]:::note');
    expect(out).toContain("nt -.-> a");
  });

  it("renders the topic header as a subroutine box carrying the perspectives key", () => {
    const { graph } = parse("%description: Why we care\n%perspectives: [alice, bob]\n= A &a");
    expect(toMermaid(graph, defaultConfig)).toContain(
      '_topic[["📋 Why we care<br/>Scores: [alice, bob]"]]:::topic',
    );
  });

  it("anchors the topic header to the first root claim with an invisible edge", () => {
    const { graph } = parse(
      "%perspectives: [alice]\n= Thesis &t\n  < supports[8] &sup\n    = Reason &r",
    );
    // `r` argues for something, `t` doesn't — so `t` is the root the header hangs off. The root
    // is the *source* so that BT ranks the header above it.
    expect(graph.edges).toContainEqual({ from: "t", to: "_topic", type: "anchor" });
    expect(toMermaid(graph, defaultConfig)).toContain("t ~~~ _topic");
  });

  it("skips the anchor when there is no topic header", () => {
    const { graph } = parse("= Thesis &t");
    expect(graph.edges).toEqual([]);
  });

  it("omits icons when showIcons is false", () => {
    const { graph } = parse("= A &a\n  < supports[8] &sup\n    = B &b");
    const out = toMermaid(graph, { ...defaultConfig, showIcons: false });
    expect(out).toContain('a["A"]:::claim');
    expect(out).toContain('sup(["supports<br/>[8]"]):::supports');
  });

  it("escapes embedded quotes and sanitizes unsafe ids", () => {
    const graph: Graph = {
      nodes: [{ id: "wall-reduces", type: "claim", text: 'say "hi"' }],
      edges: [],
    };
    const out = toMermaid(graph, defaultConfig);
    expect(out).toContain("&quot;hi&quot;");
    expect(out).toContain("wall_reduces[");
  });

  it("returns a placeholder for an empty graph", () => {
    expect(toMermaid({ nodes: [], edges: [] }, defaultConfig)).toContain("_empty");
  });

  it("matches the generated-mermaid snapshot for the bundled sample", () => {
    expect(toMermaid(parse(sample).graph, defaultConfig)).toMatchSnapshot();
  });
});
