// Helpers shared by this directory's tests; nothing here ships in the app.

import type { MeasureLabels } from "./layout.ts";
import type { Point } from "./shapes.ts";

/** A stand-in for the DOM: 8px a character, 24px a line, wrapping at 200px as the real labels do. */
export const fakeMeasure: MeasureLabels = (texts) =>
  texts.map((text) => {
    const lines = text.split("\n");
    const rows = lines.reduce(
      (sum, line) => sum + Math.max(1, Math.ceil((line.length * 8) / 200)),
      0,
    );
    return {
      width: Math.max(...lines.map((line) => Math.min(200, line.length * 8))),
      height: rows * 24,
    };
  });

/** Distance from `p` to the closed polygon's boundary. */
export function distanceToOutline(p: Point, outline: Point[]): number {
  let best = Infinity;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const length2 = ex * ex + ey * ey;
    const t =
      length2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / length2));
    best = Math.min(best, Math.hypot(p.x - (a.x + t * ex), p.y - (a.y + t * ey)));
  }
  return best;
}

const numbers = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

/** The vertices of a polygon path (`M…L…Z`). */
export function outlinePoints(d: string): Point[] {
  const n = numbers(d);
  return Array.from({ length: n.length / 2 }, (_, i) => ({ x: n[2 * i], y: n[2 * i + 1] }));
}

/** Points along an `M`/`L`/`C` path, every cubic sampled finely enough to measure against. */
export function samplePath(d: string): Point[] {
  const out: Point[] = [];
  let at: Point = { x: 0, y: 0 };
  for (const [, command, args] of d.matchAll(/([MLC])([^MLCZ]*)/g)) {
    const n = numbers(args);
    if (command === "C") {
      const [c1, c2, end] = [0, 2, 4].map((i) => ({ x: n[i], y: n[i + 1] }));
      for (let s = 1; s <= 200; s++) {
        const t = s / 200;
        const u = 1 - t;
        out.push({
          x: u * u * u * at.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * end.x,
          y: u * u * u * at.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * end.y,
        });
      }
      at = end;
    } else {
      at = { x: n[0], y: n[1] };
      out.push(at);
    }
  }
  return out;
}

export const nearestOn = (p: Point, samples: Point[]) =>
  Math.min(...samples.map((s) => Math.hypot(s.x - p.x, s.y - p.y)));
