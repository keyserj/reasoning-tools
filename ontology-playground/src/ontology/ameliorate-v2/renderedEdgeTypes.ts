import type { EdgeTypeDef } from "../types.ts";
import { anchorEdgeType } from "../anchoring.ts";
import { noteEdgeType } from "../notes.ts";
import { relationNodeTypes } from "./renderedNodeTypes.ts";

export const renderedEdgeTypes: EdgeTypeDef[] = [
  ...relationNodeTypes.flatMap(({ id, icon }): EdgeTypeDef[] => [
    { id, connector: "arrow", colorTypeId: id, icon },
    { id: `${id}-half`, connector: "line", colorTypeId: id },
  ]),
  noteEdgeType,
  anchorEdgeType,
];

export const renderedEdgeTypesById: Record<string, EdgeTypeDef> = Object.fromEntries(
  renderedEdgeTypes.map((type) => [type.id, type]),
);
