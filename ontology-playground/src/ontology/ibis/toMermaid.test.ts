import { describe, expect, it } from "vitest";
import type { Graph } from "../types.ts";
import { parse } from "./parse.ts";
import { toMermaid } from "./toMermaid.ts";
import { defaultConfig } from "./defaultConfig.ts";
import example from "./examples/session-storage.txt?raw";

/** The features argument is IBIS's unused one; `theme` is what the two after it are here for. */
const render = (graph: Graph, config = defaultConfig) => toMermaid(graph, config, {}, "light");

describe("toMermaid", () => {
  it("emits a flowchart with shapes, classes and child -> parent edges", () => {
    const { doc: graph } = parse("? Q &q1\n  = Idea &i1");
    const out = render(graph);
    expect(out.startsWith("flowchart BT")).toBe(true);
    expect(out).toContain('q1{{"❓ Q"}}:::question');
    expect(out).toContain('i1["💡 Idea"]:::idea');
    expect(out).toContain("i1 --> q1");
    expect(out).toContain("classDef question");
  });

  it("uses a dotted edge and parallelogram shape for notes", () => {
    const { doc: graph } = parse("= Idea &i1\n  ~ a note &nt1");
    const out = render(graph);
    expect(out).toContain('nt1[/"📝 a note"/]:::note');
    expect(out).toContain("nt1 -.-> i1");
  });

  it("omits icons when showIcons is false", () => {
    const { doc: graph } = parse("? Q &q1");
    const out = render(graph, { ...defaultConfig, showIcons: false });
    expect(out).toContain('q1{{"Q"}}:::question');
  });

  it("escapes embedded quotes and sanitizes unsafe ids", () => {
    const graph: Graph = {
      nodes: [{ id: "weird-id", type: "idea", text: 'say "hi"' }],
      edges: [],
    };
    const out = render(graph);
    expect(out).toContain("&quot;hi&quot;");
    expect(out).toContain("weird_id[");
  });

  it("escapes markup so labels render as typed, keeping newlines as breaks", () => {
    const graph: Graph = {
      nodes: [{ id: "n1", type: "idea", text: "5 < 6 & <img src=x>\nsecond line" }],
      edges: [],
    };
    const out = render(graph);
    expect(out).toContain("5 &lt; 6 &amp; &lt;img src=x&gt;");
    expect(out).toContain("<br/>second line");
  });

  it("returns a placeholder for an empty graph", () => {
    const out = render({ nodes: [], edges: [] });
    expect(out).toContain("_empty");
  });

  it("matches the generated-mermaid snapshot for the session-storage example", () => {
    expect(render(parse(example).doc)).toMatchSnapshot();
  });
});
