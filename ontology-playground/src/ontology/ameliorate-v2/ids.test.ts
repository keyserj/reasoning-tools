import { describe, expect, it } from "vitest";
import { allocateId, edgeIdBase, impliedClaimId, slugify } from "./ids.ts";

describe("slugify", () => {
  it("makes a readable id out of a node's text", () => {
    expect(slugify("Long legal processing times")).toBe("long-legal-processing-times");
  });

  it("drops punctuation rather than encoding it", () => {
    expect(slugify('Wanting to "disappear" (avoid government records)')).toBe(
      "wanting-to-disappear-avoid-government-re",
    );
  });

  it("never ends on the hyphen a truncation left behind", () => {
    expect(slugify("a".repeat(39) + " tail")).toBe("a".repeat(39));
  });

  it("falls back rather than returning an empty id", () => {
    expect(slugify("!!!")).toBe("unnamed");
  });
});

describe("allocateId", () => {
  it("takes the base when it's free", () => {
    expect(allocateId(new Set(), "wall")).toEqual({ id: "wall", collided: false });
  });

  it("suffixes and reports when the base is taken", () => {
    const used = new Set(["wall"]);
    expect(allocateId(used, "wall")).toEqual({ id: "wall-2", collided: true });
    expect(allocateId(used, "wall")).toEqual({ id: "wall-3", collided: true });
  });
});

describe("edge and implied-claim ids", () => {
  it("names an edge after both endpoints, so inserting a line elsewhere can't move it", () => {
    // callers pass the relation's canonical spelling, so `reduces` lands on the `causes` id
    expect(edgeIdBase("wall", "causes", "illegal-immig")).toBe("wall--causes--illegal-immig");
  });

  it("slugifies a multi-word edge type", () => {
    expect(edgeIdBase("a", "criterion for", "b")).toBe("a--criterion-for--b");
  });

  it("names an implied claim after what it stands behind", () => {
    expect(impliedClaimId("wall-reduces")).toBe("wall-reduces--implied");
  });
});
