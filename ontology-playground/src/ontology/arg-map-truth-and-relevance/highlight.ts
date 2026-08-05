import { type TokenSink, createTokenSink, pushBody } from "../highlight.ts";
import type { HighlightToken } from "../types.ts";
import {
  EDGE_TYPE_HEAD,
  ID_SUFFIX,
  LEADING_WS,
  MARKER_TO_KIND,
  PROPERTY,
  REF_BODY,
  isEdgeType,
} from "./markers.ts";
import { LEADING_BRACKET } from "./scores.ts";

/**
 * Lex a leading `[8,-,2]` if there is one, and return what follows it. Whitespace around a slot
 * rides along inside its `score-value` — it's that slot's own text, and space takes no color.
 */
function pushScores(sink: TokenSink, text: string): string {
  const match = LEADING_BRACKET.exec(text);
  if (!match) return text;

  sink.mark("[", "score-punct");
  match[1].split(",").forEach((slot, i) => {
    if (i > 0) sink.mark(",", "score-punct");
    sink.mark(slot, "score-value");
  });
  sink.mark("]", "score-punct");
  return text.slice(match[0].length);
}

/**
 * Tokenize one line of this ontology's source for the editor's highlight overlay.
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

  if (kind === "claim") {
    // Scores bind tightly to the marker (`=[4,1,8]`), so they're read before the body.
    sink.type(marker, "claim");
    pushBody(sink, pushScores(sink, content.slice(1)), ID_SUFFIX, REF_BODY);
    return sink.tokens;
  }

  if (kind === "note") {
    // No `$ref` here: a note's body is prose, and parse resolves no references in it.
    sink.type(marker, "note");
    pushBody(sink, content.slice(1), ID_SUFFIX);
    return sink.tokens;
  }

  // A `<` or `>` line. Its word names the edge type, and the marker takes that type's color as
  // well: the two together are the statement, the word saying which relation and the arrow which
  // way it runs. An unknown word leaves both plain rather than guessing a color for it.
  const rest = content.slice(1);
  const gap = LEADING_WS.exec(rest)?.[0] ?? "";
  const afterGap = rest.slice(gap.length);
  const word = EDGE_TYPE_HEAD.exec(afterGap)?.[1] ?? "";
  if (!isEdgeType(word)) {
    pushBody(sink, content, ID_SUFFIX);
    return sink.tokens;
  }

  sink.type(marker, word);
  sink.plain(gap);
  sink.type(word, word);
  pushBody(sink, pushScores(sink, afterGap.slice(word.length)), ID_SUFFIX);
  return sink.tokens;
}
