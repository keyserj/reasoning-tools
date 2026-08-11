import { describe, expect, it } from "vitest";
import type { FeatureState } from "../types.ts";
import { parse } from "./parse.ts";
import { toMermaid } from "./toMermaid.ts";
import { defaultConfig } from "./defaultConfig.ts";
import { EDGE_CLAIMS, IMPLIED } from "./features.ts";
import sessionStorage from "./examples/session-storage.txt?raw";
import buildAWall from "./examples/build-a-wall.txt?raw";

/** `{}` resolves to every feature's default, which is what a fresh document has. */
const defaults: FeatureState = {};
const implied: FeatureState = { [EDGE_CLAIMS]: { option: IMPLIED } };

const render = (text: string, features = defaults, config = defaultConfig) =>
  toMermaid(parse(text).doc, config, features, "light");

describe("toMermaid", () => {
  it("draws claims as rectangles joined by a labeled, colored edge", () => {
    const out = render("= Thesis &t\n  < supports[8] &sup\n    = Reason &r");
    expect(out.startsWith("flowchart BT")).toBe(true);
    expect(out).toContain('t["💬 Thesis"]:::claim');
    expect(out).toContain('r -->|"✅ supports [8]"| t');
    // Without color the two edge types would differ only by the word in the label.
    expect(out).toContain("linkStyle 0 stroke:#2166ac");
  });

  it("styles a critiques edge distinctly from a supports edge", () => {
    const out = render("= A &a\n  < critiques[2] &crit\n    = B &b");
    expect(out).toContain('b -->|"⛔ critiques [2]"| a');
    expect(out).toContain("linkStyle 0 stroke:#b2182b");
  });

  it("draws an argued-about edge as a detached claim spelling its claim out", () => {
    const out = render(
      "= Thesis &t\n  < supports[8] &sup\n    = Reason &r\n= $sup\n  < critiques[2] &c\n    = No &n",
    );
    expect(out).toContain(
      'sup["💬 ① &quot;Reason&quot; supports &quot;Thesis&quot;<br/>[8]"]:::claim',
    );
    // The same marker on the edge is what says which edge that node is about, and the
    // invisible anchor is what stops dagre from parking it across the diagram.
    expect(out).toContain('r -->|"✅ ① supports [8]"| t');
    expect(out).toContain("sup ~~~ t");
  });

  it("reifies every edge into a stadium in the implied rendering", () => {
    const out = render("= Thesis &t\n  < supports[8] &sup\n    = Reason &r", implied);
    expect(out).toContain('sup(["✅ supports<br/>[8]"]):::supports');
    expect(out).toContain("r --- sup");
    expect(out).toContain("sup --> t");
    expect(out).not.toContain("linkStyle");
  });

  it("thickens the connector that lands on another edge box", () => {
    const out = render(
      "= Thesis &t\n  < supports &sup\n    = Reason &r\n= $sup\n  < critiques &c\n    = No &n",
      implied,
    );
    expect(out).toContain("c ==> sup");
  });

  it("puts scores on a second line", () => {
    expect(render("=[6,-,8] A claim &a")).toContain('a["💬 A claim<br/>[6,-,8]"]:::claim');
  });

  it("uses a dotted edge and parallelogram shape for notes", () => {
    const out = render("= A &a\n  ~ a note &nt");
    expect(out).toContain('nt[/"📝 a note"/]:::note');
    expect(out).toContain("nt -.-> a");
  });

  it("renders the topic header as a subroutine box carrying the perspectives key", () => {
    const out = render("%description: Why we care\n%perspectives: [alice, bob]\n= A &a");
    expect(out).toContain('_topic[["📋 Why we care<br/>Scores: [alice, bob]"]]:::topic');
  });

  it("anchors the topic header to the first root claim with an invisible edge", () => {
    // `r` argues for something, `t` doesn't — so `t` is the root the header hangs off. The
    // root is the *source* so that BT ranks the header above it.
    const out = render(
      "%perspectives: [alice]\n= Thesis &t\n  < supports[8] &sup\n    = Reason &r",
    );
    expect(out).toContain("t ~~~ _topic");
  });

  it("counts linkStyle indices by emitted line, not by position in the edge list", () => {
    // The first edge's `$nope` never resolves, so it is dropped and the *second* edge
    // is mermaid's edge 0. Using the array index here would paint the wrong edge.
    const out = render("= A &a\n  < supports &l\n    = $nope\n  < critiques[2] &c\n    = B &b");
    expect(out).toContain('b -->|"⛔ critiques [2]"| a');
    expect(out).toContain("linkStyle 0 stroke:#b2182b");
  });

  it("omits icons on nodes and edge labels when showIcons is false", () => {
    const out = render("= A &a\n  < supports[8] &sup\n    = B &b", defaults, {
      ...defaultConfig,
      showIcons: false,
    });
    expect(out).toContain('a["A"]:::claim');
    expect(out).toContain('b -->|"supports [8]"| a');
  });

  it("escapes embedded quotes and sanitizes unsafe ids", () => {
    const out = render('= say "hi" &wall-reduces');
    expect(out).toContain("&quot;hi&quot;");
    expect(out).toContain("wall_reduces[");
  });

  it("returns a placeholder for an empty document", () => {
    expect(render("")).toContain("_empty");
  });

  it("matches the generated-mermaid snapshots for the bundled examples", () => {
    expect(render(sessionStorage)).toMatchSnapshot();
    expect(render(buildAWall)).toMatchSnapshot();
    expect(render(buildAWall, implied)).toMatchSnapshot();
  });
});
