import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import { mermaidExport } from "../mermaidExport.ts";
import { ameliorateV2 as ontology } from "./index.ts";
import { defaultConfig } from "./defaultConfig.ts";
import { VIEW, EDGE_CLAIMS } from "./features.ts";
import { deriveTypeStyle } from "../typeColors.ts";
import { defaultConfig as argMapConfig } from "../arg-map-truth-and-relevance/defaultConfig.ts";
import type { FeatureState, StyleConfig, Theme } from "../types.ts";

const fullImplied: FeatureState = {};
const fullSpelled: FeatureState = { [EDGE_CLAIMS]: { option: "spelled-out" } };
const exportOf = (
  text: string,
  features = fullImplied,
  theme: Theme = "light",
  config: StyleConfig = defaultConfig,
) => mermaidExport(ontology.toGraph(parse(text).doc, config, features), config, ontology, theme);
const sample =
  "%perspectives: [alice, bob]\n* Wall &w #action\n  > reduces[3,-5] &r\n    * Immigration &i\n= $r\n  < supports[8,-] &s\n    = Evidence &e\n      ~ Note";

describe("mermaidExport", () => {
  it.each(
    ["full", "causal"].flatMap((view) =>
      ["implied", "spelled-out"].map((display) => ({ view, display })),
    ),
  )("emits $view / $display", ({ view, display }) => {
    expect(
      exportOf(sample, { [VIEW]: { option: view }, [EDGE_CLAIMS]: { option: display } }),
    ).toMatchSnapshot();
  });

  it("draws a merged relation box as two halves through it", () => {
    const text = exportOf(sample);
    expect(text).toContain("w --- r");
    expect(text).toContain("r --> i");
  });

  it("draws a detached claim beside its labeled connector", () => {
    const text = exportOf(sample, fullSpelled);
    expect(text).toContain('w -->|"⛔ ① reduces [3,-5]"| i');
    expect(text).toContain("r__implied ~~~ i");
  });

  it("matches Arg map's support and critique default colors", () => {
    expect(defaultConfig.typeColors["positive-relation"]).toBe(argMapConfig.typeColors.supports);
    expect(defaultConfig.typeColors["negative-relation"]).toBe(argMapConfig.typeColors.critiques);
  });

  it.each(
    (["light", "dark"] as const).flatMap((theme) =>
      ["implied", "spelled-out"].map((display) => ({ theme, display })),
    ),
  )(
    "shares configured relation colors between boxes and connectors in $theme / $display",
    ({ theme, display }) => {
      const colors = {
        "positive-relation": "#347891",
        "negative-relation": "#9452a5",
        relation: "#778899",
      };
      const output = exportOf(
        `${sample}\n* Whole &whole\n  > has\n    * Part &part`,
        { [EDGE_CLAIMS]: { option: display } },
        theme,
        { ...defaultConfig, typeColors: { ...defaultConfig.typeColors, ...colors } },
      );
      for (const [id, color] of Object.entries(colors)) {
        const style = deriveTypeStyle(color, theme);
        expect(output).toContain(
          `classDef ${id} fill:${style.fill},stroke:${style.border},color:${style.text}`,
        );
      }
      const indices = display === "implied" ? ["0,1", "2,3", "4,5"] : ["0", "1", "2"];
      for (const [i, id] of ["negative-relation", "positive-relation", "relation"].entries()) {
        const color = colors[id as keyof typeof colors];
        expect(output).toContain(
          `linkStyle ${indices[i]} stroke:${deriveTypeStyle(color, theme).border}`,
        );
      }
    },
  );

  it("escapes literal markup and quotes without changing the scores", () => {
    const output = exportOf('*[-4,-] A <img src="example"> &amp; &a');
    expect(output).toContain("&lt;img src=&quot;example&quot;&gt; &amp;amp;");
    expect(output).not.toContain("<img");
    expect(output).toContain("[-4,-]");
  });

  it("keeps ids distinct when sanitizing them, including prototype names", () => {
    const output = exportOf(
      "* A &constructor\n* B &_constructor\n* C &a-b\n* D &a_b\n* E &__proto__",
    );
    const ids = [...output.matchAll(/^ {2}([A-Za-z0-9_]+)\(/gm)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(5);
    expect(ids.every((id) => !(id in Object.prototype))).toBe(true);
  });

  it("supports direction and icon options", () => {
    const output = exportOf(sample, {}, "light", {
      ...defaultConfig,
      direction: "TB",
      showIcons: false,
    });
    expect(output.startsWith("flowchart TB")).toBe(true);
    expect(output).not.toMatch(/🔗|✅|⛔/);
  });

  it("emits just the header for an empty document", () => {
    expect(exportOf("")).toBe(`flowchart ${defaultConfig.direction}`);
  });
});
