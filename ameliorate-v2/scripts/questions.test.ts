import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import { guidingQuestions } from "./questions.ts";

const buildAWall = readFileSync(join(import.meta.dirname, "../examples/build-a-wall.txt"), "utf8");

describe("guidingQuestions", () => {
  const questions = guidingQuestions(parse(buildAWall).doc);
  const find = (id: string) => questions.find((q) => q.id === id);

  it("offers every question that sets an agenda, and no clarifying ones", () => {
    expect(questions.map((q) => q.id)).toEqual(["why-wall", "best-ways", "why-immigrate"]);
  });

  it("prices a question guiding the topic itself at its own weight", () => {
    // why-wall guides[8,6,8] wall
    expect(find("why-wall")?.priority).toBeCloseTo(0.917, 3);
  });

  it("carries a question that guides a concept on through the causal web to the topic", () => {
    // best-ways guides[7,5,8] illegal-immig, which the topic reduces[3,-5,8]
    expect(find("best-ways")?.priority).toBeCloseTo(0.833 * (2 / 3), 3);
  });

  it("attenuates again through a question that only guides another question", () => {
    const best = find("best-ways")!.priority;
    const why = find("why-immigrate")!.priority;
    expect(why).toBeLessThan(best);
    expect(why).toBeCloseTo(0.5208 * (2 / 3), 3);
  });

  it("records what each question is about, which is what its view shows", () => {
    expect(find("why-wall")?.guidesId).toBe("wall");
    expect(find("best-ways")?.guidesId).toBe("illegal-immig");
  });

  it("follows a question that guides a question through to the concept underneath", () => {
    // why-immigrate guides best-ways, which is about illegal-immig
    expect(find("why-immigrate")?.guidesId).toBe("best-ways");
    expect(find("why-immigrate")?.subjectId).toBe("illegal-immig");
  });

  it("says nothing about a document with no topic to be central to", () => {
    expect(guidingQuestions(parse("* A concept &c\n? Q &q\n  > guides[8]\n    * $c").doc)).toEqual(
      [],
    );
  });

  it("keeps a question whose subject sits off the causal web, rather than hiding it", () => {
    const doc = parse(
      ["*[8] The topic &t #topic", "? Q &q", "  > guides[8]", "    * Unconnected &u"].join("\n"),
    ).doc;
    expect(guidingQuestions(doc)).toEqual([
      { id: "q", text: "Q", priority: 0, guidesId: "u", subjectId: "u" },
    ]);
  });
});
