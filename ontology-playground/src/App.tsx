import { useEffect, useMemo, useRef, useState } from "react";
import { defaultOntologyId, getOntology, ontologyList } from "./ontology/registry.ts";
import { defaultExample, exampleLabel, findExample } from "./ontology/examples.ts";
import { defaultFeatureState } from "./ontology/features.ts";
import type { Ontology, OntologyExample } from "./ontology/types.ts";
import { type DocState, decodeState, encodeState } from "./share/url.ts";
import Toolbar, { type PaneView } from "./components/Toolbar.tsx";
import EditorPane, { type EditorTab } from "./components/EditorPane.tsx";
import DiagramPane from "./components/DiagramPane.tsx";
import FeatureStrip from "./components/FeatureStrip.tsx";
import Legend from "./components/Legend.tsx";
import ConfigPanel from "./components/ConfigPanel.tsx";
import type { MermaidTheme } from "./mermaidClient.ts";

type Theme = "light" | "dark";

const THEME_KEY = "m2m-theme";

/** How long a substitution notice stays up. */
const NOTICE_MS = 6000;

function readInitialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** A shared link supplies the whole document; otherwise start on the default ontology's first example. */
function readInitialDoc(): DocState {
  const decoded = decodeState(window.location.hash);
  if (decoded) return decoded;
  const ontology = getOntology(defaultOntologyId);
  return docFor(ontology, defaultExample(ontology));
}

function docFor(ontology: Ontology, example: OntologyExample, source?: string): DocState {
  return {
    ontologyId: ontology.id,
    exampleId: example.id,
    source: source ?? example.source,
    config: structuredClone(ontology.defaultConfig),
    features: defaultFeatureState(ontology),
  };
}

/** Drafts are keyed by ontology *and* example, since the same reasoning is written twice. */
function draftKey(ontologyId: string, exampleId: string): string {
  return `${ontologyId}:${exampleId}`;
}

export default function App() {
  const [doc, setDoc] = useState<DocState>(readInitialDoc);
  const [activeTab, setActiveTab] = useState<EditorTab>("source");
  const [pane, setPane] = useState<PaneView>("edit");
  const [legendOpen, setLegendOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  // Edits survive an ontology or example switch, but only for this page load: persisting
  // them is a separate decision (which storage, and for how long) than keeping the switch
  // from feeling destructive.
  const drafts = useRef(new Map<string, string>());

  // Drive the daisyUI app theme and persist the preference (not part of the shared doc).
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (notice === null) return;
    const handle = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(handle);
  }, [notice]);

  const ontology = getOntology(doc.ontologyId);
  const parseResult = useMemo(() => ontology.parse(doc.source), [ontology, doc.source]);
  const mermaidText = useMemo(
    () => ontology.toMermaid(parseResult.doc, doc.config, doc.features),
    [ontology, parseResult, doc.config, doc.features],
  );
  const mermaidTheme: MermaidTheme = theme === "dark" ? "dark" : "default";

  // "Dirty" is derived rather than stored, so an edit that happens to restore the original
  // text stops counting as one.
  const example = findExample(ontology, doc.exampleId);
  const dirty = example !== undefined && doc.source !== example.source;

  // Persist the whole document into the URL hash (debounced) so links are shareable.
  useEffect(() => {
    const handle = setTimeout(() => {
      window.history.replaceState(null, "", `#${encodeState(doc)}`);
    }, 300);
    return () => clearTimeout(handle);
  }, [doc]);

  /** Stash the current source so switching away from an edited example isn't destructive. */
  const stashDraft = () => {
    if (dirty && doc.exampleId !== null) {
      drafts.current.set(draftKey(doc.ontologyId, doc.exampleId), doc.source);
    }
  };

  /** An example's source, or the draft of it left behind by an earlier edit. */
  const sourceFor = (next: Ontology, target: OntologyExample) =>
    drafts.current.get(draftKey(next.id, target.id)) ?? target.source;

  const switchOntology = (id: string) => {
    const next = getOntology(id);
    if (next.id === ontology.id) return;
    stashDraft();

    // The same example id in another ontology is the whole point: one click, same reasoning,
    // different lens. When it isn't there, say so — a silently swapped document is the main
    // way this would read as broken.
    const wanted = findExample(next, doc.exampleId);
    const target = wanted ?? defaultExample(next);
    if (!wanted) {
      const missing = exampleLabel(doc.exampleId);
      setNotice(
        missing === null
          ? `A custom document can't carry over to ${next.label} — showing "${exampleLabel(target.id)}"`
          : `${next.label} has no "${missing}" example — showing "${exampleLabel(target.id)}"`,
      );
    }
    // Style and features are the *next* ontology's: both are declared per ontology, and one's
    // node-type colors mean nothing in another's table.
    setDoc(docFor(next, target, sourceFor(next, target)));
  };

  /** Within one ontology, only the document changes — style and features are left alone. */
  const switchExample = (id: string) => {
    const target = findExample(ontology, id);
    if (!target || id === doc.exampleId) return;
    stashDraft();
    setDoc((d) => ({ ...d, exampleId: target.id, source: sourceFor(ontology, target) }));
  };

  const resetExample = () => {
    if (example === undefined) return;
    drafts.current.delete(draftKey(doc.ontologyId, example.id));
    setDoc((d) => ({ ...d, source: example.source }));
  };

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        ontologyList={ontologyList}
        examples={ontology.examples}
        doc={doc}
        dirty={dirty}
        theme={theme}
        pane={pane}
        onOntologyChange={switchOntology}
        onExampleChange={switchExample}
        onResetExample={resetExample}
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
        <div className="flex flex-col flex-1 min-w-0">
          <FeatureStrip
            features={ontology.features}
            state={doc.features}
            onChange={(features) => setDoc((d) => ({ ...d, features }))}
          />
          <DiagramPane mermaidText={mermaidText} theme={mermaidTheme} />
        </div>

        {/* Above both panes rather than inside the diagram column: on a phone the editor
            overlays that column, and a notice about the document you're looking at is
            exactly what you'd miss there. */}
        {notice !== null && (
          <div className="absolute bottom-4 left-1/2 z-30 w-max max-w-[90%] -translate-x-1/2">
            <div className="alert alert-info shadow-lg text-sm py-2">
              <span>{notice}</span>
              <button className="btn btn-xs btn-ghost" onClick={() => setNotice(null)}>
                ✕
              </button>
            </div>
          </div>
        )}
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
        renderedNodeTypes={ontology.renderedNodeTypes}
        onChange={(config) => setDoc((d) => ({ ...d, config }))}
        onReset={() => setDoc((d) => ({ ...d, config: structuredClone(ontology.defaultConfig) }))}
        onClose={() => setConfigOpen(false)}
      />
    </div>
  );
}
