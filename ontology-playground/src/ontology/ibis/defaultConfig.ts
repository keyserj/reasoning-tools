import type { StyleConfig } from "../types.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";

// Default layout is bottom-to-top so parent questions sit at the top of the diagram
// while argument-map edges (child -> parent) point upward toward them.
export const defaultConfig: StyleConfig = {
  direction: "BT",
  showIcons: true,
  typeColors: Object.fromEntries(renderedNodeTypes.map((t) => [t.id, t.defaultColor])),
};
