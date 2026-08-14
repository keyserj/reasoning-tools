import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import { toMermaid } from "./toMermaid.ts";
import { defaultConfig } from "./defaultConfig.ts";
import sessionStorage from "./examples/session-storage.txt?raw";
import buildAWall from "./examples/build-a-wall.txt?raw";

/** The features argument is Kialo's unused one; `theme` is what the two after it are here for. */
const render = (source: string, config = defaultConfig) =>
  toMermaid(parse(source).doc, config, {}, "light");

describe("toMermaid", () => {
  it("emits a flowchart with shapes, classes and child -> parent edges", () => {
    const out = render("? Q &q\n  =[3] Thesis &t\n    +[4] Reason &r");
    expect(out.startsWith("flowchart BT")).toBe(true);
    expect(out).toContain('q{{"❓ Q"}}:::question');
    expect(out).toContain('t["💬 Thesis<br/>[3]"]:::thesis');
    expect(out).toContain('r["✅ Reason<br/>[4]"]:::pro');
    expect(out).toContain("t --> q");
  });

  it("colors an unfolded connector from the same config entry its box type uses", () => {
    // Restyling "Pro" has to move its connectors as well as its boxes, which is what
    // `EdgeTypeDef.colorTypeId` buys — see ../types.ts.
    const source = "= A &a\n  -[1] Shared &s\n= B &b\n  +[4] $s";
    expect(render(source)).toContain('s -->|"⛔ [1]"| a');
    expect(render(source)).toContain(`stroke:${defaultConfig.typeColors.pro}`);

    const restyled = {
      ...defaultConfig,
      typeColors: { ...defaultConfig.typeColors, pro: "#00aa77" },
    };
    // Light mode draws a border in exactly the color picked, so the connector says it plainly.
    expect(render(source, restyled)).toContain("stroke:#00aa77");
    expect(render(source, restyled)).not.toContain(`stroke:${defaultConfig.typeColors.pro}`);
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
