import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import { scoresOf } from "./model.ts";

// These rules need the whole document — how many perspectives there turned out to be, whether a
// claim ever got the `%opposite` that unlocks its negative half, and what a forward `$ref` turned
// out to name — so they are reached through parse rather than called on a hand-built model.

const messages = (text: string): string[] => parse(text).errors.map((e) => e.message);
const warnings = (text: string): string[] => parse(text).warnings.map((e) => e.message);

describe("validate: score slots", () => {
  it("rejects a row that doesn't match %perspectives", () => {
    expect(messages("%perspectives: [alice, bob]\n*[6,2,8] A &a")).toEqual([
      "Expected 2 scores to match %perspectives, got 3",
    ]);
  });

  it("says nothing when %perspectives is absent, since there's nothing to match", () => {
    expect(messages("*[6,2,8] A &a")).toEqual([]);
  });
});

describe("validate: what may hold a negative", () => {
  it("lets a concept go negative, which is how it says `important to decrease`", () => {
    expect(messages("*[-8] Danger &d")).toEqual([]);
  });

  it("rejects a negative on a unipolar edge, which has no opposite to mean", () => {
    expect(messages("? Q &q\n  > guides[-6]\n    * A &a")).toEqual([
      '"guides" scores 0..8 because it has no opposite, so -6 has no meaning here',
    ]);
  });

  it("lets a bipolar edge go negative, which reads as its opposite phrasing", () => {
    expect(messages("* A &a\n  > causes[-8]\n    * B &b")).toEqual([]);
  });

  it("rejects a negative on a claim that never worded its opposite", () => {
    expect(messages("=[-4] A claim &c")).toEqual([
      'A claim scores 0..8 unless it defines "%opposite", so -4 has no meaning here',
    ]);
  });

  it("allows it once %opposite says what the other half means", () => {
    expect(messages("=[-4] A claim &c\n  %opposite: The other way round")).toEqual([]);
  });
});

describe("validate: what a relation may run between", () => {
  it("rejects a causal edge that isn't between two concepts", () => {
    expect(messages("@ S &s\n  > causes[6]\n    ? Q &q")).toEqual([
      '"causes" runs from a concept, not a source',
      '"causes" runs to a concept, not a question',
    ]);
  });

  it("keeps `answers` running from a claim to a question", () => {
    expect(messages("? Q &q\n  < answers[6]\n    = A &a")).toEqual([]);
    expect(messages("* C &c\n  < answers[6]\n    = A &a")).toEqual([
      '"answers" runs to a question, not a concept',
    ]);
  });

  it("lets `guides` reach a concept or another question, but not a claim", () => {
    expect(messages("? Q &q\n  > guides[6]\n    * C &c")).toEqual([]);
    expect(messages("? Q &q\n  > guides[6]\n    ? R &r")).toEqual([]);
    expect(messages("? Q &q\n  > guides[6]\n    = A &a")).toEqual([
      '"guides" runs to a concept or a question, not a claim',
    ]);
  });

  it("lets `clarifies` hang off anything, including an edge's implied claim", () => {
    expect(
      messages("* A &a\n  > causes[6] &e\n    * B &b\n? Q &q\n  > clarifies[6]\n    = $e"),
    ).toEqual([]);
  });

  it("says nothing about an endpoint that never resolved, which is already an error", () => {
    expect(messages("* A &a\n  > causes[6]\n    * $nope")).toEqual(['Unknown reference "$nope"']);
  });
});

describe("validate: duplicate relations", () => {
  it("warns when two edges assert the same relation, whatever they're named", () => {
    expect(
      warnings("* A &a\n  > causes[6] &one\n    * B &b\n* $a\n  > causes[2] &two\n    * $b"),
    ).toEqual([
      'Line 2 already relates these two by "causes" - duplicates double-count wherever edge weights are multiplied',
    ]);
  });

  it("reads two spellings of one relation as the same assertion", () => {
    expect(
      warnings("* A &a\n  > causes[6]\n    * B &b\n* $a\n  > reduces[2]\n    * $b"),
    ).toHaveLength(1);
  });

  it("says nothing about two different relations between the same pair", () => {
    expect(warnings("* A &a\n  > causes[6]\n    * B &b\n* $a\n  > has\n    * $b")).toEqual([]);
  });
});

describe("validate: unscoreable edges", () => {
  it("rejects a score on an edge that doesn't take one", () => {
    expect(messages("* A &a\n  > has[6]\n    * B &b")).toEqual(['"has" doesn\'t take a score']);
  });

  it("accepts the same edge unscored", () => {
    expect(messages("* A &a\n  > has\n    * B &b")).toEqual([]);
  });
});

describe("scoresOf", () => {
  it("reads an implied claim's score off the thing it stands behind", () => {
    const { doc } = parse("*[-4,0,-8] Immigration &i\n= $i\n  < supports[5]\n    = They flee &f");
    const implied = doc.nodes.find((n) => n.id === "i--implied")!;
    expect(implied.scores).toBeNull();
    expect(scoresOf(implied, doc)).toEqual([-4, 0, -8]);
  });

  it("reads an edge's implied claim off the edge", () => {
    const { doc } = parse(
      "* A &a\n  > causes[6,2,-] &c\n    * B &b\n= $c\n  < supports[5]\n    = Because &r",
    );
    const implied = doc.nodes.find((n) => n.id === "c--implied")!;
    expect(scoresOf(implied, doc)).toEqual([6, 2, null]);
  });
});
