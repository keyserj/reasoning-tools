import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type Candidate, candidates, highlights } from "./highlights.ts";
import { parse } from "./parse.ts";

const buildAWall = readFileSync(join(import.meta.dirname, "../examples/build-a-wall.txt"), "utf8");

const candidatesOf = (text: string): Map<string, Candidate> => {
  const { doc, errors } = parse(text);
  expect(errors).toEqual([]);
  return new Map(candidates(doc).map((candidate) => [candidate.id, candidate]));
};

// `UX-design.md` -> Hottest Details -> Calculations -> Basic, written out in the syntax.
const WORKED_EXAMPLE = `%perspectives: [alice, bob]
*[-2,4] A &a
  > causes[7,8]
    *[-,2] B &b
      > causes[-3,5]
        *[5,8] C &c
? Q &q
  > clarifies[5,7]
    * $b
`;

// The doc rounds these to two places; every step divides by 4 or 8, so they're asserted exactly.
describe("candidates: the worked example in UX-design.md", () => {
  const byId = candidatesOf(WORKED_EXAMPLE);
  const signals = (id: string) => byId.get(id)?.signals;

  it("normalizes a concept's averaged change importance by magnitude", () => {
    expect(signals("a")?.["change-importance"]).toBe(0.125);
    expect(signals("b")?.["change-importance"]).toBe(0.25);
    expect(signals("c")?.["change-importance"]).toBe(0.8125);
  });

  it("scores controversy on nodes and edges alike", () => {
    expect(signals("a")?.controversy).toBe(0.75);
    expect(signals("b")?.controversy).toBe(0);
    expect(signals("c")?.controversy).toBe(0.375);
    expect(signals("a--causes--b")?.controversy).toBe(0.125);
    expect(signals("b--causes--c")?.controversy).toBe(1);
    expect(signals("q--clarifies--b")?.controversy).toBe(0.25);
  });

  it("reads an unanswered clarifying question's `clarifies` score as its uncertainty", () => {
    expect(signals("q")?.unknown).toBe(0.75);
  });

  it("leaves the reasons a thing can't have at 0", () => {
    expect(signals("q")?.["change-importance"]).toBe(0);
    expect(signals("a--causes--b")?.unknown).toBe(0);
  });
});

describe("candidates: unknowns", () => {
  const unknownOf = (text: string): number | undefined =>
    candidatesOf(text).get("q")?.signals.unknown;

  it("takes the highest `clarifies` when a clarifying question clarifies several things", () => {
    const text = `*[8,2] A &a
*[8,2] B &b
? Q &q
  > clarifies[2,2]
    * $a
  > clarifies[6,6]
    * $b`;
    expect(unknownOf(text)).toBe(0.75);
  });

  it("uses the default edge score when nobody scored the `clarifies`", () => {
    expect(unknownOf("*[8,2] A &a\n? Q &q\n  > clarifies\n    * $a")).toBe(0.5);
  });

  it("scores no unknown for a question a claim has answered", () => {
    const text =
      "*[8,2] A &a\n? Q &q\n  > clarifies[8,8]\n    * $a\n  < answers[7,7]\n    =[6,2] Yes &y";
    expect(unknownOf(text)).toBe(0);
  });

  it("scores no unknown for a guiding question, which is agenda-setting not fact-requesting", () => {
    expect(unknownOf("*[8,2] A &a\n? Q &q #guiding\n  > guides[8,8]\n    * $a")).toBe(0);
  });
});

describe("candidates", () => {
  it("drops the topic node, which the whole page is already about", () => {
    expect(candidatesOf("*[8,2] T &t #topic\n*[8,2] A &a").has("t")).toBe(false);
  });

  it("drops an implied claim, which holds no score beyond the one it stands behind", () => {
    const byId = candidatesOf(
      "*[8,2] A &a\n  > causes[3,-5] &e\n    *[8,2] B &b\n= $e\n  < supports[5,5]\n    =[6,2] Because &r",
    );
    expect(byId.has("e--implied")).toBe(false);
    expect(byId.get("e")?.signals.controversy).toBe(1);
  });
});

describe("highlights", () => {
  it("lists an item once, under every reason that put it in the top 5", () => {
    const { doc } = parse("%perspectives: [alice, bob]\n* T &t #topic\n*[8,4] A &a");
    expect(highlights(doc)).toEqual([
      {
        id: "a",
        kind: "node",
        signals: { "change-importance": 0.75, controversy: 0.5, unknown: 0 },
        categories: ["change-importance", "controversy"],
        hotness: 0.75,
      },
    ]);
  });

  it("leaves out an item no reason applies to, even when a reason has fewer than 5", () => {
    const { doc } = parse("%perspectives: [alice, bob]\n* T &t #topic\n*[0,0] A &a");
    expect(highlights(doc)).toEqual([]);
  });
});

describe("highlights: build-a-wall", () => {
  const { doc } = parse(buildAWall);
  const listed = highlights(doc);

  it("lists the union of each reason's top 5, strongest reason first", () => {
    expect(listed.map((item) => item.id)).toEqual([
      "fewer-requirements",
      "wall-reduces",
      "danger",
      "illegal-immig",
      "visa-overstay",
      "enter-on-foot",
      "legal-immig",
      "admin-burden",
      "long-wait",
      "more-admin",
      "how-tall",
    ]);
  });

  it("ranks an item by its strongest reason, not by the reason that listed it", () => {
    const byId = new Map(listed.map((item) => [item.id, item]));
    // change importance -4 puts illegal-immig 6th, so only its disagreement lists it - and that
    // disagreement is also what it ranks by
    expect(byId.get("illegal-immig")).toMatchObject({
      kind: "node",
      categories: ["controversy"],
    });
    expect(byId.get("illegal-immig")?.hotness).toBeCloseTo(0.816, 3);
    expect(byId.get("wall-reduces")).toMatchObject({
      kind: "edge",
      categories: ["controversy"],
      hotness: 1,
    });
  });

  it("lists the one unanswered clarifying question at its default score", () => {
    const howTall = listed.find((item) => item.id === "how-tall");
    expect(howTall).toMatchObject({ categories: ["unknown"], hotness: 0.5 });
  });
});
