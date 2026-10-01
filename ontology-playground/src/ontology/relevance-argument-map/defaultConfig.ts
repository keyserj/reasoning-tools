import type { StyleConfig } from "../types.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";

// Bottom-to-top so the thesis sits at the top of the diagram while its arguments point
// upward at it, matching how the source text reads top-down.
export const defaultConfig: StyleConfig = {
  direction: "BT",
  showIcons: true,
  typeColors: Object.fromEntries(renderedNodeTypes.map((t) => [t.id, t.defaultColor])),
};
