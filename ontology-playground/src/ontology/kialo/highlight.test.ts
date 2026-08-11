import { describe, expect, it } from "vitest";
import { highlightLine } from "./highlight.ts";

// Exact token lists, because what the overlay draws is the *split*, not just the classification:
// a token boundary in the wrong place colors the wrong characters even when every kind is right.
// The concatenation invariant itself is checked over every shipped example in ../registry.test.ts.
describe("highlightLine", () => {
  it("colors a pro marker and its votes, leaving the body alone", () => {
    expect(highlightLine("  +[3,1] Redis is fast")).toEqual([
      { text: "  " },
      { text: "+", kind: "type", typeId: "pro", loneMarker: true },
      { text: "[", kind: "score-punct" },
      { text: "3", kind: "score-value" },
      { text: ",", kind: "score-punct" },
      { text: "1", kind: "score-value" },
      { text: "]", kind: "score-punct" },
      { text: " Redis is fast" },
    ]);
  });

  it("gives a thesis marker the color of the box it makes", () => {
    // `=` renders as a `claim`, not a type of its own — see ./renderedNodeTypes.ts.
    expect(highlightLine("=[4] A thesis &t")).toEqual([
      { text: "=", kind: "type", typeId: "claim", loneMarker: true },
      { text: "[", kind: "score-punct" },
      { text: "4", kind: "score-value" },
      { text: "]", kind: "score-punct" },
      { text: " A thesis " },
      { text: "&t", kind: "id-decl" },
    ]);
  });

  it("marks a body that is only a $ref, votes and all", () => {
    expect(highlightLine("    -[2,0] $ops-cost")).toEqual([
      { text: "    " },
      { text: "-", kind: "type", typeId: "con", loneMarker: true },
      { text: "[", kind: "score-punct" },
      { text: "2", kind: "score-value" },
      { text: ",", kind: "score-punct" },
      { text: "0", kind: "score-value" },
      { text: "]", kind: "score-punct" },
      { text: " " },
      { text: "$ops-cost", kind: "id-ref" },
    ]);
  });

  it("takes a question marker as its own type", () => {
    expect(highlightLine("? How should we store sessions? &q1")).toEqual([
      { text: "?", kind: "type", typeId: "question", loneMarker: true },
      { text: " How should we store sessions? " },
      { text: "&q1", kind: "id-decl" },
    ]);
  });

  it("marks a source's marker without borrowing a type color for it", () => {
    // A source has no rendered type — it becomes a 🔗 on its claim.
    expect(highlightLine("  @ https://e.example A study")).toEqual([
      { text: "  " },
      { text: "@", kind: "property" },
      { text: " https://e.example A study" },
    ]);
  });

  it("marks a %key: head and leaves its value plain", () => {
    expect(highlightLine("%perspectives: [alice, bob]")).toEqual([
      { text: "%perspectives:", kind: "property" },
      { text: " [alice, bob]" },
    ]);
  });

  it("takes a whole meta line as a comment, marker included", () => {
    expect(highlightLine("  / never reaches the diagram")).toEqual([
      { text: "  " },
      { text: "/ never reaches the diagram", kind: "comment" },
    ]);
  });

  it("leaves an unrecognized marker plain, since the error strip already says so", () => {
    expect(highlightLine("  ! not a marker &id")).toEqual([
      { text: "  " },
      { text: "! not a marker &id" },
    ]);
  });

  it("emits nothing but indentation for a blank line", () => {
    expect(highlightLine("")).toEqual([]);
    expect(highlightLine("   ")).toEqual([{ text: "   " }]);
  });
});
