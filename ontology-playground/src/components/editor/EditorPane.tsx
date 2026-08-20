import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { HighlightToken, ParseError, StyleConfig } from "../../ontology/types.ts";
import { lineAt, offsetOfLine } from "./caret.ts";
import { handleIndentKeys } from "./indent.ts";
import { revealLine, useRefJump } from "./refJump.ts";

export type EditorTab = "source" | "mermaid";

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
  onOpenMiscConfig: () => void;
  highlightLine: (line: string) => HighlightToken[];
  /** the document's live styling: where a `type` token's color comes from */
  config: StyleConfig;
  /** draw a lone type marker on a tint of its own color, rather than as bare colored text */
  markerHighlights: boolean;
  /** 1-based line being pointed at, banded here; `null` when nothing is */
  activeLine: number | null;
  onActiveLineChange: (line: number | null) => void;
  /**
   * Put the caret on this line and scroll it into view. Carries a nonce because the same line can
   * be asked for twice running — clicking one box, looking elsewhere, clicking it again — and a
   * bare line number would look unchanged the second time.
   */
  caretRequest: { line: number; nonce: number } | null;
}

/** One token. Plain text is bare, so the overlay's DOM stays close to the textarea's own. */
function Token({ token, config }: { token: HighlightToken; config: StyleConfig }) {
  if (token.kind === undefined) return token.text;

  // An id the config doesn't style (an ontology naming a type it doesn't render) falls back to
  // the CSS rule's `currentColor` rather than to a guess.
  const color = token.typeId === undefined ? undefined : config.typeColors[token.typeId];
  return (
    <span
      className={`tok-${token.kind}${token.loneMarker === true ? " tok-lone-marker" : ""}`}
      style={color === undefined ? undefined : ({ "--tok-color": color } as CSSProperties)}
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
  onOpenMiscConfig,
  highlightLine,
  config,
  markerHighlights,
  activeLine,
  onActiveLineChange,
  caretRequest,
}: Props) {
  const editing = activeTab === "source";
  const overlay = useRef<HTMLPreElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  // Split on "\n" rather than the parser's /\r?\n/: a token's text has to be the source's own
  // characters, and a swallowed "\r" is a character the textarea still lays out.
  const lines = useMemo(
    () => (editing ? source.split("\n").map(highlightLine) : []),
    [editing, source, highlightLine],
  );

  const { linkable, onClick: onRefJumpClick } = useRefJump(lines, editing);

  /**
   * Where the caret is, read off the element rather than the props: at report time the textarea
   * is what has just moved it. A selection reports the end it grew *toward*, which is the end
   * the caret is drawn at.
   */
  const reportCaretLine = (el: HTMLTextAreaElement) => {
    if (!editing) return;
    const caret = el.selectionDirection === "backward" ? el.selectionStart : el.selectionEnd;
    onActiveLineChange(lineAt(el.value, caret));
  };

  // `select` misses a caret the *code* moved — `setSelectionRange` fires nothing — so a click
  // reports too: it's how the ref jump lands, and how you point at a line you're already on
  // after a click somewhere else cleared it.
  const handleClick = (e: MouseEvent<HTMLTextAreaElement>) => {
    onRefJumpClick(e);
    reportCaretLine(e.currentTarget);
  };

  // Answer each request once, by nonce: the effect re-runs on every edit, and moving the caret
  // again there would drag it back out of wherever the typing had taken it. A request that
  // arrives while the Mermaid tab is up waits for the Code tab rather than being dropped —
  // the textarea is showing generated output, which the line means nothing in.
  //
  // Deliberately without `.focus()`: the click that asked for this landed on the diagram, and
  // taking the keyboard away from it would also raise the on-screen keyboard on a phone.
  const answered = useRef(0);
  useEffect(() => {
    const el = input.current;
    if (caretRequest === null || caretRequest.nonce === answered.current) return;
    if (el === null || !editing) return;
    answered.current = caretRequest.nonce;
    const offset = offsetOfLine(source, caretRequest.line);
    el.setSelectionRange(offset, offset);
    revealLine(el, caretRequest.line - 1);
  }, [caretRequest, editing, source]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab is trapped for indenting, so Escape is the keyboard way back out of the textarea.
    if (e.key === "Escape") {
      e.currentTarget.blur();
      return;
    }
    if (editing) handleIndentKeys(e);
    // The caret moves *after* this handler (the key's default action), and React's own report
    // waits for `keyup` — so a held arrow key would drag the band a keystroke behind. A frame
    // callback runs after the move and before the paint: band and caret land together.
    requestAnimationFrame(() => {
      if (input.current !== null) reportCaretLine(input.current);
    });
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
            ontology chose to call itself — the pair plus both buttons has to fit 320px. */}
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

        {/* Both sit with the editor they act on rather than in the page header, and both stay
            buttons outside the tablist: a third tab would replace the textarea and be a mode to
            click back out of, where a dialog is open-and-dismiss. They travel as one group so a
            narrow row drops them together rather than splitting the pair.

            Shown on the Mermaid tab too — the syntax describes the ontology either way, and
            hiding either would make the row jump. */}
        <div className="ml-auto flex items-center gap-1">
          <button
            className="btn btn-xs btn-ghost"
            onClick={onOpenLegend}
            title={`How to read and write ${ontologyLabel}`}
          >
            Syntax
          </button>
          <button
            className="btn btn-xs btn-ghost"
            onClick={onOpenMiscConfig}
            title="How the editor draws the source"
          >
            Misc config
          </button>
        </div>
      </div>

      {/* The editor is a plain textarea with a highlighted copy of its own text behind it, rather
          than a code-editor component: every marker in these syntaxes already has a color (the
          stroke its type is drawn with), so the overlay is what makes a line of source and its
          box in the diagram findable from each other — and keeping the textarea keeps the tab,
          undo and mobile-input behavior a replacement would have to re-earn.

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
              className={`${EDITOR_BOX} syntax-overlay absolute inset-0 overflow-auto pointer-events-none border-transparent shadow-none ${
                markerHighlights ? "marker-highlights" : ""
              } ${linkable ? "ref-links" : ""}`}
            >
              {/* One block per line, so the caret's line can be painted as a whole rather than
                  measured and drawn over. Both classes are laid out in ./EditorPane.css. */}
              <span className="editor-lines">
                {lines.map((tokens, i) => (
                  <span
                    key={i}
                    className={`editor-line${i + 1 === activeLine ? " editor-line-active" : ""}`}
                  >
                    {tokens.map((token, j) => (
                      <Token key={j} token={token} config={config} />
                    ))}
                  </span>
                ))}
              </span>
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
            ref={input}
            className={`${EDITOR_BOX} syntax-input relative resize-none overflow-auto shadow-none focus:outline-none placeholder:text-base-content/40 ${
              editing ? "bg-transparent text-transparent caret-base-content" : ""
            }`}
            spellCheck={false}
            value={editing ? source : mermaidText}
            onChange={(e) => onSourceChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            onSelect={(e) => reportCaretLine(e.currentTarget)}
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
