import type { NodeTypeDef } from "../types.ts";

// The single place a *rendered* node type is defined: icons, mermaid shapes, style defaults,
// style-panel labels and the legend's type rows all derive from this table. Syntax (which
// marker produces which type) lives in ./markers.ts instead.
//
// These are deliberately not the ontology's semantic types — see ontology.md for those. A
// rendered type is whatever can end up as a box in the diagram, which here means: `claim` (the
// ontology's only real node type), `supports`/`critiques` (ontology *edge* types, which
// ./toGraph.ts reifies into nodes so they can be argued about), `note`, and `topic` (the header
// carrying `%description` and the `%perspectives` key, without which a score row like [5,2,8]
// can't be decoded). Only `claim` is a node type in the ontology proper.
//
// One color per type: the fill, border and text it's drawn in are derived from it, per theme
// (../typeColors.ts). Colors follow the colorblind-safe red/blue axis that ameliorate-v2 already
// committed to — see UX-design.md's "needs a colorblind-safe diverging palette, not red-green"
// and the wireframes' `RB = { neg: "#b2182b", mid: "#e9e9e9", pos: "#2166ac" }`. `supports` vs
// `critiques` is the one pair that *needs* color to separate it (same shape, same role), and
// blue vs red survives both protanopia and deuteranopia. `claim` and `note` divide the warm end
// of the palette between them, which is argued in ./rendering.md.
//
// Icons carry the same distinction by silhouette: ✅ vs ⛔ reads as a check against a barred circle
// at the ~12px they render at, which is what separates support from critique when color can't
// (same-shape 🔵 / 🔴 wouldn't). Content types take unrelated pictograms so nothing competes with
// that pair. The two do come with their own green/red — the pairing the fills deliberately avoid —
// but it lands as decoration over shapes that already differ, not as the thing doing the work.
export const renderedNodeTypes: NodeTypeDef[] = [
  {
    id: "claim",
    label: "Claim",
    icon: "💬",
    description: "A statement phrased so a reader can say how much they believe it.",
    shape: ['["', '"]'],
    defaultColor: "#d97706",
  },
  {
    id: "supports",
    label: "Supports",
    icon: "✅",
    description: "An edge saying its source claim is a reason to believe its target.",
    shape: ['(["', '"])'],
    defaultColor: "#2166ac",
  },
  {
    id: "critiques",
    label: "Critiques",
    icon: "⛔",
    description: "An edge saying its source claim is a reason to doubt its target.",
    shape: ['(["', '"])'],
    defaultColor: "#b2182b",
  },
  {
    id: "note",
    label: "Note",
    icon: "📝",
    description: "An aside attached to its parent. Drawn in the diagram, but never scored.",
    shape: ['[/"', '"/]'],
    defaultColor: "#facc15",
  },
  {
    id: "topic",
    label: "Topic",
    icon: "📋",
    description: "The header box: what this topic is and why it's worth discussing.",
    shape: ['[["', '"]]'],
    defaultColor: "#7c3aed",
  },
];

export const renderedNodeTypesById: Record<string, NodeTypeDef> = Object.fromEntries(
  renderedNodeTypes.map((t) => [t.id, t]),
);
