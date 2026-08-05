import { useEffect, useRef, useState } from "react";
import svgPanZoom from "svg-pan-zoom";
import { type MermaidTheme, renderMermaid } from "../mermaidClient.ts";

interface Props {
  mermaidText: string;
  theme: MermaidTheme;
}

type PanZoom = ReturnType<typeof svgPanZoom>;

export default function DiagramPane({ mermaidText, theme }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panZoomRef = useRef<PanZoom | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const destroyPanZoom = () => {
      if (panZoomRef.current) {
        panZoomRef.current.destroy();
        panZoomRef.current = null;
      }
    };

    void (async () => {
      const result = await renderMermaid(mermaidText, theme);
      const container = containerRef.current;
      if (cancelled || !container) return;

      destroyPanZoom();

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setError(null);
      container.innerHTML = result.svg;
      const svg = container.querySelector("svg");
      if (svg) {
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
  }, [mermaidText, theme]);

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

  return (
    // `min-h-0` so the pane can shrink when the feature strip above it expands, instead of
    // pushing itself out of the column.
    <div className="relative flex-1 min-w-0 min-h-0 bg-base-100">
      {/* touch-none hands drag/pinch to svg-pan-zoom instead of the browser panning the page. */}
      <div ref={containerRef} className="absolute inset-0 overflow-hidden touch-none" />

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
