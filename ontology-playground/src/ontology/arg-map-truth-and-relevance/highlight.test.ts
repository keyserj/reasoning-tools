import { describe, expect, it } from "vitest";
import { highlightLine } from "./highlight.ts";

// Exact token lists, because what the overlay draws is the *split*, not just the classification:
// a token boundary in the wrong place colors the wrong characters even when every kind is right.
// The concatenation invariant itself is checked over every shipped example in ../registry.test.ts.
describe("highlightLine", () => {
  it("lexes a claim's scores between its marker and its body", () => {
    expect(highlightLine("=[4,1,8] The US should build a wall &wall")).toEqual([
      { text: "=", kind: "type", typeId: "claim" },
      { text: "[", kind: "score-punct" },
      { text: "4", kind: "score-value" },
      { text: ",", kind: "score-punct" },
      { text: "1", kind: "score-value" },
      { text: ",", kind: "score-punct" },
      { text: "8", kind: "score-value" },
      { text: "]", kind: "score-punct" },
      { text: " The US should build a wall " },
      { text: "&wall", kind: "id-decl" },
    ]);
  });

  it("gives an edge line's marker and word the same type, so the pair reads as one statement", () => {
    expect(highlightLine("  < supports[8,-] &fast-supports-redis")).toEqual([
      { text: "  " },
      { text: "<", kind: "type", typeId: "supports" },
      { text: " " },
      { text: "supports", kind: "type", typeId: "supports" },
      { text: "[", kind: "score-punct" },
      { text: "8", kind: "score-value" },
      { text: ",", kind: "score-punct" },
      { text: "-", kind: "score-value" },
      { text: "]", kind: "score-punct" },
      { text: " " },
      { text: "&fast-supports-redis", kind: "id-decl" },
    ]);
  });

  it("leaves an unknown edge word — and the marker with it — uncolored", () => {
    expect(highlightLine("  > opposes[6]")).toEqual([{ text: "  " }, { text: "> opposes[6]" }]);
  });

  it("marks only the %key: head of a property line", () => {
    expect(highlightLine("%perspectives: [alice, bob]")).toEqual([
      { text: "%perspectives:", kind: "property" },
      { text: " [alice, bob]" },
    ]);
  });

  it("marks a claim that is only a $ref", () => {
    expect(highlightLine("    = $ops-cost")).toEqual([
      { text: "    " },
      { text: "=", kind: "type", typeId: "claim" },
      { text: " " },
      { text: "$ops-cost", kind: "id-ref" },
    ]);
  });

  it("colors a note's marker and leaves its prose alone", () => {
    expect(highlightLine("      ~ measured on last year's hardware")).toEqual([
      { text: "      " },
      { text: "~", kind: "type", typeId: "note" },
      { text: " measured on last year's hardware" },
    ]);
  });

  it("takes a whole meta line as a comment, marker included", () => {
    expect(highlightLine("  / reuse: the same claim argues both ways")).toEqual([
      { text: "  " },
      { text: "/ reuse: the same claim argues both ways", kind: "comment" },
    ]);
  });

  it("leaves an unclosed score bracket plain rather than half-lexing it", () => {
    expect(highlightLine("=[4,1 half-typed")).toEqual([
      { text: "=", kind: "type", typeId: "claim" },
      { text: "[4,1 half-typed" },
    ]);
  });
});
