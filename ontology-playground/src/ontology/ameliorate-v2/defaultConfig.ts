import type { StyleConfig } from "../types.ts";
import { renderedNodeTypes } from "./renderedNodeTypes.ts";

export const defaultConfig: StyleConfig = {
  direction: "BT",
  showIcons: true,
  typeColors: Object.fromEntries(renderedNodeTypes.map((type) => [type.id, type.defaultColor])),
};
