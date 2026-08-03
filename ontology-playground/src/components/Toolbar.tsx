import { useState } from "react";
import { type ShareState, buildShareUrl } from "../share/url.ts";

/** Which pane a phone-sized screen shows; wider screens show both side by side. */
export type PaneView = "edit" | "view";

const GITHUB_URL = "https://github.com/keyserj/reasoning-tools/tree/main/ontology-playground";

interface Props {
  shared: ShareState;
  theme: "light" | "dark";
  pane: PaneView;
  onPaneChange: (pane: PaneView) => void;
  onToggleTheme: () => void;
}

// Site scope only. The ontology and example pickers live with the document they identify
// (DocumentPicker) and Key/Style with the halves they act on, leaving this row with what is
// true of the whole page — plus Copy link, the one action spanning both halves, which is why
// it stays here rather than belonging to either.
export default function Toolbar({ shared, theme, pane, onPaneChange, onToggleTheme }: Props) {
  const [copied, setCopied] = useState(false);

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

  const themeIcon = theme === "dark" ? "☀️" : "🌙";

  return (
    // Everything fits one row at 375px now that the two selects have moved out, so there's no
    // wrapped picker line and no overflow menu to hide controls in. `flex-wrap` stays as the
    // fallback for narrower phones.
    <div className="navbar bg-base-200 border-b border-base-300 min-h-12 py-0 px-3 gap-2 flex-wrap">
      {/* `shrink-0`, not the `flex-1 min-w-0` this had while it held the selects: with nothing
          left to shrink, that squeezed the group to 7px at 320px and the pane toggle drew over
          the logo. Refusing to shrink lets the row wrap instead, which is what `flex-wrap` is
          here for. */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-lg">🗺️</span>
        <span className="font-semibold hidden md:inline">Reasoning Ontology Playground</span>
      </div>

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
          className="btn btn-sm btn-ghost"
          onClick={onToggleTheme}
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {themeIcon}
        </button>
        <button
          className="btn btn-sm btn-primary"
          onClick={copyLink}
          aria-label="Copy link"
          title="Copy link"
        >
          {/* The text form is the one thing that wouldn't fit a 375px row. */}
          <span className="md:hidden">{copied ? "✅" : "🔗"}</span>
          <span className="hidden md:inline">{copied ? "Copied!" : "Copy link"}</span>
        </button>
        <a className="btn btn-sm btn-ghost" href={GITHUB_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>
    </div>
  );
}
