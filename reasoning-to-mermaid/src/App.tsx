import { useEffect, useMemo, useState } from "react";
import type { StyleConfig } from "./ontology/types.ts";
import { defaultOntologyId, getOntology, ontologyList } from "./ontology/registry.ts";
import { decodeState, encodeState } from "./share/url.ts";
import Toolbar from "./components/Toolbar.tsx";
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

interface InitialState {
  ontologyId: string;
  source: string;
  config: StyleConfig;
}

/** Merge a possibly-partial shared config over the ontology defaults so old/partial links stay valid. */
function mergeConfig(base: StyleConfig, partial?: StyleConfig): StyleConfig {
  if (!partial) return structuredClone(base);
  return {
    ...base,
    ...partial,
    types: { ...base.types, ...(partial.types ?? {}) },
  };
}

function readInitialState(): InitialState {
  const decoded = decodeState(window.location.hash);
  const ontology = getOntology(decoded?.ontologyId ?? defaultOntologyId);
  if (decoded) {
    return {
      ontologyId: ontology.id,
      source: decoded.source,
      config: mergeConfig(ontology.defaultConfig, decoded.config),
    };
  }
  return {
    ontologyId: ontology.id,
    source: ontology.sample,
    config: structuredClone(ontology.defaultConfig),
  };
}

export default function App() {
  const initial = useMemo(readInitialState, []);
  const [ontologyId, setOntologyId] = useState(initial.ontologyId);
  const [source, setSource] = useState(initial.source);
  const [config, setConfig] = useState<StyleConfig>(initial.config);
  const [activeTab, setActiveTab] = useState<EditorTab>("ibis");
  const [legendOpen, setLegendOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  // Drive the daisyUI app theme and persist the preference (not part of the shared doc).
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const ontology = getOntology(ontologyId);
  const parseResult = useMemo(() => ontology.parse(source), [ontology, source]);
  const mermaidText = useMemo(
    () => ontology.toMermaid(parseResult.graph, config),
    [ontology, parseResult, config],
  );
  const mermaidTheme: MermaidTheme = theme === "dark" ? "dark" : "default";

  // Persist the whole document into the URL hash (debounced) so links are shareable.
  useEffect(() => {
    const handle = setTimeout(() => {
      const encoded = encodeState({ ontologyId, source, config });
      window.history.replaceState(null, "", `#${encoded}`);
    }, 300);
    return () => clearTimeout(handle);
  }, [ontologyId, source, config]);

  const switchOntology = (id: string) => {
    const next = getOntology(id);
    setOntologyId(next.id);
    setSource(next.sample);
    setConfig(structuredClone(next.defaultConfig));
  };

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        ontologyList={ontologyList}
        ontologyId={ontologyId}
        source={source}
        config={config}
        theme={theme}
        onOntologyChange={switchOntology}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onToggleLegend={() => setLegendOpen((v) => !v)}
        onToggleConfig={() => setConfigOpen((v) => !v)}
      />

      <div className="flex flex-1 min-h-0">
        <div className="w-2/5 min-w-70 max-w-160">
          <EditorPane
            source={source}
            onSourceChange={setSource}
            mermaidText={mermaidText}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            ontologyLabel={ontology.label}
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
        config={config}
        typeLabels={ontology.typeLabels}
        onChange={setConfig}
        onReset={() => setConfig(structuredClone(ontology.defaultConfig))}
        onClose={() => setConfigOpen(false)}
      />
    </div>
  );
}
