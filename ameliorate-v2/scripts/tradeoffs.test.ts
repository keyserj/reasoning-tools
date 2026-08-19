import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import { tradeoffs } from "./tradeoffs.ts";

const buildAWall = readFileSync(join(import.meta.dirname, "../examples/build-a-wall.txt"), "utf8");

describe("tradeoffs", () => {
  const { doc } = parse(buildAWall);
  const table = tradeoffs(doc, "best-ways")!;

  it("traces the criteria from what declares itself criterion for the question", () => {
    expect(table.criterionIds).toEqual(["inexpensive", "quick", "humane"]);
  });

  it("traces the options from the actions that causally reach the question's subject", () => {
    expect(table.optionIds).toEqual(["wall", "more-admin", "fewer-requirements"]);
  });

  it("reads a cell straight off a fulfils edge on the option", () => {
    // more-admin fulfils[-3,-4,-] inexpensive
    expect(table.cells.inexpensive["more-admin"]).toBeCloseTo(-3.5, 10);
    expect(table.cells.inexpensive["fewer-requirements"]).toBeCloseTo(6.5, 10);
  });

  it("reaches a cell through what the option causes, when nothing fulfils it directly", () => {
    // wall causes[8,8,8] wall-cost, which fulfils[-7,-8,-2] inexpensive
    expect(table.cells.inexpensive.wall).toBeCloseTo(-17 / 3, 10);
  });

  it("leaves a cell empty when nothing fulfils the criterion from that option", () => {
    // the example writes fulfils edges for `inexpensive` only
    expect(table.cells.quick.wall).toBeNull();
    expect(table.cells.humane.wall).toBeNull();
  });

  it("leaves a cell empty rather than guessing at a fulfilment nobody scored", () => {
    const { doc: d } = parse(
      [
        "*[-8] Problem &p #topic",
        "*[4] Criterion &c",
        "  > criterion for",
        "    ? What to do? &q",
        "* $q",
        "  > guides[8]",
        "    * $p",
        "*[2] Option &o #action",
        "  > reduces[8]",
        "    * $p",
        "* $o",
        "  > fulfils",
        "    * $c",
      ].join("\n"),
    );
    expect(tradeoffs(d, "q")?.cells.c.o).toBeNull();
  });

  it("attenuates a fulfilment reached through a weak causal step", () => {
    const { doc: d } = parse(
      [
        "*[-8] Problem &p #topic",
        "*[4] Criterion &c",
        "  > criterion for",
        "    ? What to do? &q",
        "* $q",
        "  > guides[8]",
        "    * $p",
        "*[2] Option &o #action",
        "  > reduces[8]",
        "    * $p",
        "* $o",
        "  > causes[4]",
        "    *[-2] Side effect &side",
        "      > fulfils[-8]",
        "        * $c",
      ].join("\n"),
    );
    // causes[4] normalizes to 0.5, so the -8 fulfilment arrives halved
    expect(tradeoffs(d, "q")?.cells.c.o).toBeCloseTo(-4, 10);
  });

  it("has nothing to show for a question with no criteria", () => {
    expect(tradeoffs(doc, "why-wall")).toBeNull();
  });

  it("keeps an action that only worsens the subject, which is still a thing being weighed", () => {
    const { doc: d } = parse(
      [
        "*[-8] Problem &p #topic",
        "*[4] Criterion &c",
        "  > criterion for",
        "    ? What to do? &q",
        "* $q",
        "  > guides[8]",
        "    * $p",
        "*[2] Makes it worse &bad #action",
        "  > causes[8]",
        "    * $p",
      ].join("\n"),
    );
    expect(tradeoffs(d, "q")?.optionIds).toEqual(["bad"]);
  });
});
