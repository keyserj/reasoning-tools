import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CAUSAL_TYPES,
  type WalkOptions,
  partReach,
  pathStrength,
  pathWeight,
  reachFrom,
  stepWeight,
  topicReach,
  walk,
} from "./chains.ts";
import { parse } from "./parse.ts";

const buildAWall = readFileSync(join(import.meta.dirname, "../examples/build-a-wall.txt"), "utf8");
const causal: WalkOptions = { types: CAUSAL_TYPES };
const either: WalkOptions = { types: CAUSAL_TYPES, direction: "either" };
const reach = (doc: ReturnType<typeof parse>["doc"], from: string, to: string, o: WalkOptions) =>
  reachFrom(doc, from, o).get(to) ?? 0;

describe("stepWeight", () => {
  it("reads the two spellings of one relation as the same weight", () => {
    const causes = parse("* A &a\n  > causes[-8]\n    * B &b").doc.edges[0];
    const reduces = parse("* A &a\n  > reduces[8]\n    * B &b").doc.edges[0];
    expect(stepWeight(causes)).toBe(-1);
    expect(stepWeight(reduces)).toBe(-1);
  });

  it("falls back for an edge nobody scored, rather than treating it as no relation", () => {
    const edge = parse("* A &a\n  > causes\n    * B &b").doc.edges[0];
    expect(stepWeight(edge)).toBe(0.5);
  });

  it("refuses a relation that carries no belief to weigh", () => {
    const edge = parse("* A &a\n  > has\n    * B &b").doc.edges[0];
    expect(() => stepWeight(edge)).toThrow(/isn't scoreable/);
  });
});

describe("walk", () => {
  const { doc } = parse(
    ["* C &c", "  < causes[8]", "    * B &b", "      < causes[4]", "        * A &a"].join("\n"),
  );

  it("reaches everything downstream, one entry per route", () => {
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
    expect(pathWeight(toC)).toBe(0.5);
  });

  it("composes two reductions into an increase", () => {
    const { doc: d } = parse(
      ["* C &c", "  < reduces[8]", "    * B &b", "      < reduces[8]", "        * A &a"].join("\n"),
    );
    const toC = walk(d, "a", causal).find((p) => p.toId === "c")!;
    expect(pathWeight(toC)).toBe(1);
    expect(pathStrength(toC)).toBe(1);
  });

  it("can't loop forever on a cycle", () => {
    const { doc: d } = parse(
      ["* A &a", "  > causes[8]", "    * B &b", "* $b", "  > causes[8]", "    * $a"].join("\n"),
    );
    expect(walk(d, "a", causal).map((p) => p.toId)).toEqual(["b"]);
  });

  it("follows a long strong chain that a depth cap would have cut", () => {
    const lines = ["* N0 &n0"];
    for (let i = 1; i <= 12; i++) lines.push(`* N${i} &n${i}`, `  < causes[8]`, `    * $n${i - 1}`);
    const { doc: d } = parse(lines.join("\n"));
    const far = walk(d, "n0", causal).find((p) => p.toId === "n12")!;
    expect(far.steps).toHaveLength(12);
    expect(pathStrength(far)).toBe(1);
  });

  it("abandons a route once the scores have worn it away", () => {
    const lines = ["* N0 &n0"];
    for (let i = 1; i <= 12; i++) lines.push(`* N${i} &n${i}`, `  < causes[1]`, `    * $n${i - 1}`);
    const { doc: d } = parse(lines.join("\n"));
    // (1/8)^3 still clears 0.001 and (1/8)^4 does not
    expect(walk(d, "n0", causal).map((p) => p.toId)).toEqual(["n1", "n2", "n3"]);
  });
});

describe("reach", () => {
  const { doc } = parse(buildAWall);

  it("is total for a node against itself", () => {
    expect(reach(doc, "wall", "wall", causal)).toBe(1);
  });

  it("prices a direct relation by its own weight", () => {
    // wall causes[8,8,8] wall-cost
    expect(reach(doc, "wall", "wall-cost", either)).toBe(1);
  });

  it("keeps a contested relation strong, since the disagreement is about which way it points", () => {
    // wall reduces[3,-5,8] illegal-immig: the three magnitudes average 5.33, not the signed 2
    expect(reach(doc, "wall", "illegal-immig", either)).toBeCloseTo(2 / 3, 10);
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

describe("partReach", () => {
  const { doc } = parse(buildAWall);
  const reaches = topicReach(doc, "wall");

  it("puts an edge at whichever of its ends is nearer", () => {
    // wall reduces illegal-immig: the topic is at 1, illegal-immig at 2/3
    expect(partReach(doc, "wall-reduces", reaches)).toBe(1);
  });

  it("is nothing for an id that names neither a node nor an edge", () => {
    expect(partReach(doc, "not-a-thing", reaches)).toBe(0);
  });
});

describe("topicReach", () => {
  const { doc } = parse(buildAWall);
  const reaches = topicReach(doc, "wall");
  const at = (id: string): number => reaches.get(id) ?? 0;

  it("leaves a criterion off the causal web, however well it is scored", () => {
    // inexpensive is reached only by `fulfils`, which the tradeoffs table owns
    expect(at("inexpensive")).toBe(0);
    expect(at("humane")).toBe(0);
  });

  it("puts an implied claim exactly where the score it stands behind sits", () => {
    expect(at("wall-reduces--implied")).toBe(at("wall"));
    expect(at("illegal-immig--implied")).toBe(at("illegal-immig"));
  });

  it("attenuates an explicit claim outward along what it supports", () => {
    // physical-barrier supports[7,-,8] the claim behind wall-reduces, which sits at 1
    expect(at("physical-barrier")).toBeCloseTo(7.5 / 8, 10);
    // ...and its own supporter is one relation further out again
    expect(at("costly-recrossing")).toBeLessThan(at("caging-effect"));
  });

  it("says nothing about a claim with no score to hang off", () => {
    expect(at("enter-on-foot")).toBe(0);
  });
});

describe("chaining a question's guides weight", () => {
  const { doc } = parse(buildAWall);
  const guiding: WalkOptions = { types: ["guides"], direction: "forward" };
  // just the chain - ./questions.ts multiplies this by the distance from what it guides
  const chain = (from: string, to: string): number => {
    const paths = walk(doc, from, guiding).filter((p) => p.toId === to);
    return Math.max(...paths.map(pathStrength));
  };

  it("prices a question that guides the topic directly by its own weight", () => {
    // why-wall guides[8,6,8] the topic
    expect(chain("why-wall", "wall")).toBeCloseTo(0.917, 3);
  });

  it("attenuates a question reached only through another question", () => {
    // why-immigrate guides[6,8,1] best-ways guides[7,5,8] illegal-immig
    expect(chain("best-ways", "illegal-immig")).toBeCloseTo(0.833, 3);
    expect(chain("why-immigrate", "illegal-immig")).toBeCloseTo(0.5208, 3);
  });
});
