import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import example from "./examples/session-storage.txt?raw";

describe("parse", () => {
  it("builds child -> parent edges from indentation", () => {
    const { doc, errors } = parse("? Q &q1\n  = Idea &i1\n    + Pro &p1\n    - Con &c1");
    expect(errors).toEqual([]);
    expect(doc.nodes).toHaveLength(4);
    expect(doc.edges).toContainEqual({ from: "i1", to: "q1" });
    expect(doc.edges).toContainEqual({ from: "p1", to: "i1" });
    expect(doc.edges).toContainEqual({ from: "c1", to: "i1" });
  });

  it("auto-assigns stable ids to unlabeled nodes", () => {
    const { doc } = parse("? Q\n  = Idea");
    expect(doc.nodes.map((n) => n.id)).toEqual(["n1", "n2"]);
  });

  it("drops `/` meta-comments without error and hangs `~` notes off the line above", () => {
    const { doc, errors } = parse("= Idea &i1\n  / hidden\n  ~ shown note");
    expect(errors).toEqual([]);
    expect(doc.nodes.some((n) => n.text === "hidden")).toBe(false);
    // A note is no node of IBIS's, so it adds neither a node nor an edge to the model.
    expect(doc.nodes).toHaveLength(1);
    expect(doc.edges).toEqual([]);
    expect(doc.nodes[0].notes.map((n) => n.text)).toEqual(["shown note"]);
  });

  it("keeps a note a leaf, so a line nested under one attaches to the note's parent", () => {
    const { doc, errors } = parse("= Idea &i1\n  ~ aside\n    + Pro &p1");
    expect(errors).toEqual([]);
    expect(doc.edges).toContainEqual({ from: "p1", to: "i1" });
  });

  it("takes `$id` in a note's body as prose rather than a reference", () => {
    const { doc, errors } = parse("= Idea &i1\n= Other &i2\n  ~ $i1");
    expect(errors).toEqual([]);
    expect(doc.edges).toEqual([]);
    expect(doc.nodes.find((n) => n.id === "i2")?.notes[0].text).toBe("$i1");
  });

  it("reports a `~` with nothing above it to attach to", () => {
    const { errors } = parse("~ orphan");
    expect(errors.some((e) => /needs a line above it/.test(e.message))).toBe(true);
  });

  it("resolves `$ref` to an edge without creating a node, leaving its type alone", () => {
    const { doc, errors } = parse("= A &a1\n= B\n  - $a1");
    expect(errors).toEqual([]);
    expect(doc.nodes).toHaveLength(2);
    const b = doc.nodes.find((n) => n.text === "B");
    // The `-` places `a1` under B but can't restate what it is: `a1` is still an idea.
    expect(doc.nodes.find((n) => n.id === "a1")?.type).toBe("idea");
    expect(doc.edges).toContainEqual({ from: "a1", to: b?.id });
  });

  it("nests deeper indentation even with mixed tabs and spaces", () => {
    const { doc } = parse("- Con &c1\n\t  - Rebuttal &r1");
    expect(doc.edges).toContainEqual({ from: "r1", to: "c1" });
  });

  it("reports duplicate ids and unknown references as non-fatal errors", () => {
    const dup = parse("= A &x\n= B &x");
    expect(dup.errors.some((e) => /Duplicate/.test(e.message))).toBe(true);
    expect(dup.doc.nodes).toHaveLength(2);

    const ref = parse("= A\n  - $missing");
    expect(ref.errors.some((e) => /Unknown reference/.test(e.message))).toBe(true);
  });

  it("flags an unrecognized marker", () => {
    const { errors } = parse("! not a marker");
    expect(errors.some((e) => /Unrecognized marker/.test(e.message))).toBe(true);
  });

  it("parses the session-storage example cleanly and reuses the referenced con node", () => {
    const { doc, errors } = parse(example);
    expect(errors).toEqual([]);
    // c1 ("Another service to operate") is reused via `- $c1` under the worker queue.
    expect(doc.edges.filter((e) => e.from === "c1").length).toBeGreaterThanOrEqual(2);
  });

  it("matches the parsed-model snapshot for the session-storage example", () => {
    expect(parse(example).doc).toMatchSnapshot();
  });
});
