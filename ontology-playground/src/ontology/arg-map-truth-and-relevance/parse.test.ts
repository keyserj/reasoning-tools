import { describe, expect, it } from "vitest";
import { parse, parseDoc } from "./parse.ts";
import sample from "./example.txt?raw";

/** Just the messages, for the error cases. */
const messages = (text: string): string[] => parse(text).errors.map((e) => e.message);

describe("parse", () => {
  it("reifies a `<` link into a node between its child source and parent target", () => {
    const { graph } = parse("= Thesis &t\n  < supports[8] &sup\n    = Reason &r");
    expect(graph.nodes).toEqual([
      { id: "t", type: "claim", text: "Thesis" },
      { id: "r", type: "claim", text: "Reason" },
      { id: "sup", type: "supports", text: "supports\n[8]" },
    ]);
    expect(graph.edges).toEqual([
      { from: "r", to: "sup", type: "link" },
      { from: "sup", to: "t", type: "link" },
    ]);
  });

  it("points a `>` link the other way: parent is the source, child the target", () => {
    const { graph } = parse("= Thesis &t\n= Alternative &a\n  > critiques[6] &crit\n    = $t");
    expect(graph.edges).toEqual([
      { from: "a", to: "crit", type: "link" },
      { from: "crit", to: "t", type: "link" },
    ]);
  });

  it("attaches an argument to a link's implied claim via a `= $link-id` block", () => {
    const { graph } = parse(
      [
        "= Thesis &t",
        "  < supports[8] &sup",
        "    = Reason &r",
        "= $sup",
        "  < critiques[2] &crit",
        "    = Beside the point &btp",
      ].join("\n"),
    );
    // The critique targets the *link*, not either claim it connects.
    expect(graph.edges).toEqual([
      { from: "r", to: "sup", type: "link" },
      { from: "sup", to: "t", type: "link" },
      { from: "btp", to: "crit", type: "link" },
      { from: "crit", to: "sup", type: "link" },
    ]);
    expect(graph.nodes.filter((n) => n.id === "sup")).toHaveLength(1);
  });

  it("reuses a claim referenced from two places without duplicating the node", () => {
    const { graph } = parse(
      [
        "= A &a",
        "  < supports &l1",
        "    = Shared &s",
        "= B &b",
        "  < supports &l2",
        "    = $s",
      ].join("\n"),
    );
    expect(graph.nodes.filter((n) => n.id === "s")).toHaveLength(1);
    expect(graph.edges).toContainEqual({ from: "s", to: "l1", type: "link" });
    expect(graph.edges).toContainEqual({ from: "s", to: "l2", type: "link" });
  });

  it("distinguishes an unscored slot from nobody having scored at all", () => {
    const { doc } = parseDoc("=[6,-,8] Scored &a\n  < supports\n    = Unscored &b");
    expect(doc.claims[0].scores).toEqual([6, null, 8]);
    expect(doc.claims[1].scores).toBeNull();
    expect(doc.links[0].scores).toBeNull();
  });

  it("accepts kebab-case ids", () => {
    const { graph } = parse("= A &wall-reduces\n  < supports &barrier-supports-reduction\n    = B");
    expect(graph.nodes.map((n) => n.id)).toContain("wall-reduces");
    expect(graph.nodes.map((n) => n.id)).toContain("barrier-supports-reduction");
  });

  it("keeps notes, drops meta-comments, and lets a sibling claim still be the endpoint", () => {
    const { graph } = parse(
      "= A &a\n  < supports &l\n    / dropped entirely\n    ~ a note &nt\n    = B &b",
    );
    expect(graph.nodes).toContainEqual({ id: "nt", type: "note", text: "a note" });
    expect(graph.nodes.map((n) => n.text)).not.toContain("dropped entirely");
    expect(graph.edges).toContainEqual({ from: "nt", to: "l", type: "note" });
    expect(graph.edges).toContainEqual({ from: "b", to: "l", type: "link" });
  });

  it("builds a topic header from %description and %perspectives", () => {
    const { graph } = parse("%description: Why we care\n%perspectives: [alice, bob]\n= A &a");
    expect(graph.nodes[0]).toEqual({
      id: "_topic",
      type: "topic",
      text: "Why we care\nScores: [alice, bob]",
    });
  });

  it("omits the topic header when the document declares neither property", () => {
    const { graph } = parse("= A &a");
    expect(graph.nodes.map((n) => n.type)).not.toContain("topic");
  });

  it("auto-ids claims and links that have no `&id`", () => {
    const { graph } = parse("= A\n  < supports\n    = B");
    expect(graph.nodes.map((n) => n.id)).toEqual(["c1", "c2", "l1"]);
  });

  it("reports an unknown link type", () => {
    expect(messages("= A &a\n  < undermines\n    = B")).toContain(
      'Unknown link type "undermines" (expected supports or critiques)',
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

  it("rejects a link line with no claim, or with two claims, nested under it", () => {
    expect(messages("= A &a\n  < supports")).toContain('A "<" line needs a claim nested under it');
    expect(messages("= A &a\n  < supports\n    = B\n    = C")).toContain(
      'This "<" line already has a claim nested under it',
    );
  });

  it("rejects a link line with nothing above it to link to", () => {
    expect(messages("< supports\n  = B")).toContain('A "<" line needs a claim above it to link');
  });

  it("rejects a link line nested under another link line", () => {
    expect(messages("= A &a\n  < supports\n    < critiques\n      = B")).toContain(
      'A "<" line can\'t nest under another link line — argue about a link with a "= $link-id" block',
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
    expect(withTabs.graph.edges).toContainEqual({ from: "b", to: "l", type: "link" });
  });

  it("parses the bundled sample without errors", () => {
    expect(parse(sample).errors).toEqual([]);
  });

  it("matches the parsed-graph snapshot for the bundled sample", () => {
    expect(parse(sample).graph).toMatchSnapshot();
  });
});
