import { describe, expect, it } from "vitest";
import type { BasicArgDoc } from "./model.ts";
import { parse } from "./parse.ts";
import { mermaidExport } from "../mermaidExport.ts";
import { basicArgumentMap } from "./index.ts";
import { defaultConfig } from "./defaultConfig.ts";
import example from "./examples/session-storage.txt?raw";

const render = (doc: BasicArgDoc, config = defaultConfig) =>
  mermaidExport(basicArgumentMap.toGraph(doc, config, {}), config, basicArgumentMap, "light");

describe("mermaidExport", () => {
  it("emits a flowchart with shapes, classes and child -> parent edges", () => {
    const { doc } = parse("= Root &q1\n  = Claim &i1");
    const out = render(doc);
    expect(out.startsWith("flowchart BT")).toBe(true);
    expect(out).toContain('q1["💡 Root"]:::claim');
    expect(out).toContain('i1["💡 Claim"]:::claim');
    expect(out).toContain("i1 --> q1");
    expect(out).toContain("classDef claim");
  });

  it("uses a dotted edge and parallelogram shape for notes", () => {
    const { doc } = parse("= Claim &i1\n  ~ a note &nt1");
    const out = render(doc);
    expect(out).toContain('nt1[/"📝 a note"/]:::note');
    expect(out).toContain("nt1 -.-> i1");
  });

  it("renders support and critique as boxes with plain arrows", () => {
    const { doc } = parse("= Claim &claim\n  + Support &support\n  - Critique &critique");
    const out = render(doc);
    expect(out).toContain('support["✅ Support"]:::support');
    expect(out).toContain('critique["⛔ Critique"]:::critique');
    expect(out).toContain("support --> claim");
    expect(out).toContain("critique --> claim");
    expect(out).not.toContain("classDef question");
  });

  it("omits icons when showIcons is false", () => {
    const { doc } = parse("= Root &q1");
    const out = render(doc, { ...defaultConfig, showIcons: false });
    expect(out).toContain('q1["Root"]:::claim');
  });

  it("escapes embedded quotes and sanitizes unsafe ids", () => {
    const doc: BasicArgDoc = {
      nodes: [{ id: "weird-id", type: "claim", text: 'say "hi"', notes: [] }],
      edges: [],
      notes: [],
      sourceLines: {},
    };
    const out = render(doc);
    expect(out).toContain("&quot;hi&quot;");
    expect(out).toContain("weird_id[");
  });

  it("escapes markup so labels render as typed, keeping newlines as breaks", () => {
    const doc: BasicArgDoc = {
      nodes: [{ id: "n1", type: "claim", text: "5 < 6 & <img src=x>\nsecond line", notes: [] }],
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
