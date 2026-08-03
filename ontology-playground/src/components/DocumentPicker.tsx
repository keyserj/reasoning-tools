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
  /** "Ontology" / "Example" — also the pill group's accessible name */
  label: string;
  /** what the summary row reads to the right of the label */
  summary: string;
  options: PickerOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** rendered beside the summary-row toggle, as its sibling */
  action?: ReactNode;
}

/**
 * One accordion section: a summary row that always names the current selection, over a pill
 * list that can be collapsed. "Summary row" rather than "header" because that is what it is to
 * the list below it — the page already has a header, and this isn't one.
 */
function PickerSection({ label, summary, options, selectedId, onSelect, action }: SectionProps) {
  // Desktop has room to show every option at once; a phone doesn't, and the collapsed summary
  // row is written for exactly that case. Read once at mount rather than tracked across
  // resizes: crossing the breakpoint mid-session is rare next to the cost of overriding a
  // choice the reader has already made. A resize listener would go here if that changes.
  const [open, setOpen] = useState(() => window.matchMedia?.(WIDE_QUERY).matches ?? true);
  const listId = useId();

  return (
    <div className="border-b border-base-300">
      {/* The toggle is a button and `action` is its *sibling*: nesting a button inside a button
          is invalid HTML, and Reset would toggle the accordion on its way to resetting.

          The toggle spans the row (`flex-1 justify-start`) rather than hugging its text, which
          buys a large target and hover across the whole width. It does *not* make the row look
          clickable at rest: transparent full-width is pixel-identical to transparent
          text-width until you happen to hover it. Giving the row a resting affordance is an
          open design question — a background band was tried and backed out. */}
      <div className="flex items-center gap-1 px-3 py-1">
        <button
          className="btn btn-sm btn-ghost flex-1 justify-start gap-1.5 px-2 min-w-0 font-normal"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={listId}
        >
          <span className="opacity-50">{open ? "▾" : "▸"}</span>
          <span className="opacity-60">{label}:</span>
          <span className="truncate font-semibold">{summary}</span>
        </button>
        {action}
      </div>

      {open && (
        <div
          id={listId}
          role="group"
          aria-label={label}
          className="flex flex-wrap gap-1 px-3 pb-1.5"
        >
          {options.map((option) => {
            const selected = option.id === selectedId;
            const unavailable = option.unavailable !== undefined;
            return (
              <button
                key={option.id}
                // A border on the unselected pills so they still read as pills rather than as
                // loose text; `aria-pressed` matches how the toolbar's pane toggle says the
                // same thing.
                //
                // The unavailable colour is set here rather than left to daisyUI's `:disabled`,
                // which is 20% alpha — about 1.9:1 against the dark theme's base-200, and
                // barely legible. A disabled control is normally allowed to be that faint, but
                // this one carries a message, and an unreadable message is no message.
                className={`btn btn-xs font-normal ${
                  selected
                    ? "btn-primary"
                    : `btn-ghost border border-base-content/20 ${
                        unavailable
                          ? "text-base-content/50 hover:bg-transparent cursor-not-allowed"
                          : ""
                      }`
                }`}
                aria-pressed={selected}
                // `aria-disabled`, not `disabled`. `disabled` sets `pointer-events: none`, so
                // the browser never delivers hover and the `title` below can never appear; it
                // also drops the pill out of the tab order, so a keyboard or screen-reader user
                // never learns the example exists. Both defeat the point of showing it at all.
                // Clicking is still not a selection — `onSelect` explains itself instead (see
                // App's switchExample), which is also the only route a touch device has, since
                // it has no hover to show a tooltip with.
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
    // `text-sm` rather than the rendering strip's `text-xs`: this is the first thing a visitor
    // needs to read — what they're looking at and what else there is — so it outranks the
    // secondary bar over the diagram.
    <div className="shrink-0 bg-base-200 text-sm">
      <PickerSection
        label="Ontology"
        summary={ontology.label}
        options={ontologyList.map((o) => ({ id: o.id, label: o.label }))}
        selectedId={ontology.id}
        onSelect={onOntologyChange}
      />
      {/* `null` is the only route to "Custom" — `decodeState` normalises an example id this
          ontology doesn't ship down to it — so no pill stands for it; the summary row does. */}
      <PickerSection
        label="Example"
        summary={`${exampleLabel(exampleId) ?? "Custom"}${dirty ? " • edited" : ""}`}
        options={exampleOptions}
        selectedId={exampleId}
        onSelect={onExampleChange}
        action={
          dirty && (
            // Bordered rather than a bare ghost: `btn-ghost` only grows a background on hover,
            // and that background is a light grey landing on this bar's light grey — at rest it
            // read as text, not a control. The ↺ marks it as an action rather than one more
            // pill in a row of them.
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
