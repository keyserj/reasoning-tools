import { useState } from "react";
import type { Ontology, StyleConfig } from "../ontology/types.ts";
import { buildShareUrl } from "../share/url.ts";

interface Props {
  ontologyList: Ontology[];
  ontologyId: string;
  source: string;
  config: StyleConfig;
  theme: "light" | "dark";
  onOntologyChange: (id: string) => void;
  onToggleTheme: () => void;
  onToggleLegend: () => void;
  onToggleConfig: () => void;
}

export default function Toolbar({
  ontologyList,
  ontologyId,
  source,
  config,
  theme,
  onOntologyChange,
  onToggleTheme,
  onToggleLegend,
  onToggleConfig,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    const url = buildShareUrl({ ontologyId, source, config });
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard may be unavailable; the URL bar is at least updated above.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="navbar bg-base-200 border-b border-base-300 min-h-12 py-0 px-3 gap-2">
      <div className="flex-1 flex items-center gap-2">
        <span className="text-lg">🗺️</span>
        <span className="font-semibold hidden sm:inline">markdownish → mermaid</span>
        <select
          className="select select-sm select-bordered ml-1"
          value={ontologyId}
          onChange={(e) => onOntologyChange(e.target.value)}
          aria-label="Ontology"
        >
          {ontologyList.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button
          className="btn btn-sm btn-ghost"
          onClick={onToggleTheme}
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <button className="btn btn-sm btn-ghost" onClick={onToggleLegend}>
          Key
        </button>
        <button className="btn btn-sm btn-ghost" onClick={onToggleConfig}>
          Style
        </button>
        <button className="btn btn-sm btn-primary" onClick={copyLink}>
          {copied ? "Copied!" : "Copy link"}
        </button>
        <a
          className="btn btn-sm btn-ghost"
          href="https://github.com/keyserj/reasoning-tools"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </div>
    </div>
  );
}
