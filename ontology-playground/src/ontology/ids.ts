// The id space a document writes into: which ids it may claim, and the tables keyed by them.

/**
 * The ids the renderer mints rather than reading off a line: the topic box (./topic.ts), mermaid's
 * empty-graph placeholder, and any id renamed to keep mermaid's own tables working
 * (./mermaidFlowchart.ts). A document writing one would put two boxes under a single id — mermaid
 * draws them as one, and the source map keys both their lines to it — so a parser refuses an
 * explicit `_id` and mints its own instead.
 */
export const RESERVED_ID_PREFIX = "_";

/** What a parser reports for a line claiming an id out of that space. */
export const RESERVED_ID_MESSAGE = `An id can't start with "${RESERVED_ID_PREFIX}" — the diagram reserves that prefix`;

/**
 * A table keyed by ids that came from a document. Without using `Object.create(null)`, ids like
 * `constructor` and `toString` can error during access because the object's prototype is not null
 * and therefore it would return a function instead of `undefined`.
 */
export const idTable = <T>(): Record<string, T> => Object.create(null) as Record<string, T>;
