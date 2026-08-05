import type { KeyboardEvent } from "react";
import type { ParseError } from "../ontology/types.ts";

export type EditorTab = "source" | "mermaid";

/** What one indent level is worth. Two spaces, GitHub-style — the syntaxes nest by indentation. */
const INDENT = "  ";

interface Props {
  source: string;
  onSourceChange: (value: string) => void;
  mermaidText: string;
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  ontologyLabel: string;
  placeholder: string;
  errors: ParseError[];
  onOpenLegend: () => void;
}

export default function EditorPane({
  source,
  onSourceChange,
  mermaidText,
  activeTab,
  onTabChange,
  ontologyLabel,
  placeholder,
  errors,
  onOpenLegend,
}: Props) {
  const editing = activeTab === "source";

  // Indent edits go through execCommand("insertText") rather than onSourceChange: the browser
  // applies them as real user edits, so the caret lands correctly, ctrl+z still undoes them, and
  // the resulting input event feeds React's onChange like any keystroke.
  const insertText = (el: HTMLTextAreaElement, text: string, from: number, to: number) => {
    el.setSelectionRange(from, to);
    document.execCommand("insertText", false, text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab is trapped for indenting, so Escape is the keyboard way back out of the textarea.
    if (e.key === "Escape") {
      e.currentTarget.blur();
      return;
    }
    if (e.key !== "Tab" || !editing) return;
    e.preventDefault();

    const el = e.currentTarget;
    const { value, selectionStart, selectionEnd } = el;

    // Plain Tab with the selection inside one line: insert an indent like any other typed text.
    if (!e.shiftKey && !value.slice(selectionStart, selectionEnd).includes("\n")) {
      insertText(el, INDENT, selectionStart, selectionEnd);
      return;
    }

    // Otherwise indent/outdent every line the selection touches, as one replacement.
    const blockStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const lineEnd = value.indexOf("\n", selectionEnd);
    const blockEnd = lineEnd === -1 ? value.length : lineEnd;
    const block = value.slice(blockStart, blockEnd);

    let firstDelta = 0;
    const next = block
      .split("\n")
      .map((line, i) => {
        const outdent = line.startsWith(INDENT) ? INDENT.length : line.startsWith(" ") ? 1 : 0;
        if (i === 0) firstDelta = e.shiftKey ? -outdent : INDENT.length;
        return e.shiftKey ? line.slice(outdent) : INDENT + line;
      })
      .join("\n");
    if (next === block) return;

    insertText(el, next, blockStart, blockEnd);

    // insertText leaves the caret at the end of what it wrote. Reselect the block so repeated
    // presses keep acting on the same lines; a bare caret stays a caret, shifted by its line.
    if (selectionStart === selectionEnd) {
      const caret = Math.max(blockStart, selectionStart + firstDelta);
      el.setSelectionRange(caret, caret);
    } else {
      el.setSelectionRange(blockStart, blockStart + next.length);
    }
  };

  return (
    // `min-h-0` so the textarea shrinks when the pickers above expand, rather than pushing
    // itself out of the column. The border and background live on that column now, since the
    // pickers share it.
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      {/* The pane's third **band**: same surface, same `px-3`, same 40px as the two accordion
          headers above it, so all three read as one kind of thing at a glance.

          No `py-` here, unlike those rows: daisyUI's `tab` carries its own 40px height, and
          padding on top of it would make this band 48px against their 40. */}
      <div className="flex items-center bg-base-200 px-3 shrink-0">
        {/* "Code" rather than the ontology's name: the picker above already names the ontology,
            and a fixed-width label keeps this row from being at the mercy of how long an
            ontology chose to call itself — the pair plus the Key button has to fit 320px. */}
        <div role="tablist" className="tabs tabs-border">
          {/* daisyUI v5 spells the underline `tabs-border`; `tabs-bordered` is v4's name and is
              inert, so switching to it would leave the active tab unmarked with no error.

              Only the active tab heads the content below, so only it takes `section-header`; the
              other is a route to a different view, and the dim says so alongside the underline. */}
          <button
            role="tab"
            className={`tab ${editing ? "tab-active section-header" : "text-sm opacity-60"}`}
            onClick={() => onTabChange("source")}
          >
            Code
          </button>
          <button
            role="tab"
            className={`tab ${!editing ? "tab-active section-header" : "text-sm opacity-60"}`}
            onClick={() => onTabChange("mermaid")}
          >
            Mermaid
          </button>
        </div>

        {/* Sits with the syntax it documents rather than in the page header, but stays a button
            outside the tablist: a third tab would replace the textarea and be a mode to click
            back out of, where the key is glance-and-dismiss. Shown on the Mermaid tab too —
            it describes the ontology either way, and hiding it would make the row jump. */}
        <button
          className="btn btn-xs btn-ghost ml-auto"
          onClick={onOpenLegend}
          title={`How to read and write ${ontologyLabel}`}
        >
          Key
        </button>
      </div>

      <div className="flex-1 min-h-0 p-2">
        {/* 16px text on small screens keeps iOS Safari from zooming in when the textarea is focused. */}
        <textarea
          className="textarea textarea-bordered w-full h-full font-mono text-base md:text-sm leading-relaxed resize-none"
          spellCheck={false}
          value={editing ? source : mermaidText}
          onChange={(e) => onSourceChange(e.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={!editing}
          placeholder={editing ? placeholder : undefined}
          aria-label={editing ? `${ontologyLabel} source` : "Generated mermaid source"}
          aria-keyshortcuts={editing ? "Tab Shift+Tab Escape" : undefined}
          title={editing ? "Tab/Shift+Tab indent/outdent. Escape exits the editor." : undefined}
        />
      </div>

      {errors.length > 0 && (
        <div className="shrink-0 max-h-32 overflow-auto border-t border-warning/50 bg-warning/10 px-3 py-2 text-xs font-mono">
          {errors.map((err, i) => (
            <div key={i}>
              line {err.line}: {err.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
