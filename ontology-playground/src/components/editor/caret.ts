// Where the caret is, in the terms the rest of the app speaks: a 1-based line number, the
// convention `ParseError.line` already sets (../../ontology/types.ts). Two 0-based counts sit
// next to it and are easy to mistake for this one — the tokenized `lines` array the overlay
// renders, and `refJump.ts`'s `Span.line`, which is an index into that array.

/** The 1-based line holding `offset`. An offset past the end reads as the last line. */
export function lineAt(text: string, offset: number): number {
  return text.slice(0, offset).split("\n").length;
}

/** Where a 1-based line starts. A line past the end lands at the end of the text. */
export function offsetOfLine(text: string, line: number): number {
  let offset = 0;
  for (let i = 1; i < line; i++) {
    const next = text.indexOf("\n", offset);
    if (next === -1) return text.length;
    offset = next + 1;
  }
  return offset;
}
