import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";

const buildAWall = readFileSync(join(import.meta.dirname, "../examples/build-a-wall.txt"), "utf8");

const messages = (text: string): string[] => parse(text).errors.map((e) => e.message);

describe("parse: nodes", () => {
  it("reads a node's type from its marker", () => {
    const { doc } = parse("* A concept\n? A question\n= A claim\n@ A source");
    expect(doc.nodes.map((n) => n.type)).toEqual(["concept", "question", "claim", "source"]);
  });

  it("takes scores off the marker, and an id and tags off the end", () => {
    const { doc } = parse("*[2,-7,8] Border wall &wall #topic #action");
    expect(doc.nodes[0]).toMatchObject({
      id: "wall",
      text: "Border wall",
      scores: [2, -7, 8],
      tags: ["topic", "action"],
    });
  });

  it("names an unnamed node after its text", () => {
    expect(parse("* Long legal processing times").doc.nodes[0].id).toBe(
      "long-legal-processing-times",
    );
  });

  it("warns rather than fails when a generated id collides", () => {
    const { doc, errors, warnings } = parse("* Same text\n* Same text");
    expect(errors).toEqual([]);
    expect(doc.nodes.map((n) => n.id)).toEqual(["same-text", "same-text-2"]);
    expect(warnings[0].message).toContain('give it an explicit "&id"');
  });

  it("rejects a duplicate explicit id", () => {
    expect(messages("* One &dup\n* Two &dup")).toEqual(['Duplicate id "&dup"']);
  });

  it("falls back to a derived name for a duplicate id rather than a second complaint", () => {
    const { doc, errors, warnings } = parse(
      "* A &a\n  > causes[6] &dup\n    * B &b\n* $a\n  > has &dup\n    * C &c",
    );
    expect(errors.map((e) => e.message)).toEqual(['Duplicate id "&dup"']);
    expect(warnings).toEqual([]);
    expect(doc.edges.map((e) => e.id)).toEqual(["dup", "a--has--c"]);
  });

  it("attaches %description and %opposite to the declaration above them", () => {
    const { doc } = parse("= A claim &c\n  %opposite: The other way round");
    expect(doc.nodes[0].properties).toEqual({ opposite: "The other way round" });
  });

  it("rejects a property the ontology doesn't define", () => {
    expect(messages("* A &a\n  %color: red")).toEqual([
      'Unknown property "%color" (expected %description or %opposite)',
    ]);
  });

  it("rejects a second %opposite rather than letting it overwrite the first", () => {
    const { doc, errors } = parse("= A claim &c\n  %opposite: first\n  %opposite: second");
    expect(errors.map((e) => e.message)).toEqual(['"%opposite" is already set on "c"']);
    expect(doc.nodes[0].properties.opposite).toBe("first");
  });
});

describe("parse: edges", () => {
  it("reads a `<` edge as running from its nested child to the line above", () => {
    const { doc } = parse("* Effect &e\n  < causes[6,2,-] &c\n    * Cause &s");
    expect(doc.edges).toEqual([
      { id: "c", type: "causes", sourceId: "s", targetId: "e", scores: [6, 2, null], notes: [] },
    ]);
  });

  it("points a `>` edge the other way: parent is the source, child the target", () => {
    const { doc } = parse("* Wall &w\n  > reduces[3] &r\n    * Immigration &i");
    expect(doc.edges[0]).toMatchObject({ sourceId: "w", targetId: "i", type: "reduces" });
  });

  it("reads a multi-word edge type", () => {
    const { doc } = parse("* Inexpensive &x\n  > criterion for\n    ? Which way? &q");
    expect(doc.edges[0]).toMatchObject({ type: "criterion for", scores: null });
  });

  it("names an unnamed edge after both of its endpoints", () => {
    const { doc } = parse("* Effect &e\n  < causes[6]\n    * Cause &s");
    expect(doc.edges[0].id).toBe("s--causes--e");
  });

  it("rejects an unknown edge type", () => {
    expect(messages("* A &a\n  > enables[6]\n    * B &b")).toContain('Unknown edge type "enables"');
  });

  it("rejects an edge line with nothing nested under it", () => {
    expect(messages("* A &a\n  > causes[6]")).toEqual(['A ">" line needs a node nested under it']);
  });

  it("rejects an edge line nested under another edge line", () => {
    const errors = messages("* A &a\n  > causes[6]\n    > causes[6]\n      * B &b");
    expect(errors.some((m) => m.includes("can't nest under another edge line"))).toBe(true);
  });

  it("rejects a node nested directly under another node", () => {
    expect(messages("* A &a\n  * B &b")).toEqual([
      'A node has to be attached with a "<" or ">" line, not nested directly under another node',
    ]);
  });
});

describe("parse: references", () => {
  it("resolves a reference to a node declared further down the file", () => {
    const { doc, errors } = parse("* A &a\n  > causes[6]\n    * $b\n* B &b");
    expect(errors).toEqual([]);
    expect(doc.edges[0]).toMatchObject({ sourceId: "a", targetId: "b" });
  });

  it("reports a reference to nothing", () => {
    expect(messages("* A &a\n  > causes[6]\n    * $nope")).toEqual(['Unknown reference "$nope"']);
  });

  it("requires the reference to be prefixed with the referent's type character", () => {
    expect(messages("? Q &q\n  > clarifies[6]\n    * $c\n= C &c")).toEqual([
      '"$c" is a claim, so the reference should read "= $c"',
    ]);
  });

  it("rejects text after a reference, whose text comes from what it names", () => {
    const errors = messages("* A &a\n= $a is important to increase");
    expect(errors[0]).toContain('carries nothing but "= $a"');
  });

  it("rejects scores on a reference line", () => {
    expect(messages("* A &a\n  > causes[6]\n    *[8] $a")).toContain(
      '"$a" can\'t carry scores - the line that declares it holds them',
    );
  });
});

describe("parse: implied claims", () => {
  it("gives an edge's implied claim a node of its own, so an argument can target it", () => {
    const { doc } = parse(
      [
        "* Wall &w",
        "  > reduces[3] &wr",
        "    * Immigration &i",
        "= $wr",
        "  < supports[7]",
        "    = It stops crossings &sc",
      ].join("\n"),
    );
    const implied = doc.nodes.find((n) => n.id === "wr--implied");
    expect(implied).toMatchObject({ type: "claim", impliedForId: "wr", scores: null, text: "" });
    expect(doc.edges[1]).toMatchObject({ sourceId: "sc", targetId: "wr--implied" });
  });

  it("keeps that claim distinct from the concept whose score it stands behind", () => {
    const { doc } = parse(
      [
        "*[-4] Immigration &i",
        "= $i",
        "  < supports[5]",
        "    = They flee danger &fd",
        "* Danger &d",
        "  > causes[7]",
        "    * $i",
      ].join("\n"),
    );
    expect(doc.edges.find((e) => e.type === "supports")?.targetId).toBe("i--implied");
    expect(doc.edges.find((e) => e.type === "causes")?.targetId).toBe("i");
  });

  it("refuses to imply a claim behind a question or a source, which carry no score", () => {
    expect(messages("? Q &q\n= $q\n  < supports[6]\n    = Because &r")).toEqual([
      '"= $q" argues about a score, and a question has none - reference it as "? $q"',
    ]);
    expect(messages("@ S &s\n= $s\n  < supports[6]\n    = Because &r")).toEqual([
      '"= $s" argues about a score, and a source has none - reference it as "@ $s"',
    ]);
  });

  it("refuses to imply a claim behind a relation that takes no score", () => {
    expect(
      messages("* A &a\n  > has &h\n    * B &b\n= $h\n  < supports[6]\n    = Because &r"),
    ).toEqual(['"= $h" argues about a score, and a "has" edge has none']);
  });

  it("treats `= $claim` as a plain reference, since a claim needs no implied claim", () => {
    const { doc } = parse("= A claim &c\n= Another &b\n  > supports[6]\n    = $c");
    expect(doc.nodes.some((n) => n.impliedForId !== undefined)).toBe(false);
    expect(doc.edges[0].targetId).toBe("c");
  });
});

describe("parse: notes, comments and properties", () => {
  it("hangs a `~` note off the line above it", () => {
    const { doc } = parse("* A &a\n  ~ worth knowing");
    expect(doc.nodes[0].notes).toMatchObject([{ text: "worth knowing" }]);
  });

  it("files a `~` with nothing above it as a note about the document", () => {
    expect(parse("~ about the whole thing").doc.notes).toMatchObject([
      { text: "about the whole thing" },
    ]);
  });

  it("rejects a note hanging off another note", () => {
    expect(messages("* A &a\n  ~ one\n    ~ two")).toEqual([
      'A "~" note can\'t hang off another note',
    ]);
  });

  it("drops a `/` comment without letting it become a parent", () => {
    const { doc, errors } = parse(
      "* A &a\n  > causes[6]\n    / a note about the example\n    * B &b",
    );
    expect(errors).toEqual([]);
    expect(doc.edges[0]).toMatchObject({ sourceId: "a", targetId: "b" });
  });

  it("reads %perspectives at column 0", () => {
    expect(parse("%perspectives: [alice, bob, casey]").doc.perspectives).toEqual([
      "alice",
      "bob",
      "casey",
    ]);
  });

  it("reports an unrecognized marker", () => {
    expect(messages("! Something")).toEqual([
      'Unrecognized marker "!" (expected * ? = @ < > ~ % /)',
    ]);
  });
});

describe("parse: the build-a-wall example", () => {
  it("parses with no errors and no warnings", () => {
    const { errors, warnings } = parse(buildAWall);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("produces the same model it did last time", () => {
    expect(parse(buildAWall).doc).toMatchSnapshot();
  });
});

describe("parse: references that could be confused for ids", () => {
  it("doesn't retarget an edge whose endpoint merely spells like an implied claim", () => {
    const { doc, errors } = parse(
      [
        "= Claim X &x",
        "? P &p",
        "  > clarifies[6]",
        "    = Decoy &x--implied",
        "= Other &o",
        "  > supports[6]",
        "    = $x",
      ].join("\n"),
    );
    expect(errors).toEqual([]);
    expect(doc.edges.find((e) => e.type === "clarifies")?.targetId).toBe("x--implied");
  });

  it("names an edge from the endpoints a reference resolved to, not from the reference", () => {
    const { doc } = parse("= A claim &c\n@ A source &s\n  > mentions[8]\n    = $c");
    expect(doc.edges[0].id).toBe("s--mentions--c");
  });

  it("keeps text ending in an ampersand out of the id", () => {
    const { doc } = parse("* Spending on R&D");
    expect(doc.nodes[0]).toMatchObject({ text: "Spending on R&D", id: "spending-on-r-d" });
  });
});

describe("parse: more of the syntax", () => {
  it("reads the longest edge type, not the first word of it", () => {
    const { doc } = parse("* A &a\n  > positively correlates with[6]\n    * B &b");
    expect(doc.edges[0]).toMatchObject({ type: "positively correlates with", scores: [6] });
  });

  it("accepts an opposite spelling as the same relation", () => {
    const { doc } = parse("= A &a\n  < critiques[6]\n    = B &b");
    expect(doc.edges[0].type).toBe("critiques");
    expect(doc.edges[0].id).toBe("b--supports--a");
  });

  it("hangs a note off an edge line", () => {
    const { doc } = parse("* A &a\n  > causes[6] &e\n    ~ worth knowing\n    * B &b");
    expect(doc.edges[0].notes).toMatchObject([{ text: "worth knowing" }]);
  });

  it("hangs a note off what a forward reference names", () => {
    const { doc } = parse("* A &a\n  > causes[6]\n    * $b\n* B &b");
    expect(doc.nodes.find((n) => n.id === "b")?.notes).toEqual([]);
    const { doc: doc2 } = parse("* B &b\n* $b\n  ~ about b");
    expect(doc2.nodes.find((n) => n.id === "b")?.notes).toMatchObject([{ text: "about b" }]);
  });

  it("reuses one implied claim across every block that argues about it", () => {
    const { doc } = parse(
      [
        "*[-4] I &i",
        "= $i",
        "  < supports[5]",
        "    = One &one",
        "= $i",
        "  < supports[6]",
        "    = Two &two",
      ].join("\n"),
    );
    expect(doc.nodes.filter((n) => n.impliedForId === "i")).toHaveLength(1);
    expect(doc.edges.every((e) => e.targetId === "i--implied")).toBe(true);
  });

  it("reports a malformed score row once, not again as leftover text", () => {
    expect(messages("* A &a\n  > causes[6,2\n    * B &b")).toEqual([
      'Unclosed score bracket - expected a "]"',
    ]);
  });

  it("rejects scores written a space away from their marker", () => {
    expect(messages("* [2,-7,8] Border wall")).toEqual([
      'Scores attach directly to the marker, as "*[6,2,-] ..."',
    ]);
  });

  it("rejects a second %perspectives rather than letting it win silently", () => {
    expect(messages("%perspectives: [alice]\n%perspectives: [bob]")).toEqual([
      '"%perspectives" is already set',
    ]);
  });

  it("keeps %opposite to claims and %description to concepts", () => {
    expect(messages("* A concept &a\n  %opposite: the other way")).toEqual([
      '"%opposite" belongs to a claim, not a concept',
    ]);
  });

  it("sees through a `/` comment when deciding a note can't hang off a note", () => {
    expect(messages("* A &a\n  ~ one\n  / an aside\n    ~ two")).toEqual([
      'A "~" note can\'t hang off another note',
    ]);
  });

  it("checks an edge's slot count against %perspectives too", () => {
    expect(messages("%perspectives: [alice, bob]\n* A &a\n  > causes[6,2,8]\n    * B &b")).toEqual([
      "Expected 2 scores to match %perspectives, got 3",
    ]);
  });
});

describe("parse: the example's marquee structure", () => {
  const { doc } = parse(buildAWall);
  const edge = (id: string) => doc.edges.find((e) => e.id === id);

  it("gives every score-bearing thing an implied claim only where one is argued about", () => {
    expect(
      doc.nodes.filter((n) => n.impliedForId !== undefined).map((n) => n.impliedForId),
    ).toEqual([
      "wall-reduces",
      "wait-causes-illegal-immig",
      "illegal-immig",
      "murder-supports-worse-score",
    ]);
  });

  it("points a clarifying question at an edge's implied claim, not at the edge's endpoints", () => {
    expect(doc.edges.find((e) => e.sourceId === "how-enter")).toMatchObject({
      type: "clarifies",
      targetId: "wall-reduces--implied",
    });
  });

  it("reuses one claim in two arguments, which is what the graph buys over a tree", () => {
    const uses = doc.edges.filter((e) => e.sourceId === "visa-overstay");
    expect(uses.map((e) => `${e.type} ${e.targetId}`)).toEqual([
      "answers how-enter",
      "supports wall-reduces--implied",
    ]);
  });

  it("leaves the three unscoreable relations unscored", () => {
    const unscoreable = doc.edges.filter((e) =>
      ["categorizes", "has", "criterion for"].includes(e.type),
    );
    expect(unscoreable).toHaveLength(7);
    expect(unscoreable.every((e) => e.scores === null)).toBe(true);
  });

  it("reads the topic's tags, description and scores off one line and its child", () => {
    expect(doc.nodes.find((n) => n.id === "wall")).toMatchObject({
      tags: ["topic", "action"],
      scores: [2, -7, 8],
    });
    expect(doc.nodes.find((n) => n.id === "wall")?.properties.description).toContain(
      "Should the US build a wall",
    );
  });

  it("keeps the written spelling of a relation while naming it canonically", () => {
    expect(edge("wall-reduces")).toMatchObject({ type: "reduces", scores: [3, -5, 8] });
    expect(edge("legal-immig--causes--illegal-immig")?.type).toBe("reduces");
  });
});
