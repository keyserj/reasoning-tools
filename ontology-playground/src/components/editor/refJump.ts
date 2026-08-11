// Ctrl/⌘-click a `$ref` in the editor to select the `&id` that declares it.
//
// The textarea does the hard part: the click has already placed the caret by the time the handler
// runs, so `selectionStart` is the character offset under the pointer and there is no coordinate
// math to get wrong. What's left is knowing which offsets are refs, which is a walk over the
// tokens the overlay is already drawing. `id-decl`/`id-ref` are shell kinds (../../ontology/
// types.ts), so no ontology's syntax is named here.

import { type MouseEvent, useEffect, useMemo, useState } from "react";
import type { HighlightToken } from "../../ontology/types.ts";

/** Where something sits in the source: offsets into the whole text, plus the line holding it. */
interface Span {
  start: number;
  end: number;
  /** 0-based, as `lines` is indexed */
  line: number;
}

export interface RefIndex {
  /** every `$ref`, in source order */
  refs: (Span & { name: string })[];
  decls: Map<string, Span>;
}

// Both ontologies spell an id `&name`/`$name`, so the name is the token less its one-character
// sigil. One that didn't would have to say so through the highlight contract rather than here.
const nameOf = (token: HighlightToken) => token.text.slice(1);

/**
 * Locate every id in a tokenized document. Offsets land exactly on the textarea's own because a
 * line's tokens concatenate back to it — the `highlightLine` contract every tokenizer keeps.
 */
export function indexRefs(lines: HighlightToken[][]): RefIndex {
  const refs: RefIndex["refs"] = [];
  const decls = new Map<string, Span>();
  let offset = 0;

  lines.forEach((tokens, line) => {
    for (const token of tokens) {
      const span = { start: offset, end: offset + token.text.length, line };
      offset = span.end;

      if (token.kind === "id-ref") refs.push({ ...span, name: nameOf(token) });
      // First declaration wins, which is where a duplicate's references resolve: the parser hands
      // the later `&id` an auto id and reports it, leaving the first holding the name.
      else if (token.kind === "id-decl" && !decls.has(nameOf(token)))
        decls.set(nameOf(token), span);
    }
    offset += 1; // the "\n" the split dropped
  });

  return { refs, decls };
}

/** The declaration to jump to for a caret at `offset`, if it sits in a ref that resolves. */
export function refTargetAt(index: RefIndex, offset: number): Span | undefined {
  // Inclusive at both ends, so clicking either edge of `$id` counts. Refs can't be adjacent — a
  // ref is a whole line body — so no two spans compete for an offset.
  const ref = index.refs.find((r) => offset >= r.start && offset <= r.end);
  return ref && index.decls.get(ref.name);
}

/**
 * Scroll a jumped-to line into view, centered, when it isn't already visible. Only vertical: an
 * `&id` sits at the end of its line, and scrolling sideways to it would leave the line's own text
 * off-screen, which is the part you jumped to read.
 */
function revealLine(el: HTMLTextAreaElement, line: number) {
  const style = getComputedStyle(el);
  const lineHeight = parseFloat(style.lineHeight);
  if (Number.isNaN(lineHeight)) return; // a `normal` line-height; leave the scrolling to the browser

  const top = parseFloat(style.paddingTop) + line * lineHeight;
  if (top >= el.scrollTop && top + lineHeight <= el.scrollTop + el.clientHeight) return;
  // The overlay follows on its own: a scroll set here fires the same event a dragged scrollbar does.
  el.scrollTop = top - (el.clientHeight - lineHeight) / 2;
}

/**
 * Wire the gesture onto a textarea whose `lines` are tokenized. `enabled` is the Code tab: the
 * Mermaid tab is someone else's language and has no ids to jump between.
 */
export function useRefJump(lines: HighlightToken[][], enabled: boolean) {
  const [modifierHeld, setModifierHeld] = useState(false);
  const index = useMemo(() => indexRefs(lines), [lines]);

  useEffect(() => {
    if (!enabled) return;
    // Read the event's modifier flags rather than its key, so a chord that releases in either
    // order still resolves; window blur clears a modifier held while tabbing away.
    const sync = (e: KeyboardEvent) => setModifierHeld(e.ctrlKey || e.metaKey);
    const clear = () => setModifierHeld(false);
    window.addEventListener("keydown", sync);
    window.addEventListener("keyup", sync);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", sync);
      window.removeEventListener("keyup", sync);
      window.removeEventListener("blur", clear);
    };
  }, [enabled]);

  const onClick = (e: MouseEvent<HTMLTextAreaElement>) => {
    // ⌘ as well as ctrl: on a mac ctrl+click is the context menu, so ⌘ is the one that arrives.
    if (!e.ctrlKey && !e.metaKey) return;

    const el = e.currentTarget;
    const target = refTargetAt(index, el.selectionStart);
    if (target === undefined) return; // not a ref, or one that resolves to nothing — the error strip says so

    // Selecting the whole `&id` rather than dropping a caret: the landing has to be visible.
    el.setSelectionRange(target.start, target.end);
    revealLine(el, target.line);
  };

  return {
    /** the overlay marks every jump target while the modifier is down */
    linkable: enabled && modifierHeld,
    onClick,
  };
}
