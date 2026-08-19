import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildBundle } from "./bundle.ts";
import { parse } from "./parse.ts";

const examples = join(import.meta.dirname, "../examples");
const buildAWall = readFileSync(join(examples, "build-a-wall.txt"), "utf8");
const parsed = parse(buildAWall);
const bundle = buildBundle(parsed.doc);

describe("buildBundle", () => {
  it("starts from an example that parses cleanly", () => {
    expect(parsed.errors).toEqual([]);
  });

  it("carries the topic and the description written on it", () => {
    expect(bundle.topic?.id).toBe("wall");
    expect(bundle.topic?.description).toContain("Should the US build a wall");
  });

  it("splits questions by the edge that reaches them, not by their marker", () => {
    expect(bundle.nodes["why-wall"].kind).toBe("guiding");
    expect(bundle.nodes["how-tall"].kind).toBe("clarifying");
  });

  it("reads the subtypes nothing writes down off the edges", () => {
    expect(bundle.nodes["inexpensive"].subtypes).toEqual(["criterion"]);
    expect(bundle.nodes["motivations"].subtypes).toEqual(["category"]);
    expect(bundle.nodes["barbed-wire"].subtypes).toEqual(["component"]);
    expect(bundle.nodes["wall"].tags).toEqual(["topic", "action"]);
  });

  it("words an implied claim from what it stands behind", () => {
    expect(bundle.nodes["wall-reduces--implied"].label).toBe(
      "Border wall along the southern US border reduces Illegal immigration into the US",
    );
    expect(bundle.nodes["illegal-immig--implied"].label).toBe(
      "Illegal immigration into the US is important to increase",
    );
  });

  it("keeps the claims argued about a score, as the tree they were argued in", () => {
    const claims = bundle.arguments["wall-reduces"].claims;
    expect(claims.map((c) => c.id)).toEqual([
      "physical-barrier",
      "caging-effect",
      "climb-over",
      "visa-overstay",
    ]);
    // `unclimbable` critiques `climb-over`, which is a negative supports rather than its own edge
    expect(claims[2].children.map((c) => c.id)).toEqual(["easy-climb", "unclimbable"]);
  });

  it("keeps a claim that argues in two places under both of them", () => {
    const { doc } = parse(
      [
        "*[4] Topic &t #topic",
        "= $t",
        "  < supports[5]",
        "    =[6] One &one",
        "      < supports[5]",
        "        =[7] Shared &shared",
        "  < supports[5]",
        "    =[6] Two &two",
        "      < supports[5]",
        "        = $shared",
      ].join("\n"),
    );
    const claims = buildBundle(doc).arguments["t"].claims;
    expect(claims.map((c) => c.children.map((child) => child.id))).toEqual([
      ["shared"],
      ["shared"],
    ]);
  });

  it("argues only about what the diagram can reach", () => {
    for (const id of Object.keys(bundle.arguments)) {
      expect([...bundle.diagram.nodeIds, ...bundle.diagram.edges.map((e) => e.id)]).toContain(id);
    }
  });

  it("matches the committed bundle, so a derivation change can't go unregenerated", () => {
    const committed = JSON.parse(readFileSync(join(examples, "build-a-wall.views.json"), "utf8"));
    expect(bundle).toEqual(committed);
  });
});
