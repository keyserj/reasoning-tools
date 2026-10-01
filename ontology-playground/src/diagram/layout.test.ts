import { describe, expect, it } from "vitest";
import type {
  FeatureState,
  Ontology,
  RenderGraph,
  StyleConfig,
  LayoutDirection,
} from "../ontology/types.ts";
import { ontologyList } from "../ontology/registry.ts";
import { defaultFeatureState } from "../ontology/features.ts";
import { parse as parseBasic } from "../ontology/arg-map-basic/parse.ts";
import { argMapBasic } from "../ontology/arg-map-basic/index.ts";
import { argMapTruthAndRelevance } from "../ontology/arg-map-truth-and-relevance/index.ts";
import { EDGE_CLAIMS, SPELLED_OUT } from "../ontology/arg-map-truth-and-relevance/features.ts";
import {
  ARROW_INSET,
  type DiagramLayout,
  EMPTY_PLACEHOLDER,
  basisPath,
  layoutDiagram,
} from "./layout.ts";
import { distanceToOutline, fakeMeasure, nearestOn, outlinePoints, samplePath } from "./testing.ts";

/** The default lens, then every option and param option of each feature on its own. */
function lenses(ontology: Ontology): { lens: string; features: FeatureState }[] {
  const base = defaultFeatureState(ontology);
  const out = [{ lens: "default", features: base }];
  for (const feature of ontology.features) {
    for (const option of feature.options) {
      out.push({
        lens: `${feature.id}=${option.id}`,
        features: { ...base, [feature.id]: { ...base[feature.id], option: option.id } },
      });
    }
    for (const param of feature.params ?? []) {
      for (const option of param.options) {
        out.push({
          lens: `${feature.id}.${param.id}=${option.id}`,
          features: {
            ...base,
            [feature.id]: {
              option: param.onlyForOptions?.[0] ?? base[feature.id].option,
              params: { ...base[feature.id].params, [param.id]: option.id },
            },
          },
        });
      }
    }
  }
  return out;
}

const cases = ontologyList.flatMap((ontology) =>
  ontology.examples.flatMap((example) =>
    lenses(ontology).map(({ lens, features }) => ({
      name: `${ontology.id} / ${example.id} / ${lens}`,
      ontology,
      graph: ontology.toGraph(ontology.parse(example.source).doc, ontology.defaultConfig, features),
    })),
  ),
);

function laidOut(layout: DiagramLayout) {
  if (layout.empty) throw new Error("expected a picture");
  return layout;
}

const config = (overrides: Partial<StyleConfig> = {}): StyleConfig => ({
  direction: "BT",
  showIcons: false,
  typeColors: {},
  ...overrides,
});

describe.each(cases)("$name", ({ ontology, graph }) => {
  const layout = laidOut(layoutDiagram(graph, ontology, ontology.defaultConfig, fakeMeasure));
  const outlines = new Map(layout.nodes.map((node) => [node.id, outlinePoints(node.path)]));

  it("places every node at a finite position", () => {
    for (const node of layout.nodes) {
      expect([node.label.x, node.label.y].every(Number.isFinite)).toBe(true);
      expect(
        outlinePoints(node.path).every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
      ).toBe(true);
    }
  });

  it("ends every drawn edge on the outlines of the boxes it joins", () => {
    for (const edge of layout.edges) {
      const first = edge.points[0];
      const last = edge.points[edge.points.length - 1];
      expect(distanceToOutline(first, outlines.get(edge.from)!)).toBeLessThan(0.5);
      expect(distanceToOutline(last, outlines.get(edge.to)!)).toBeLessThan(0.5);
    }
  });

  it("draws every edge whose ends exist, except invisible ones", () => {
    const ids = new Set(graph.nodes.map((node) => node.id));
    const connectorOf = (type: string) =>
      ontology.renderedEdgeTypes.find((t) => t.id === type)?.connector ?? "arrow";
    const expected = graph.edges.filter(
      (edge) => ids.has(edge.from) && ids.has(edge.to) && connectorOf(edge.type) !== "invisible",
    );
    expect(layout.edges.map((e) => [e.from, e.to, e.type])).toEqual(
      expected.map((e) => [e.from, e.to, e.type]),
    );
  });

  it("centers every edge label on its connector", () => {
    for (const edge of layout.edges) {
      if (edge.label) expect(nearestOn(edge.label, samplePath(edge.path))).toBeLessThan(0.5);
    }
  });
});

describe("layoutDiagram", () => {
  const types = argMapBasic;
  const node = (id: string, text = id) => ({ id, type: "claim", text });

  it("returns the placeholder for an empty graph", () => {
    expect(layoutDiagram({ nodes: [], edges: [] }, types, config(), fakeMeasure)).toEqual({
      empty: true,
      placeholder: EMPTY_PLACEHOLDER,
    });
  });

  it("drops an edge whose endpoint is missing", () => {
    const layout = laidOut(
      layoutDiagram(
        {
          nodes: [node("a"), node("b")],
          edges: [
            { from: "a", to: "b", type: "supports" },
            { from: "a", to: "nope", type: "supports" },
          ],
        },
        types,
        config(),
        fakeMeasure,
      ),
    );
    expect(layout.edges.map((e) => [e.from, e.to])).toEqual([["a", "b"]]);
  });

  it("lays out ids that name members of `Object.prototype`", () => {
    const layout = laidOut(
      layoutDiagram(
        {
          nodes: [node("constructor"), node("__proto__")],
          edges: [{ from: "constructor", to: "__proto__", type: "supports" }],
        },
        types,
        config(),
        fakeMeasure,
      ),
    );
    expect(layout.nodes).toHaveLength(2);
    expect(layout.edges).toHaveLength(1);
  });

  it.each([
    ["TB", (a: number, b: number) => a < b, "y"],
    ["BT", (a: number, b: number) => a > b, "y"],
    ["LR", (a: number, b: number) => a < b, "x"],
    ["RL", (a: number, b: number) => a > b, "x"],
  ] as const)("ranks an edge's source before its target along %s", (direction, before, axis) => {
    const layout = laidOut(
      layoutDiagram(
        { nodes: [node("a"), node("b")], edges: [{ from: "a", to: "b", type: "supports" }] },
        types,
        config({ direction: direction as LayoutDirection }),
        fakeMeasure,
      ),
    );
    const [a, b] = layout.nodes.map((n) => n.label[axis]);
    expect(before(a, b)).toBe(true);
  });

  it.each(["TB", "BT", "LR", "RL"] as const)(
    "routes a self-loop out and back to its own box, %s",
    (direction) => {
      const layout = laidOut(
        layoutDiagram(
          {
            nodes: [node("a", "A longer claim"), node("b")],
            edges: [
              { from: "a", to: "a", type: "supports", lines: [3] },
              { from: "b", to: "a", type: "supports" },
            ],
          },
          types,
          config({ direction }),
          fakeMeasure,
        ),
      );
      const loop = layout.edges[0];
      const outline = outlinePoints(layout.nodes[0].path);
      const [first, last] = [loop.points[0], loop.points[loop.points.length - 1]];
      expect(distanceToOutline(first, outline)).toBeLessThan(0.5);
      expect(distanceToOutline(last, outline)).toBeLessThan(0.5);
      expect(Math.hypot(first.x - last.x, first.y - last.y)).toBeGreaterThan(5);
      expect(loop.lines).toEqual([3]);
      // Inside the picture, which dagre's own size would cut it off from.
      for (const p of samplePath(loop.path)) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(layout.width);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(layout.height);
      }
    },
  );

  it("labels a self-loop on its own curve", () => {
    const layout = laidOut(
      layoutDiagram(
        {
          nodes: [{ id: "a", type: "claim", text: "A" }],
          edges: [{ from: "a", to: "a", type: "supports", label: "loops" }],
        },
        argMapTruthAndRelevance,
        config(),
        fakeMeasure,
      ),
    );
    const [loop] = layout.edges;
    expect(nearestOn(loop.label!, samplePath(loop.path))).toBeLessThan(0.5);
  });

  it.each(["TB", "LR"] as const)(
    "routes a wide box's self-loop outside it, arrowhead and all, %s",
    (direction) => {
      const text = "a claim long enough that its label wraps at the full two hundred pixels";
      const layout = laidOut(
        layoutDiagram(
          {
            nodes: [node("a", text)],
            edges: [{ from: "a", to: "a", type: "supports" }],
          },
          types,
          config({ direction }),
          fakeMeasure,
        ),
      );
      const [loop] = layout.edges;
      const outline = outlinePoints(layout.nodes[0].path);
      const xs = outline.map((p) => p.x);
      const ys = outline.map((p) => p.y);
      const inside = (p: { x: number; y: number }) =>
        p.x > Math.min(...xs) + 0.5 &&
        p.x < Math.max(...xs) - 0.5 &&
        p.y > Math.min(...ys) + 0.5 &&
        p.y < Math.max(...ys) - 0.5;
      expect(loop.points.slice(1, -1).some(inside)).toBe(false);
      const samples = samplePath(loop.path);
      const end = samples[samples.length - 1];
      const tip = loop.points[loop.points.length - 1];
      expect(Math.hypot(end.x - tip.x, end.y - tip.y)).toBeCloseTo(ARROW_INSET, 1);
    },
  );

  it("keeps parallel edges apart, each with its own lines", () => {
    // A child plus a repeated `$ref` of it: two connectors between the same two boxes.
    const { doc, errors } = parseBasic("= A &a\n  + B &b\n  + $b");
    expect(errors).toEqual([]);
    const layout = laidOut(
      layoutDiagram(argMapBasic.toGraph(doc, config(), {}), types, config(), fakeMeasure),
    );
    expect(layout.edges.map((e) => [e.from, e.to, e.lines])).toEqual([
      ["b", "a", [2]],
      ["b", "a", [3]],
    ]);
    expect(layout.edges[0].path).not.toEqual(layout.edges[1].path);
  });

  it("stops an arrow half an arrowhead short of the outline, and a plain line on it", () => {
    const layout = laidOut(
      layoutDiagram(
        {
          nodes: [node("a"), node("b"), node("c")],
          edges: [
            { from: "a", to: "b", type: "link" },
            { from: "c", to: "b", type: "edge-half" },
          ],
        },
        argMapTruthAndRelevance,
        config(),
        fakeMeasure,
      ),
    );
    const gap = (i: number) => {
      const samples = samplePath(layout.edges[i].path);
      const end = samples[samples.length - 1];
      const tip = layout.edges[i].points[layout.edges[i].points.length - 1];
      return Math.hypot(end.x - tip.x, end.y - tip.y);
    };
    expect(gap(0)).toBeCloseTo(ARROW_INSET, 1);
    expect(gap(1)).toBeCloseTo(0, 1);
  });
});

describe("basisPath", () => {
  it("draws d3's basis curve, pinned to the first and last points", () => {
    expect(
      basisPath([
        { x: 0, y: 0 },
        { x: 60, y: 0 },
        { x: 60, y: 60 },
        { x: 120, y: 60 },
      ]),
    ).toBe("M0,0L10,0C20,0 40,0 50,10C60,20 60,40 70,50C80,60 100,60 110,60L120,60");
  });

  it("draws two points as a straight line", () => {
    expect(
      basisPath([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ]),
    ).toBe("M1,2L3,4");
  });
});

describe("picture key", () => {
  const source =
    "= Thesis &t\n  < supports[8] &sup\n    = Reason &r\n  < critiques &c\n    = Doubt &d\n      ~ aside";
  const spelledOut = { [EDGE_CLAIMS]: { option: SPELLED_OUT } };
  const graph = argMapTruthAndRelevance.toGraph(
    argMapTruthAndRelevance.parse(source).doc,
    argMapTruthAndRelevance.defaultConfig,
    spelledOut,
  );
  const keyOf = (g: RenderGraph, c = argMapTruthAndRelevance.defaultConfig) =>
    laidOut(layoutDiagram(g, argMapTruthAndRelevance, c, fakeMeasure)).key;

  it("ignores source lines moving, as an edit above the argument moves them", () => {
    const shifted = argMapTruthAndRelevance.toGraph(
      argMapTruthAndRelevance.parse(`\n${source}`).doc,
      argMapTruthAndRelevance.defaultConfig,
      spelledOut,
    );
    expect(shifted.nodes.find((n) => n.id === "t")?.lines).toEqual([2]);
    expect(keyOf(shifted)).toBe(keyOf(graph));
  });

  it("ignores a recolor", () => {
    const style = argMapTruthAndRelevance.defaultConfig;
    const recolored = { ...style, typeColors: { ...style.typeColors, claim: "#123456" } };
    expect(keyOf(graph, recolored)).toBe(keyOf(graph));
  });

  it("changes with a label edit that keeps its width", () => {
    const edited = {
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === "r" ? { ...n, text: "Reasom" } : n)),
    };
    expect(keyOf(edited)).not.toBe(keyOf(graph));
  });

  it("changes with a different graph of the same bounds", () => {
    const nodes = [
      { id: "a", type: "claim", text: "same" },
      { id: "b", type: "claim", text: "same" },
      { id: "c", type: "claim", text: "same" },
    ];
    const both = {
      nodes,
      edges: [
        { from: "a", to: "c", type: "link" },
        { from: "b", to: "c", type: "link" },
      ],
    };
    // An invisible anchor ranks `b` just as the drawn edge did, so nothing moves but the line.
    const one = {
      nodes,
      edges: [
        { from: "a", to: "c", type: "link" },
        { from: "b", to: "c", type: "anchor" },
      ],
    };
    const layoutOf = (g: RenderGraph) =>
      laidOut(layoutDiagram(g, argMapTruthAndRelevance, config(), fakeMeasure));
    expect([layoutOf(one).width, layoutOf(one).height]).toEqual([
      layoutOf(both).width,
      layoutOf(both).height,
    ]);
    expect(layoutOf(one).key).not.toBe(layoutOf(both).key);
  });
});
