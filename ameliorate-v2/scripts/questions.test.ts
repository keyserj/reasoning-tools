import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import { guidingQuestions, guidingScore } from "./questions.ts";

const buildAWall = readFileSync(join(import.meta.dirname, "../examples/build-a-wall.txt"), "utf8");

const scoreOf = (text: string, questionId: string): number => {
  const { doc, errors } = parse(text);
  expect(errors).toEqual([]);
  return guidingScore(questionId, doc);
};

// `UX-design.md` -> Guiding Questions -> Calculations, written out in the syntax. GQ4 reaches the
// topic two ways so its paths can be compared; CQ1 and GQ5 only clarify it, which is no path.
const WORKED_EXAMPLE = `%perspectives: [alice, bob]
* T &t #topic
? GQ1 &gq1 #guiding
  > guides[8,6]
    * $t
? GQ2 &gq2 #guiding
  > clarifies[4,7]
    ? $gq1
? GQ3 &gq3 #guiding
  > clarifies[5,7]
    ? $gq2
? GQ4 &gq4 #guiding
  > guides[4,4]
    * $t
  > clarifies[2,5]
    ? $gq1
? CQ1 &cq1
  > clarifies[8,8]
    * $t
? GQ5 &gq5 #guiding
  > clarifies[8,8]
    * $t
`;

// The doc rounds these to two places; every step divides by 8, so they're asserted exactly.
describe("guidingScore: the worked example in UX-design.md", () => {
  it("scores a direct `guides` as the normalized edge average", () => {
    expect(scoreOf(WORKED_EXAMPLE, "gq1")).toBe(0.875);
  });

  it("attenuates each further `clarifies` by multiplying along the path", () => {
    expect(scoreOf(WORKED_EXAMPLE, "gq2")).toBe(0.6015625);
    expect(scoreOf(WORKED_EXAMPLE, "gq3")).toBe(0.451171875);
  });

  it("takes the best of several paths, so a weaker direct `guides` can still win", () => {
    expect(scoreOf(WORKED_EXAMPLE, "gq4")).toBe(0.5);
  });

  it("scores 0 when a question only clarifies the topic and never guides it", () => {
    expect(scoreOf(WORKED_EXAMPLE, "cq1")).toBe(0);
    expect(scoreOf(WORKED_EXAMPLE, "gq5")).toBe(0);
  });
});

describe("guidingScore", () => {
  it("scores 0 for a path that ends anywhere but the topic", () => {
    const text = "* T &t #topic\n* C &c\n? Q &q #guiding\n  > guides[8]\n    * $c";
    expect(scoreOf(text, "q")).toBe(0);
  });

  it("uses the default edge score when nobody scored the `guides`", () => {
    const text = "* T &t #topic\n? Q &q #guiding\n  > guides\n    * $t";
    expect(scoreOf(text, "q")).toBe(0.5);
  });

  // The default stands in for the whole row, never for one slot of it: a `-` is left out of the
  // average here the same way it is everywhere else.
  it("leaves a `-` out of the average rather than defaulting that slot", () => {
    const text =
      "%perspectives: [alice, bob]\n* T &t #topic\n? Q &q #guiding\n  > guides[8,-]\n    * $t";
    expect(scoreOf(text, "q")).toBe(1);
  });

  it("scores 0 when the document has no topic node to reach", () => {
    const text = "* C &c\n? Q &q #guiding\n  > guides[8]\n    * $c";
    expect(scoreOf(text, "q")).toBe(0);
  });

  it("handles a cycle between two questions", () => {
    const text = `* T &t #topic
? Q &q #guiding
  > guides[8]
    * $t
? R &r #guiding
  > clarifies[8]
    ? $q
  < clarifies[8]
    ? $q`;
    expect(scoreOf(text, "q")).toBe(1);
    expect(scoreOf(text, "r")).toBe(1);
  });
});

describe("guidingQuestions: build-a-wall", () => {
  const { doc } = parse(buildAWall);

  it("ranks the tagged questions by how strongly they reach the topic", () => {
    expect(guidingQuestions(doc).map((question) => question.id)).toEqual([
      "why-wall",
      "best-ways",
      "why-immigrate",
    ]);
  });

  it("chains best-ways through its `guides` to why-wall, not through the concept it guides", () => {
    const scores = new Map(guidingQuestions(doc).map((q) => [q.id, q.score]));
    expect(scores.get("why-wall")).toBeCloseTo(0.917, 3);
    expect(scores.get("best-ways")).toBeCloseTo(0.764, 3);
    expect(scores.get("why-immigrate")).toBeCloseTo(0.477, 3);
  });
});
