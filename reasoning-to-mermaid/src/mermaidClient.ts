export type MermaidTheme = "default" | "dark";

// Mermaid is large, so it is dynamically imported: it lands in its own async chunk
// instead of the main bundle, and only loads the first time a diagram is rendered.
type Mermaid = Awaited<typeof import("mermaid")>["default"];

let mermaidPromise: Promise<Mermaid> | null = null;
let currentTheme: MermaidTheme | null = null;
let seq = 0;

async function getMermaid(theme: MermaidTheme): Promise<Mermaid> {
  mermaidPromise ??= import("mermaid").then((m) => m.default);
  const mermaid = await mermaidPromise;
  if (currentTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme,
      flowchart: { htmlLabels: true, curve: "basis" },
    });
    currentTheme = theme;
  }
  return mermaid;
}

export type RenderResult = { ok: true; svg: string } | { ok: false; error: string };

/** Render a mermaid definition to an SVG string, catching parse/render errors. */
export async function renderMermaid(
  definition: string,
  theme: MermaidTheme,
): Promise<RenderResult> {
  try {
    const mermaid = await getMermaid(theme);
    const { svg } = await mermaid.render(`mmd-${++seq}`, definition);
    return { ok: true, svg };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
