import { type PointerEvent, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import svgPanZoom from "svg-pan-zoom";
import type { RenderGraph, StyleConfig, Theme, TypeTables } from "../ontology/types.ts";
import { type DiagramLayout, layoutDiagram } from "../diagram/layout.ts";
import { measureLabels } from "../diagram/measure.ts";
import Diagram from "./Diagram.tsx";

interface Props {
  graph: RenderGraph;
  types: TypeTables;
  config: StyleConfig;
  theme: Theme;
  activeLine: number | null;
  onPickLine: (line: number | null) => void;
}

type PanZoom = ReturnType<typeof svgPanZoom>;

/** Pan vs tap: without this, a pan that ended on a box would jump the caret. */
const TAP_SLOP = 6;

/** Relative to the fit. */
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 20;

/** Uncapped, fitting a one-box map blows it up to fill the pane. 1 is the layout's own size. */
const MAX_FIT_SCALE = 1.5;

/** The fit, capped, as a zoom relative to svg-pan-zoom's uncapped one. */
function cappedFit(panZoom: PanZoom) {
  const { width, height, viewBox } = panZoom.getSizes();
  return Math.min(1, MAX_FIT_SCALE / Math.min(width / viewBox.width, height / viewBox.height));
}

/** svg-pan-zoom measures its limits against its own fit; re-measure them against the capped one. */
function syncZoomLimits(panZoom: PanZoom) {
  const fit = cappedFit(panZoom);
  panZoom.setMinZoom(MIN_ZOOM * fit).setMaxZoom(MAX_ZOOM * fit);
}

function fitToPane(panZoom: PanZoom) {
  panZoom.zoom(cappedFit(panZoom));
  panZoom.center();
}

type Attempt = { layout: DiagramLayout; error: null } | { layout: null; error: string };

export default function DiagramPane({
  graph,
  types,
  config,
  theme,
  activeLine,
  onPickLine,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<SVGGElement>(null);
  const panZoomRef = useRef<PanZoom | null>(null);
  const pressedAt = useRef<{ x: number; y: number } | null>(null);
  /** The picture key svg-pan-zoom was last fitted to. */
  const fittedKey = useRef<string | null>(null);

  // Accepted compromise: `measureLabels` reads the DOM, which a render isn't supposed to do. It is
  // idempotent and cached, so StrictMode's double render and a render React throws away both cost
  // nothing. Measuring in a layout effect and storing the result in state would keep the render
  // pure at the price of a second render pass every time.
  const attempt = useMemo((): Attempt => {
    try {
      return { layout: layoutDiagram(graph, types, config, measureLabels), error: null };
    } catch (err) {
      return { layout: null, error: err instanceof Error ? err.message : String(err) };
    }
  }, [graph, types, config]);

  // A layout that throws is this app's bug, not the document's, so the last good picture stays up.
  const lastGood = useRef<DiagramLayout | null>(null);
  useEffect(() => {
    if (attempt.layout) lastGood.current = attempt.layout;
  }, [attempt]);
  const layout = attempt.layout ?? lastGood.current;
  const picture = layout && !layout.empty ? layout : null;

  // Refit when the picture's structure changes, and only then: a recolor, the theme or a caret
  // move keeps the reader's pan and zoom. svg-pan-zoom folds the viewBox into its own transform
  // and deletes the attribute, so it's written here on every refit rather than left to React,
  // which wouldn't restore a value it thinks is unchanged.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    const viewport = viewportRef.current;
    if (!svg || !viewport) return;
    const key = picture?.key ?? null;
    if (key === fittedKey.current) return;
    fittedKey.current = key;
    panZoomRef.current?.destroy();
    panZoomRef.current = null;
    if (!picture) return;

    svg.setAttribute("viewBox", `0 0 ${picture.width} ${picture.height}`);
    const panZoom = svgPanZoom(svg, {
      viewportSelector: viewport,
      zoomEnabled: true,
      controlIconsEnabled: false,
      fit: true,
      center: true,
      dblClickZoomEnabled: false,
    });
    syncZoomLimits(panZoom);
    fitToPane(panZoom);
    panZoomRef.current = panZoom;
  }, [picture]);

  // svg-pan-zoom measures the SVG once at init and caches it, so without this every later fit
  // would scale to the pane's size at render time rather than its size now.
  // Re-measuring leaves the current pan/zoom alone; it only refreshes what "fit" means.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      // A zero-size measurement (hidden pane) would leave a garbage scale cached.
      if (container.clientWidth === 0 || container.clientHeight === 0) return;
      const panZoom = panZoomRef.current;
      if (!panZoom) return;
      panZoom.resize();
      syncZoomLimits(panZoom);
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Forgetting the fit too, so a remount (StrictMode's, in development) sets svg-pan-zoom up again.
  useEffect(
    () => () => {
      panZoomRef.current?.destroy();
      panZoomRef.current = null;
      fittedKey.current = null;
    },
    [],
  );

  // Pointer events: svg-pan-zoom preventDefaults `touchstart`, so a phone never fires a click.
  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const pressed = pressedAt.current;
    pressedAt.current = null;
    if (pressed === null) return;
    if (Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) > TAP_SLOP) return;
    const target = e.target instanceof Element ? e.target.closest("[data-line]") : null;
    onPickLine(target === null ? null : Number(target.getAttribute("data-line")));
  };

  return (
    // `min-h-0` so the pane can shrink when the feature strip above it expands, instead of
    // pushing itself out of the column.
    <div className="diagram-pane relative flex-1 min-w-0 min-h-0 bg-base-100">
      {/* touch-none hands drag/pinch to svg-pan-zoom instead of the browser panning the page. */}
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden touch-none"
        onPointerDown={(e) => {
          // svg-pan-zoom preventDefaults `mousedown`, which is where the browser would have
          // blurred the editor.
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          pressedAt.current = e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
        }}
        onPointerUp={handlePointerUp}
      >
        <svg ref={svgRef} className="diagram" width="100%" height="100%">
          <g ref={viewportRef}>
            {picture && (
              <Diagram
                nodes={picture.nodes}
                edges={picture.edges}
                types={types}
                typeColors={config.typeColors}
                theme={theme}
                activeLine={activeLine}
                linked={attempt.error === null}
              />
            )}
          </g>
        </svg>
      </div>

      {layout?.empty && (
        <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none text-sm opacity-60">
          {layout.placeholder}
        </div>
      )}

      {attempt.error !== null && (
        <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
          <div className="alert alert-error max-w-md whitespace-pre-wrap text-sm pointer-events-auto">
            {attempt.error}
          </div>
        </div>
      )}

      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          className="btn btn-sm btn-circle"
          title="Zoom in"
          onClick={() => panZoomRef.current?.zoomBy(1.2)}
        >
          +
        </button>
        <button
          className="btn btn-sm btn-circle"
          title="Zoom out"
          onClick={() => panZoomRef.current?.zoomBy(0.8)}
        >
          −
        </button>
        <button
          className="btn btn-sm btn-circle"
          aria-label="Fit to screen"
          title="Fit to screen"
          onClick={() => {
            if (panZoomRef.current) fitToPane(panZoomRef.current);
          }}
        >
          {/* Corner brackets rather than a glyph like ⤢ or ⛶: the neighbours can be one character
              because + and − read at any size, while every "fit" glyph is either a hairline
              diagonal or missing from the font. */}
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 9V6a2 2 0 0 1 2-2h3" />
            <path d="M15 4h3a2 2 0 0 1 2 2v3" />
            <path d="M20 15v3a2 2 0 0 1-2 2h-3" />
            <path d="M9 20H6a2 2 0 0 1-2-2v-3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
