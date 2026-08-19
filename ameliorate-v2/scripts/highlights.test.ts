import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { highlights } from "./highlights.ts";
import { parse } from "./parse.ts";

const buildAWall = readFileSync(join(import.meta.dirname, "../examples/build-a-wall.txt"), "utf8");

describe("highlights", () => {
  const { top, byCategory } = highlights(parse(buildAWall).doc);

  it("leads with the topic's sharpest disagreement", () => {
    expect(top[0].id).toBe("wall-reduces");
  });

  it("holds the list to five", () => {
    expect(top).toHaveLength(5);
  });

  it("shows the criteria the wireframe's hand-built list had no way to reach", () => {
    // `inexpensive` enters at #2 through `wall causes wall-cost fulfils inexpensive`
    expect(top.map((item) => item.id)).toEqual([
      "wall-reduces",
      "inexpensive",
      "how-tall",
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
