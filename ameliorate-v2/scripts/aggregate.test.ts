import { describe, expect, it } from "vitest";
import {
  average,
  controversy,
  normalizeForChaining,
  normalizeForSorting,
  popStdDev,
} from "./aggregate.ts";

describe("average", () => {
  it("averages the perspectives that scored", () => {
    expect(average([-2, 4])).toBe(1);
  });

  it("leaves a `-` out rather than counting it as a 0", () => {
    expect(average([null, 2])).toBe(2);
  });

  it("returns null when nobody scored, so each caller applies its own default", () => {
    expect(average([null, null])).toBeNull();
    expect(average(null)).toBeNull();
  });
});

describe("popStdDev", () => {
  it("measures the spread of the perspectives that scored", () => {
    expect(popStdDev([-3, 5])).toBe(4);
  });

  it("reads one perspective as no disagreement", () => {
    expect(popStdDev([null, 2])).toBe(0);
  });

  it("reads nobody scoring as no disagreement rather than as NaN", () => {
    expect(popStdDev(null)).toBe(0);
  });
});

describe("normalization", () => {
  it("sorts by magnitude, so a strong decrease is as hot as a strong increase", () => {
    expect(normalizeForSorting(-8)).toBe(1);
    expect(normalizeForSorting(6.5)).toBe(0.8125);
  });

  it("chains with the sign, so an opposite survives being multiplied along a path", () => {
    expect(normalizeForChaining(-4)).toBe(-0.5);
  });
});

describe("controversy", () => {
  it("reads a spread of 4 as complete disagreement", () => {
    expect(controversy([-3, 5])).toBe(1);
  });

  it("clamps the wider spread a -8..8 score can reach", () => {
    expect(controversy([-8, 8])).toBe(1);
  });

  it("scales a narrower spread by the same 4", () => {
    expect(controversy([7, 8])).toBe(0.125);
  });
});
