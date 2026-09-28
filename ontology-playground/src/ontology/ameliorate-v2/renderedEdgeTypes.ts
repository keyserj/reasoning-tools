import type { EdgeTypeDef } from "../types.ts";
import { anchorEdgeType } from "../anchoring.ts";
import { noteEdgeType } from "../notes.ts";

export const renderedEdgeTypes: EdgeTypeDef[] = [
  { id: "relation", connector: "-->", colorTypeId: "relation" },
  { id: "half", connector: "---", colorTypeId: "relation" },
  noteEdgeType,
  anchorEdgeType,
];

export const renderedEdgeTypesById: Record<string, EdgeTypeDef> = Object.fromEntries(
  renderedEdgeTypes.map((type) => [type.id, type]),
);

export const DEFAULT_CONNECTOR = "-->";
