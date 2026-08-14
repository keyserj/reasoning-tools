import { describe, expect, it } from "vitest";
import { deriveTypeStyle } from "./typeColors.ts";

/** WCAG relative luminance, written out rather than imported so the module can't grade itself. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Every shipped default plus the picks most likely to defeat a derivation. */
const picks = [
  "#d97706",
  "#2166ac",
  "#b2182b",
  "#d3ad20",
  "#71717a",
  "#7c3aed",
  "#ffffff",
  "#000000",
  "#ffd9d9",
  "#00ff00",
];

describe("deriveTypeStyle", () => {
  it("keeps text legible on fill whatever color is picked", () => {
    for (const theme of ["light", "dark"] as const) {
      for (const color of picks) {
        const { fill, text } = deriveTypeStyle(color, theme);
        expect({ color, theme, legible: contrast(fill, text) > 7 }).toEqual({
          color,
          theme,
          legible: true,
        });
      }
    }
  });

  it("draws the border in exactly the picked color in light mode", () => {
    for (const color of picks) {
      expect(deriveTypeStyle(color, "light").border).toBe(color);
    }
  });

  it("lifts the border off a dark fill in dark mode, where the pick itself would vanish", () => {
    for (const color of picks) {
      const { fill, border } = deriveTypeStyle(color, "dark");
      expect({ color, separated: contrast(fill, border) > 4.5 }).toEqual({
        color,
        separated: true,
      });
    }
  });

  it("leaves a gray pick gray, rather than tinting it toward a hue it never had", () => {
    for (const theme of ["light", "dark"] as const) {
      const { fill, text } = deriveTypeStyle("#808080", theme);
      for (const derived of [fill, text]) {
        expect(derived.slice(1, 3)).toBe(derived.slice(3, 5));
        expect(derived.slice(3, 5)).toBe(derived.slice(5, 7));
      }
    }
  });

  it("emits the `#rrggbb` its own input is required to be", () => {
    const style = deriveTypeStyle("#2166ac", "dark");
    for (const derived of [style.fill, style.border, style.text]) {
      expect(derived).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
