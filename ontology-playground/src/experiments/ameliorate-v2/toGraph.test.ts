import { describe, expect, it } from "vitest";
import { parse } from "../../ontology/ameliorate-v2/parse.ts";
import source from "../../../../ameliorate-v2/examples/build-a-wall.txt?raw";
import { toGraph } from "./toGraph.ts";

const { doc, errors, warnings } = parse(source);

describe("build-a-wall rendering experiment", () => {
  it("keeps the real example and its reused claims in the spelled-out graph", () => {
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    const graph = toGraph(doc, "full", "spelled-out");
    expect(
      graph.nodes.filter((node) => doc.nodes.some((semantic) => semantic.id === node.id)),
    ).toHaveLength(38);
    expect(graph.edges.filter((edge) => edge.type === "relation")).toHaveLength(41);
    const wallClaim = doc.nodes.find((node) => node.impliedForId === "wall-reduces")!;
    expect(graph.nodes.find((node) => node.id === wallClaim.id)?.text).toContain("[3,-5,8]");
    expect(graph.edges).toContainEqual(
      expect.objectContaining({ from: "visa-overstay", to: wallClaim.id }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({ from: "visa-overstay", to: "how-enter" }),
    );
    expect(graph.nodes.find((node) => node.id === "wall")?.text).toContain(
      doc.nodes.find((node) => node.id === "wall")!.properties.description,
    );
  });

  it("attaches arguments to the original relation box in implied mode", () => {
    const before = structuredClone(doc);
    const graph = toGraph(doc, "full", "implied");
    expect(doc).toEqual(before);
    expect(graph.nodes.filter((node) => node.type === "relation")).toHaveLength(41);
    const wallClaim = doc.nodes.find((node) => node.impliedForId === "wall-reduces")!;
    expect(graph.nodes.some((node) => node.id === wallClaim.id)).toBe(false);
    expect(graph.nodes.find((node) => node.id === "wall-reduces")?.text).toBe("reduces\n[3,-5,8]");
    const reuseEdge = doc.edges.find(
      (edge) => edge.sourceId === "visa-overstay" && edge.targetId === wallClaim.id,
    )!;
    expect(graph.edges).toContainEqual({ from: "visa-overstay", to: reuseEdge.id, type: "half" });
    expect(graph.edges).toContainEqual({
      from: reuseEdge.id,
      to: "wall-reduces",
      type: "relation",
    });
    expect(
      graph.nodes.some(
        (node) =>
          node.id === doc.nodes.find((semantic) => semantic.impliedForId === "illegal-immig")!.id,
      ),
    ).toBe(true);
  });

  it.each(["spelled-out", "implied"] as const)(
    "filters causal relations and retains their notes in %s mode",
    (display) => {
      const graph = toGraph(doc, "causal", display);
      expect(graph.nodes.filter((node) => node.type === "concept")).toHaveLength(11);
      expect(
        graph.nodes.some(
          (node) => node.type === "claim" || node.type === "question" || node.type === "source",
        ),
      ).toBe(false);
      const notes = graph.nodes.filter((node) => node.type === "note");
      expect(notes).toHaveLength(1);
      expect(notes[0].text).toContain("which requirements would be reduced");
      expect(graph.edges.filter((edge) => edge.type === "relation")).toHaveLength(11);
      const ids = new Set(graph.nodes.map((node) => node.id));
      expect(graph.edges.every((edge) => ids.has(edge.from) && ids.has(edge.to))).toBe(true);
    },
  );
});
