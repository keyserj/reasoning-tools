import { describe, expect, it } from "vitest";
import type { NodeShape } from "../ontology/types.ts";
import { intersectOutline, outlineOf, sizeOf } from "./shapes.ts";
import { distanceToOutline } from "./testing.ts";

const SHAPES: NodeShape[] = [
  "rect",
  "rounded",
  "stadium",
  "subroutine",
  "hexagon",
  "diamond",
  "parallelogram",
];

const LABEL = { width: 120, height: 48 };

describe.each(SHAPES)("%s", (shape) => {
  const center = { x: 300, y: 200 };
  const { points } = outlineOf(shape, LABEL);
  const placed = points.map((p) => ({ x: p.x + center.x, y: p.y + center.y }));
  const size = sizeOf({ points, bars: [] });

  it("is big enough to hold its label", () => {
    expect(size.width).toBeGreaterThan(LABEL.width);
    expect(size.height).toBeGreaterThan(LABEL.height);
  });

  it.each(Array.from({ length: 48 }, (_, i) => i * 7.5))(
    "ends an edge arriving at %s° on the drawn outline",
    (degrees) => {
      const angle = (degrees * Math.PI) / 180;
      const toward = { x: center.x + 1000 * Math.cos(angle), y: center.y + 1000 * Math.sin(angle) };
      const hit = intersectOutline(center, placed, toward);
      expect(distanceToOutline(hit, placed)).toBeLessThan(1e-6);
      // On the ray, not just anywhere on the outline.
      const along = Math.atan2(hit.y - center.y, hit.x - center.x);
      expect(Math.abs(Math.sin(along - angle))).toBeLessThan(1e-9);
      expect(Math.cos(along - angle)).toBeGreaterThan(0);
    },
  );

  it("meets a head-on edge at the outline's extreme", () => {
    const right = intersectOutline(center, placed, { x: center.x + 1000, y: center.y });
    const top = intersectOutline(center, placed, { x: center.x, y: center.y - 1000 });
    // A parallelogram's widest points are its corners, half a lean past its middle.
    const lean = shape === "parallelogram" ? size.height / 4 : 0;
    expect(right.x - center.x).toBeCloseTo(size.width / 2 - lean, 6);
    expect(center.y - top.y).toBeCloseTo(size.height / 2, 6);
  });

  it("works from a point inside the outline too", () => {
    const hit = intersectOutline(center, placed, { x: center.x + 1, y: center.y + 1 });
    expect(distanceToOutline(hit, placed)).toBeLessThan(1e-6);
  });
});

describe("stadium", () => {
  it("reaches its full width only at the middle of each cap", () => {
    const { points } = outlineOf("stadium", LABEL);
    const half = sizeOf({ points, bars: [] }).width / 2;
    const center = { x: 0, y: 0 };
    expect(intersectOutline(center, points, { x: 1000, y: 0 }).x).toBeCloseTo(half, 6);
    // Up and to the right lands on the curve, short of the bounding box's corner.
    const oblique = intersectOutline(center, points, { x: 1000, y: -200 });
    expect(oblique.x).toBeLessThan(half);
  });
});

describe("diamond", () => {
  it("is a square, as wide as its label is wide plus tall", () => {
    const size = sizeOf(outlineOf("diamond", LABEL));
    expect(size.width).toBeCloseTo(size.height, 9);
    expect(size.width).toBeGreaterThan(LABEL.width + LABEL.height);
  });
});

describe("subroutine", () => {
  it("draws two inner bars inside its outline", () => {
    const { points, bars } = outlineOf("subroutine", LABEL);
    expect(bars).toHaveLength(2);
    const half = sizeOf({ points, bars }).width / 2;
    for (const [a, b] of bars) {
      expect(a.x).toBe(b.x);
      expect(Math.abs(a.x)).toBeLessThan(half);
    }
  });
});
