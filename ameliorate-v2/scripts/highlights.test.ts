import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { highlights } from "./highlights.ts";
import { parse } from "./parse.ts";

const buildAWall = readFileSync(join(import.meta.dirname, "../examples/build-a-wall.txt"), "utf8");

describe("highlights", () => {
  const { ranked: top, byCategory } = highlights(parse(buildAWall).doc, 5);

  it("leads with the topic's sharpest disagreement", () => {
    expect(top[0].id).toBe("wall-reduces");
  });

  it("holds the list to five", () => {
    expect(top).toHaveLength(5);
  });

  it("picks the same five the wireframe was hand-built with", () => {
    // and orders them differently: illegal-immig is both contested and important to change, which
    // the wireframe's hand-placed numbers had no way to add together
    expect(top.map((item) => item.id)).toEqual([
      "wall-reduces",
      "how-tall",
      "illegal-immig",
      "danger",
      "wall-cost",
    ]);
  });

  it("puts every item under each pill it qualifies for", () => {
    expect(byCategory.unknown.map((item) => item.id)).toEqual(["how-tall"]);
    expect(byCategory.controversy[0].id).toBe("wall-reduces");
  });

  it("ranks within a pill by that pill's signal, not by the combined score", () => {
    // wall-reduces is hottest overall on controversy, but is not the most change-important
    expect(byCategory["change-importance"][0].id).not.toBe("wall-reduces");
    expect(
      byCategory["change-importance"].every((item) => item.signals["change-importance"] > 0),
    ).toBe(true);
  });
});
