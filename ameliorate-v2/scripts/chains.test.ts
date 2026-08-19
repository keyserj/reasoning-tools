import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CAUSAL_TYPES,
  type WalkOptions,
  magnitudeProduct,
  reach,
  signedProduct,
  stepWeight,
  walk,
} from "./chains.ts";
import { parse } from "./parse.ts";
import { UNSCORED_RELATION } from "./scores.ts";

const buildAWall = readFileSync(join(import.meta.dirname, "../examples/build-a-wall.txt"), "utf8");
const causal = { types: CAUSAL_TYPES };

describe("stepWeight", () => {
  it("reads the two spellings of one relation as the same weight", () => {
    const causes = parse("* A &a\n  > causes[-8]\n    * B &b").doc.edges[0];
    const reduces = parse("* A &a\n  > reduces[8]\n    * B &b").doc.edges[0];
    expect(stepWeight(causes, UNSCORED_RELATION)).toBe(-1);
    expect(stepWeight(reduces, UNSCORED_RELATION)).toBe(-1);
  });

  it("falls back for an edge nobody scored, rather than treating it as no relation", () => {
    const edge = parse("* A &a\n  > causes\n    * B &b").doc.edges[0];
    expect(stepWeight(edge, UNSCORED_RELATION)).toBe(0.5);
  });
});

describe("walk", () => {
  const { doc } = parse(
    ["* C &c", "  < causes[8]", "    * B &b", "      < causes[4]", "        * A &a"].join("\n"),
  );

  it("reaches everything downstream, one path per node reached", () => {
    expect(walk(doc, "a", causal).map((p) => p.toId)).toEqual(["b", "c"]);
  });

  it("goes nowhere downstream from the end of the chain", () => {
    expect(walk(doc, "c", causal)).toEqual([]);
  });

  it("walks against the arrows when asked", () => {
    expect(walk(doc, "c", { ...causal, direction: "backward" }).map((p) => p.toId)).toEqual([
      "b",
      "a",
    ]);
  });

  it("attenuates rather than compounds along a chain", () => {
    const toC = walk(doc, "a", causal).find((p) => p.toId === "c")!;
    // a causes[4] b causes[8] c -> 0.5 x 1
    expect(signedProduct(toC, UNSCORED_RELATION)).toBe(0.5);
  });

  it("composes two reductions into an increase", () => {
    const { doc: d } = parse(
      ["* C &c", "  < reduces[8]", "    * B &b", "      < reduces[8]", "        * A &a"].join("\n"),
    );
    const toC = walk(d, "a", causal).find((p) => p.toId === "c")!;
    expect(signedProduct(toC, UNSCORED_RELATION)).toBe(1);
    expect(magnitudeProduct(toC, UNSCORED_RELATION)).toBe(1);
  });

  it("can't loop forever on a cycle", () => {
    const { doc: d } = parse(
      ["* A &a", "  > causes[8]", "    * B &b", "* $b", "  > causes[8]", "    * $a"].join("\n"),
    );
    expect(walk(d, "a", causal).map((p) => p.toId)).toEqual(["b"]);
  });
});

describe("reach", () => {
  const { doc } = parse(buildAWall);

  it("is total for a node against itself", () => {
    expect(reach(doc, "wall", "wall", causal)).toBe(1);
  });

  it("prices a direct relation by its own weight", () => {
    // wall causes[8,8,8] wall-cost
    expect(reach(doc, "wall", "wall-cost", { ...causal, direction: "either" })).toBe(1);
  });

  it("keeps a contested relation strong, since the disagreement is about which way it points", () => {
    // wall reduces[3,-5,8] illegal-immig: the three magnitudes average 5.33, not the signed 2
    expect(reach(doc, "wall", "illegal-immig", { ...causal, direction: "either" })).toBeCloseTo(
      2 / 3,
      10,
    );
  });

  it("attenuates across a chain of weaker relations", () => {
    // admin-burden causes[7,-,8] long-wait causes[6,2,-] illegal-immig
    expect(reach(doc, "admin-burden", "illegal-immig", causal)).toBeCloseTo(
      (7.5 / 8) * (4 / 8),
      10,
    );
  });

  it("takes the best route rather than adding weak ones up", () => {
    const { doc: d } = parse(
      [
        "* A &a",
        "  > causes[8]",
        "    * B &b",
        "* $a",
        "  > causes[2]",
        "    * C &c",
        "* $c",
        "  > causes[2]",
        "    * $b",
      ].join("\n"),
    );
    expect(reach(d, "a", "b", causal)).toBe(1);
  });
});

describe("chaining a question's priority", () => {
  const { doc } = parse(buildAWall);
  const guiding: WalkOptions = { types: ["guides"], direction: "forward" };
  const priority = (from: string, to: string): number => {
    const path = walk(doc, from, guiding).find((p) => p.toId === to)!;
    return magnitudeProduct(path, UNSCORED_RELATION);
  };

  it("prices a question that guides the topic directly by its own weight", () => {
    // why-wall guides[8,6,8] the topic
    expect(priority("why-wall", "wall")).toBeCloseTo(0.917, 3);
  });

  it("attenuates a question reached only through another question", () => {
    // why-immigrate guides[6,8,1] best-ways guides[7,5,8] illegal-immig
    expect(priority("best-ways", "illegal-immig")).toBeCloseTo(0.833, 3);
    expect(priority("why-immigrate", "illegal-immig")).toBeCloseTo(0.5208, 3);
  });
});
