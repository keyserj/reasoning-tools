import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { diagram } from "./diagram.ts";
import { parse } from "./parse.ts";

const buildAWall = readFileSync(join(import.meta.dirname, "../examples/build-a-wall.txt"), "utf8");

describe("diagram", () => {
  const { doc } = parse(buildAWall);
  const drawn = diagram(doc);

  it("anchors on the topic, which the ranking leaves out", () => {
    expect(drawn.nodeIds[0]).toBe("wall");
  });

  it("draws concepts only, closest to the topic first", () => {
    expect(drawn.nodeIds).toEqual([
      "wall",
      "illegal-immig",
      "danger",
      "wall-cost",
      "legal-immig",
      "more-admin",
      "long-wait",
      "admin-burden",
      "fewer-requirements",
      "save-money",
    ]);
  });

  it("draws the whole causal core it selected", () => {
    expect(drawn).toMatchSnapshot();
  });

  it("leaves out the questions the same ranking puts near the top", () => {
    // `how-tall` is the topic's second-hottest detail and still isn't part of a causal map
    expect(drawn.nodeIds).not.toContain("how-tall");
  });

  it("draws no node it can't connect to something else, however tight the limit", () => {
    for (const limit of [3, 5, 10]) {
      const small = diagram(doc, limit);
      const connected = new Set(small.edges.flatMap((e) => [e.sourceId, e.targetId]));
      // the topic anchors the view even when nothing else survives
      expect(small.nodeIds.filter((id) => id !== "wall" && !connected.has(id))).toEqual([]);
    }
  });

  it("draws a relation between two shown concepts as itself", () => {
    const wallReduces = drawn.edges.find((e) => e.id === "wall-reduces")!;
    expect(wallReduces).toMatchObject({ sourceId: "wall", targetId: "illegal-immig", via: [] });
    expect(wallReduces.weight).toBeCloseTo(-0.25, 10);
  });

  it("holds the set to the limit", () => {
    expect(diagram(doc, 4).nodeIds).toHaveLength(4);
  });

  it("says nothing about a document with no topic", () => {
    expect(diagram(parse("* A concept &a").doc)).toEqual({ nodeIds: [], edges: [] });
  });
});

describe("diagram: indirect edges", () => {
  const chain = [
    "*[8] Topic &t #topic",
    "  < causes[8]",
    "    *[2] Middle &m",
    "      < causes[4]",
    "        *[6] Far &f",
  ].join("\n");

  it("reconnects two shown concepts across a hidden one", () => {
    const { doc } = parse(chain);
    const drawn = diagram(doc, 2);
    expect(drawn.nodeIds).toEqual(["t", "f"]);
    const indirect = drawn.edges.find((e) => e.via.length > 0)!;
    expect(indirect).toMatchObject({ sourceId: "f", targetId: "t", type: "causes", via: ["m"] });
    // causes[4] into causes[8]: 0.5 x 1
    expect(indirect.weight).toBeCloseTo(0.5, 10);
    expect(indirect.scores).toBeNull();
  });

  it("composes two reductions across a hidden concept into an increase", () => {
    const { doc } = parse(
      [
        "*[8] Topic &t #topic",
        "  < reduces[8]",
        "    *[2] Middle &m",
        "      < reduces[8]",
        "        *[6] Far &f",
      ].join("\n"),
    );
    const indirect = diagram(doc, 2).edges.find((e) => e.via.length > 0)!;
    expect(indirect.type).toBe("causes");
    expect(indirect.weight).toBeCloseTo(1, 10);
  });

  it("leaves a relation alone when nothing between it is hidden", () => {
    const { doc } = parse(chain);
    expect(diagram(doc, 3).edges.every((e) => e.via.length === 0)).toBe(true);
  });

  it("lets the strongest route stand for the rest, rather than adding routes that share steps", () => {
    const { doc } = parse(
      [
        "*[8] Topic &t #topic",
        "  < causes[8]",
        "    *[1] Weak middle &w",
        "      < causes[2]",
        "        *[6] Far &f",
        "* $f",
        "  > causes[8]",
        "    *[1] Strong middle &s",
        "      > causes[8]",
        "        * $t",
      ].join("\n"),
    );
    const indirect = diagram(doc, 2).edges.filter((e) => e.via.length > 0);
    expect(indirect).toHaveLength(1);
    expect(indirect[0]).toMatchObject({ via: ["s"], weight: 1 });
  });

  it("says nothing where the scores say the route carries nothing", () => {
    const { doc } = parse(
      [
        "*[8] Topic &t #topic",
        "  < causes[0]",
        "    *[1] Middle &m",
        "      < causes[8]",
        "        *[6] Far &f",
      ].join("\n"),
    );
    expect(diagram(doc, 2).edges).toEqual([]);
  });

  it("stays quiet when the drawn graph already states the relation", () => {
    const { doc } = parse(
      [
        "*[8] Topic &t #topic",
        "  < causes[8]",
        "    *[6] Far &f",
        "* $f",
        "  > causes[8]",
        "    *[1] Middle &m",
        "      > causes[8]",
        "        * $t",
      ].join("\n"),
    );
    expect(diagram(doc, 2).edges.map((e) => e.via.length)).toEqual([0]);
  });
});
