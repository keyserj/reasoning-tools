import { useEffect, useMemo, useRef, useState } from "react";
import { defaultOntologyId, getOntology, ontologyList } from "./ontology/registry.ts";
import {
  EXAMPLES,
  defaultExample,
  exampleLabel,
  findExample,
  missingExampleNote,
} from "./ontology/examples.ts";
import { defaultFeatureState } from "./ontology/features.ts";
import type { Ontology, OntologyExample, Theme } from "./ontology/types.ts";
import { type ShareState, decodeState, encodeState } from "./share/url.ts";
import Toolbar, { type PaneView } from "./components/Toolbar.tsx";
import EditorPane, { type EditorTab } from "./components/EditorPane.tsx";
import DiagramPane from "./components/DiagramPane.tsx";
import DocumentPicker from "./components/DocumentPicker.tsx";
import RenderingStrip from "./components/RenderingStrip.tsx";
import Legend from "./components/Legend.tsx";
import MiscConfig from "./components/MiscConfig.tsx";
import ConfigPanel from "./components/ConfigPanel.tsx";

const THEME_KEY = "m2m-theme";

/** How long a substitution notice stays up. */
const NOTICE_MS = 6000;

function readInitialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** A shared link supplies the whole document; otherwise start on the default ontology's first example. */
function readInitialShared(): ShareState {
  const decoded = decodeState(window.location.hash);
  if (decoded) return decoded;
  const ontology = getOntology(defaultOntologyId);
  return sharedFor(ontology, defaultExample(ontology));
}

function sharedFor(ontology: Ontology, example: OntologyExample, source?: string): ShareState {
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
  const [shared, setShared] = useState<ShareState>(readInitialShared);
  const [activeTab, setActiveTab] = useState<EditorTab>("source");
  const [pane, setPane] = useState<PaneView>("edit");
  const [legendOpen, setLegendOpen] = useState(false);
  const [miscConfigOpen, setMiscConfigOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  // How the editor draws the tokens that name a type, set from the misc config dialog and read by
  // the editor, so it sits above both rather than in either. Not in `shared`: it's how *you* like
  // reading the source, not part of the document, so it doesn't travel in a link someone sent.
  const [typeBackgrounds, setTypeBackgrounds] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  // Edits survive an ontology or example switch, but only for this page load: persisting
  // them is a separate decision (which storage, and for how long) than keeping the switch
  // from feeling destructive.
  const drafts = useRef(new Map<string, string>());

  // Drive the daisyUI app theme and persist the preference (not part of the shared state).
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (notice === null) return;
    const handle = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(handle);
  }, [notice]);

  const ontology = getOntology(shared.ontologyId);
  const parseResult = useMemo(() => ontology.parse(shared.source), [ontology, shared.source]);
  // Depends on the theme because each type's one configured color resolves into a fill, a
  // border and a text color differently in each (ontology/typeColors.ts).
  const mermaidText = useMemo(
    () => ontology.toMermaid(parseResult.doc, shared.config, shared.features, theme),
    [ontology, parseResult, shared.config, shared.features, theme],
  );

  // "Dirty" is derived rather than stored, so an edit that happens to restore the original
  // text stops counting as one.
  const example = findExample(ontology, shared.exampleId);
  const dirty = example !== undefined && shared.source !== example.source;

  // Persist the whole document into the URL hash (debounced) so links are shareable.
  useEffect(() => {
    const handle = setTimeout(() => {
      window.history.replaceState(null, "", `#${encodeState(shared)}`);
    }, 300);
    return () => clearTimeout(handle);
  }, [shared]);

  /** Stash the current source so switching away from an edited example isn't destructive. */
  const stashDraft = () => {
    if (dirty && shared.exampleId !== null) {
      drafts.current.set(draftKey(shared.ontologyId, shared.exampleId), shared.source);
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
    const wanted = findExample(next, shared.exampleId);
    const target = wanted ?? defaultExample(next);
    if (!wanted) {
      const missing = exampleLabel(shared.exampleId);
      setNotice(
        missing === null
          ? `A custom document can't carry over to ${next.label} — showing "${exampleLabel(target.id)}"`
          : `${next.label} has no "${missing}" example — showing "${exampleLabel(target.id)}"`,
      );
    }
    // Style and features are the *next* ontology's: both are declared per ontology, and one's
    // node-type colors mean nothing in another's table.
    setShared(sharedFor(next, target, sourceFor(next, target)));
  };

  /** Within one ontology, only the document changes — style and features are left alone. */
  const switchExample = (id: string) => {
    const target = findExample(ontology, id);
    // The picker shows examples this ontology hasn't written, greyed rather than hidden, so
    // clicking one is expected and has to answer rather than do nothing. It's also the only
    // route a touch device has to the reason, having no hover to raise the tooltip with.
    if (!target) {
      setNotice(missingExampleNote(ontology, id));
      return;
    }
    if (id === shared.exampleId) return;
    stashDraft();
    setShared((d) => ({ ...d, exampleId: target.id, source: sourceFor(ontology, target) }));
  };

  const resetExample = () => {
    if (example === undefined) return;
    drafts.current.delete(draftKey(shared.ontologyId, example.id));
    setShared((d) => ({ ...d, source: example.source }));
  };

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        shared={shared}
        theme={theme}
        pane={pane}
        onPaneChange={setPane}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />

      {/* Both panes stay mounted: on a phone the editor sits on top of a full-width diagram,
          so switching back to the diagram keeps the size and pan/zoom it already had. */}
      <div className="relative flex flex-1 min-h-0">
        {/* The document column: what the diagram is *of*, and the text it's read from.
            `md:flex` rather than `md:block` in the hidden branch — `block` would override the
            `flex` this column now needs for its two children. */}
        <div
          className={`absolute inset-0 z-10 flex flex-col border-r border-base-300 bg-base-100 md:static md:w-2/5 md:min-w-70 md:max-w-160 ${
            pane === "view" ? "hidden md:flex" : ""
          }`}
        >
          <DocumentPicker
            ontologyList={ontologyList}
            ontology={ontology}
            examples={EXAMPLES}
            exampleId={shared.exampleId}
            dirty={dirty}
            onOntologyChange={switchOntology}
            onExampleChange={switchExample}
            onResetExample={resetExample}
          />
          <EditorPane
            source={shared.source}
            onSourceChange={(source) => setShared((d) => ({ ...d, source }))}
            mermaidText={mermaidText}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            ontologyLabel={ontology.label}
            placeholder={ontology.placeholder}
            errors={parseResult.errors}
            onOpenLegend={() => setLegendOpen(true)}
            onOpenMiscConfig={() => setMiscConfigOpen(true)}
            highlightLine={ontology.highlightLine}
            config={shared.config}
            typeBackgrounds={typeBackgrounds}
          />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <RenderingStrip
            features={ontology.features}
            state={shared.features}
            onChange={(features) => setShared((d) => ({ ...d, features }))}
            onOpenStyle={() => setConfigOpen(true)}
          />
          <DiagramPane mermaidText={mermaidText} theme={theme} />
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
      <MiscConfig
        open={miscConfigOpen}
        typeBackgrounds={typeBackgrounds}
        onTypeBackgroundsChange={setTypeBackgrounds}
        onClose={() => setMiscConfigOpen(false)}
      />
      <ConfigPanel
        open={configOpen}
        config={shared.config}
        renderedNodeTypes={ontology.renderedNodeTypes}
        theme={theme}
        onChange={(config) => setShared((d) => ({ ...d, config }))}
        onReset={() =>
          setShared((d) => ({ ...d, config: structuredClone(ontology.defaultConfig) }))
        }
        onClose={() => setConfigOpen(false)}
      />
    </div>
  );
}
