import { type CSSProperties, Fragment, type KeyboardEvent, useMemo, useRef } from "react";
import type { HighlightToken, ParseError, StyleConfig } from "../ontology/types.ts";

export type EditorTab = "source" | "mermaid";

/** What one indent level is worth. Two spaces, GitHub-style — the syntaxes nest by indentation. */
const INDENT = "  ";

/**
 * Everything that decides where a glyph lands. The overlay is only invisible while it and the
 * textarea agree on all of it, so they wear one string rather than two that look alike: the
 * daisyUI box (border, radius, padding, min-height), the font metrics over it, and whether a
 * long line wraps. 16px text on small screens keeps iOS Safari from zooming in when the textarea
 * is focused.
 *
 * `whitespace-pre` scrolls a long line sideways instead of wrapping it, for the same reason code
 * editors do: indentation is what a line says it belongs to here, and a wrapped continuation
 * starts at column 0 looking like a sibling of the wrong depth. It also takes wrapping out of
 * what the two elements can disagree about — the overlay tracks the textarea's `scrollLeft`
 * exactly, where a wrap point only had to differ by a pixel to smear the whole file.
 *
 * `textarea-bordered` is deliberately absent: that's daisyUI v4's name and does nothing in v5,
 * the same trap as `tabs-bordered` above — v5's `.textarea` already draws the border.
 */
const EDITOR_BOX =
  "textarea w-full h-full font-mono text-base md:text-sm leading-relaxed whitespace-pre";

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
  highlightLine: (line: string) => HighlightToken[];
  /** the document's live styling: where a `type` token's color comes from */
  config: StyleConfig;
}

/** One token. Plain text is bare, so the overlay's DOM stays close to the textarea's own. */
function Token({ token, config }: { token: HighlightToken; config: StyleConfig }) {
  if (token.kind === undefined) return token.text;

  // An id the config doesn't style (an ontology naming a type it doesn't render) falls back to
  // the CSS rule's `currentColor` rather than to a guess.
  const stroke = token.typeId === undefined ? undefined : config.types[token.typeId]?.stroke;
  return (
    <span
      className={`tok-${token.kind}`}
      style={stroke === undefined ? undefined : ({ "--tok-hue": stroke } as CSSProperties)}
    >
      {token.text}
    </span>
  );
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
  highlightLine,
  config,
}: Props) {
  const editing = activeTab === "source";
  const overlay = useRef<HTMLPreElement>(null);

  // Split on "\n" rather than the parser's /\r?\n/: a token's text has to be the source's own
  // characters, and a swallowed "\r" is a character the textarea still lays out.
  const lines = useMemo(
    () => (editing ? source.split("\n").map(highlightLine) : []),
    [editing, source, highlightLine],
  );

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
            back out of, where the dialog is glance-and-dismiss. Shown on the Mermaid tab too —
            it describes the ontology either way, and hiding it would make the row jump. */}
        <button
          className="btn btn-xs btn-ghost ml-auto"
          onClick={onOpenLegend}
          title={`How to read and write ${ontologyLabel}`}
        >
          Syntax
        </button>
      </div>

      {/* The editor is a plain textarea with a highlighted copy of its own text behind it, rather
          than a code-editor component: every marker in these syntaxes already has a color (the
          stroke its type is drawn with), so the overlay is what makes a line of source and its
          box in the diagram findable from each other — and keeping the textarea keeps the tab,
          undo and mobile-input behaviour a replacement would have to re-earn.

          Only the Code tab gets it. The Mermaid tab is generated output in someone else's
          language, and this ontology's tokenizer would be reading a document it didn't write. */}
      <div className="flex-1 min-h-0 p-2">
        {/* The overlay is positioned against this box rather than the padded one above, so that
            `inset-0` and the `w-full h-full` both elements share describe the same rectangle —
            against a padded containing block they'd disagree by the padding, and the pre would
            wrap its lines at a different width than the textarea it's tracking. */}
        <div className="relative h-full">
          {editing && (
            <pre
              ref={overlay}
              aria-hidden
              className={`${EDITOR_BOX} syntax-overlay absolute inset-0 overflow-auto pointer-events-none border-transparent shadow-none`}
            >
              {lines.map((tokens, i) => (
                <Fragment key={i}>
                  {i > 0 && "\n"}
                  {tokens.map((token, j) => (
                    <Token key={j} token={token} config={config} />
                  ))}
                </Fragment>
              ))}
              {/* A source ending in a newline leaves the textarea an empty last line; give the
                  pre one too, or the two disagree about their height by a line. A trailing space
                  hangs at the end of its line, so it can never move a wrap. */}{" "}
            </pre>
          )}
          {/* `relative` only so the textarea paints over the absolutely positioned overlay:
              without it, in-flow content sits below a positioned sibling whatever the DOM
              order, and the transparent text would be hiding *behind* its own highlighting.

              daisyUI's `.textarea:focus` changes three things, and only the first is kept: the
              border darkens (`--input-color` swapping to full base-content, left alone here), a
              2px outline appears, and the inset shadow becomes an outer one. The outline is off
              because it rings a rectangle whose edges are already the pane's own, and the shadow
              off in both states because a hairline flipping from inset to outer says nothing
              about focus. What's left is the border doing that job by itself. */}
          <textarea
            className={`${EDITOR_BOX} syntax-input relative resize-none overflow-auto shadow-none focus:outline-none placeholder:text-base-content/40 ${
              editing ? "bg-transparent text-transparent caret-base-content" : ""
            }`}
            spellCheck={false}
            value={editing ? source : mermaidText}
            onChange={(e) => onSourceChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={(e) => {
              if (overlay.current === null) return;
              overlay.current.scrollTop = e.currentTarget.scrollTop;
              overlay.current.scrollLeft = e.currentTarget.scrollLeft;
            }}
            readOnly={!editing}
            placeholder={editing ? placeholder : undefined}
            aria-label={editing ? `${ontologyLabel} source` : "Generated mermaid source"}
            aria-keyshortcuts={editing ? "Tab Shift+Tab Escape" : undefined}
          />
        </div>
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
