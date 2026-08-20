import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import { toMermaid } from "./toMermaid.ts";
import { defaultConfig } from "./defaultConfig.ts";
import sessionStorage from "./examples/session-storage.txt?raw";
import buildAWall from "./examples/build-a-wall.txt?raw";

/** The features argument is Kialo's unused one; `theme` is what the two after it are here for. */
const render = (source: string, config = defaultConfig) =>
  toMermaid(parse(source).doc, config, {}, "light").text;

const sourceMap = (source: string) =>
  toMermaid(parse(source).doc, defaultConfig, {}, "light").sourceMap;

describe("toMermaid", () => {
  it("emits a flowchart with shapes, classes and child -> parent edges", () => {
    const out = render("? Q &q\n  =[3] Thesis &t\n    +[4] Reason &r");
    expect(out.startsWith("flowchart BT")).toBe(true);
    expect(out).toContain('q{{"❓ Q"}}:::question');
    expect(out).toContain('t["💬 Thesis<br/>[3]"]:::thesis');
    expect(out).toContain('r["✅ Reason<br/>[4]"]:::pro');
    expect(out).toContain("t e0@--> q");
  });

  it("dashes a copy with a second class, so it keeps its stance type's fill and stroke", () => {
    // Mermaid appends both classes and concatenates their styles — see ../mermaidFlowchart.ts.
    const out = render("= A &a\n  -[1] Shared &s\n= B &b\n  +[4] $s");
    expect(out).toContain('a2["✅ Shared 🔀<br/>[4]"]:::pro');
    expect(out).toContain("classDef dashed stroke-dasharray:4 3");
    expect(out).toContain("class a2 dashed");
    // No connector here carries a stance, so nothing asks for a linkStyle.
    expect(out).not.toContain("linkStyle");
  });

  it("omits icons when showIcons is false, including a claim's source marker", () => {
    const source = "=[3] Thesis &t\n  +[2] Reason &r\n    @ https://e.example";
    expect(render(source)).toContain('r["✅ Reason 🔗<br/>[2]"]:::pro');
    expect(render(source, { ...defaultConfig, showIcons: false })).toContain(
      'r["Reason<br/>[2]"]:::pro',
    );
  });

  it("returns a placeholder for an empty document", () => {
    expect(render("")).toContain("_empty");
  });

  it("matches the generated-mermaid snapshot for the session-storage example", () => {
    expect(render(sessionStorage)).toMatchSnapshot();
  });

  it("matches the generated-mermaid snapshot for the build-a-wall example", () => {
    expect(render(buildAWall)).toMatchSnapshot();
  });
});

describe("sourceMap", () => {
  it("maps each box and connector back to the line that wrote it", () => {
    const map = sourceMap("? Q &q\n  =[3] Thesis &t\n    +[4] Reason &r");
    expect(map.nodes).toEqual({ q: [1], t: [2], r: [3] });
    // A `+` line writes a claim and attaches it, so it draws a box and a connector.
    expect(map.edges).toEqual({ e0: [2], e1: [3] });
  });

  it("leads a copy with the line that reuses the claim, then the claim's other uses", () => {
    const map = sourceMap("= A &a\n  - Shared &s\n= B &b\n  + $s");
    expect(map.nodes.s).toEqual([2, 4]);
    expect(map.nodes.a2).toEqual([4, 2]);
  });

  it("keys a box by the id mermaid was given, not by the one the document wrote", () => {
    // `buildIdMap` sanitizes `ops-cost`; a map keyed by the ontology's id would miss the box.
    expect(sourceMap("= A &ops-cost").nodes).toEqual({ ops_cost: [1] });
  });

  it("leaves the `@` source line and the anchor out: neither draws anything of its own", () => {
    const map = sourceMap("%description: D\n= T &t\n  @ https://e.example A study");
    expect(map.nodes).toEqual({ _topic: [1], t: [2] });
    expect(map.edges).toEqual({});
  });
});
