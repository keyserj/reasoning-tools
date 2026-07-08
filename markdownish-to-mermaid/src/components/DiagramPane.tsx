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

  useEffect(
    () => () => {
      panZoomRef.current?.destroy();
      panZoomRef.current = null;
    },
    [],
  );

  return (
    <div className="relative flex-1 min-w-0 bg-base-100">
      <div ref={containerRef} className="absolute inset-0 overflow-hidden" />

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
          title="Fit to screen"
          onClick={() => {
            panZoomRef.current?.fit();
            panZoomRef.current?.center();
          }}
        >
          ⤢
        </button>
        <button
          className="btn btn-sm btn-circle"
          title="Reset zoom"
          onClick={() => panZoomRef.current?.reset()}
        >
          ⟲
        </button>
      </div>
    </div>
  );
}
