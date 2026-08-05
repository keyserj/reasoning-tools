import { type ReactNode, useId, useState } from "react";
import type { Ontology } from "../ontology/types.ts";
import {
  type ExampleDef,
  exampleLabel,
  findExample,
  missingExampleNote,
} from "../ontology/examples.ts";

// The document-scope section at the top of the left pane: which ontology the document is
// written in, and which example it started from. Both belong to the document rather than to
// the diagram — the language a document is written in is part of its identity the way Markdown
// is part of a `.md` file's, not something the previewer chose — which is why they sit above
// the editor instead of in the page header.
//
// Options are pills rather than a `<select>` because the whole point of shipping several
// ontologies is that you can see there are several; a dropdown hides its own alternatives until
// clicked. The accordion is what keeps that bounded as the lists grow.

/**
 * Tailwind's `md`, duplicated from the class names below because the initial open state is a
 * JS decision rather than a CSS one. If a third place ever needs this, hoist it rather than
 * writing a fourth literal.
 */
const WIDE_QUERY = "(min-width: 48rem)";

interface PickerOption {
  id: string;
  label: string;
  /** why this option can't be picked; renders disabled with this as its tooltip */
  unavailable?: string;
}

interface SectionProps {
  /** "Ontologies" / "Examples" — also the pill group's accessible name */
  label: string;
  /** the current selection, rendered parenthesised after the label */
  selection: string;
  options: PickerOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** rendered beside the accordion header's toggle, as its sibling */
  action?: ReactNode;
}

/**
 * One accordion section: a header that always names the current selection, over a pill list that
 * can be collapsed.
 */
function PickerSection({ label, selection, options, selectedId, onSelect, action }: SectionProps) {
  // Desktop has room to show every option at once; a phone doesn't, and the collapsed header
  // naming the current selection is written for exactly that case. Read once at mount rather
  // than tracked across resizes: crossing the breakpoint mid-session is rare next to the cost of
  // overriding a choice the reader has already made. A resize listener would go here if that
  // changes.
  const [open, setOpen] = useState(() => window.matchMedia?.(WIDE_QUERY).matches ?? true);
  const listId = useId();

  return (
    <div>
      {/* The toggle is a button and `action` is its *sibling*: nesting a button inside a button
          is invalid HTML, and Reset would toggle the accordion on its way to resetting. The
          toggle spans the row (`flex-1 justify-start`) for a large target.

          The row takes the **band** surface every section header in the pane wears, which is what
          makes it read as a header at rest.

          The bottom border appears only while collapsed, which is the rule "draw a divider only
          where two regions share a surface" applied to this row. Open, the band meets the pill
          list and the surface step separates them. Collapsed, this band meets the *next* band —
          `Examples` below `Ontologies`, the editor tab row below `Examples` — and without a line
          the three merge into one slab. */}
      <div
        className={`flex items-center gap-1 bg-base-200 px-3 py-1 ${
          open ? "" : "border-b border-base-300"
        }`}
      >
        {/* `px-3` puts the label at the same 24px as the editor's `Code` tab, so all three of the
            pane's headers start on one line. */}
        <button
          className="btn btn-sm btn-ghost flex-1 justify-start gap-1 px-3 min-w-0 section-header"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={listId}
        >
          <span>{label}</span>
          {/* The selection is content rather than a header, so it drops to the body weight and
              a lower value while keeping the header's size. */}
          <span className="truncate font-normal opacity-70">({selection})</span>
          {/* Trails the text, so the label keeps the header line rather than being pushed off it,
              and `shrink-0` makes truncation eat the selection instead of the caret. ▾/▴ is the
              app's convention for a caret that follows what it toggles (see the feature pills). */}
          <span className="shrink-0 font-normal opacity-50">{open ? "▴" : "▾"}</span>
        </button>
        {action}
      </div>

      {open && (
        <div
          id={listId}
          role="group"
          aria-label={label}
          className="flex flex-wrap gap-1 px-3 py-1.5"
        >
          {options.map((option) => {
            const selected = option.id === selectedId;
            const unavailable = option.unavailable !== undefined;
            return (
              <button
                key={option.id}
                // A border on the unselected pills too, so they read as pills rather than as loose
                // text; `option-selected` doubles its weight and adds a fill, and `aria-pressed`
                // says the same thing the toolbar's pane toggle does.
                //
                // The unavailable colour is set here rather than left to daisyUI's `:disabled`,
                // which is 20% alpha — barely legible against the page surface these pills sit
                // on. A disabled control is normally allowed to be that faint, but this one
                // carries a message, and an unreadable message is no message.
                className={`btn btn-xs btn-ghost border ${
                  selected
                    ? "option option-selected font-medium"
                    : unavailable
                      ? "border-base-content/20 font-normal text-base-content/50 hover:bg-transparent cursor-not-allowed"
                      : "option border-base-content/20 font-normal"
                }`}
                aria-pressed={selected}
                // `aria-disabled`, not `disabled`: `disabled` sets `pointer-events: none`, so the
                // `title` below can never appear, and drops the pill out of the tab order, so a
                // keyboard or screen-reader user never learns the example exists. Clicking is
                // still not a selection — `onSelect` explains itself instead (see App's
                // switchExample), the only route a touch device has.
                aria-disabled={unavailable}
                title={option.unavailable}
                onClick={() => onSelect(option.id)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface Props {
  ontologyList: Ontology[];
  /** the selected ontology, which decides which examples are available */
  ontology: Ontology;
  /** every shared example, not just the ones this ontology ships */
  examples: ExampleDef[];
  exampleId: string | null;
  /** the source differs from the example it came from */
  dirty: boolean;
  onOntologyChange: (id: string) => void;
  onExampleChange: (id: string) => void;
  onResetExample: () => void;
}

export default function DocumentPicker({
  ontologyList,
  ontology,
  examples,
  exampleId,
  dirty,
  onOntologyChange,
  onExampleChange,
  onResetExample,
}: Props) {
  // Driven by the shared table rather than `ontology.examples`, so an example this ontology
  // hasn't written is shown greyed instead of vanishing. Which reasoning a lens can't yet
  // express is worth seeing — it's half of what comparing ontologies is for — and a list that
  // changed length as you switched ontology would read as a bug.
  const exampleOptions: PickerOption[] = examples.map((example) => ({
    id: example.id,
    label: example.label,
    unavailable:
      findExample(ontology, example.id) === undefined
        ? missingExampleNote(ontology, example.id)
        : undefined,
  }));

  return (
    // No surface of its own. Each section paints its own band and lets its pill list fall through
    // to the page surface the column already sets, which is the alternation the pane is built on;
    // a fill here would flatten both sections into one slab.
    <div className="shrink-0">
      <PickerSection
        label="Ontologies"
        selection={ontology.label}
        options={ontologyList.map((o) => ({ id: o.id, label: o.label }))}
        selectedId={ontology.id}
        onSelect={onOntologyChange}
      />
      {/* `null` is the only route to "Custom" — `decodeState` normalises an example id this
          ontology doesn't ship down to it — so no pill stands for it; the header does. */}
      <PickerSection
        label="Examples"
        selection={`${exampleLabel(exampleId) ?? "Custom"}${dirty ? " • edited" : ""}`}
        options={exampleOptions}
        selectedId={exampleId}
        onSelect={onExampleChange}
        action={
          dirty && (
            // Bordered rather than a bare ghost: `btn-ghost` only grows a background on hover, so
            // at rest it reads as text rather than as a control. The ↺ marks it as an action
            // rather than one more pill in a row of them.
            <button
              className="btn btn-xs btn-ghost border border-base-content/20 gap-1 shrink-0"
              onClick={onResetExample}
              title="Discard the edits and reload the original example"
            >
              ↺ Reset
            </button>
          )
        }
      />
    </div>
  );
}
