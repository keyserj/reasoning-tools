import { useEffect, useMemo, useState } from "react";
import { parse } from "../../ontology/ameliorate-v2/parse.ts";
import source from "../../../../ameliorate-v2/examples/build-a-wall.txt?raw";
import DiagramPane from "../../components/DiagramPane.tsx";
import { deriveTypeStyle } from "../../ontology/typeColors.ts";
import type { FeatureState, LayoutDirection, Theme } from "../../ontology/types.ts";
import { toGraph } from "../../ontology/ameliorate-v2/toGraph.ts";
import { toMermaid } from "../../ontology/ameliorate-v2/toMermaid.ts";
import { defaultConfig } from "../../ontology/ameliorate-v2/defaultConfig.ts";
import { renderedNodeTypes } from "../../ontology/ameliorate-v2/renderedNodeTypes.ts";
import {
  features,
  VIEW,
  EDGE_CLAIMS,
  DEFAULT_VIEW,
  DEFAULT_EDGE_CLAIMS,
} from "../../ontology/ameliorate-v2/features.ts";

const parsed = parse(source);

export default function Experiment() {
  const [view, setView] = useState<string>(DEFAULT_VIEW);
  const [display, setDisplay] = useState<string>(DEFAULT_EDGE_CLAIMS);
  const [direction, setDirection] = useState<LayoutDirection>(defaultConfig.direction);
  const [theme, setTheme] = useState<Theme>("light");
  const featureState: FeatureState = useMemo(
    () => ({
      [VIEW]: { option: view },
      [EDGE_CLAIMS]: { option: display },
    }),
    [view, display],
  );
  const graph = useMemo(() => toGraph(parsed.doc, featureState), [featureState]);
  const mermaid = useMemo(
    () => toMermaid(parsed.doc, { ...defaultConfig, direction }, featureState, theme),
    [featureState, direction, theme],
  );
  const anchors = graph.edges.filter((edge) => edge.type === "anchor").length;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <main className="flex h-full min-h-0 flex-col bg-base-100 text-base-content">
      <header className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-b border-base-300 px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">Ameliorate v2 · Build a wall</h1>
          <p className="text-sm opacity-70">Rendering experiment</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          View
          <select
            className="select select-sm w-auto"
            value={view}
            onChange={(e) => setView(e.target.value)}
          >
            {features
              .find((feature) => feature.id === VIEW)!
              .options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Edge claims
          <select
            className="select select-sm w-auto"
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
          >
            {features
              .find((feature) => feature.id === EDGE_CLAIMS)!
              .options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Direction
          <select
            className="select select-sm w-auto"
            value={direction}
            onChange={(e) => setDirection(e.target.value as LayoutDirection)}
          >
            <option value="BT">Bottom to top</option>
            <option value="TB">Top to bottom (TD)</option>
            <option value="LR">Left to right</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Theme
          <select
            className="select select-sm w-auto"
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </header>
      <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 bg-base-200 px-4 py-2 text-xs">
        <p aria-live="polite">
          {parsed.doc.nodes.length} semantic nodes · {parsed.doc.edges.length} relations →{" "}
          {graph.nodes.length} boxes · {graph.edges.length - anchors} visible connectors · {anchors}{" "}
          layout anchors
        </p>
        <div className="flex flex-wrap gap-3" aria-label="Node types">
          {renderedNodeTypes.map((type) => (
            <span
              key={type.id}
              className="border-l-2 pl-1"
              title={type.description}
              style={{ borderColor: deriveTypeStyle(type.defaultColor, theme).border }}
            >
              {type.icon} {type.label}
            </span>
          ))}
        </div>
      </div>
      {[...parsed.errors, ...parsed.warnings].map((diagnostic, i) => (
        <p className="px-4 py-1 text-sm" key={i}>
          Line {diagnostic.line}: {diagnostic.message}
        </p>
      ))}
      <DiagramPane mermaid={mermaid} theme={theme} activeLine={null} onPickLine={() => {}} />
    </main>
  );
}
