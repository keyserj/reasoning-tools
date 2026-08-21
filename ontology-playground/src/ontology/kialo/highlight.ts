import { createTokenSink, pushBody, pushScores } from "../highlight.ts";
import type { HighlightToken } from "../types.ts";
import { ID_SUFFIX, LEADING_WS, MARKER_TO_KIND, PROPERTY, REF_BODY } from "./markers.ts";

/**
 * Tokenize one line of this ontology's source for the editor's highlight overlay.
 *
 * It reads a line the way ./parse.ts does, through the same ./markers.ts regexes, but only ever
 * *this* line: indentation is plain text here, since what a line is nested under changes nothing
 * about how it's written. Anything malformed is left plain rather than flagged: the editor's
 * error strip already carries what `parse` found, and a half-typed line shouldn't turn red.
 */
export function highlightLine(line: string): HighlightToken[] {
  const sink = createTokenSink();

  const ws = LEADING_WS.exec(line)?.[0] ?? "";
  sink.plain(ws);
  const content = line.slice(ws.length);
  if (content === "") return sink.tokens;

  const marker = content[0];
  const kind = MARKER_TO_KIND[marker];

  if (kind === "meta") {
    sink.mark(content, "comment");
    return sink.tokens;
  }

  if (kind === undefined) {
    sink.plain(content);
    return sink.tokens;
  }

  if (kind === "property") {
    // Only `%key:` is syntax. The value is prose or a list, and the topic box it ends up in
    // draws it as prose too.
    if (!PROPERTY.test(content)) {
      sink.plain(content);
      return sink.tokens;
    }
    const colon = content.indexOf(":");
    sink.mark(content.slice(0, colon + 1), "property");
    sink.plain(content.slice(colon + 1));
    return sink.tokens;
  }

  if (kind === "question" || kind === "note") {
    // No `$ref` in either body: a question is never reused, and a note is prose.
    sink.loneMarker(marker, kind === "question" ? "question" : "note");
    pushBody(sink, content.slice(1), ID_SUFFIX);
    return sink.tokens;
  }

  if (kind === "source") {
    // A source has no rendered type of its own — it becomes a 🔗 on its claim — so the marker
    // takes the neutral `property` styling rather than borrowing another type's color, and the
    // URL stays plain.
    sink.mark(marker, "property");
    sink.plain(content.slice(1));
    return sink.tokens;
  }

  // A `=`, `+` or `-` line. Scores bind tightly to the marker (`=[3,1]`), so they're read
  // before the body.
  sink.loneMarker(marker, kind);
  pushBody(sink, pushScores(sink, content.slice(1)), ID_SUFFIX, REF_BODY);
  return sink.tokens;
}
