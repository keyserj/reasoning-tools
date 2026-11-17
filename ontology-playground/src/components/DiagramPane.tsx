import {
  type PointerEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import svgPanZoom from "svg-pan-zoom";
import type { RenderGraph, StyleConfig, Theme, TypeTables } from "../ontology/types.ts";
import { type DiagramLayout, layoutDiagram } from "../diagram/layout.ts";
import { measureLabels } from "../diagram/measure.ts";
import {
  elementsInBox,
  hiddenItems,
  restoreItem,
  selectableDiagram,
  selectionBox,
  type SelectionBox,
} from "../diagram/selection.ts";
import Diagram from "./Diagram.tsx";

interface Props {
  graph: RenderGraph;
  source: string;
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

interface Press {
  x: number;
  y: number;
  pointerId: number;
  moved: boolean;
  selectionKey: string | null;
  line: number | null;
}

export default function DiagramPane({
  graph,
  source,
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
  const pressedAt = useRef<Press | null>(null);
  const boxDrag = useRef<(Press & { additive: boolean }) | null>(null);
  const [box, setBox] = useState<SelectionBox | null>(null);
  const [selected, setSelected] = useState(new Set<string>());
  const [hidden, setHidden] = useState(new Set<string>());
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const hiddenPanelRef = useRef<HTMLDivElement>(null);
  const hiddenPanelId = useId();
  /** The picture key svg-pan-zoom was last fitted to. */
  const fittedKey = useRef<string | null>(null);

  // Parsers can reassign automatic IDs after edits, so hidden items belong to one source revision.
  useLayoutEffect(() => {
    setSelected(new Set());
    setHidden(new Set());
    setHiddenOpen(false);
  }, [source]);

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

  const selectable = useMemo(
    () => selectableDiagram(picture?.nodes ?? [], picture?.edges ?? []),
    [picture],
  );
  const hiddenKeys = useMemo(() => hiddenItems(selectable.items, hidden), [selectable, hidden]);
  const hiddenList = selectable.items.filter((item) => hiddenKeys.has(item.key));
  const selectedCount = selectable.items.filter(
    (item) => selected.has(item.key) && !hiddenKeys.has(item.key),
  ).length;
  const visibleNodes = useMemo(
    () => selectable.nodes.filter((node) => !hiddenKeys.has(node.selectionKey)),
    [selectable, hiddenKeys],
  );
  const visibleEdges = useMemo(
    () => selectable.edges.filter((edge) => !hiddenKeys.has(edge.selectionKey)),
    [selectable, hiddenKeys],
  );

  useEffect(() => {
    const keys = new Set(selectable.items.map((item) => item.key));
    setSelected((previous) => new Set([...previous].filter((key) => keys.has(key))));
    setHidden((previous) => new Set([...previous].filter((key) => keys.has(key))));
  }, [selectable]);

  const pictureRef = useRef(picture);

  // Refit when the picture's structure changes, and only then: a recolor, the theme or a caret
  // move keeps the reader's pan and zoom. svg-pan-zoom folds the viewBox into its own transform
  // and deletes the attribute, so it's written here on every refit rather than left to React,
  // which wouldn't restore a value it thinks is unchanged.
  const fit = useCallback(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    const viewport = viewportRef.current;
    const current = pictureRef.current;
    if (!container || !svg || !viewport) return;
    const key = current?.key ?? null;
    if (key === fittedKey.current) return;
    // svg-pan-zoom scales by the pane's size, and at zero it builds a matrix it can't invert and
    // throws. A pane squeezed shut (a tall feature panel in a short window) waits for the resize
    // that opens it back up.
    if (current && (container.clientWidth === 0 || container.clientHeight === 0)) return;
    panZoomRef.current?.destroy();
    panZoomRef.current = null;
    fittedKey.current = key;
    if (!current) return;

    svg.setAttribute("viewBox", `0 0 ${current.width} ${current.height}`);
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
  }, []);

  useLayoutEffect(() => {
    pictureRef.current = picture;
    fit();
  }, [picture, fit]);

  // svg-pan-zoom measures the SVG once at init and caches it, so without this every later fit
  // would scale to the pane's size at render time rather than its size now.
  // Re-measuring leaves the current pan/zoom alone; it only refreshes what "fit" means, or fits a
  // picture that arrived while the pane had no size.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      // A zero-size measurement (hidden pane) would leave a garbage scale cached.
      if (container.clientWidth === 0 || container.clientHeight === 0) return;
      fit();
      const panZoom = panZoomRef.current;
      if (!panZoom) return;
      panZoom.resize();
      syncZoomLimits(panZoom);
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [fit]);

  // Forgetting the fit too, so a remount (StrictMode's, in development) sets svg-pan-zoom up again.
  useEffect(
    () => () => {
      panZoomRef.current?.destroy();
      panZoomRef.current = null;
      fittedKey.current = null;
    },
    [],
  );

  const cancelDrag = useCallback(() => {
    const drag = boxDrag.current;
    boxDrag.current = null;
    pressedAt.current = null;
    setBox(null);
    if (drag) {
      if (containerRef.current?.hasPointerCapture(drag.pointerId)) {
        containerRef.current.releasePointerCapture(drag.pointerId);
      }
      panZoomRef.current?.enablePan();
      panZoomRef.current?.enableZoom();
    }
  }, []);

  useEffect(cancelDrag, [source, selectable, cancelDrag]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      cancelDrag();
      setSelected(new Set());
      setHiddenOpen(false);
    };
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && !hiddenPanelRef.current?.contains(event.target)) {
        setHiddenOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("blur", cancelDrag);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("blur", cancelDrag);
    };
  }, [cancelDrag]);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || e.button !== 0 || attempt.error !== null) return;
    // svg-pan-zoom prevents the mousedown that would normally blur the editor.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const target = e.target instanceof Element ? e.target.closest("[data-selection-key]") : null;
    const line = target?.getAttribute("data-line");
    const press: Press = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      moved: false,
      selectionKey: target?.getAttribute("data-selection-key") ?? null,
      line: line == null ? null : Number(line),
    };
    pressedAt.current = press;
    if (!e.shiftKey) return;
    e.preventDefault();
    boxDrag.current = { ...press, additive: e.ctrlKey || e.metaKey };
    panZoomRef.current?.disablePan();
    panZoomRef.current?.disableZoom();
    e.currentTarget.setPointerCapture(e.pointerId);
    setBox(selectionBox(press, press));
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const pressed = pressedAt.current;
    if (!pressed || pressed.pointerId !== e.pointerId) return;
    if (Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) > TAP_SLOP) pressed.moved = true;
    if (!boxDrag.current) return;
    boxDrag.current.moved = pressed.moved;
    setBox(selectionBox(pressed, { x: e.clientX, y: e.clientY }));
  };

  // Pointer events: svg-pan-zoom preventDefaults `touchstart`, so a phone never fires a click.
  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const pressed = pressedAt.current;
    if (!pressed || pressed.pointerId !== e.pointerId) return;
    const drag = boxDrag.current;
    const moved =
      pressed.moved || Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) > TAP_SLOP;
    if (drag) {
      if (attempt.error === null && viewportRef.current) {
        const hits = moved
          ? elementsInBox(viewportRef.current, selectionBox(drag, { x: e.clientX, y: e.clientY }))
          : new Set(drag.selectionKey ? [drag.selectionKey] : []);
        setSelected((previous) => (drag.additive ? new Set([...previous, ...hits]) : hits));
        onPickLine(null);
      }
      cancelDrag();
      return;
    }
    pressedAt.current = null;
    // A picture kept up past a layout error is out of date: its lines no longer point anywhere.
    if (attempt.error !== null || moved) return;
    const target = e.target instanceof Element ? e.target.closest("[data-selection-key]") : null;
    const key = target?.getAttribute("data-selection-key") ?? null;
    if (key !== pressed.selectionKey) return;
    if (e.ctrlKey || e.metaKey) {
      if (key) setSelected((previous) => new Set([...previous, key]));
      onPickLine(null);
    } else {
      setSelected(new Set(key ? [key] : []));
      onPickLine(pressed.line);
    }
  };

  return (
    // `min-h-0` so the pane can shrink when the feature strip above it expands, instead of
    // pushing itself out of the column.
    <div className="diagram-pane relative flex-1 min-w-0 min-h-0 bg-base-100">
      {/* touch-none hands drag/pinch to svg-pan-zoom instead of the browser panning the page. */}
      <div
        ref={containerRef}
        className={`absolute inset-0 overflow-hidden touch-none select-none ${box ? "cursor-crosshair" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={cancelDrag}
        onLostPointerCapture={cancelDrag}
        onPointerLeave={() => {
          if (!boxDrag.current) pressedAt.current = null;
        }}
        onMouseDownCapture={(e) => {
          if (boxDrag.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <svg ref={svgRef} className="diagram" width="100%" height="100%">
          <g ref={viewportRef}>
            {picture && (
              <Diagram
                nodes={visibleNodes}
                edges={visibleEdges}
                types={types}
                typeColors={config.typeColors}
                theme={theme}
                activeLine={activeLine}
                selected={selected}
                linked={attempt.error === null}
              />
            )}
          </g>
        </svg>
        {box && (
          <div
            className="absolute border border-primary bg-primary/15 pointer-events-none"
            style={{
              left: box.left - (containerRef.current?.getBoundingClientRect().left ?? 0),
              top: box.top - (containerRef.current?.getBoundingClientRect().top ?? 0),
              width: box.right - box.left,
              height: box.bottom - box.top,
            }}
          />
        )}
      </div>

      {selectedCount > 0 && (
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 rounded-lg border border-base-content/20 bg-base-100 p-2 shadow-sm max-w-[calc(100%-1.5rem)]">
          <span className="text-xs" role="status">
            {selectedCount} selected
          </span>
          <button
            className="btn btn-sm"
            disabled={attempt.error !== null}
            onClick={() => {
              setHidden((previous) => new Set([...previous, ...selected]));
              setSelected(new Set());
              onPickLine(null);
              setHiddenOpen(false);
            }}
          >
            Hide these
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setSelected(new Set());
              onPickLine(null);
            }}
          >
            Clear
          </button>
        </div>
      )}

      {picture && visibleNodes.length === 0 && hiddenList.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none text-sm opacity-60">
          All nodes are hidden. Use the hidden-items list to show them again.
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex flex-col items-start gap-2 max-w-[calc(100%-4.5rem)]">
        {hiddenList.length > 0 && (
          <div ref={hiddenPanelRef} className="relative max-w-full">
            <button
              className="btn btn-sm rounded-full border-base-content/20 shadow-sm"
              aria-expanded={hiddenOpen}
              aria-controls={hiddenPanelId}
              onClick={() => setHiddenOpen((open) => !open)}
            >
              {hiddenList.length} nodes/edges hidden
            </button>
            {hiddenOpen && (
              <section
                id={hiddenPanelId}
                aria-label="Hidden nodes and edges"
                className="absolute bottom-full left-0 mb-2 w-80 max-w-[calc(100vw-5rem)] rounded-lg border border-base-content/20 bg-base-100 shadow-lg"
              >
                <div className="flex items-center justify-between gap-2 border-b border-base-content/20 p-3">
                  <h2 className="text-sm font-semibold">Hidden nodes and edges</h2>
                  <button
                    className="btn btn-xs btn-ghost"
                    onClick={() => {
                      setHidden(new Set());
                      setHiddenOpen(false);
                    }}
                  >
                    Show all
                  </button>
                </div>
                <ul className="max-h-[min(50vh,24rem)] overflow-y-auto p-2">
                  {hiddenList.map((item) => (
                    <li key={item.key} className="flex items-start gap-3 p-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs opacity-60 capitalize">{item.kind}</span>
                        <p className="text-sm whitespace-pre-wrap break-words">{item.label}</p>
                      </div>
                      <button
                        className="btn btn-xs shrink-0"
                        aria-label={`Show ${item.kind}: ${item.label}`}
                        title={
                          item.kind === "edge"
                            ? "Show this edge and its endpoints"
                            : "Show this node"
                        }
                        onClick={() => setHidden((previous) => restoreItem(item, previous))}
                      >
                        Show
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
        {picture && (
          <p className="hidden sm:block text-xs bg-base-100/90 rounded px-2 py-1 pointer-events-none">
            Shift-drag to select · Ctrl/Cmd-click to add · Esc to clear
          </p>
        )}
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
