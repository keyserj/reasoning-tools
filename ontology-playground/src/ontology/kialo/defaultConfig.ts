import type { StyleConfig } from "../types.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";

// Default layout is bottom-to-top so questions and theses sit at the top of the diagram while
// the arguments beneath point upward at what they are about, matching how the source reads.
export const defaultConfig: StyleConfig = {
  direction: "BT",
  showIcons: true,
  typeColors: Object.fromEntries(renderedNodeTypes.map((t) => [t.id, t.defaultColor])),
};
