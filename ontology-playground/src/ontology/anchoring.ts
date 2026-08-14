// A node with nothing to connect it to the argument is a graph component of its own, and dagre
// parks those wherever it likes — arg-map's topic header landed in among the claims, where it
// read as part of the argument. An anchor is an invisible connector that draws nothing and only
// fixes rank, which is what keeps such a node where it was meant to go.
//
// Direction is the trap, and it is easy to get backwards: under the default `BT` layout an edge's
// *target* is ranked above its *source*. So to put a floating node **above** the argument, the
// root is the source and the floating node the target — `{ from: rootId, to: floatingId }`.

import type { EdgeTypeDef } from "./types.ts";

export const ANCHOR_TYPE_ID = "anchor";

export const anchorEdgeType: EdgeTypeDef = { id: ANCHOR_TYPE_ID, connector: "~~~" };
