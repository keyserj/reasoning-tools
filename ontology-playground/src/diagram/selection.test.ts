import { describe, expect, it } from "vitest";
import { layoutDiagram } from "./layout.ts";
import { fakeMeasure } from "./testing.ts";
import {
  boxesIntersect,
  hiddenItems,
  nodeKey,
  restoreItem,
  selectableDiagram,
  selectionBox,
  segmentIntersectsBox,
} from "./selection.ts";
import type { RenderGraph } from "../ontology/types.ts";

function diagram(
  graph: RenderGraph = {
    nodes: [
      { id: "a", type: "claim", text: "A" },
      { id: "b", type: "claim", text: "B" },
      { id: "c", type: "claim", text: "C" },
    ],
    edges: [
      { from: "a", to: "b", type: "supports" },
      { from: "a", to: "b", type: "supports", label: "Another reason" },
      { from: "b", to: "c", type: "supports" },
      { from: "c", to: "c", type: "supports" },
      { from: "a", to: "c", type: "anchor" },
    ],
  },
) {
  const layout = layoutDiagram(
    graph,
    {
      renderedNodeTypes: [],
      renderedEdgeTypes: [{ id: "anchor", connector: "invisible" }],
    },
    { direction: "BT", showIcons: false, typeColors: {} },
    fakeMeasure,
  );
  if (layout.empty) throw new Error("expected a diagram");
  return selectableDiagram(layout.nodes, layout.edges);
}

describe("diagram selection identities", () => {
  it("distinguishes parallel edges and excludes invisible layout anchors", () => {
    const { items, edges } = diagram();
    expect(items).toHaveLength(7);
    expect(new Set(items.map((item) => item.key)).size).toBe(items.length);
    expect(edges.map((edge) => edge.type)).not.toContain("anchor");
  });

  it("keeps identity when labels, positions, and source lines change", () => {
    const original = diagram();
    const changed = selectableDiagram(
      original.nodes.map((node) => ({
        ...node,
        lines: [40],
        label: { ...node.label, text: "Edited", x: 100 },
      })),
      original.edges.map((edge) => ({
        ...edge,
        lines: [41],
        label: { text: "Edited edge", x: 10, y: 10, width: 20, height: 20 },
      })),
    );
    expect(changed.items.map((item) => item.key)).toEqual(original.items.map((item) => item.key));
  });
});

describe("hiding and restoring", () => {
  it("hides incident edges with a node, leaving unrelated edges visible", () => {
    const { items, edges } = diagram();
    expect(hiddenItems(items, new Set([nodeKey("a")]))).toEqual(
      new Set([nodeKey("a"), edges[0].selectionKey, edges[1].selectionKey]),
    );
  });

  it("hides an edge independently of parallel edges and its endpoints", () => {
    const { items, edges } = diagram();
    expect(hiddenItems(items, new Set([edges[0].selectionKey]))).toEqual(
      new Set([edges[0].selectionKey]),
    );
  });

  it("restores a node's incident edges except edges explicitly hidden", () => {
    const { items, edges } = diagram();
    const hidden = new Set([nodeKey("a"), edges[0].selectionKey]);
    const restored = restoreItem(items.find((item) => item.key === nodeKey("a"))!, hidden);
    expect(hiddenItems(items, restored)).toEqual(new Set([edges[0].selectionKey]));
    expect(hidden.size).toBe(2);
  });

  it("restores both endpoints when showing an edge without restoring other explicit hides", () => {
    const { items, edges } = diagram();
    const edge = items.find((item) => item.key === edges[0].selectionKey)!;
    const restored = restoreItem(
      edge,
      new Set([nodeKey("a"), nodeKey("b"), edge.key, edges[1].selectionKey]),
    );
    expect(hiddenItems(items, restored)).toEqual(new Set([edges[1].selectionKey]));
  });

  it("counts each hidden element once, including self-loops, and ignores stale keys", () => {
    const { items } = diagram();
    expect(hiddenItems(items, new Set([...items.map((item) => item.key), "stale"])).size).toBe(
      items.length,
    );
  });
});

describe("box selection geometry", () => {
  const box = { left: 10, top: 10, right: 20, bottom: 20 };

  it("works in every drag direction and selects partially intersecting boxes", () => {
    for (const [a, b] of [
      [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      [
        { x: 20, y: 20 },
        { x: 10, y: 10 },
      ],
      [
        { x: 10, y: 20 },
        { x: 20, y: 10 },
      ],
      [
        { x: 20, y: 10 },
        { x: 10, y: 20 },
      ],
    ])
      expect(selectionBox(a, b)).toEqual(box);
    expect(boxesIntersect(box, { left: 5, top: 5, right: 12, bottom: 12 })).toBe(true);
    expect(boxesIntersect(box, { left: 0, top: 0, right: 5, bottom: 5 })).toBe(false);
  });

  it("selects crossing, touching, and contained edge segments in either direction", () => {
    for (const [a, b] of [
      [
        { x: 0, y: 15 },
        { x: 30, y: 15 },
      ],
      [
        { x: 15, y: 30 },
        { x: 15, y: 0 },
      ],
      [
        { x: 5, y: 5 },
        { x: 10, y: 10 },
      ],
      [
        { x: 12, y: 12 },
        { x: 18, y: 18 },
      ],
      [
        { x: 15, y: 15 },
        { x: 15, y: 15 },
      ],
    ]) {
      expect(segmentIntersectsBox(a, b, box)).toBe(true);
      expect(segmentIntersectsBox(b, a, box)).toBe(true);
    }
  });

  it("rejects an edge whose bounding box overlaps but whose path misses", () => {
    expect(segmentIntersectsBox({ x: 0, y: 11 }, { x: 11, y: 0 }, box)).toBe(false);
    expect(segmentIntersectsBox({ x: 0, y: 9 }, { x: 30, y: 9 }, box)).toBe(false);
    expect(segmentIntersectsBox({ x: 5, y: 5 }, { x: 5, y: 5 }, box)).toBe(false);
  });
});
