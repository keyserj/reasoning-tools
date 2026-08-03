import { useEffect, useState } from "react";
import type { Ontology, OntologyExample } from "../ontology/types.ts";
import { exampleLabel } from "../ontology/examples.ts";
import { type ShareState, buildShareUrl } from "../share/url.ts";

/** Which pane a phone-sized screen shows; wider screens show both side by side. */
export type PaneView = "edit" | "view";

const GITHUB_URL = "https://github.com/keyserj/reasoning-tools/tree/main/ontology-playground";

/** `<option>` value standing in for "this text is nobody's example any more". */
const CUSTOM = "__custom";

interface Props {
  ontologyList: Ontology[];
  /** the current ontology's writings of the shared examples */
  examples: OntologyExample[];
  shared: ShareState;
  /** the source differs from the example it came from */
  dirty: boolean;
  theme: "light" | "dark";
  pane: PaneView;
  onOntologyChange: (id: string) => void;
  onExampleChange: (id: string) => void;
  onResetExample: () => void;
  onPaneChange: (pane: PaneView) => void;
  onToggleTheme: () => void;
  onToggleLegend: () => void;
  onToggleConfig: () => void;
}

export default function Toolbar({
  ontologyList,
  examples,
  shared,
  dirty,
  theme,
  pane,
  onOntologyChange,
  onExampleChange,
  onResetExample,
  onPaneChange,
  onToggleTheme,
  onToggleLegend,
  onToggleConfig,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // daisyUI opens dropdowns on :focus-within, which iOS Safari doesn't reliably give a
  // tapped button, so the menu is driven by state and dismissed by taps outside of it.
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const copyLink = async () => {
    const url = buildShareUrl(shared);
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard may be unavailable; the URL bar is at least updated above.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const fromMenu = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  const themeIcon = theme === "dark" ? "☀️" : "🌙";
  const themeLabel = theme === "dark" ? "Light mode" : "Dark mode";

  return (
    // Two selects plus the pane toggle don't fit one phone-width row, so the row wraps and
    // the pickers get a line of their own; above `md` it stays the single row it was.
    <div className="navbar bg-base-200 border-b border-base-300 min-h-12 py-0 px-3 gap-2 flex-wrap md:flex-nowrap">
      <div className="flex-1 basis-full md:basis-auto flex items-center gap-2 min-w-0">
        <span className="text-lg">🗺️</span>
        <span className="font-semibold hidden lg:inline">Reasoning Ontology Playground</span>
        <select
          className="select select-sm select-bordered ml-1 min-w-0 flex-1 md:flex-initial md:w-auto text-base md:text-sm"
          value={shared.ontologyId}
          onChange={(e) => onOntologyChange(e.target.value)}
          aria-label="Ontology"
        >
          {ontologyList.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        {/* Example ids are shared across ontologies, so switching ontology keeps the example
            and this dropdown reads the same everywhere. */}
        <select
          className="select select-sm select-bordered min-w-0 flex-1 md:flex-initial md:w-auto text-base md:text-sm"
          value={shared.exampleId ?? CUSTOM}
          onChange={(e) => onExampleChange(e.target.value)}
          aria-label="Example"
        >
          {shared.exampleId === null && <option value={CUSTOM}>Custom</option>}
          {examples.map((e) => (
            <option key={e.id} value={e.id}>
              {exampleLabel(e.id) ?? e.id}
              {dirty && e.id === shared.exampleId ? " • edited" : ""}
            </option>
          ))}
        </select>
        {dirty && (
          <button
            className="btn btn-sm btn-ghost px-2"
            onClick={onResetExample}
            title="Reset to the original example"
          >
            <span className="md:hidden">↺</span>
            <span className="hidden md:inline">Reset</span>
          </button>
        )}
      </div>

      {/* `ml-auto` keeps these right-aligned on the wrapped phone row too. */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Only one pane fits on a phone, so it gets a toggle between them. */}
        <div className="join mr-1 md:hidden" role="group" aria-label="Show editor or diagram">
          <button
            className={`btn btn-sm join-item ${pane === "edit" ? "btn-primary" : "btn-ghost"}`}
            aria-pressed={pane === "edit"}
            onClick={() => onPaneChange("edit")}
          >
            Edit
          </button>
          <button
            className={`btn btn-sm join-item ${pane === "view" ? "btn-primary" : "btn-ghost"}`}
            aria-pressed={pane === "view"}
            onClick={() => onPaneChange("view")}
          >
            View
          </button>
        </div>

        <button
          className="btn btn-sm btn-ghost hidden md:inline-flex"
          onClick={onToggleTheme}
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {themeIcon}
        </button>
        <button className="btn btn-sm btn-ghost hidden md:inline-flex" onClick={onToggleLegend}>
          Key
        </button>
        <button className="btn btn-sm btn-ghost hidden md:inline-flex" onClick={onToggleConfig}>
          Style
        </button>
        <button
          className="btn btn-sm btn-primary"
          onClick={copyLink}
          aria-label="Copy link"
          title="Copy link"
        >
          <span className="md:hidden">{copied ? "✅" : "🔗"}</span>
          <span className="hidden md:inline">{copied ? "Copied!" : "Copy link"}</span>
        </button>
        <a
          className="btn btn-sm btn-ghost hidden md:inline-flex"
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>

        {/* The buttons above don't fit next to the pane toggle on a phone. */}
        <div
          className={`dropdown dropdown-end md:hidden ${menuOpen ? "dropdown-open" : ""}`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            ☰
          </button>
          {menuOpen && (
            <ul className="dropdown-content menu menu-sm z-20 mt-1 w-44 gap-1 rounded-box bg-base-200 p-2 shadow">
              <li>
                <button onClick={fromMenu(onToggleTheme)}>
                  {themeIcon} {themeLabel}
                </button>
              </li>
              <li>
                <button onClick={fromMenu(onToggleLegend)}>Key</button>
              </li>
              <li>
                <button onClick={fromMenu(onToggleConfig)}>Style</button>
              </li>
              <li>
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  GitHub
                </a>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
