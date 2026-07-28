import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import { sample } from "./sample.ts";

describe("parse", () => {
  it("builds child -> parent edges with the child's marker type", () => {
    const { graph, errors } = parse("? Q &q1\n  = Idea &i1\n    + Pro &p1\n    - Con &c1");
    expect(errors).toEqual([]);
    expect(graph.nodes).toHaveLength(4);
    expect(graph.edges).toContainEqual({ from: "i1", to: "q1", type: "idea" });
    expect(graph.edges).toContainEqual({ from: "p1", to: "i1", type: "pro" });
    expect(graph.edges).toContainEqual({ from: "c1", to: "i1", type: "con" });
  });

  it("auto-assigns stable ids to unlabeled nodes", () => {
    const { graph } = parse("? Q\n  = Idea");
    expect(graph.nodes.map((n) => n.id)).toEqual(["n1", "n2"]);
  });

  it("drops `/` meta-comments without error and keeps `~` notes", () => {
    const { graph, errors } = parse("= Idea &i1\n  / hidden\n  ~ shown note");
    expect(errors).toEqual([]);
    const note = graph.nodes.find((n) => n.type === "note");
    expect(note?.text).toBe("shown note");
    expect(graph.nodes.some((n) => n.text === "hidden")).toBe(false);
    expect(graph.edges).toContainEqual({ from: note?.id, to: "i1", type: "note" });
  });

  it("resolves `$ref` to an edge without creating a node", () => {
    const { graph, errors } = parse("= A &a1\n= B\n  - $a1");
    expect(errors).toEqual([]);
    expect(graph.nodes).toHaveLength(2);
    const b = graph.nodes.find((n) => n.text === "B");
    expect(graph.edges).toContainEqual({ from: "a1", to: b?.id, type: "con" });
  });

  it("nests deeper indentation even with mixed tabs and spaces", () => {
    const { graph } = parse("- Con &c1\n\t  - Rebuttal &r1");
    expect(graph.edges).toContainEqual({ from: "r1", to: "c1", type: "con" });
  });

  it("reports duplicate ids and unknown references as non-fatal errors", () => {
    const dup = parse("= A &x\n= B &x");
    expect(dup.errors.some((e) => /Duplicate/.test(e.message))).toBe(true);
    expect(dup.graph.nodes).toHaveLength(2);

    const ref = parse("= A\n  - $missing");
    expect(ref.errors.some((e) => /Unknown reference/.test(e.message))).toBe(true);
  });

  it("flags an unrecognized marker", () => {
    const { errors } = parse("! not a marker");
    expect(errors.some((e) => /Unrecognized marker/.test(e.message))).toBe(true);
  });

  it("parses the bundled sample cleanly and reuses the referenced con node", () => {
    const { graph, errors } = parse(sample);
    expect(errors).toEqual([]);
    // c1 ("Another service to operate") is reused via `- $c1` under the worker queue.
    expect(graph.edges.filter((e) => e.from === "c1").length).toBeGreaterThanOrEqual(2);
  });

  it("matches the parsed-graph snapshot for the bundled sample", () => {
    expect(parse(sample).graph).toMatchSnapshot();
  });
});
