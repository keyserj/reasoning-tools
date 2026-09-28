import { describe, expect, it } from "vitest";
import { highlightLine } from "./highlight.ts";
import { EDGE_TYPES } from "./markers.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";
import source from "../../../../ameliorate-v2/examples/build-a-wall.txt?raw";

describe("highlightLine", () => {
  it.each([
    ["*", "concept"],
    ["?", "question"],
    ["=", "claim"],
    ["@", "source"],
  ])("colors %s with the %s type", (marker, typeId) => {
    expect(highlightLine(`${marker} Text`)).toEqual([
      { text: marker, kind: "type", typeId, loneMarker: true },
      { text: " Text" },
    ]);
  });

  it("preserves signed scores, unscored slots and whitespace", () => {
    expect(highlightLine("  *[-4, -,8] A")).toEqual([
      { text: "  " },
      { text: "*", kind: "type", typeId: "concept", loneMarker: true },
      { text: "[", kind: "score-punct" },
      { text: "-4", kind: "score-value" },
      { text: ",", kind: "score-punct" },
      { text: " -", kind: "score-value" },
      { text: ",", kind: "score-punct" },
      { text: "8", kind: "score-value" },
      { text: "]", kind: "score-punct" },
      { text: " A" },
    ]);
  });

  it("uses the configurable relation type for a multiword relation and its direction", () => {
    expect(highlightLine("\t> negatively correlates with[-2,-] &corr ")).toEqual([
      { text: "\t" },
      { text: ">", kind: "type", typeId: "relation" },
      { text: " " },
      { text: "negatively correlates with", kind: "type", typeId: "relation" },
      { text: "[", kind: "score-punct" },
      { text: "-2", kind: "score-value" },
      { text: ",", kind: "score-punct" },
      { text: "-", kind: "score-value" },
      { text: "]", kind: "score-punct" },
      { text: " " },
      { text: "&corr", kind: "id-decl" },
      { text: " " },
    ]);
  });

  it.each(Object.keys(EDGE_TYPES))("recognizes the entire %s relation", (name) => {
    expect(highlightLine(`  < ${name}[4,-] &r`).filter((token) => token.kind === "type")).toEqual([
      { text: "<", kind: "type", typeId: "relation" },
      { text: name, kind: "type", typeId: "relation" },
    ]);
  });

  it("peels interleaved node tags and IDs while retaining their original order and spacing", () => {
    expect(highlightLine("* A #topic  &wall\t#action ")).toEqual([
      { text: "*", kind: "type", typeId: "concept", loneMarker: true },
      { text: " A" },
      { text: " " },
      { text: "#topic", kind: "tag" },
      { text: "  " },
      { text: "&wall", kind: "id-decl" },
      { text: "\t" },
      { text: "#action", kind: "tag" },
      { text: " " },
    ]);
  });

  it.each(["*", "?", "=", "@"])(
    "marks a %s reference without treating its ID as prose",
    (marker) => {
      expect(
        highlightLine(`${marker}  $__proto__ `).filter((token) => token.kind === "id-ref"),
      ).toEqual([{ text: "$__proto__", kind: "id-ref" }]);
    },
  );

  it("leaves property values and note bodies as prose", () => {
    expect(highlightLine("%opposite: $ref &id #tag")).toEqual([
      { text: "%opposite:", kind: "property" },
      { text: " $ref &id #tag" },
    ]);
    expect(highlightLine("~ $ref &id #tag")).toEqual([
      { text: "~", kind: "type", typeId: "note", loneMarker: true },
      { text: " $ref &id #tag" },
    ]);
  });

  it("doesn't highlight tags on relation lines or suffix-like words within prose", () => {
    for (const line of ["> causes &id #action", "* R&D and #topic prose", "* NoSpace#action"]) {
      expect(
        highlightLine(line).filter((token) => token.kind === "tag" || token.kind === "id-decl"),
      ).toEqual([]);
    }
  });

  it("marks an entire comment", () => {
    expect(highlightLine("  / * A &id #tag")).toEqual([
      { text: "  " },
      { text: "/ * A &id #tag", kind: "comment" },
    ]);
  });

  it("leaves unfinished scores and unknown relation words plain", () => {
    expect(highlightLine("*[-4,")).toEqual([
      { text: "*", kind: "type", typeId: "concept", loneMarker: true },
      { text: "[-4," },
    ]);
    expect(highlightLine("> causesExtra[4]")).toEqual([{ text: "> causesExtra[4]" }]);
    expect(highlightLine("%perspectives")).toEqual([{ text: "%perspectives" }]);
  });

  it("preserves every character in the example and partially typed syntax", () => {
    const lines = [
      ...source.split(/\r?\n/),
      "",
      "  ",
      "\t*",
      "*  &a #b &c #d\t",
      "* &only",
      "* #only",
      "* $a #tag &id",
      "* [4] text",
      ">",
      "> has &a &b",
      "= $ref extra",
      "~ &note",
      "! Unknown",
      "@[] X",
    ];
    const types = new Set(renderedNodeTypes.map((type) => type.id));
    for (const line of lines) {
      const tokens = highlightLine(line);
      expect(tokens.map((token) => token.text).join(""), line).toBe(line);
      expect(
        tokens.every((token) => token.text.length > 0),
        line,
      ).toBe(true);
      for (const token of tokens) {
        if (token.kind === "type") expect(types.has(token.typeId!)).toBe(true);
      }
    }
  });
});
