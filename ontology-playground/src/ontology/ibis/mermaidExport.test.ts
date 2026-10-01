import { describe, expect, it } from "vitest";
import type { IbisDoc } from "./model.ts";
import { parse } from "./parse.ts";
import { mermaidExport } from "../mermaidExport.ts";
import { ibis } from "./index.ts";
import { defaultConfig } from "./defaultConfig.ts";
import example from "./examples/session-storage.txt?raw";

const render = (doc: IbisDoc, config = defaultConfig) =>
  mermaidExport(ibis.toGraph(doc, config, {}), config, ibis, "light");

describe("mermaidExport", () => {
  it("emits a flowchart with shapes, classes and child -> parent edges", () => {
    const { doc } = parse("? Q &q1\n  = Idea &i1");
    const out = render(doc);
    expect(out.startsWith("flowchart BT")).toBe(true);
    expect(out).toContain('q1{{"❓ Q"}}:::question');
    expect(out).toContain('i1["💡 Idea"]:::idea');
    expect(out).toContain("i1 --> q1");
    expect(out).toContain("classDef question");
  });

  it("uses a dotted edge and parallelogram shape for notes", () => {
    const { doc } = parse("= Idea &i1\n  ~ a note &nt1");
    const out = render(doc);
    expect(out).toContain('nt1[/"📝 a note"/]:::note');
    expect(out).toContain("nt1 -.-> i1");
  });

  it("draws a note as its own box on a dotted connector", () => {
    const { doc } = parse("= Idea &i1\n  ~ an aside &nt1");
    const out = render(doc);
    expect(out).toContain('nt1[/"📝 an aside"/]:::note');
    expect(out).toContain("nt1 -.-> i1");
  });

  it("omits icons when showIcons is false", () => {
    const { doc } = parse("? Q &q1");
    const out = render(doc, { ...defaultConfig, showIcons: false });
    expect(out).toContain('q1{{"Q"}}:::question');
  });

  it("escapes embedded quotes and sanitizes unsafe ids", () => {
    const doc: IbisDoc = {
      nodes: [{ id: "weird-id", type: "idea", text: 'say "hi"', notes: [] }],
      edges: [],
      notes: [],
      sourceLines: {},
    };
    const out = render(doc);
    expect(out).toContain("&quot;hi&quot;");
    expect(out).toContain("weird_id[");
  });

  it("escapes markup so labels render as typed, keeping newlines as breaks", () => {
    const doc: IbisDoc = {
      nodes: [{ id: "n1", type: "idea", text: "5 < 6 & <img src=x>\nsecond line", notes: [] }],
      edges: [],
      notes: [],
      sourceLines: {},
    };
    const out = render(doc);
    expect(out).toContain("5 &lt; 6 &amp; &lt;img src=x&gt;");
    expect(out).toContain("<br/>second line");
  });

  it("emits just the header for an empty graph", () => {
    expect(render({ nodes: [], edges: [], notes: [], sourceLines: {} })).toBe("flowchart BT");
  });

  it("matches the generated-mermaid snapshot for the session-storage example", () => {
    expect(render(parse(example).doc)).toMatchSnapshot();
  });
});
