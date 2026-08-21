// The header box, drawn from the document's own `%` properties rather than from a line of the
// argument. Its id is shared because two layers name it: `toGraph` builds the box, and `parse`
// files the property lines it was built from under the same key (see ./pipeline.md).

import { RESERVED_ID_PREFIX } from "./ids.ts";

export const TOPIC_ID = `${RESERVED_ID_PREFIX}topic`;
