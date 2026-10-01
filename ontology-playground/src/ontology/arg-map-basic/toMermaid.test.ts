import { describe, expect, it } from "vitest";
import type { BasicArgDoc } from "./model.ts";
import { parse } from "./parse.ts";
import { toMermaid } from "./toMermaid.ts";
import { defaultConfig } from "./defaultConfig.ts";
import example from "./examples/session-storage.txt?raw";

const render = (doc: BasicArgDoc, config = defaultConfig) =>
  toMermaid(doc, config, {}, "light").text;

const sourceMap = (source: string) =>
  toMermaid(parse(source).doc, defaultConfig, {}, "light").sourceMap;

describe("toMermaid", () => {
  it("emits a flowchart with shapes, classes and child -> parent edges", () => {
    const { doc } = parse("= Root &q1\n  = Claim &i1");
    const out = render(doc);
    expect(out.startsWith("flowchart BT")).toBe(true);
    expect(out).toContain('q1["💡 Root"]:::claim');
    expect(out).toContain('i1["💡 Claim"]:::claim');
    expect(out).toContain("i1 e0@--> q1");
    expect(out).toContain("classDef claim");
  });

  it("uses a dotted edge and parallelogram shape for notes", () => {
    const { doc } = parse("= Claim &i1\n  ~ a note &nt1");
    const out = render(doc);
    expect(out).toContain('nt1[/"📝 a note"/]:::note');
    expect(out).toContain("nt1 e0@-.-> i1");
  });

  it("renders support and critique as boxes with plain arrows", () => {
    const { doc } = parse("= Claim &claim\n  + Support &support\n  - Critique &critique");
    const out = render(doc);
    expect(out).toContain('support["✅ Support"]:::support');
    expect(out).toContain('critique["⛔ Critique"]:::critique');
    expect(out).toContain("support e0@--> claim");
    expect(out).toContain("critique e1@--> claim");
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

  it("returns a placeholder for an empty graph", () => {
    const out = render({ nodes: [], edges: [], notes: [], sourceLines: {} });
    expect(out).toContain("_empty");
  });

  it("matches the generated-mermaid snapshot for the session-storage example", () => {
    expect(render(parse(example).doc)).toMatchSnapshot();
  });
});

describe("sourceMap", () => {
  it("maps each box and the connector its nesting drew back to their lines", () => {
    const map = sourceMap("= Root &q1\n  = Claim &i1");
    expect(map.nodes).toEqual({ q1: [1], i1: [2] });
    expect(map.edges).toEqual({ e0: [2] });
  });

  it("points a `$ref` connector at the ref line, not at the node it reuses", () => {
    const map = sourceMap("= Claim &i1\n= Other &i2\n  + $i1");
    expect(map.edges).toEqual({ e0: [3] });
  });
});
