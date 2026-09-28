import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import { toMermaid } from "./toMermaid.ts";
import { defaultConfig } from "./defaultConfig.ts";
import { VIEW, EDGE_CLAIMS } from "./features.ts";
import { deriveTypeStyle } from "../typeColors.ts";
import type { FeatureState, Theme } from "../types.ts";

const fullImplied: FeatureState = {};
const fullSpelled: FeatureState = { [EDGE_CLAIMS]: { option: "spelled-out" } };
const render = (text: string, features = fullImplied, theme: Theme = "light") =>
  toMermaid(parse(text).doc, defaultConfig, features, theme);
const sample =
  "%perspectives: [alice, bob]\n* Wall &w #action\n  > reduces[3,-5] &r\n    * Immigration &i\n= $r\n  < supports[8,-] &s\n    = Evidence &e\n      ~ Note";

describe("toMermaid", () => {
  it.each(
    ["full", "causal"].flatMap((view) =>
      ["implied", "spelled-out"].map((display) => ({ view, display })),
    ),
  )("emits $view / $display", ({ view, display }) => {
    expect(
      render(sample, { [VIEW]: { option: view }, [EDGE_CLAIMS]: { option: display } }).text,
    ).toMatchSnapshot();
  });

  it("maps the merged relation box to its declaration and implied references", () => {
    const output = render(sample);
    expect(output.sourceMap.nodes).toEqual({
      w: [2],
      i: [4],
      e: [7],
      r: [3, 5],
      s: [6],
      note_note: [8],
      _score_context: [1],
    });
    expect(output.sourceMap.edges).toEqual({ e0: [3], e1: [3], e2: [6], e3: [6], e4: [8] });
    expect(output.text).toContain("w e0@--- r");
    expect(output.text).toContain("r e1@--> i");
  });

  it("maps a detached claim to its reference and its labeled connector to the relation", () => {
    const output = render(sample, fullSpelled);
    expect(output.sourceMap.nodes.r__implied).toEqual([5]);
    expect(output.sourceMap.nodes.r).toBeUndefined();
    expect(output.sourceMap.edges).toEqual({ e0: [3], e1: [6], e3: [8] });
    expect(output.text).toContain('w e0@-->|"① reduces [3,-5]"| i');
    expect(output.text).toContain("r__implied ~~~ i");
  });

  it("omits filtered notes and claim references from the causal source map", () => {
    const output = render(sample, { [VIEW]: { option: "causal" } });
    expect(output.sourceMap.nodes).toEqual({ w: [2], i: [4], r: [3], _score_context: [1] });
    expect(output.sourceMap.edges).toEqual({ e0: [3], e1: [3] });
  });

  it.each(["light", "dark"] as const)(
    "shares the configured relation color between boxes and connectors in %s",
    (theme) => {
      const color = "#9452a5";
      const output = toMermaid(
        parse(sample).doc,
        { ...defaultConfig, typeColors: { ...defaultConfig.typeColors, relation: color } },
        {},
        theme,
      );
      const style = deriveTypeStyle(color, theme);
      expect(output.text).toContain(
        `classDef relation fill:${style.fill},stroke:${style.border},color:${style.text}`,
      );
      expect(output.text).toContain(`linkStyle 0,1,2,3 stroke:${style.border}`);
    },
  );

  it("escapes literal markup and quotes without changing the scores", () => {
    const output = render('*[-4,-] A <img src="example"> &amp; &a');
    expect(output.text).toContain("&lt;img src=&quot;example&quot;&gt; &amp;amp;");
    expect(output.text).not.toContain("<img");
    expect(output.text).toContain("[-4,-]");
  });

  it("keeps source targets distinct when sanitizing IDs, including prototype names", () => {
    const output = render(
      "* A &constructor\n* B &_constructor\n* C &a-b\n* D &a_b\n* E &__proto__",
    );
    const ids = Object.keys(output.sourceMap.nodes);
    expect(ids).toHaveLength(5);
    expect(ids.every((id) => !(id in Object.prototype))).toBe(true);
    expect(Object.values(output.sourceMap.nodes)).toEqual([[1], [2], [3], [4], [5]]);
  });

  it("supports direction and icon options without changing source targets", () => {
    const parsed = parse(sample).doc;
    const output = toMermaid(
      parsed,
      { ...defaultConfig, direction: "TB", showIcons: false },
      {},
      "light",
    );
    expect(output.text.startsWith("flowchart TB")).toBe(true);
    expect(output.text).not.toContain("🔗");
    expect(output.sourceMap).toEqual(render(sample).sourceMap);
  });

  it("leaves the empty placeholder without a source target", () => {
    const output = render("");
    expect(output.text).toContain("_empty");
    expect(output.sourceMap).toEqual({ nodes: {}, edges: {} });
  });

  it("maps a cyclic implied relation's loop segments to its declaration", () => {
    const output = render("= $loop\n  > supports &loop\n    = Claim &c");
    expect(output.sourceMap.nodes.loop).toEqual([2, 1]);
    expect(output.sourceMap.edges).toEqual({
      "loop-cyclic-special-1": [2],
      "loop-cyclic-special-mid": [2],
      "loop-cyclic-special-2": [2],
      e1: [2],
    });
  });
});
