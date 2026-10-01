import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import { parse as parseArgMap } from "../arg-map-truth-and-relevance/parse.ts";
import sessionStorage from "./examples/session-storage.txt?raw";
import argMapSessionStorage from "../arg-map-truth-and-relevance/examples/session-storage.txt?raw";

describe("session-storage parity", () => {
  it("preserves the wording with the document description written as a note", () => {
    expect(sessionStorage).toBe(argMapSessionStorage.replace(/^%description: /, "~ "));
  });

  it("preserves claims, relation meaning, scores, reuse, and notes", () => {
    const result = parse(sessionStorage);
    const baseline = parseArgMap(argMapSessionStorage);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(baseline.errors).toEqual([]);
    const { doc } = result;
    const expected = baseline.doc;
    const claims = doc.nodes.filter((node) => node.impliedForId === undefined);
    expect(claims).toHaveLength(6);
    expect(claims.every((node) => node.type === "claim")).toBe(true);
    const claimContent = (nodes: typeof expected.claims) =>
      nodes.map(({ id, text, scores, notes }) => ({
        id,
        text,
        scores,
        notes: notes.map((note) => note.text),
      }));
    expect(claimContent(claims)).toEqual(claimContent(expected.claims));
    const referents = new Map(
      doc.nodes.flatMap((node) => (node.impliedForId ? [[node.id, node.impliedForId]] : [])),
    );
    expect([...referents.values()]).toEqual(["fast-supports-redis"]);
    const relations = (edges: typeof doc.edges) =>
      edges.map((edge) => ({
        type: edge.type,
        source: referents.get(edge.sourceId) ?? edge.sourceId,
        target: referents.get(edge.targetId) ?? edge.targetId,
        scores: edge.scores,
        notes: edge.notes.map((note) => note.text),
      }));
    expect(doc.edges).toHaveLength(5);
    expect(relations(doc.edges)).toEqual(relations(expected.edges));
    expect(doc.perspectives).toEqual(expected.perspectives);
    expect(doc.notes.map((note) => note.text)).toEqual([
      expected.description,
      ...expected.notes.map((note) => note.text),
    ]);
  });
});
