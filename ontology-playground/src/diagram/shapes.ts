import type { NodeShape } from "../ontology/types.ts";

// Each shape is one outline, a closed list of points that is both what gets drawn and what an
// edge is trimmed against, so an arrowhead can't stop short of the line it should touch or poke
// through it. Curves (a stadium's caps, a rounded corner) are points along the curve, as mermaid
// does for its stadium; at these radii the facets are well under a pixel.
//
// Sizes follow mermaid's flowchart shapes at its `padding` of 15, so a copied export draws the
// same boxes.

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Outline {
  /** Around (0, 0), the label's center. */
  points: Point[];
  /** Strokes inside the outline that edges don't land on: a subroutine's inner bars. */
  bars: [Point, Point][];
}

const PADDING = 15;
const CORNER_RADIUS = 5;
const SUBROUTINE_BAR = 8;
const CAP_STEPS = 16;
const CORNER_STEPS = 4;

/** `steps + 1` points from angle `from` to `to`, clockwise on screen. */
function arc(cx: number, cy: number, r: number, from: number, to: number, steps: number): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = from + ((to - from) * i) / steps;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

function rect(halfWidth: number, halfHeight: number): Point[] {
  return [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ];
}

function roundedRect(halfWidth: number, halfHeight: number, r: number): Point[] {
  const x = halfWidth - r;
  const y = halfHeight - r;
  const quarter = Math.PI / 2;
  return [
    ...arc(x, -y, r, -quarter, 0, CORNER_STEPS),
    ...arc(x, y, r, 0, quarter, CORNER_STEPS),
    ...arc(-x, y, r, quarter, 2 * quarter, CORNER_STEPS),
    ...arc(-x, -y, r, 2 * quarter, 3 * quarter, CORNER_STEPS),
  ];
}

export function outlineOf(shape: NodeShape, label: Size): Outline {
  const { width: w, height: h } = label;
  switch (shape) {
    case "rect":
      return { points: rect(w / 2 + 2 * PADDING, h / 2 + PADDING), bars: [] };
    case "rounded":
      return {
        points: roundedRect(w / 2 + PADDING, h / 2 + PADDING, CORNER_RADIUS),
        bars: [],
      };
    case "stadium": {
      const height = h + PADDING;
      const r = height / 2;
      const cx = Math.max((w + height / 4 + PADDING) / 2 - r, 0);
      return {
        points: [
          ...arc(cx, 0, r, -Math.PI / 2, Math.PI / 2, CAP_STEPS),
          ...arc(-cx, 0, r, Math.PI / 2, (3 * Math.PI) / 2, CAP_STEPS),
        ],
        bars: [],
      };
    }
    case "subroutine": {
      const halfWidth = (w + PADDING) / 2 + SUBROUTINE_BAR;
      const halfHeight = (h + PADDING) / 2;
      const bar = halfWidth - SUBROUTINE_BAR;
      return {
        points: rect(halfWidth, halfHeight),
        bars: [
          [
            { x: -bar, y: -halfHeight },
            { x: -bar, y: halfHeight },
          ],
          [
            { x: bar, y: -halfHeight },
            { x: bar, y: halfHeight },
          ],
        ],
      };
    }
    case "hexagon": {
      const height = h + PADDING;
      const point = height / 4;
      const halfWidth = (w + PADDING) / 2 + point;
      const halfHeight = height / 2;
      return {
        points: [
          { x: -halfWidth + point, y: -halfHeight },
          { x: halfWidth - point, y: -halfHeight },
          { x: halfWidth, y: 0 },
          { x: halfWidth - point, y: halfHeight },
          { x: -halfWidth + point, y: halfHeight },
          { x: -halfWidth, y: 0 },
        ],
        bars: [],
      };
    }
    case "diamond": {
      const half = (w + h + 2 * PADDING) / 2;
      return {
        points: [
          { x: 0, y: -half },
          { x: half, y: 0 },
          { x: 0, y: half },
          { x: -half, y: 0 },
        ],
        bars: [],
      };
    }
    case "parallelogram": {
      // Leans right by half its height on each side, past the box the label sits in.
      const halfWidth = (w + PADDING) / 2;
      const halfHeight = (h + PADDING) / 2;
      return {
        points: [
          { x: -halfWidth, y: -halfHeight },
          { x: halfWidth + halfHeight, y: -halfHeight },
          { x: halfWidth, y: halfHeight },
          { x: -halfWidth - halfHeight, y: halfHeight },
        ],
        bars: [],
      };
    }
  }
}

/** The outline's bounding box, which is what dagre spaces the node by. */
export function sizeOf(outline: Outline): Size {
  let width = 0;
  let height = 0;
  for (const { x, y } of outline.points) {
    width = Math.max(width, 2 * Math.abs(x));
    height = Math.max(height, 2 * Math.abs(y));
  }
  return { width, height };
}

/**
 * Where the ray from `center` toward `toward` leaves `points`, an outline already placed around
 * `center`. Every shape is convex, so the ray crosses it exactly once.
 */
export function intersectOutline(center: Point, points: Point[], toward: Point): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const ax = a.x - center.x;
    const ay = a.y - center.y;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const denominator = dx * ey - dy * ex;
    if (denominator === 0) continue;
    // Solve center + t·d = a + u·e for the ray's t and the side's u.
    const t = (ax * ey - ay * ex) / denominator;
    const u = (ax * dy - ay * dx) / denominator;
    if (t >= 0 && u >= -1e-9 && u <= 1 + 1e-9 && t < best) best = t;
  }
  if (best === Infinity) return toward;
  return { x: center.x + best * dx, y: center.y + best * dy };
}
