import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import example from "./examples/session-storage.txt?raw";

describe("parse", () => {
  it("keeps a written id clear of the ones it mints for edges and notes", () => {
    // Every id in a document is unique whoever minted it, so `sourceLines` can key them all.
    const { doc } = parse("= Claim &n1\n  + Nested &n2\n    ~ aside &n3");
    const ids = [
      ...doc.nodes.map((node) => node.id),
      ...doc.nodes.flatMap((node) => node.notes.map((note) => note.id)),
      ...doc.edges.map((edge) => edge.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(doc.sourceLines).sort()).toEqual([...ids].sort());
  });

  it("builds child -> parent edges from indentation", () => {
    const { doc, errors } = parse(
      "= Root &q1\n  = Claim &i1\n    + Support &p1\n    - Critique &c1",
    );
    expect(errors).toEqual([]);
    expect(doc.nodes).toHaveLength(4);
    expect(doc.edges).toContainEqual(expect.objectContaining({ from: "i1", to: "q1" }));
    expect(doc.edges).toContainEqual(expect.objectContaining({ from: "p1", to: "i1" }));
    expect(doc.edges).toContainEqual(expect.objectContaining({ from: "c1", to: "i1" }));
  });

  it("auto-assigns stable ids to unlabeled nodes", () => {
    const { doc } = parse("= Root\n  = Claim");
    expect(doc.nodes.map((n) => n.id)).toEqual(["n1", "n2"]);
  });

  it("allows every node type at the root and under any other type", () => {
    for (const parent of ["=", "+", "-"]) {
      const { doc, errors } = parse(
        `${parent} Parent &parent\n  = Claim\n  + Support\n  - Critique`,
      );
      expect(errors).toEqual([]);
      expect(doc.nodes.slice(1).map((n) => n.type)).toEqual(["claim", "support", "critique"]);
      expect(doc.edges.map((e) => e.to)).toEqual(["parent", "parent", "parent"]);
    }
  });

  it("rejects question declarations and references while preserving surrounding lines", () => {
    const { doc, errors } = parse(
      "= Root &root\n  ? Question &question\n    + Support &support\n  ? $root\n  - Critique &critique",
    );
    expect(errors).toEqual([
      { line: 2, message: 'Unrecognized marker "?" (expected = + - ~ /)' },
      { line: 4, message: 'Unrecognized marker "?" (expected = + - ~ /)' },
    ]);
    expect(doc.nodes.map((n) => n.id)).toEqual(["root", "support", "critique"]);
    expect(doc.edges).toMatchObject([
      { from: "support", to: "root" },
      { from: "critique", to: "root" },
    ]);
    expect(doc.sourceLines.support).toEqual([3]);
    expect(doc.sourceLines.critique).toEqual([5]);
  });

  it("files lines under ids that name members of `Object.prototype`", () => {
    // On a plain `{}`, `sourceLines["constructor"]` reads back the inherited function and filing a
    // line onto it throws, taking a document someone shared a link to down with it.
    const { doc, errors } = parse("= Claim &constructor\n  + Support &toString");
    expect(errors).toEqual([]);
    expect(doc.sourceLines["constructor"]).toEqual([1]);
    expect(doc.sourceLines["toString"]).toEqual([2]);
  });

  it("refuses an id in the renderer's `_` namespace, keeping the line", () => {
    // Arg map: basic draws no box of the renderer's own today, but the namespace is the shared renderer's
    // (../ids.ts), so a syntax that let a document in would be the one that collides later.
    const { doc, errors } = parse("= Claim &_topic");
    expect(errors.map((e) => e.message)).toEqual([
      'An id can\'t start with "_" — the diagram reserves that prefix',
    ]);
    expect(doc.nodes).toMatchObject([{ id: "n1", text: "Claim" }]);
  });

  it("drops `/` meta-comments without error and hangs `~` notes off the line above", () => {
    const { doc, errors } = parse("= Claim &i1\n  / hidden\n  ~ shown note");
    expect(errors).toEqual([]);
    expect(doc.nodes.some((n) => n.text === "hidden")).toBe(false);
    // A note is no node of Arg map: basic's, so it adds neither a node nor an edge to the model.
    expect(doc.nodes).toHaveLength(1);
    expect(doc.edges).toEqual([]);
    expect(doc.nodes[0].notes.map((n) => n.text)).toEqual(["shown note"]);
  });

  it("keeps a note a leaf, so a line nested under one attaches to the note's parent", () => {
    const { doc, errors } = parse("= Claim &i1\n  ~ aside\n    + Support &p1");
    expect(errors).toEqual([]);
    expect(doc.edges).toContainEqual(expect.objectContaining({ from: "p1", to: "i1" }));
  });

  it("takes `$id` in a note's body as prose rather than a reference", () => {
    const { doc, errors } = parse("= Claim &i1\n= Other &i2\n  ~ $i1");
    expect(errors).toEqual([]);
    expect(doc.edges).toEqual([]);
    expect(doc.nodes.find((n) => n.id === "i2")?.notes[0].text).toBe("$i1");
  });

  it("rejects a `~` nested under another `~`, but not a sibling one", () => {
    const nested = parse("= Claim &i1\n  ~ first\n    ~ second");
    expect(nested.errors.map((e) => e.message)).toEqual([
      'A "~" note can\'t hang off another note',
    ]);
    expect(nested.doc.nodes[0].notes.map((n) => n.text)).toEqual(["first"]);

    const siblings = parse("= Claim &i1\n  ~ first\n  ~ second");
    expect(siblings.errors).toEqual([]);
    expect(siblings.doc.nodes[0].notes.map((n) => n.text)).toEqual(["first", "second"]);
  });

  it("takes a `~` with nothing above it as a note on the document", () => {
    const { doc, errors } = parse("~ about the map itself\n= Root &q1");
    expect(errors).toEqual([]);
    expect(doc.notes.map((n) => n.text)).toEqual(["about the map itself"]);
    expect(doc.nodes.flatMap((n) => n.notes)).toEqual([]);
  });

  it("resolves `$ref` to an edge without creating a node, leaving its type alone", () => {
    const { doc, errors } = parse("= A &a1\n= B\n  - $a1");
    expect(errors).toEqual([]);
    expect(doc.nodes).toHaveLength(2);
    const b = doc.nodes.find((n) => n.text === "B");
    // The `-` places `a1` under B but can't restate what it is: `a1` is still a claim.
    expect(doc.nodes.find((n) => n.id === "a1")?.type).toBe("claim");
    expect(doc.edges).toContainEqual(expect.objectContaining({ from: "a1", to: b?.id }));
  });

  it("resolves a forward reference and attaches its children and notes to the referenced node", () => {
    const { doc, errors } = parse(
      "= Root &root\n  - $later\n    ~ an aside &note\n    - Objection &objection\n+ Later &later",
    );
    expect(errors).toEqual([]);
    expect(doc.nodes).toHaveLength(3);
    expect(doc.nodes.find((n) => n.id === "later")).toMatchObject({
      type: "support",
      notes: [{ id: "note", text: "an aside" }],
    });
    expect(doc.edges).toEqual([
      { id: "l1", from: "objection", to: "later" },
      { id: "l2", from: "later", to: "root" },
    ]);
    expect(doc.sourceLines.l2).toEqual([2]);
  });

  it("reports a reference without a parent", () => {
    const { errors } = parse("= Claim &claim\n+ $claim");
    expect(errors).toEqual([{ line: 2, message: 'Reference "$claim" has no parent to attach to' }]);
  });

  it("nests deeper indentation even with mixed tabs and spaces", () => {
    const { doc } = parse("- Critique &c1\n\t  - Rebuttal &r1");
    expect(doc.edges).toContainEqual(expect.objectContaining({ from: "r1", to: "c1" }));
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

  it("parses the session-storage example cleanly and reuses the referenced critique node", () => {
    const { doc, errors } = parse(example);
    expect(errors).toEqual([]);
    // c1 ("Another service to operate") is reused via `- $c1` under the worker queue.
    expect(doc.edges.filter((e) => e.from === "c1").length).toBeGreaterThanOrEqual(2);
  });

  it("matches the parsed-model snapshot for the session-storage example", () => {
    expect(parse(example).doc).toMatchSnapshot();
  });
});
