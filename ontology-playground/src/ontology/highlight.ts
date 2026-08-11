// Shared plumbing for the per-ontology tokenizers (src/ontology/<id>/highlight.ts). Ontology-
// agnostic on purpose: it knows what a token *is* — see `HighlightToken` in ./types.ts — and
// nothing about which characters mean what.

import { LEADING_BRACKET } from "./scores.ts";
import type { HighlightKind, HighlightToken } from "./types.ts";

/**
 * Collects one line's tokens. Tokenizers push slices of the line rather than rebuilding it, and
 * empty slices — a marker at end of line, a body with no id — are dropped here instead of being
 * guarded at every call site, which is what keeps `highlightLine`'s concatenation invariant from
 * depending on each tokenizer getting it right.
 */
export interface TokenSink {
  readonly tokens: HighlightToken[];
  /** text with no syntactic role of its own */
  plain(text: string): void;
  mark(text: string, kind: HighlightKind): void;
  /** text that produces `typeId`, whose color the overlay reads from the document's StyleConfig */
  type(text: string, typeId: string): void;
  /** a `type` that is its line's only glyph for `typeId`; see `HighlightToken.loneMarker` */
  loneMarker(text: string, typeId: string): void;
}

export function createTokenSink(): TokenSink {
  const tokens: HighlightToken[] = [];
  return {
    tokens,
    plain(text) {
      if (text !== "") tokens.push({ text });
    },
    mark(text, kind) {
      if (text !== "") tokens.push({ text, kind });
    },
    type(text, typeId) {
      if (text !== "") tokens.push({ text, kind: "type", typeId });
    },
    loneMarker(text, typeId) {
      if (text !== "") tokens.push({ text, kind: "type", typeId, loneMarker: true });
    },
  };
}

/**
 * Lex a leading `[8,-,2]` if there is one, and return what follows it. Whitespace around a slot
 * rides along inside its `score-value` — it's that slot's own text, and space takes no color.
 * The range a slot may hold is the parser's business, not the overlay's: a half-typed `[9]` in
 * a 0-8 ontology colors like any other slot, and the error strip is what says it's wrong.
 */
export function pushScores(sink: TokenSink, text: string): string {
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
 * Push a line's body, marking a trailing `&id` and a body that is nothing but `$id`. Every
 * ontology spells those the same way over its own id charset, so the regexes come from the
 * caller's markers.ts; `refBody` is left off where a reference isn't valid, as in a note's body.
 */
export function pushBody(sink: TokenSink, text: string, idSuffix: RegExp, refBody?: RegExp): void {
  let body = text;
  let idDecl = "";
  let tail = "";

  // The `&id` match spans the whitespace around it too, so find the `&` inside it: that spacing
  // is ordinary body text and only `&id` itself should take the id color.
  const idMatch = idSuffix.exec(text);
  if (idMatch) {
    const at = idMatch.index + idMatch[0].indexOf("&");
    body = text.slice(0, at);
    idDecl = text.slice(at, at + 1 + idMatch[1].length);
    tail = text.slice(at + idDecl.length);
  }

  const trimmed = body.trim();
  if (refBody?.test(trimmed)) {
    const at = body.indexOf("$");
    sink.plain(body.slice(0, at));
    sink.mark(trimmed, "id-ref");
    sink.plain(body.slice(at + trimmed.length));
  } else {
    sink.plain(body);
  }

  sink.mark(idDecl, "id-decl");
  sink.plain(tail);
}
