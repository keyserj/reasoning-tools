import { describe, expect, it } from "vitest";
import type { Graph } from "../types.ts";
import { parse } from "./parse.ts";
import { toMermaid } from "./toMermaid.ts";
import { defaultConfig } from "./defaultConfig.ts";
import { sample } from "./sample.ts";

describe("toMermaid", () => {
  it("emits a flowchart with shapes, classes and child -> parent edges", () => {
    const { graph } = parse("? Q &q1\n  = Idea &i1");
    const out = toMermaid(graph, defaultConfig);
    expect(out.startsWith("flowchart BT")).toBe(true);
    expect(out).toContain('q1{{"❓ Q"}}:::question');
    expect(out).toContain('i1["💡 Idea"]:::idea');
    expect(out).toContain("i1 --> q1");
    expect(out).toContain("classDef question");
  });

  it("uses a dotted edge and parallelogram shape for notes", () => {
    const { graph } = parse("= Idea &i1\n  ~ a note &nt1");
    const out = toMermaid(graph, defaultConfig);
    expect(out).toContain('nt1[/"📝 a note"/]:::note');
    expect(out).toContain("nt1 -.-> i1");
  });

  it("omits icons when showIcons is false", () => {
    const { graph } = parse("? Q &q1");
    const out = toMermaid(graph, { ...defaultConfig, showIcons: false });
    expect(out).toContain('q1{{"Q"}}:::question');
  });

  it("escapes embedded quotes and sanitizes unsafe ids", () => {
    const graph: Graph = {
      nodes: [{ id: "weird-id", type: "idea", text: 'say "hi"' }],
      edges: [],
    };
    const out = toMermaid(graph, defaultConfig);
    expect(out).toContain("&quot;hi&quot;");
    expect(out).toContain("weird_id[");
  });

  it("returns a placeholder for an empty graph", () => {
    const out = toMermaid({ nodes: [], edges: [] }, defaultConfig);
    expect(out).toContain("_empty");
  });

  it("matches the generated-mermaid snapshot for the bundled sample", () => {
    expect(toMermaid(parse(sample).graph, defaultConfig)).toMatchSnapshot();
  });
});
