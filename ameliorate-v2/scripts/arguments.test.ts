import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calculatedArguments } from "./arguments.ts";
import { parse } from "./parse.ts";

const buildAWall = readFileSync(join(import.meta.dirname, "../examples/build-a-wall.txt"), "utf8");

describe("calculatedArguments", () => {
  const { doc } = parse(buildAWall);

  it("reads reducing a bad thing as a pro and causing one as a con", () => {
    const { pros, cons } = calculatedArguments(doc, "wall");
    // wall reduces[3,-5,8] illegal-immig, which is scored [-4,0,-8]
    expect(pros.map((a) => `${a.effect} ${a.aboutId}`)).toEqual(["decreases illegal-immig"]);
    // wall causes[8,8,8] wall-cost, which is scored [-2,-4,-]
    expect(cons.map((a) => `${a.effect} ${a.aboutId}`)).toEqual(["increases wall-cost"]);
  });

  it("weighs an argument by the relation and the score at the far end together", () => {
    const { pros, cons } = calculatedArguments(doc, "wall");
    expect(pros[0].strength).toBeCloseTo(0.25 * 0.5, 10);
    expect(cons[0].strength).toBeCloseTo(1 * 0.375, 10);
  });

  it("carries a chain through a node nobody scored", () => {
    const { doc: d } = parse(
      [
        "*[8] Wanted &good",
        "  < causes[8]",
        "    * Nobody scored this &mid",
        "      < causes[8]",
        "        *[4] Subject &s",
      ].join("\n"),
    );
    expect(calculatedArguments(d, "s").pros.map((a) => a.aboutId)).toEqual(["good"]);
  });

  it("adds two mechanisms onto the same outcome", () => {
    const { doc: d } = parse(
      [
        "*[8] Outcome &o",
        "  < causes[8]",
        "    * Subject &s",
        "* $s",
        "  > causes[8]",
        "    * Middle &m",
        "      > causes[8]",
        "        * $o",
      ].join("\n"),
    );
    // one direct path plus one through the middle, both at full weight
    expect(calculatedArguments(d, "s").pros[0].strength).toBeCloseTo(2, 10);
  });

  it("says nothing about a node with nothing causal downstream of it", () => {
    // barbed-wire is a component of the wall, and `has` is not a causal relation
    expect(calculatedArguments(doc, "barbed-wire")).toEqual({ pros: [], cons: [] });
  });

  it("passes over a concept it reaches that nobody scored", () => {
    const { doc: d } = parse("* Nobody scored this &u\n  < causes[8]\n    *[4] Subject &s");
    expect(calculatedArguments(d, "s")).toEqual({ pros: [], cons: [] });
  });

  it("leaves fulfilment to the tradeoffs table rather than counting it twice", () => {
    const { pros, cons } = calculatedArguments(doc, "wall");
    const reached = [...pros, ...cons].map((a) => a.aboutId);
    expect(reached).not.toContain("inexpensive");
  });
});
