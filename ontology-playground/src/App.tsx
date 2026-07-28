import { useEffect, useMemo, useState } from "react";
import { defaultOntologyId, getOntology, ontologyList } from "./ontology/registry.ts";
import { type DocState, decodeState, encodeState } from "./share/url.ts";
import Toolbar, { type PaneView } from "./components/Toolbar.tsx";
import EditorPane, { type EditorTab } from "./components/EditorPane.tsx";
import DiagramPane from "./components/DiagramPane.tsx";
import Legend from "./components/Legend.tsx";
import ConfigPanel from "./components/ConfigPanel.tsx";
import type { MermaidTheme } from "./mermaidClient.ts";

type Theme = "light" | "dark";

const THEME_KEY = "m2m-theme";

function readInitialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** A shared link supplies the whole document; otherwise start on the default ontology's sample. */
function readInitialDoc(): DocState {
  const decoded = decodeState(window.location.hash);
  if (decoded) return decoded;
  const ontology = getOntology(defaultOntologyId);
  return {
    ontologyId: ontology.id,
    source: ontology.sample,
    config: structuredClone(ontology.defaultConfig),
  };
}

export default function App() {
  const [doc, setDoc] = useState<DocState>(readInitialDoc);
  const [activeTab, setActiveTab] = useState<EditorTab>("source");
  const [pane, setPane] = useState<PaneView>("edit");
  const [legendOpen, setLegendOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  // Drive the daisyUI app theme and persist the preference (not part of the shared doc).
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const ontology = getOntology(doc.ontologyId);
  const parseResult = useMemo(() => ontology.parse(doc.source), [ontology, doc.source]);
  const mermaidText = useMemo(
    () => ontology.toMermaid(parseResult.graph, doc.config),
    [ontology, parseResult, doc.config],
  );
  const mermaidTheme: MermaidTheme = theme === "dark" ? "dark" : "default";

  // Persist the whole document into the URL hash (debounced) so links are shareable.
  useEffect(() => {
    const handle = setTimeout(() => {
      window.history.replaceState(null, "", `#${encodeState(doc)}`);
    }, 300);
    return () => clearTimeout(handle);
  }, [doc]);

  const switchOntology = (id: string) => {
    const next = getOntology(id);
    setDoc({
      ontologyId: next.id,
      source: next.sample,
      config: structuredClone(next.defaultConfig),
    });
  };

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        ontologyList={ontologyList}
        doc={doc}
        theme={theme}
        pane={pane}
        onOntologyChange={switchOntology}
        onPaneChange={setPane}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onToggleLegend={() => setLegendOpen((v) => !v)}
        onToggleConfig={() => setConfigOpen((v) => !v)}
      />

      {/* Both panes stay mounted: on a phone the editor sits on top of a full-width diagram,
          so switching back to the diagram keeps the size and pan/zoom it already had. */}
      <div className="relative flex flex-1 min-h-0">
        <div
          className={`absolute inset-0 z-10 md:static md:w-2/5 md:min-w-70 md:max-w-160 ${
            pane === "view" ? "hidden md:block" : ""
          }`}
        >
          <EditorPane
            source={doc.source}
            onSourceChange={(source) => setDoc((d) => ({ ...d, source }))}
            mermaidText={mermaidText}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            ontologyLabel={ontology.label}
            placeholder={ontology.placeholder}
            errors={parseResult.errors}
          />
        </div>
        <DiagramPane mermaidText={mermaidText} theme={mermaidTheme} />
      </div>

      <Legend
        open={legendOpen}
        entries={ontology.legend}
        note={ontology.legendNote}
        onClose={() => setLegendOpen(false)}
      />
      <ConfigPanel
        open={configOpen}
        config={doc.config}
        nodeTypes={ontology.nodeTypes}
        onChange={(config) => setDoc((d) => ({ ...d, config }))}
        onReset={() => setDoc((d) => ({ ...d, config: structuredClone(ontology.defaultConfig) }))}
        onClose={() => setConfigOpen(false)}
      />
    </div>
  );
}
