import { describe, expect, it } from "vitest";
import { highlightLine } from "./highlight.ts";

// Exact token lists, because what the overlay draws is the *split*, not just the classification:
// a token boundary in the wrong place colors the wrong characters even when every kind is right.
// The concatenation invariant itself is checked over every shipped example in ../registry.test.ts.
describe("highlightLine", () => {
  it("colors a marker by the type it produces, leaving the body alone", () => {
    expect(highlightLine("  = Use Redis")).toEqual([
      { text: "  " },
      { text: "=", kind: "type", typeId: "idea", loneMarker: true },
      { text: " Use Redis" },
    ]);
  });

  it("marks a trailing &id, and only the &id", () => {
    expect(highlightLine("? How should we handle session storage? &q1")).toEqual([
      { text: "?", kind: "type", typeId: "question", loneMarker: true },
      { text: " How should we handle session storage? " },
      { text: "&q1", kind: "id-decl" },
    ]);
  });

  it("marks a body that is only a $ref", () => {
    expect(highlightLine("    - $c1")).toEqual([
      { text: "    " },
      { text: "-", kind: "type", typeId: "con", loneMarker: true },
      { text: " " },
      { text: "$c1", kind: "id-ref" },
    ]);
  });

  it("takes a whole meta line as a comment, marker included", () => {
    expect(highlightLine("  / this line never reaches the diagram")).toEqual([
      { text: "  " },
      { text: "/ this line never reaches the diagram", kind: "comment" },
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
