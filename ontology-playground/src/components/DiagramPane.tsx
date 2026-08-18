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
  /** 1-based line being pointed at; every element it drew is marked */
  activeLine: number | null;
  /** what the click landed on, or `null` for a click on nothing the document drew */
  onPickLine: (line: number | null) => void;
}

type PanZoom = ReturnType<typeof svgPanZoom>;

/**
 * How far the pointer may travel between press and release and still count as a tap. The diagram
 * pans under the same press, so without this every pan that ended on a box would jump the
 * editor's caret. Generous enough for a finger, which never lands perfectly still.
 */
const TAP_SLOP = 6;

export default function DiagramPane({ mermaid, theme, activeLine, onPickLine }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panZoomRef = useRef<PanZoom | null>(null);
  // The elements of the SVG *currently* on screen. Held rather than re-queried because the
  // marking has to survive a caret move, which re-renders nothing.
  const linkedRef = useRef<LinkedElement[]>([]);
  const pressedAt = useRef<{ x: number; y: number } | null>(null);
  // Read by the render effect, which must not re-run when the caret moves.
  const activeLineRef = useRef(activeLine);
  // What is on screen: the mermaid the SVG was drawn from, and the theme it was drawn in.
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

    // An edit that leaves the picture alone — inside a comment, say — should leave the pan and
    // zoom you were reading it at alone too. The map can still have moved under it, so the
    // tagging is redone either way.
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
        // The last good picture stays up, but it is no longer this document's: everything it
        // draws answers to lines that have moved, so it stops offering itself to be clicked.
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
        // Against `mermaid.sourceMap` rather than a prop read later: the render is awaited, so a
        // newer map can already have arrived, and it describes an SVG that isn't on screen yet.
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

  // Marking is not a re-render: the caret moves far more often than the document changes, and
  // re-emitting the SVG for it would throw away the pan and zoom you were reading it at.
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

  // Which line a tap landed on. Judged here rather than in the shell's own listener because this
  // pane owns the gesture: the same press pans, so a tap has to be told from a drag.
  //
  // Pointer events rather than clicks, because on a touch device there is no click to hear:
  // svg-pan-zoom takes `touchstart` and calls `preventDefault()` on it, which is what would
  // otherwise have produced the compatibility mouse events.
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
          // Left button or a finger; a right-click opens a menu rather than pointing at anything.
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
