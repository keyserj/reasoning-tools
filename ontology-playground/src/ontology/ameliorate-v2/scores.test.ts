import { describe, expect, it } from "vitest";
import { takeScores } from "./scores.ts";

describe("takeScores", () => {
  it("reads one slot per perspective, with `-` for nobody", () => {
    expect(takeScores("[6,-,8] rest")).toMatchObject({ scores: [6, null, 8], rest: " rest" });
  });

  it("reads negatives, which is what makes a bipolar score's opposite sayable", () => {
    expect(takeScores("[-4,0,-8]").scores).toEqual([-4, 0, -8]);
  });

  it("returns null scores, not empty ones, when nobody scored", () => {
    expect(takeScores(" Some text")).toMatchObject({ scores: null, rest: " Some text" });
  });

  it("only reads a bracket that opens the text, since scores bind to their marker", () => {
    expect(takeScores(" text [6,2,8]").scores).toBeNull();
  });

  it("reports a slot outside -8..8", () => {
    expect(takeScores("[9]").messages).toEqual(['Score "9" is out of range -8..8']);
  });

  it("reports a slot that isn't a number", () => {
    expect(takeScores("[x]").messages).toEqual(['Score "x" is not a number -8..8 or "-"']);
  });

  it("reports an unclosed bracket", () => {
    expect(takeScores("[6,2").messages).toEqual(['Unclosed score bracket - expected a "]"']);
  });
});
