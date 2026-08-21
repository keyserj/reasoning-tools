// The id space a document writes into: which ids it may claim.

/**
 * The ids the renderer mints rather than reading off a line: the topic box (./topic.ts) and
 * mermaid's empty-graph placeholder. A document writing one would put two boxes under a single
 * id — mermaid draws them as one, and the source map keys both their lines to it — so a parser
 * refuses an explicit `_id` and mints its own instead.
 */
export const RESERVED_ID_PREFIX = "_";

/** What a parser reports for a line claiming an id out of that space. */
export const RESERVED_ID_MESSAGE = `An id can't start with "${RESERVED_ID_PREFIX}" — the diagram reserves that prefix`;
