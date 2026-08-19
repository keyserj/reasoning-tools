import { describe, expect, it } from "vitest";
import { average, deviation, magnitude, normalize, presentScores } from "./scores.ts";

describe("reading a score row", () => {
  it("ignores the slots nobody filled", () => {
    expect(presentScores([6, null, 8])).toEqual([6, 8]);
    expect(average([6, null, 8])).toBe(7);
  });

  it("distinguishes nobody scoring from everybody scoring zero", () => {
    expect(average([null, null])).toBeNull();
    expect(average([0, 0])).toBe(0);
  });

  it("measures disagreement across the scorers present", () => {
    expect(deviation([8, -8])).toBe(8);
    expect(deviation([4, 4, 4])).toBe(0);
  });

  it("reports no disagreement when only one person scored", () => {
    expect(deviation([7, null, null])).toBe(0);
  });

  it("keeps the sign for a chain weight and drops it for a magnitude", () => {
    expect(normalize(-8)).toBe(-1);
    expect(magnitude(-8)).toBe(1);
  });
});
