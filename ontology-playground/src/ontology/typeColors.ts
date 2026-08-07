import type { Theme } from "./types.ts";

/** The three roles a node type is drawn in, derived from the one color it is configured with. */
export interface TypeStyle {
  fill: string;
  border: string;
  text: string;
}

interface Target {
  /** OKLab lightness, 0-1 */
  lightness: number;
  /** multiplier on the configured color's chroma */
  chroma: number;
}

/**
 * A type's configured color is its *identity* — a hue and a saturation — rather than a literal
 * paint value. Fill and text take that hue at a fixed lightness, which is what makes any color
 * legible: text on fill lands near 11:1 whether the pick is pale pink or near-black, where
 * hand-picked triples ranged 6.7:1 to 16.3:1. Chroma is scaled rather than fixed so a type
 * chosen to be gray, like `note`, stays gray instead of arriving as a blue tint.
 *
 * Light mode's border is exactly the color picked, so the swatch is what the diagram draws.
 * Dark mode's can't be: the defaults measure 2.5-3.4:1 against a dark fill, so there all three
 * roles are derived and the picked color survives only as the hue they share. Fill sits 1.4:1
 * above the dark canvas — enough to read as a surface, with the border doing the separating.
 */
const TARGETS: Record<Theme, { fill: Target; border: Target | null; text: Target }> = {
  light: {
    fill: { lightness: 0.96, chroma: 0.28 },
    border: null,
    text: { lightness: 0.32, chroma: 0.62 },
  },
  dark: {
    fill: { lightness: 0.3, chroma: 0.45 },
    border: { lightness: 0.7, chroma: 0.9 },
    text: { lightness: 0.9, chroma: 0.35 },
  },
};

/** Derive how one node type is drawn from its configured color. */
export function deriveTypeStyle(color: string, theme: Theme): TypeStyle {
  const { chroma, hue } = toOklch(color);
  const targets = TARGETS[theme];
  const role = (target: Target) => fromOklch(target.lightness, chroma * target.chroma, hue);
  return {
    fill: role(targets.fill),
    border: targets.border === null ? color : role(targets.border),
    text: role(targets.text),
  };
}

// --- OKLab ----------------------------------------------------------------------------
//
// Björn Ottosson's transform, hand-rolled because the derived values have to be hex by the
// time they reach mermaid: `classDef` splits its style list on commas, so a `color-mix(in
// oklab, a, b)` in the emitted source is read as three broken declarations.
//
// OKLab rather than sRGB mixing because the whole scheme rests on lightness meaning the same
// thing at every hue — mixing toward white in sRGB makes yellow's fill and blue's fill look
// nothing alike at the same nominal ratio.

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

const linearToSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** Input is `#rrggbb`: both sources of a color, the type tables and `share/url.ts`, hold that. */
function toOklch(hex: string): { chroma: number; hue: number } {
  const n = parseInt(hex.slice(1), 16);
  const r = srgbToLinear(((n >> 16) & 255) / 255);
  const g = srgbToLinear(((n >> 8) & 255) / 255);
  const b = srgbToLinear((n & 255) / 255);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { chroma: Math.hypot(a, bb), hue: Math.atan2(bb, a) };
}

/**
 * The requested chroma is a wish: most of it doesn't exist in sRGB at these lightnesses (a fill
 * at L 0.96 can hold almost none), so it walks down until the color is representable rather
 * than clipping channels, which would shift the hue it was asked to keep.
 */
function fromOklch(lightness: number, chroma: number, hue: number): string {
  for (let c = chroma; c > 0.0005; c *= 0.95) {
    const rgb = oklabToLinearSrgb(lightness, c * Math.cos(hue), c * Math.sin(hue));
    if (rgb.every((v) => v >= -0.001 && v <= 1.001)) return toHex(rgb);
  }
  return toHex(oklabToLinearSrgb(lightness, 0, 0));
}

function oklabToLinearSrgb(L: number, a: number, b: number): number[] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function toHex(linearRgb: number[]): string {
  const channels = linearRgb.map((v) => {
    const byte = Math.round(Math.min(1, Math.max(0, linearToSrgb(v))) * 255);
    return byte.toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}
