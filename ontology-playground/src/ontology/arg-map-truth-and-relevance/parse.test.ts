import { describe, expect, it } from "vitest";
import { TOPIC_ID } from "../topic.ts";
import { parse } from "./parse.ts";
import sessionStorage from "./examples/session-storage.txt?raw";
import buildAWall from "./examples/build-a-wall.txt?raw";

// Parsing produces the ontology's own model and stops there — how a document is drawn is
// ./toGraph.test.ts's business.

/** Just the messages, for the error cases. */
const messages = (text: string): string[] => parse(text).errors.map((e) => e.message);

describe("parse", () => {
  it("reads a `<` edge as running from its nested child to the line above", () => {
    const { doc } = parse("= Thesis &t\n  < supports[8] &sup\n    = Reason &r");
    expect(doc.claims.map((c) => c.id)).toEqual(["t", "r"]);
    expect(doc.edges).toEqual([
      { id: "sup", type: "supports", sourceId: "r", targetId: "t", scores: [8], notes: [] },
    ]);
  });

  it("points a `>` edge the other way: parent is the source, child the target", () => {
    const { doc } = parse("= Thesis &t\n= Alternative &a\n  > critiques[6] &crit\n    = $t");
    expect(doc.edges[0]).toMatchObject({ id: "crit", sourceId: "a", targetId: "t" });
  });

  it("attaches an argument to an edge's implied claim via a `= $edge-id` block", () => {
    const { doc } = parse(
      [
        "= Thesis &t",
        "  < supports[8] &sup",
        "    = Reason &r",
        "= $sup",
        "  < critiques[2] &crit",
        "    = Beside the point &btp",
      ].join("\n"),
    );
    // The critique targets the *edge*, not either claim it connects.
    expect(doc.edges[1]).toMatchObject({ id: "crit", sourceId: "btp", targetId: "sup" });
    expect(doc.claims.map((c) => c.id)).not.toContain("sup");
  });

  it("reuses a claim referenced from two places without duplicating it", () => {
    const { doc } = parse(
      [
        "= A &a",
        "  < supports &l1",
        "    = Shared &s",
        "= B &b",
        "  < supports &l2",
        "    = $s",
      ].join("\n"),
    );
    expect(doc.claims.filter((c) => c.id === "s")).toHaveLength(1);
    expect(doc.edges.map((l) => l.sourceId)).toEqual(["s", "s"]);
  });

  it("distinguishes an unscored slot from nobody having scored at all", () => {
    const { doc } = parse("=[6,-,8] Scored &a\n  < supports\n    = Unscored &b");
    expect(doc.claims[0].scores).toEqual([6, null, 8]);
    expect(doc.claims[1].scores).toBeNull();
    expect(doc.edges[0].scores).toBeNull();
  });

  it("accepts kebab-case ids", () => {
    const { doc } = parse("= A &wall-reduces\n  < supports &barrier-supports-reduction\n    = B");
    expect(doc.claims.map((c) => c.id)).toContain("wall-reduces");
    expect(doc.edges.map((l) => l.id)).toContain("barrier-supports-reduction");
  });

  it("keeps notes, drops meta-comments, and lets a sibling claim still be the endpoint", () => {
    const { doc } = parse(
      "= A &a\n  < supports &l\n    / dropped entirely\n    ~ a note &nt\n    = B &b",
    );
    // The note hangs off the edge line it was nested under, not off either claim.
    expect(doc.edges[0].notes).toEqual([{ id: "nt", text: "a note" }]);
    expect(doc.claims.map((c) => c.text)).not.toContain("dropped entirely");
    expect(doc.edges[0]).toMatchObject({ sourceId: "b", targetId: "a" });
  });

  it("rejects a `~` nested under another `~`, but not a sibling one", () => {
    const nested = parse("= A &a\n  ~ first\n    ~ second");
    expect(nested.errors.map((e) => e.message)).toEqual([
      'A "~" note can\'t hang off another note',
    ]);
    expect(nested.doc.claims[0].notes.map((n) => n.text)).toEqual(["first"]);

    const siblings = parse("= A &a\n  ~ first\n  ~ second");
    expect(siblings.errors).toEqual([]);
    expect(siblings.doc.claims[0].notes.map((n) => n.text)).toEqual(["first", "second"]);
  });

  it("takes a `~` with nothing above it as a note on the document", () => {
    const { doc, errors } = parse("~ about the map itself\n= A &a");
    expect(errors).toEqual([]);
    expect(doc.notes.map((n) => n.text)).toEqual(["about the map itself"]);
    expect(doc.claims.flatMap((c) => c.notes)).toEqual([]);
  });

  it("drops a note whose owner never resolved, rather than leaving it ownerless", () => {
    const { doc, errors } = parse("= A &a\n  < supports\n    = $nope\n      ~ orphan");
    expect(errors.map((e) => e.message)).toContain('Unknown reference "$nope"');
    expect(doc.claims.flatMap((c) => c.notes)).toEqual([]);
    expect(doc.edges.flatMap((e) => e.notes)).toEqual([]);
  });

  it("reads %description and %perspectives as document properties", () => {
    const { doc } = parse("%description: Why we care\n%perspectives: [alice, bob]\n= A &a");
    expect(doc.description).toBe("Why we care");
    expect(doc.perspectives).toEqual(["alice", "bob"]);
  });

  it("refuses an id in the renderer's `_` namespace, keeping the line", () => {
    const { doc, errors } = parse("%description: Topic\n= A &_topic");
    expect(errors.map((e) => e.message)).toEqual([
      'An id can\'t start with "_" — the diagram reserves that prefix',
    ]);
    // The header box keeps `_topic` to itself, so the claim is somewhere else entirely.
    expect(doc.claims).toMatchObject([{ id: "c1", text: "A" }]);
    expect(doc.sourceLines[TOPIC_ID]).toEqual([1]);
  });

  it("auto-ids claims and edges that have no `&id`", () => {
    const { doc } = parse("= A\n  < supports\n    = B");
    expect(doc.claims.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(doc.edges.map((l) => l.id)).toEqual(["l1"]);
  });

  it("reports an unknown edge type", () => {
    expect(messages("= A &a\n  < undermines\n    = B")).toContain(
      'Unknown edge type "undermines" (expected supports or critiques)',
    );
  });

  it("reports out-of-range scores and slot counts that disagree with %perspectives", () => {
    expect(messages("=[9] A &a")).toContain('Score "9" is out of range 0-8');
    expect(messages("%perspectives: [alice, bob, casey]\n=[4,1] A &a")).toContain(
      "Expected 3 scores to match %perspectives, got 2",
    );
  });

  it("rejects a claim nested directly under another claim", () => {
    expect(messages("= A &a\n  = B &b")).toContain(
      'A claim must be attached with a "<" or ">" line, not nested directly under another claim',
    );
  });

  it("rejects an edge line with no claim, or with two claims, nested under it", () => {
    expect(messages("= A &a\n  < supports")).toContain('A "<" line needs a claim nested under it');
    expect(messages("= A &a\n  < supports\n    = B\n    = C")).toContain(
      'This "<" line already has a claim nested under it',
    );
  });

  it("rejects an edge line with nothing above it to attach to", () => {
    expect(messages("< supports\n  = B")).toContain(
      'A "<" line needs a claim above it to attach to',
    );
  });

  it("rejects an edge line nested under another edge line", () => {
    expect(messages("= A &a\n  < supports\n    < critiques\n      = B")).toContain(
      'A "<" line can\'t nest under another edge line — argue about an edge with a "= $edge-id" block',
    );
  });

  it("reports unknown references, duplicate ids and unrecognized markers", () => {
    expect(messages("= A &a\n  < supports\n    = $nope")).toContain('Unknown reference "$nope"');
    expect(messages("= A &a\n= B &a")).toContain('Duplicate id "&a"');
    expect(messages("= A &a\n  ! what")).toContain(
      'Unrecognized marker "!" (expected = < > ~ % /)',
    );
  });

  it("rejects scores on a reference line, since the declaration holds them", () => {
    expect(messages("= A &a\n= B &b\n  < supports\n    =[4] $a")).toContain(
      '"$a" can\'t carry scores — the line that declares it holds them',
    );
  });

  it("rejects indented and unknown properties", () => {
    expect(messages("= A &a\n  %description: nope")).toContain(
      'Properties are only supported at the document level (column 0), but "%description" is indented',
    );
    expect(messages("%sources: [a]")).toContain(
      'Unknown property "%sources" (expected %description or %perspectives)',
    );
  });

  it("handles mixed tabs and spaces the same way", () => {
    const withTabs = parse("= A &a\n\t< supports &l\n\t\t= B &b");
    expect(withTabs.errors).toEqual([]);
    expect(withTabs.doc.edges[0]).toMatchObject({ sourceId: "b", targetId: "a" });
  });

  it("parses the bundled examples without errors", () => {
    expect(parse(sessionStorage).errors).toEqual([]);
    expect(parse(buildAWall).errors).toEqual([]);
  });

  it("matches the parsed-model snapshot for the build-a-wall example", () => {
    expect(parse(buildAWall).doc).toMatchSnapshot();
  });
});
