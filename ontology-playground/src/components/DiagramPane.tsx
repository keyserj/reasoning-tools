import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import svgPanZoom from "svg-pan-zoom";
import type { MermaidOutput, Theme } from "../ontology/types.ts";
import { renderMermaid } from "../mermaidClient.ts";
import {
  ACTIVE_CLASS,
  type LinkedElement,
  lineAtTarget,
  linkDrawnElements,
  unlinkDrawnElements,
} from "./diagramTargets.ts";

interface Props {
  mermaid: MermaidOutput;
  theme: Theme;
  activeLine: number | null;
  onPickLine: (line: number | null) => void;
}

type PanZoom = ReturnType<typeof svgPanZoom>;

/** Pan vs tap: without this, a pan that ended on a box would jump the caret. */
const TAP_SLOP = 6;

export default function DiagramPane({ mermaid, theme, activeLine, onPickLine }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panZoomRef = useRef<PanZoom | null>(null);
  const linkedRef = useRef<LinkedElement[]>([]);
  const pressedAt = useRef<{ x: number; y: number } | null>(null);
  const activeLineRef = useRef(activeLine);
  const drawn = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const markActive = useCallback((line: number | null) => {
    for (const { el, lines } of linkedRef.current) {
      el.classList.toggle(ACTIVE_CLASS, line !== null && lines.includes(line));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const destroyPanZoom = () => {
      if (panZoomRef.current) {
        panZoomRef.current.destroy();
        panZoomRef.current = null;
      }
    };

    // Same picture (an edit inside a comment, say) keeps pan/zoom; the map can still have moved,
    // so retag.
    const key = `${theme}\u0000${mermaid.text}`;
    if (key === drawn.current) {
      const svg = containerRef.current?.querySelector("svg");
      if (svg) {
        linkedRef.current = linkDrawnElements(svg, mermaid.sourceMap);
        markActive(activeLineRef.current);
      }
      return;
    }

    void (async () => {
      const result = await renderMermaid(mermaid.text, theme);
      const container = containerRef.current;
      if (cancelled || !container) return;

      destroyPanZoom();
      linkedRef.current = [];

      if (!result.ok) {
        // Last good picture stays up, but its lines have moved, so it stops being clickable.
        unlinkDrawnElements(container);
        drawn.current = null;
        setError(result.error);
        return;
      }

      setError(null);
      container.innerHTML = result.svg;
      drawn.current = key;
      const svg = container.querySelector("svg");
      if (svg) {
        // Closed-over map, not a later prop: the render is awaited, so a newer map can already
        // describe a different SVG.
        linkedRef.current = linkDrawnElements(svg, mermaid.sourceMap);
        markActive(activeLineRef.current);
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.maxWidth = "none";
        panZoomRef.current = svgPanZoom(svg, {
          zoomEnabled: true,
          controlIconsEnabled: false,
          fit: true,
          center: true,
          minZoom: 0.2,
          maxZoom: 20,
          dblClickZoomEnabled: false,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mermaid, theme, markActive]);

  // Don't rebuild the SVG on a caret move: that would throw away pan/zoom.
  useEffect(() => {
    activeLineRef.current = activeLine;
    markActive(activeLine);
  }, [activeLine, markActive]);

  // svg-pan-zoom measures the SVG once at init and caches it, so without this every later
  // `fit()`/`reset()` would scale to the pane's size at render time rather than its size now.
  // Re-measuring leaves the current pan/zoom alone; it only refreshes what "fit" means.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      // A zero-size measurement (hidden pane) would leave a garbage scale cached.
      if (container.clientWidth === 0 || container.clientHeight === 0) return;
      panZoomRef.current?.resize();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      panZoomRef.current?.destroy();
      panZoomRef.current = null;
    },
    [],
  );

  // Pointer events: svg-pan-zoom preventDefaults `touchstart`, so a phone never fires a click.
  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const pressed = pressedAt.current;
    pressedAt.current = null;
    if (pressed === null || error !== null) return;
    if (Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) > TAP_SLOP) return;
    onPickLine(lineAtTarget(e.target, linkedRef.current));
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
      />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
          <div className="alert alert-error max-w-md whitespace-pre-wrap text-sm pointer-events-auto">
            {error}
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
            panZoomRef.current?.fit();
            panZoomRef.current?.center();
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
