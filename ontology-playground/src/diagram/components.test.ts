import { describe, expect, it } from "vitest";
import { ameliorateV2 } from "../ontology/ameliorate-v2/index.ts";
import { relevanceArgumentMap } from "../ontology/relevance-argument-map/index.ts";
import { defaultFeatureState } from "../ontology/features.ts";
import { LAYOUT_DIRECTIONS, type RenderGraph } from "../ontology/types.ts";
import { layoutDiagram, type DiagramLayout } from "./layout.ts";
import { fakeMeasure, outlinePoints, nearestOn, samplePath } from "./testing.ts";
import rentFreeze from "./__fixtures__/rent-freeze.txt?raw";

function picture(layout: DiagramLayout) {
  if (layout.empty) throw new Error("expected a picture");
  return layout;
}

function connectedTo(graph: RenderGraph, root: string) {
  const ids = new Set([root]);
  for (const id of ids) {
    for (const edge of graph.edges) {
      if (edge.from === id) ids.add(edge.to);
      if (edge.to === id) ids.add(edge.from);
    }
  }
  return ids;
}

function bounds(layout: ReturnType<typeof picture>, ids: Set<string>) {
  const points = layout.nodes
    .filter((node) => ids.has(node.id))
    .flatMap((n) => outlinePoints(n.path));
  for (const edge of layout.edges.filter((e) => ids.has(e.from))) {
    points.push(...edge.points);
    if (edge.label) {
      const { x, y, width, height } = edge.label;
      points.push({ x: x - width / 2, y: y - height / 2 }, { x: x + width / 2, y: y + height / 2 });
    }
  }
  return {
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxY: Math.max(...points.map((p) => p.y)),
  };
}

describe.each(LAYOUT_DIRECTIONS)("disconnected components, %s", (direction) => {
  const vertical = direction === "TB" || direction === "BT";

  function expectSeparated(layout: ReturnType<typeof picture>, islands: Set<string>[]) {
    const boxes = islands.map((ids) => bounds(layout, ids));
    boxes.forEach((box, i) => {
      expect(box.minX).toBeGreaterThanOrEqual(0);
      expect(box.minY).toBeGreaterThanOrEqual(0);
      expect(box.maxX).toBeLessThanOrEqual(layout.width + 0.01);
      expect(box.maxY).toBeLessThanOrEqual(layout.height + 0.01);
      for (const later of boxes.slice(i + 1)) {
        expect(vertical ? later.minX - box.maxX : later.minY - box.maxY).toBeGreaterThanOrEqual(
          99.99,
        );
      }
    });
  }

  it("separates the rent-freeze question, causal map, and argument with their notes and labels", () => {
    const ontology = ameliorateV2;
    const config = { ...ontology.defaultConfig, direction };
    const { doc, errors } = ontology.parse(rentFreeze);
    expect(errors).toEqual([]);
    const graph = ontology.toGraph(doc, config, defaultFeatureState(ontology));
    const islands = [
      "Should a city freeze rents?",
      "rent freeze",
      "A city should freeze rents",
    ].map((text) => connectedTo(graph, graph.nodes.find((n) => n.text === text)!.id));
    expect(islands.reduce((sum, ids) => sum + ids.size, 0)).toBe(graph.nodes.length);
    const layout = picture(layoutDiagram(graph, ontology, config, fakeMeasure));
    expectSeparated(layout, islands);
    expect(layout.nodes.map((n) => n.id)).toEqual(graph.nodes.map((n) => n.id));
    expect(layoutDiagram(graph, ontology, config, fakeMeasure)).toEqual(layout);
  });

  it("reserves space for self-loops and wide labels, keeping invisible anchors in their island", () => {
    const node = (id: string) => ({ id, type: "claim", text: id });
    const graph: RenderGraph = {
      nodes: [node("a"), node("b"), node("header"), node("child"), node("isolated")],
      edges: [
        { from: "a", to: "a", type: "link", label: "a very wide self-loop label" },
        { from: "b", to: "b", type: "link", label: "another island's self-loop" },
        { from: "a", to: "header", type: "anchor" },
        { from: "child", to: "a", type: "link", label: "first", lines: [3] },
        { from: "child", to: "a", type: "link", label: "second", lines: [4] },
        { from: "child", to: "missing", type: "link" },
      ],
    };
    const original = structuredClone(graph);
    const config = { ...relevanceArgumentMap.defaultConfig, direction };
    const layout = picture(layoutDiagram(graph, relevanceArgumentMap, config, fakeMeasure));
    expectSeparated(layout, [
      new Set(["a", "header", "child"]),
      new Set(["b"]),
      new Set(["isolated"]),
    ]);
    expect(layout.edges.map((e) => e.label?.text)).toEqual([
      "a very wide self-loop label",
      "another island's self-loop",
      "first",
      "second",
    ]);
    for (const edge of layout.edges) {
      expect(nearestOn(edge.label!, samplePath(edge.path))).toBeLessThan(0.5);
    }
    const a = layout.nodes.find((n) => n.id === "a")!.label;
    const header = layout.nodes.find((n) => n.id === "header")!.label;
    const delta = vertical ? header.y - a.y : header.x - a.x;
    expect(direction === "TB" || direction === "LR" ? delta : -delta).toBeGreaterThan(0);
    expect(graph).toEqual(original);
  });
});
