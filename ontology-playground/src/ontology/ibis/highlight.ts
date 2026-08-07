import { createTokenSink, pushBody } from "../highlight.ts";
import type { HighlightToken } from "../types.ts";
import { ID_SUFFIX, LEADING_WS, MARKER_TO_TYPE, META_MARKER, REF_BODY } from "./markers.ts";

/**
 * Tokenize one line of IBIS source for the editor's highlight overlay.
 *
 * It reads a line the way ./parse.ts does, through the same ./markers.ts regexes, but only ever
 * *this* line: indentation is plain text here, since what a line is nested under changes nothing
 * about how it's written. Anything malformed is left plain rather than flagged — the editor's
 * error strip already carries what `parse` found, and a half-typed line shouldn't turn red.
 */
export function highlightLine(line: string): HighlightToken[] {
  const sink = createTokenSink();

  const ws = LEADING_WS.exec(line)?.[0] ?? "";
  sink.plain(ws);
  const content = line.slice(ws.length);
  if (content === "") return sink.tokens;

  const marker = content[0];
  if (marker === META_MARKER) {
    sink.mark(content, "comment");
    return sink.tokens;
  }

  const type = MARKER_TO_TYPE[marker];
  if (type === undefined) {
    sink.plain(content);
    return sink.tokens;
  }

  sink.loneMarker(marker, type);
  pushBody(sink, content.slice(1), ID_SUFFIX, REF_BODY);
  return sink.tokens;
}
