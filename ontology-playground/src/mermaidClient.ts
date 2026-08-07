import type { Theme } from "./ontology/types.ts";

// Mermaid is large, so it is dynamically imported: it lands in its own async chunk
// instead of the main bundle, and only loads the first time a diagram is rendered.
type Mermaid = Awaited<typeof import("mermaid")>["default"];

let mermaidPromise: Promise<Mermaid> | null = null;
let currentTheme: Theme | null = null;
let seq = 0;

async function getMermaid(theme: Theme): Promise<Mermaid> {
  mermaidPromise ??= import("mermaid").then((m) => m.default);
  const mermaid = await mermaidPromise;
  if (currentTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      // Mermaid's word for the light theme is "default"; the app has one theme vocabulary and
      // this is the only place that has to know mermaid's.
      theme: theme === "dark" ? "dark" : "default",
      flowchart: { htmlLabels: true, curve: "basis" },
    });
    currentTheme = theme;
  }
  return mermaid;
}

export type RenderResult = { ok: true; svg: string } | { ok: false; error: string };

/** Render a mermaid definition to an SVG string, catching parse/render errors. */
export async function renderMermaid(definition: string, theme: Theme): Promise<RenderResult> {
  try {
    const mermaid = await getMermaid(theme);
    const { svg } = await mermaid.render(`mmd-${++seq}`, definition);
    return { ok: true, svg };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
