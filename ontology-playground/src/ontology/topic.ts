// The header box, drawn from the document's own `%` properties rather than from a line of the
// argument. Its id is shared because two layers name it: `toGraph` builds the box, and `parse`
// files the property lines it was built from under the same key (see ./pipeline.md).

// Accepted for now: `&_topic` is a legal id in kialo and arg-map, and writing it gives a claim
// the header's id — two boxes, one key, and mermaid renames both. The fix is for `takeId` to
// refuse the leading `_` that marks a rendered-only id, not for callers to check.
export const TOPIC_ID = "_topic";
