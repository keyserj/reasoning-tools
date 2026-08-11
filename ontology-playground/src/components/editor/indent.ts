// Tab and shift+Tab in the editor. Indentation is what a line says it belongs to in these
// syntaxes, so it's worth the trapped key: a Tab that moved focus out of the textarea would be a
// Tab you couldn't use to nest anything.

import type { KeyboardEvent } from "react";

/** What one indent level is worth. Two spaces, GitHub-style — the syntaxes nest by indentation. */
const INDENT = "  ";

// Indent edits go through execCommand("insertText") rather than a React state update: the browser
// applies them as real user edits, so the caret lands correctly, ctrl+z still undoes them, and the
// resulting input event feeds React's onChange like any keystroke.
const insertText = (el: HTMLTextAreaElement, text: string, from: number, to: number) => {
  el.setSelectionRange(from, to);
  document.execCommand("insertText", false, text);
};

/**
 * Indent every line of `block`, or outdent it. `firstDelta` is how far the first line's text
 * moved, which is what a bare caret has to shift by to stay where it was standing.
 */
export function shiftBlock(block: string, outdent: boolean): { next: string; firstDelta: number } {
  let firstDelta = 0;
  const next = block
    .split("\n")
    .map((line, i) => {
      // An outdent takes a whole indent where there is one and a lone space where there isn't,
      // so a hand-typed half indent can be cleaned up rather than refused.
      const taken = line.startsWith(INDENT) ? INDENT.length : line.startsWith(" ") ? 1 : 0;
      if (i === 0) firstDelta = outdent ? -taken : INDENT.length;
      return outdent ? line.slice(taken) : INDENT + line;
    })
    .join("\n");
  return { next, firstDelta };
}

/**
 * Apply a Tab / shift+Tab to the textarea it was pressed in. Reports whether it was this key at
 * all, so the caller keeps saying what every other keystroke means.
 */
export function handleIndentKeys(e: KeyboardEvent<HTMLTextAreaElement>): boolean {
  if (e.key !== "Tab") return false;
  e.preventDefault();

  const el = e.currentTarget;
  const { value, selectionStart, selectionEnd } = el;

  // Plain Tab with the selection inside one line: insert an indent like any other typed text.
  if (!e.shiftKey && !value.slice(selectionStart, selectionEnd).includes("\n")) {
    insertText(el, INDENT, selectionStart, selectionEnd);
    return true;
  }

  // Otherwise indent/outdent every line the selection touches, as one replacement.
  const blockStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const lineEnd = value.indexOf("\n", selectionEnd);
  const blockEnd = lineEnd === -1 ? value.length : lineEnd;
  const block = value.slice(blockStart, blockEnd);

  const { next, firstDelta } = shiftBlock(block, e.shiftKey);
  if (next === block) return true;

  insertText(el, next, blockStart, blockEnd);

  // insertText leaves the caret at the end of what it wrote. Reselect the block so repeated
  // presses keep acting on the same lines; a bare caret stays a caret, shifted by its line.
  if (selectionStart === selectionEnd) {
    const caret = Math.max(blockStart, selectionStart + firstDelta);
    el.setSelectionRange(caret, caret);
  } else {
    el.setSelectionRange(blockStart, blockStart + next.length);
  }
  return true;
}
