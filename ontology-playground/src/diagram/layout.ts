// dagre 2, not 3: 3.1 routes two edges out of one box across each other, and lands self-loops
// far from their box.
import dagre, { type GraphLabel } from "@dagrejs/dagre";
import type {
  Connector,
  NodeShape,
  RenderGraph,
  StyleConfig,
  TypeTables,
} from "../ontology/types.ts";
import { type Point, type Size, intersectOutline, outlineOf, sizeOf } from "./shapes.ts";

// RenderGraph → positioned shapes and paths, with no DOM: label sizes come from an injected
// measurer, so this runs under vitest as it does in the page.

/** Label text → rendered size, in the order asked. */
export type MeasureLabels = (texts: string[]) => Size[];

export interface Label {
  text: string;
  /** center */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LaidOutNode {
  id: string;
  type: string;
  shape: NodeShape;
  dashed: boolean;
  lines: number[];
  /** the outline, closed */
  path: string;
  /** the subroutine's inner bars; empty for every other shape */
  bars: string;
  label: Label;
}

type DrawnConnector = Exclude<Connector, "invisible">;

export interface LaidOutEdge {
  from: string;
  to: string;
  type: string;
  connector: DrawnConnector;
  /** first and last on the outlines of the boxes the edge joins */
  points: Point[];
  path: string;
  label?: Label;
  lines: number[];
}

export type DiagramLayout =
  | { empty: true; placeholder: string }
  | {
      empty: false;
      nodes: LaidOutNode[];
      edges: LaidOutEdge[];
      /** The picture spans (0, 0) to here, margin included. */
      width: number;
      height: number;
      /**
       * Changes exactly when the picture's geometry or text does: what a refit keys on. Colors,
       * the theme and source lines stay out, so a recolor or an edit above the argument keeps
       * the reader's pan and zoom.
       */
      key: string;
    };

export const EMPTY_PLACEHOLDER = "(nothing to show yet — start typing on the left)";

/** Mermaid's flowchart spacing, so a layout keeps the proportions it had. */
const NODE_SEP = 50;
const RANK_SEP = 50;
const MARGIN = 8;

/**
 * Half the arrowhead's length. An arrowed path stops this far short of the outline and the
 * marker centers on its end, so the tip lands on the outline and the line's square end hides
 * under the head.
 */
export const ARROW_INSET = 4;

function labelText(text: string, icon: string | undefined, showIcons: boolean): string {
  return showIcons && icon ? `${icon} ${text}` : text;
}

const round = (n: number) => Math.round(n * 100) / 100;

function polygonPath(points: Point[]): string {
  return `${points.map((p, i) => `${i === 0 ? "M" : "L"}${round(p.x)},${round(p.y)}`).join("")}Z`;
}

/**
 * Mermaid's `basis` curve (d3's `curveBasis`): a uniform cubic B-spline over the points, pinned
 * to the first and last. It cuts the corners dagre's routing points make rather than passing
 * through them, which is what keeps a bend reading as one curve.
 */
export function basisPath(points: Point[]): string {
  const p = (pt: Point) => `${round(pt.x)},${round(pt.y)}`;
  const first = points[0];
  const last = points[points.length - 1];
  if (points.length < 3) return `M${p(first)}L${p(last)}`;
  let d = `M${p(first)}L${p(mix([first, 5], [points[1], 1]))}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const next = points[i + 1] ?? b;
    d += `C${p(mix([a, 2], [b, 1]))} ${p(mix([a, 1], [b, 2]))} ${p(mix([a, 1], [b, 4], [next, 1]))}`;
  }
  return `${d}L${p(last)}`;
}

function mix(...terms: [Point, number][]): Point {
  const total = terms.reduce((sum, [, weight]) => sum + weight, 0);
  return {
    x: terms.reduce((sum, [pt, weight]) => sum + pt.x * weight, 0) / total,
    y: terms.reduce((sum, [pt, weight]) => sum + pt.y * weight, 0) / total,
  };
}

/** Where the {@link basisPath} curve passes control point `i`, for an interior `i`. */
function knot(points: Point[], i: number): Point {
  return mix([points[i - 1], 1], [points[i], 4], [points[i + 1], 1]);
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function layoutDiagram(
  graph: RenderGraph,
  types: TypeTables,
  config: StyleConfig,
  measure: MeasureLabels,
): DiagramLayout {
  if (graph.nodes.length === 0) return { empty: true, placeholder: EMPTY_PLACEHOLDER };

  const nodeTypes = new Map(types.renderedNodeTypes.map((t) => [t.id, t]));
  const edgeTypes = new Map(types.renderedEdgeTypes.map((t) => [t.id, t]));

  // dagre's graph keys on plain objects, so a document id like `constructor` can't be a key.
  const keyOf = new Map<string, string>();
  const nodes = graph.nodes.filter((node) => {
    if (keyOf.has(node.id)) return false;
    keyOf.set(node.id, `n${keyOf.size}`);
    return true;
  });
  // An unresolved `$ref` mid-typing leaves an edge with nothing at one end.
  const edges = graph.edges.filter((edge) => keyOf.has(edge.from) && keyOf.has(edge.to));

  const nodeTexts = nodes.map((node) =>
    labelText(node.text, nodeTypes.get(node.type)?.icon, config.showIcons),
  );
  const edgeTexts = edges.map((edge) =>
    edge.label ? labelText(edge.label, edgeTypes.get(edge.type)?.icon, config.showIcons) : null,
  );
  const sizes = measure([...nodeTexts, ...edgeTexts.filter((text) => text !== null)]);
  let nextEdgeSize = nodes.length;
  const edgeSizes = edgeTexts.map((text) => (text === null ? null : sizes[nextEdgeSize++]));

  const g = new dagre.graphlib.Graph<
    GraphLabel,
    Size & Partial<Point>,
    { labelpos: "c"; points?: Point[]; x?: number; y?: number } & Partial<Size>
  >({ multigraph: true });
  g.setGraph({
    rankdir: config.direction,
    nodesep: NODE_SEP,
    ranksep: RANK_SEP,
    marginx: MARGIN,
    marginy: MARGIN,
  });

  // Insertion order is dagre's initial ordering, which several `toGraph`s lean on to say
  // where a box lands relative to its siblings.
  const index = new Map(nodes.map((node, i) => [node.id, i]));
  const shapes = nodes.map((node, i) => {
    const shape = nodeTypes.get(node.type)?.shape ?? "rect";
    const outline = outlineOf(shape, sizes[i]);
    const size = sizeOf(outline);
    g.setNode(keyOf.get(node.id)!, { ...size });
    return { shape, outline, size };
  });
  // Named, or two edges between the same pair of boxes would share dagre's key and one would
  // vanish. A centered label sits on the line, where mermaid draws it; dagre's default puts it
  // beside the line and widens the spacing to make room.
  edges.forEach((edge, i) => {
    const size = edgeSizes[i];
    g.setEdge(
      keyOf.get(edge.from)!,
      keyOf.get(edge.to)!,
      size === null ? { labelpos: "c" } : { labelpos: "c", ...size },
      String(i),
    );
  });

  dagre.layout(g);

  const center = nodes.map((node) => {
    const { x, y } = g.node(keyOf.get(node.id)!);
    return { x: x!, y: y! };
  });
  const placed = shapes.map(({ outline }, i) =>
    outline.points.map((p) => ({ x: p.x + center[i].x, y: p.y + center[i].y })),
  );

  const routes: {
    edge: (typeof edges)[number];
    connector: DrawnConnector;
    points: Point[];
    drawn: Point[];
    label?: Label;
  }[] = [];
  edges.forEach((edge, i) => {
    const connector = edgeTypes.get(edge.type)?.connector ?? "arrow";
    if (connector === "invisible") return;
    const from = index.get(edge.from)!;
    const to = index.get(edge.to)!;
    const routed = g.edge(keyOf.get(edge.from)!, keyOf.get(edge.to)!, String(i));
    const slot =
      routed.x === undefined || routed.y === undefined ? null : { x: routed.x, y: routed.y };

    const points = routed.points!.map((p) => ({ x: p.x, y: p.y }));
    // dagre ends an edge on the node's bounding box; ours ends on the outline, toward the
    // next routing point in. A self-loop's ends are trimmed the same way.
    points[0] = intersectOutline(center[from], placed[from], points[1]);
    const last = points.length - 1;
    points[last] = intersectOutline(center[to], placed[to], points[last - 1]);

    const drawn = points.slice();
    const tail = distance(points[last], points[last - 1]);
    if (connector !== "line" && tail > 0) {
      const k = Math.min(ARROW_INSET, tail / 2) / tail;
      drawn[last] = {
        x: points[last].x + (points[last - 1].x - points[last].x) * k,
        y: points[last].y + (points[last - 1].y - points[last].y) * k,
      };
    }

    const size = edgeSizes[i];
    let label: Label | undefined;
    if (size !== null) {
      // dagre centers the label on one of the edge's routing points, which the curve cuts past,
      // so it moves onto the curve at that point to sit on the line it labels.
      let at = mix([drawn[0], 1], [drawn[last], 1]);
      if (last >= 2) {
        let nearest = Math.floor(last / 2);
        if (slot !== null) {
          for (let j = 1; j < last; j++) {
            if (distance(points[j], slot) < distance(points[nearest], slot)) nearest = j;
          }
        }
        at = knot(drawn, nearest);
      }
      label = { text: edgeTexts[i]!, ...at, ...size };
    }
    routes.push({ edge, connector, points, drawn, label });
  });

  // dagre's own bounds leave out edge points, which a self-loop reaches past. Everything moves so
  // the picture starts at the origin: svg-pan-zoom centers a viewBox that doesn't by its offset
  // twice over.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const include = (x: number, y: number, halfWidth = 0, halfHeight = 0) => {
    minX = Math.min(minX, x - halfWidth);
    maxX = Math.max(maxX, x + halfWidth);
    minY = Math.min(minY, y - halfHeight);
    maxY = Math.max(maxY, y + halfHeight);
  };
  shapes.forEach(({ size }, i) =>
    include(center[i].x, center[i].y, size.width / 2, size.height / 2),
  );
  for (const { points, label } of routes) {
    // A B-spline stays inside the hull of its points.
    for (const p of points) include(p.x, p.y);
    if (label) include(label.x, label.y, label.width / 2, label.height / 2);
  }
  const shift = (p: Point) => ({ x: p.x - minX + MARGIN, y: p.y - minY + MARGIN });

  const laidOutNodes: LaidOutNode[] = nodes.map((node, i) => {
    const { x, y } = shift(center[i]);
    return {
      id: node.id,
      type: node.type,
      shape: shapes[i].shape,
      dashed: node.dashed === true,
      lines: node.lines ?? [],
      path: polygonPath(placed[i].map(shift)),
      bars: shapes[i].outline.bars
        .map(([a, b]) => `M${round(a.x + x)},${round(a.y + y)}L${round(b.x + x)},${round(b.y + y)}`)
        .join(""),
      label: { text: nodeTexts[i], x, y, ...sizes[i] },
    };
  });

  const laidOutEdges: LaidOutEdge[] = routes.map(({ edge, connector, points, drawn, label }) => ({
    from: edge.from,
    to: edge.to,
    type: edge.type,
    connector,
    points: points.map(shift),
    path: basisPath(drawn.map(shift)),
    ...(label ? { label: { ...label, ...shift(label) } } : {}),
    lines: edge.lines ?? [],
  }));

  return {
    empty: false,
    nodes: laidOutNodes,
    edges: laidOutEdges,
    width: maxX - minX + 2 * MARGIN,
    height: maxY - minY + 2 * MARGIN,
    key: JSON.stringify([
      laidOutNodes.map((n) => [n.shape, n.path, n.label.text, n.dashed]),
      laidOutEdges.map((e) => [e.connector, e.path, e.label?.text, e.label?.x, e.label?.y]),
    ]),
  };
}
