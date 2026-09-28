import { describe, expect, it } from "vitest";
import { parse } from "./parse.ts";
import source from "../../../../ameliorate-v2/examples/build-a-wall.txt?raw";
import { toGraph } from "./toGraph.ts";
import { withoutLines } from "../testing.ts";
import { VIEW, EDGE_CLAIMS } from "./features.ts";
import type { FeatureState } from "../types.ts";

const project = (doc: Parameters<typeof toGraph>[0], view: string, display: string) =>
  withoutLines(toGraph(doc, { [VIEW]: { option: view }, [EDGE_CLAIMS]: { option: display } }));

const { doc, errors, warnings } = parse(source);

const combinations = ["full", "causal"].flatMap((view) =>
  ["implied", "spelled-out"].map((display) => ({ view, display })),
);
const state = (view: string, display: string): FeatureState => ({
  [VIEW]: { option: view },
  [EDGE_CLAIMS]: { option: display },
});

const annotated = [
  "%perspectives: [alice, bob]",
  "~ About this map",
  "*[-4,2] Pollution &p #topic",
  "  %description: Air quality",
  "*[-,6] Filters &f #action",
  "  > reduces[4,-2] &r",
  "    ~ Relation note",
  "    * $p",
  "= $r",
  "  ~ Claim note",
  "  < supports[6,-] &s",
  "    =[5,3] Filters trap particles &e",
  "= $p",
  "  ~ Importance note",
].join("\n");

describe("toGraph", () => {
  it("defaults to Full structure and Implied", () => {
    const parsed = parse(annotated).doc;
    expect(toGraph(parsed, {})).toEqual(toGraph(parsed, state("full", "implied")));
  });

  it.each(combinations)(
    "projects $view / $display without changing the document",
    ({ view, display }) => {
      const parsed = parse(annotated).doc;
      const before = structuredClone(parsed);
      const graph = toGraph(parsed, state(view, display));
      expect(parsed).toEqual(before);
      const ids = new Set(graph.nodes.map((node) => node.id));
      expect(ids.size).toBe(graph.nodes.length);
      expect(graph.edges.every((edge) => ids.has(edge.from) && ids.has(edge.to))).toBe(true);
      expect(withoutLines(graph)).toMatchSnapshot();
    },
  );

  it.each(combinations)(
    "keeps source targets and note ownership in $view / $display",
    ({ view, display }) => {
      const graph = toGraph(parse(annotated).doc, state(view, display));
      const findNode = (id: string) => graph.nodes.find((node) => node.id === id);
      expect(findNode("p")?.lines).toEqual([3, 4, 8]);
      expect(findNode("f")?.lines).toEqual([5]);
      expect(findNode("_score_context")?.lines).toEqual([1]);
      expect(findNode("note-about-this-map")?.lines).toEqual([2]);
      expect(findNode("note-relation-note")?.lines).toEqual([7]);
      expect(
        graph.edges
          .filter((edge) => edge.type === "anchor")
          .every((edge) => edge.lines === undefined),
      ).toBe(true);
      expect(graph.nodes.every((node) => node.lines?.length)).toBe(true);
      expect(
        graph.edges.filter((edge) => edge.type !== "anchor").every((edge) => edge.lines?.length),
      ).toBe(true);

      const relationOwner =
        display === "implied" ? "r" : view === "full" ? "r--implied" : "_note_owner_r";
      expect(graph.edges).toContainEqual({
        from: "note-relation-note",
        to: relationOwner,
        type: "note",
        lines: [7],
      });
      expect(findNode(relationOwner)?.lines).toEqual(
        display === "implied" ? (view === "full" ? [6, 9] : [6]) : view === "full" ? [9] : [6],
      );
      if (view === "full") {
        expect(findNode("p--implied")?.lines).toEqual([13]);
        expect(graph.edges).toContainEqual({
          from: "note-claim-note",
          to: relationOwner,
          type: "note",
          lines: [10],
        });
        expect(graph.edges).toContainEqual({
          from: "note-importance-note",
          to: "p--implied",
          type: "note",
          lines: [14],
        });
      } else {
        expect(findNode("note-claim-note")).toBeUndefined();
        expect(findNode("note-importance-note")).toBeUndefined();
        expect(findNode("e")).toBeUndefined();
        expect(graph.nodes.flatMap((node) => node.lines ?? [])).not.toContain(9);
      }
    },
  );

  it("combines repeated implied references while keeping connector clicks on the relation", () => {
    const parsed = parse("= $r\n* A &a\n  > causes &r\n    * B &b\n= $r\n= $r").doc;
    const graph = toGraph(parsed, {});
    expect(graph.nodes.find((node) => node.id === "r")?.lines).toEqual([3, 1, 5, 6]);
    expect(graph.edges).toEqual([
      { from: "a", to: "r", type: "half", lines: [3] },
      { from: "r", to: "b", type: "relation", lines: [3] },
    ]);
  });

  it("reads implied scores from their owner and preserves signed and missing slots", () => {
    const parsed = parse(annotated).doc;
    const implied = toGraph(parsed, {});
    expect(implied.nodes.find((node) => node.id === "r")?.text).toBe("reduces\n[4,-2]");
    expect(implied.nodes.find((node) => node.id === "s")?.text).toBe("supports\n[6,-]");
    expect(implied.nodes.find((node) => node.id === "p--implied")?.text).toContain(
      "Pollution is important to increase\n[-4,2]",
    );
    expect(implied.nodes.some((node) => node.id === "r--implied")).toBe(false);
    parsed.edges.find((edge) => edge.id === "r")!.scores = [0, null];
    const spelled = toGraph(parsed, state("full", "spelled-out"));
    expect(spelled.nodes.find((node) => node.id === "r--implied")?.text).toContain("[0,-]");
    expect(parsed.nodes.find((node) => node.id === "r--implied")?.scores).toBeNull();
  });

  it("remaps both ends of relations involving nested implied claims", () => {
    const parsed = parse(
      "* A &a\n  > causes &r\n    * B &b\n= $r\n  < supports &s\n    = Evidence &e\n= $s\n  > critiques &c\n    = $r",
    ).doc;
    const graph = toGraph(parsed, {});
    expect(graph.nodes.some((node) => node.id.endsWith("--implied"))).toBe(false);
    expect(graph.edges).toContainEqual({ from: "s", to: "c", type: "half", lines: [8] });
    expect(graph.edges).toContainEqual({ from: "c", to: "r", type: "relation", lines: [8] });
  });

  it("gives a note on a scoreless relation an attachment box without creating a claim", () => {
    const parsed = parse("* Whole &w\n  > has &h\n    ~ Details\n    * Part &p").doc;
    const graph = toGraph(parsed, state("full", "spelled-out"));
    expect(parsed.nodes.some((node) => node.impliedForId)).toBe(false);
    expect(graph.nodes.find((node) => node.id === "_note_owner_h")).toMatchObject({
      type: "relation",
      lines: [2],
    });
    expect(graph.edges).toContainEqual({
      from: "note-details",
      to: "_note_owner_h",
      type: "note",
      lines: [3],
    });
  });

  it("keeps tags, properties and relation-derived subtypes from the unfiltered document", () => {
    const parsed = parse(
      "* Filter &f #topic #action\n  %opposite: No filter\n  > causes &c\n    * Clean air &a\n  > criterion for\n    ? Which? &q\n  > categorizes\n    * $a\n* Whole &w\n  > has\n    * $f",
    ).doc;
    const graph = toGraph(parsed, state("causal", "implied"));
    const text = graph.nodes.find((node) => node.id === "f")!.text;
    for (const tag of ["#topic", "#action", "#criterion", "#category", "#component"])
      expect(text).toContain(tag);
    expect(text).toContain("Opposite: No filter");
    expect(graph.nodes.some((node) => node.id === "q" || node.id === "w")).toBe(false);
  });

  it("filters correlations, arguments and isolated concepts out of the causal view", () => {
    const parsed = parse(
      "* A &a\n  > positively correlates with\n    * B &b\n* Isolated &i\n= Claim &c\n  > supports\n    = Other &o",
    ).doc;
    expect(toGraph(parsed, state("causal", "implied"))).toEqual({ nodes: [], edges: [] });
  });

  it.each([">", "<"])("keeps the drawable half of an unresolved %s relation", (marker) => {
    const parsed = parse(`* A &a\n  ${marker} causes &r\n    * $missing`).doc;
    const graph = toGraph(parsed, {});
    expect(graph.edges).toEqual([
      marker === ">"
        ? { from: "a", to: "r", type: "half", lines: [2] }
        : { from: "r", to: "a", type: "relation", lines: [2] },
    ]);
    expect(toGraph(parsed, state("full", "spelled-out")).edges).toEqual([]);
    expect(toGraph(parsed, state("causal", "implied"))).toEqual({ nodes: [], edges: [] });
  });

  it.each(combinations)(
    "handles empty and incomplete documents in $view / $display",
    ({ view, display }) => {
      for (const text of ["", "*", "= $missing", "* A &a\n  > causes"]) {
        const graph = toGraph(parse(text).doc, state(view, display));
        expect(graph.edges).toEqual([]);
      }
    },
  );

  it("keeps document context when a document has no causal relations", () => {
    const graph = toGraph(
      parse("%perspectives: [alice]\n~ Context\n= A claim").doc,
      state("causal", "implied"),
    );
    expect(graph.nodes.map((node) => [node.type, node.lines])).toEqual([
      ["note", [2]],
      ["context", [1]],
    ]);
    expect(graph.edges).toEqual([]);
  });

  it.each(combinations)(
    "keeps synthetic IDs distinct from user IDs in $view / $display",
    ({ view, display }) => {
      const parsed = parse(
        "%perspectives: [alice]\n* A &_score_context\n  > causes &r\n    ~ Details\n    * B &_note_owner_r\n* C &_score_context_1",
      ).doc;
      const graph = toGraph(parsed, state(view, display));
      expect(new Set(graph.nodes.map((node) => node.id)).size).toBe(graph.nodes.length);
      expect(graph.nodes.find((node) => node.type === "context")?.id).toBe("_score_context_2");
      expect(graph.nodes.find((node) => node.id === "_score_context")?.text).toBe("A");
      if (display === "spelled-out")
        expect(graph.edges).toContainEqual({
          from: "note-details",
          to: "_note_owner_r_1",
          type: "note",
          lines: [4],
        });
    },
  );

  it("doesn't let a synthetic note attachment satisfy an unresolved reference", () => {
    const parsed = parse(
      "* A &a\n  > has &h\n    ~ Details\n    * B &b\n* $a\n  > causes &r\n    * $_note_owner_h",
    ).doc;
    const graph = toGraph(parsed, state("full", "spelled-out"));
    expect(graph.nodes.some((node) => node.id === "_note_owner_h")).toBe(false);
    expect(graph.nodes.some((node) => node.id === "_note_owner_h_1")).toBe(true);
    expect(graph.edges.some((edge) => edge.type === "relation" && edge.lines?.includes(6))).toBe(
      false,
    );
  });

  it("bounds cyclic implied wording and falls back to the repeated ID", () => {
    const parsed = parse("= $loop\n  > supports &loop\n    = Claim &c").doc;
    const graph = toGraph(parsed, state("full", "spelled-out"));
    const label = graph.nodes.find((node) => node.id === "loop--implied")!.text;
    expect(label).toContain('"loop--implied" supports "Claim"');
    expect(label.length).toBeLessThan(200);
  });

  it("truncates quoted endpoints while preserving an explicit claim's full text", () => {
    const long = "A".repeat(200);
    const graph = toGraph(
      parse(`= ${long} &a\n  > supports &s\n    = B &b\n= $s`).doc,
      state("full", "spelled-out"),
    );
    expect(graph.nodes.find((node) => node.id === "a")?.text).toBe(long);
    expect(graph.nodes.find((node) => node.id === "s--implied")?.text).toContain(
      `${"A".repeat(69)}…`,
    );
  });
});

describe("build-a-wall rendering", () => {
  it("keeps the real example and its reused claims in the spelled-out graph", () => {
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    const graph = project(doc, "full", "spelled-out");
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
    const graph = project(doc, "full", "implied");
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
      const graph = project(doc, "causal", display);
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
