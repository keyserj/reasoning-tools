import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import { rank } from "./ranking.ts";

const buildAWall = readFileSync(join(import.meta.dirname, "../examples/build-a-wall.txt"), "utf8");

describe("rank", () => {
  const ranked = rank(parse(buildAWall).doc);
  const find = (id: string) => ranked.find((item) => item.id === id);

  it("leaves out the topic, which is the thing being read about", () => {
    expect(find("wall")).toBeUndefined();
  });

  it("prices an unanswered clarifying question by how much it hangs over what it clarifies", () => {
    // `how-tall` clarifies the topic itself and nobody weighed the edge, so it takes the
    // unscored-relation default of 4 and no distance discount
    expect(find("how-tall")?.hot).toBeCloseTo(0.5, 10);
    expect(find("how-tall")?.categories).toEqual(["unknown"]);
  });

  it("prices a concept by its change importance, discounted by distance to the topic", () => {
    // wall-cost is scored [-2,-4,-] and the topic causes it at [8,8,8], so nothing is discounted
    expect(find("wall-cost")?.hot).toBeCloseTo(0.375, 10);
  });

  it("counts a concept nobody scored as nothing to change, not as unknown", () => {
    expect(find("barbed-wire")).toBeUndefined();
  });

  it("drops a clarifying question once a claim answers it", () => {
    expect(find("how-enter")).toBeUndefined();
  });

  it("surfaces the topic's sharpest disagreement as the hottest thing in the topic", () => {
    // wall reduces[3,-5,8] illegal-immig: casey believes it works, bob believes it backfires
    expect(ranked[0].id).toBe("wall-reduces");
    expect(ranked[0].categories).toEqual(["controversy"]);
    expect(ranked[0].hot).toBeCloseTo(0.669, 3);
  });

  it("gives a concept both categories when it is contested and worth changing", () => {
    expect(find("illegal-immig")?.categories).toEqual(["change-importance", "controversy"]);
  });

  it("counts two reasons for more than either alone, without letting one reason lose out", () => {
    // illegal-immig is 0.5 important and 0.408 contested, so it outranks danger's 0.917 x 0.5
    expect(find("illegal-immig")!.hot).toBeGreaterThan(find("danger")!.hot);
    // wall-reduces has only controversy, and still keeps every bit of it
    expect(ranked[0].hot).toBeCloseTo(ranked[0].signals.controversy, 10);
  });

  it("calls a thing everyone agrees about uncontroversial rather than faintly controversial", () => {
    // danger is [-8,-8,-6]: a consensus that reads as a deviation of 0.94
    expect(find("danger")?.categories).toEqual(["change-importance"]);
    expect(find("danger")?.signals.controversy).toBe(0);
  });

  it("discounts a concept by every relation between it and the topic", () => {
    // danger causes[7,8,3] illegal-immig, which the topic reduces[3,-5,8]
    expect(find("danger")?.hot).toBeCloseTo(0.458, 3);
    expect(find("long-wait")?.hot).toBeCloseTo(0.222, 3);
    expect(find("wait-causes-illegal-immig")?.hot).toBeCloseTo(0.167, 3);
  });

  it("leaves out a criterion, which the tradeoffs table weighs instead", () => {
    // `humane` is the best-scored criterion in the topic and still isn't a causal finding
    expect(find("inexpensive")).toBeUndefined();
    expect(find("humane")).toBeUndefined();
  });

  it("keeps a question's doubt and its distance as one pair", () => {
    // a faint doubt about the topic and a strong doubt about something remote are each 0.125;
    // taking the best weight and the best distance separately would report 1
    const { doc } = parse(
      [
        "* Topic &t #topic",
        "  > causes[1]",
        "    * Remote &r",
        "  < clarifies[1]",
        "    ? Q &q",
        "* $r",
        "  < clarifies[8]",
        "    ? $q",
      ].join("\n"),
    );
    expect(rank(doc).find((item) => item.id === "q")?.hot).toBeCloseTo(0.125, 10);
  });

  it("ranks hottest first", () => {
    const hots = ranked.map((item) => item.hot);
    expect([...hots].sort((a, b) => b - a)).toEqual(hots);
  });

  it("says nothing at all about a document with no topic", () => {
    expect(rank(parse("* A concept &a").doc)).toEqual([]);
  });
});
