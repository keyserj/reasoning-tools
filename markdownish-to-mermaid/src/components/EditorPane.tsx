import type { ParseError } from "../ontology/types.ts";

export type EditorTab = "ibis" | "mermaid";

interface Props {
  source: string;
  onSourceChange: (value: string) => void;
  mermaidText: string;
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  ontologyLabel: string;
  errors: ParseError[];
}

export default function EditorPane({
  source,
  onSourceChange,
  mermaidText,
  activeTab,
  onTabChange,
  ontologyLabel,
  errors,
}: Props) {
  return (
    <div className="flex flex-col h-full min-w-0 border-r border-base-300 bg-base-100">
      <div role="tablist" className="tabs tabs-bordered px-2 pt-2 shrink-0">
        <button
          role="tab"
          className={`tab ${activeTab === "ibis" ? "tab-active" : ""}`}
          onClick={() => onTabChange("ibis")}
        >
          {ontologyLabel}
        </button>
        <button
          role="tab"
          className={`tab ${activeTab === "mermaid" ? "tab-active" : ""}`}
          onClick={() => onTabChange("mermaid")}
        >
          Mermaid
        </button>
      </div>

      <div className="flex-1 min-h-0 p-2">
        {activeTab === "ibis" ? (
          <textarea
            className="textarea textarea-bordered w-full h-full font-mono text-sm leading-relaxed resize-none"
            spellCheck={false}
            value={source}
            onChange={(e) => onSourceChange(e.target.value)}
            placeholder="? Your question here &q1&#10;  = An idea &i1&#10;    + A pro&#10;    - A con"
          />
        ) : (
          <textarea
            className="textarea textarea-bordered w-full h-full font-mono text-sm leading-relaxed resize-none"
            readOnly
            value={mermaidText}
            aria-label="Generated mermaid source"
          />
        )}
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
