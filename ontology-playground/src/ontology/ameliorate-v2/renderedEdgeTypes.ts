import type { EdgeTypeDef } from "../types.ts";
import { anchorEdgeType } from "../anchoring.ts";
import { noteEdgeType } from "../notes.ts";
import { relationNodeTypes } from "./renderedNodeTypes.ts";

export const renderedEdgeTypes: EdgeTypeDef[] = [
  ...relationNodeTypes.flatMap(({ id, icon }) => [
    { id, connector: "-->", colorTypeId: id, icon },
    { id: `${id}-half`, connector: "---", colorTypeId: id },
  ]),
  noteEdgeType,
  anchorEdgeType,
];

export const renderedEdgeTypesById: Record<string, EdgeTypeDef> = Object.fromEntries(
  renderedEdgeTypes.map((type) => [type.id, type]),
);

export const DEFAULT_CONNECTOR = "-->";
