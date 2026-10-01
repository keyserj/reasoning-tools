import type { StyleConfig } from "../types.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";

// Bottom-to-top places parents above children while arrows point toward the parent.
export const defaultConfig: StyleConfig = {
  direction: "BT",
  showIcons: true,
  typeColors: Object.fromEntries(renderedNodeTypes.map((t) => [t.id, t.defaultColor])),
};
