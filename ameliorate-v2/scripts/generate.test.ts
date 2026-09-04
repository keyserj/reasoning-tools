import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildViews, toJson } from "./generate.ts";
import { parse } from "./parse.ts";

const example = readFileSync(join(import.meta.dirname, "../examples/build-a-wall.txt"), "utf8");
const bundle = readFileSync(
  join(import.meta.dirname, "../examples/build-a-wall.views.json"),
  "utf8",
);
const activity = JSON.parse(
  readFileSync(join(import.meta.dirname, "../examples/build-a-wall.activity.json"), "utf8"),
);

/** Refuses a document the generator itself would refuse, so a test can't pass where it would fail. */
const viewsOf = (text: string) => {
  const { doc, errors } = parse(text);
  if (errors.length > 0) {
    throw new Error(errors.map((error) => `${error.line}: ${error.message}`).join("\n"));
  }
  return buildViews(doc, activity);
};

describe("the committed bundle", () => {
  it("is what the current code generates, so a derivation change can't go unnoticed", () => {
    expect(bundle).toBe(`${toJson(viewsOf(example))}\n`);
  });
});

describe("buildViews", () => {
  const views = viewsOf(example);

  it("takes the topic's id and description off the #topic node", () => {
    expect(views.topic.id).toBe("wall");
    expect(views.topic.description).toContain("Should the US build a wall");
  });

  it("splits questions into guiding and clarifying by the tag", () => {
    expect(views.nodes["why-wall"].kind).toBe("guiding");
    expect(views.nodes["how-tall"].kind).toBe("clarifying");
  });

  it("reads the subtypes a relation implies, which nothing tags", () => {
    expect(views.nodes["inexpensive"].subtypes).toEqual(["criterion"]);
    expect(views.nodes["motivations"].subtypes).toEqual(["category"]);
    expect(views.nodes["barbed-wire"].subtypes).toEqual(["component"]);
    expect(views.nodes["wall"]).toMatchObject({ tags: ["topic", "action"], subtypes: [] });
  });

  it("carries every signal's score, not just the ones that listed the item", () => {
    expect(views.nodes["illegal-immig"]).toMatchObject({
      signals: { "change-importance": 0.5, controversy: 0.816, unknown: 0, active: 0.5 },
      hotness: 0.816,
    });
  });

  it("scores every node and edge, so a view can rank what no highlight listed", () => {
    expect(views.nodes["caging-effect"].hotness).toBeCloseTo(0.656, 3);
    expect(views.edges["wall--has--barbed-wire"].hotness).toBe(0);
    expect(views.highlights.map((item) => item.id)).not.toContain("caging-effect");
  });

  it("leaves a question node's score alone, since the guides edge holds it", () => {
    expect(views.nodes["why-wall"].scores).toBeNull();
    expect(views.questions[0]).toEqual({
      id: "why-wall",
      text: "Why might we want the wall?",
      guidingScore: 0.917,
    });
  });

  it("points a highlight at an id, leaving `nodes` and `edges` to say the rest", () => {
    expect(views.highlights.find((item) => item.kind === "edge")).toEqual({
      kind: "edge",
      id: "wall-reduces",
      categories: ["controversy", "active"],
    });
    expect(views.edges["wall-reduces"]).toEqual({
      from: "wall",
      relation: "reduces",
      to: "illegal-immig",
      scores: [3, -5, 8],
      signals: { "change-importance": 0, controversy: 1, unknown: 0, active: 1 },
      hotness: 1,
    });
  });

  it("keeps the relation as written, since an id spells it canonically", () => {
    expect(views.edges["legal-immig--causes--illegal-immig"].relation).toBe("reduces");
  });

  it("carries every edge, not just the highlighted ones", () => {
    expect(Object.keys(views.edges).length).toBe(parse(example).doc.edges.length);
    expect(views.edges["wall--has--barbed-wire"]).toMatchObject({ relation: "has", scores: null });
  });

  it("leaves out an implied claim, which has no wording of its own", () => {
    expect(Object.keys(views.nodes)).not.toContain("wall-reduces--implied");
    expect(views.nodes["visa-overstay"].kind).toBe("claim");
  });

  it("refuses a document with no topic, which every calculation reads from", () => {
    expect(() => viewsOf("* A &a")).toThrow(/#topic/);
  });
});

describe("toJson", () => {
  it("keeps a row of primitives on one line, so a changed score is one changed line", () => {
    expect(toJson({ scores: [-4, null, 8], categories: ["controversy"] })).toBe(
      '{\n  "scores": [-4, null, 8],\n  "categories": ["controversy"]\n}',
    );
  });

  it("handles an undefined the way JSON.stringify does, rather than writing invalid JSON", () => {
    expect(toJson({ a: 1, b: undefined })).toBe('{\n  "a": 1\n}');
    expect(toJson([1, undefined, 2])).toBe("[1, null, 2]");
    expect(toJson(undefined)).toBe("null");
  });

  it("still reads back as the same data", () => {
    const views = viewsOf(example);
    expect(JSON.parse(toJson(views))).toEqual(views);
  });
});
