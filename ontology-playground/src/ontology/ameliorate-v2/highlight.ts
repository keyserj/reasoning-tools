import { createTokenSink, pushBody, pushScores, type TokenSink } from "../highlight.ts";
import type { HighlightKind, HighlightToken } from "../types.ts";
import {
  ID_SUFFIX,
  LEADING_WS,
  MARKER_TO_KIND,
  MARKER_TO_NODE_TYPE,
  PROPERTY,
  REF_BODY,
  TAG_SUFFIX,
  takeEdgeType,
} from "./markers.ts";

function pushNodeBody(sink: TokenSink, text: string): void {
  const suffixes: { start: number; end: number; kind: HighlightKind }[] = [];
  let end = text.length;
  for (;;) {
    const body = text.slice(0, end);
    const tag = TAG_SUFFIX.exec(body);
    const match = tag ?? ID_SUFFIX.exec(body);
    if (!match) break;
    const start = match.index + match[0].indexOf(tag ? "#" : "&");
    suffixes.unshift({ start, end: start + 1 + match[1].length, kind: tag ? "tag" : "id-decl" });
    end = match.index;
  }

  // Keep offsets into the original text: trimming like the parser would shift the editor overlay.
  pushBody(sink, text.slice(0, end), ID_SUFFIX, REF_BODY);
  for (const suffix of suffixes) {
    sink.plain(text.slice(end, suffix.start));
    sink.mark(text.slice(suffix.start, suffix.end), suffix.kind);
    end = suffix.end;
  }
  sink.plain(text.slice(end));
}

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
  } else if (kind === "property") {
    if (PROPERTY.test(content)) {
      const colon = content.indexOf(":");
      sink.mark(content.slice(0, colon + 1), "property");
      sink.plain(content.slice(colon + 1));
    } else sink.plain(content);
  } else if (kind === "note") {
    sink.loneMarker(marker, "note");
    sink.plain(content.slice(1));
  } else if (kind === "node") {
    sink.loneMarker(marker, MARKER_TO_NODE_TYPE[marker]!);
    pushNodeBody(sink, pushScores(sink, content.slice(1)));
  } else if (kind === "edge-from-child" || kind === "edge-to-child") {
    const rest = content.slice(1);
    const gap = LEADING_WS.exec(rest)?.[0] ?? "";
    const { type, rest: afterType } = takeEdgeType(rest.slice(gap.length));
    if (type === null) {
      pushBody(sink, content, ID_SUFFIX);
    } else {
      sink.type(marker, "relation");
      sink.plain(gap);
      sink.type(type, "relation");
      pushBody(sink, pushScores(sink, afterType), ID_SUFFIX);
    }
  } else sink.plain(content);
  return sink.tokens;
}
