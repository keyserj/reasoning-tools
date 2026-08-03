# AGENTS.md

Instructions for every agent working in this repo. See [README.md](./README.md) for what the repo is for.

## Layout

- `ontology-playground/` — the only app. React + Vite + TypeScript: write a markdown-ish syntax, get a rendered mermaid diagram. Published to GitHub Pages.
- `ameliorate-v2/` — design docs (no build, no code) for a "contested causal map" ontology and an app built on it, plus HTML wireframes of that UX.
- `site/` — the published site's root `index.html`; it just redirects into the playground.
- `.github/workflows/deploy.yml` — on pushes to `main` touching `ontology-playground/`, `site/`, or the workflow itself: tests, builds, and assembles `_site/` (playground into a subdirectory, `site/index.html` at root).

## Don't start web servers yourself

When you need a server for testing, first check whether one is already running via playwright; if it isn't, ask the user to run it and give them the command for the directory in question. If the port is dead, say so rather than starting your own server. (This matters mostly for wireframes because `file://` URLs are blocked by playwright, but also it's annoying for the user to have to figure out if you started a server)

- playground: `cd ontology-playground && npm run dev` → `http://localhost:5173/`
- wireframes — serve the wireframe directory itself, not the repo root: `cd ameliorate-v2/wireframe && python3 -m http.server 8777`, then browse `http://localhost:8777/<page>.html`

## ontology-playground

There is no root `package.json`; run everything from `ontology-playground/`. Node version is pinned in `.nvmrc` (24.18.0).

```bash
npm install
npm run dev          # vite dev server
npm run test         # vitest run (parser + mermaid generation)
npm run typecheck    # tsc --noEmit, covers .tsx too
npm run lint         # oxlint
npm run format       # oxfmt in place (format:check to verify)
npm run build        # production build into dist/
```

A single test file or case: `npx vitest run src/ontology/arg-map-truth-and-relevance/parse.test.ts`, `npx vitest run -t "resolves \`$ref\`"`. Snapshots live in `__snapshots__/`; after deliberately changing parser or mermaid output, re-record with `npx vitest run -u` and read the diff rather than trusting it.

Vitest only collects `src/**/*.test.ts` in a `node` environment — there's no DOM test setup, so components are covered by typecheck and manual checks, not tests.

### Architecture

Per keystroke: editor text → `ontology.parse` → the ontology's own model (`doc`, opaque to the shell) → `ontology.toMermaid` (with the doc's `StyleConfig` and `FeatureState`) → mermaid source → `renderMermaid` → SVG injected into `DiagramPane`, wrapped in svg-pan-zoom. `App.tsx` memoizes the two halves separately, so changing a feature or a color re-renders without re-parsing.

- `src/ontology/types.ts` holds the contract. The UI shell (`App.tsx` + `components/`) only ever talks to `Ontology`, `Graph`, `StyleConfig` and `FeatureDef`, never to a concrete ontology. Node and edge `type`s are plain strings, not a fixed union, so each ontology declares its own vocabulary.
- A `doc` is `unknown` to the shell, which only hands it back to the ontology that produced it. `defineOntology<Doc>()` bridges that in one documented cast so no ontology module needs its own.
- Adding an ontology = a new `src/ontology/<id>/` exporting an `Ontology`, plus one line in `src/ontology/registry.ts`. It should need no UI change; if it does, the missing piece belongs in the contract, not in a component.
- Examples are shared by id across ontologies (`src/ontology/examples.ts`); each ontology ships its own writing of the ones it can express under `examples/`, and `examples[0]` is what the app opens on.
- A *feature* is a switchable rendering lens an ontology declares and `components/RenderingStrip.tsx` renders generically; only the ontology's `toMermaid` gives an option meaning. Read feature state through `src/ontology/features.ts`'s accessors, never by indexing — a partial state from an old link has to resolve to defaults.
- Each ontology directory documents itself in two files: `ontology.md` (what the ontology is — structure, example, open questions) and `rendering.md` (how the playground draws it). Keep them separate; the ontology shouldn't be described in terms of one app's rendering. The README links to both and deliberately holds no syntax tables of its own, because a hand-written copy of the legend drifts from `legend.ts`.
- Inside an ontology, syntax stays separate from semantics: `markers.ts` (which leading character produces which type) is the parser's business, while `renderedNodeTypes.ts` is the single source of icons, mermaid shapes, default colors, style-panel labels, and legend rows. Adding a node type should mean editing one table, not five files.
- `renderedNodeTypes` / `renderedEdgeTypes` are named for what they are: the types that can appear as a box or connector in the *diagram*, which need not match the ontology's own vocabulary. `arg-map-truth-and-relevance` renders `supports`/`critiques` — its ontology *edge* types — as nodes, plus a `topic` header that isn't part of the ontology at all. Don't treat these tables as a statement of the ontology's semantics; `ontology.md` is that.
- `src/ontology/mermaidFlowchart.ts` does the actual mermaid emitting; an ontology's `toMermaid.ts` is a wrapper passing its own lookup tables. A node's `text` may contain newlines, which become `<br/>` — that's how an ontology gets a second line (scores, say) into a label without the shared renderer knowing what it means.
- When an ontology's model doesn't fit a plain node-and-edge graph, parse into its own model and flatten in a separate `toGraph.ts` called from `toMermaid`, rather than contorting the parser. Flattening sits on the render side so a feature can vary it, and so a lens sees structured data rather than scores already flattened into label strings. `arg-map-truth-and-relevance/rendering.md` works an example.
- A parsed model holds what the ontology means, not how it was written: no line numbers (only `ParseError` carries one), and a child in the syntax is a child in the model rather than a root-level list keyed by a parent id.
- Colors across ontologies follow the colorblind-safe red/blue axis that `ameliorate-v2/UX-design.md` requires — never a red-green pro/con pair. Icons have to hold the same distinction by *shape* at the ~12px they render at, since color alone can't carry it; that's why the support/critique axis uses ✅/⛔ rather than same-shape 🔵/🔴.
- `src/share/url.ts` — the entire `ShareState` (ontology id + example id + source + style config + feature state) is DEFLATEd and base64url-encoded into the URL hash, written debounced from `App.tsx`. There is no backend and no other persistence (theme is the lone localStorage item). The hash is untrusted input that ends up inside generated mermaid, so it's zod-validated on the way in, and every field carries a `.catch` default so old or partial links degrade to defaults instead of breaking. Keep that property when changing `StyleConfig`.
- `mermaidClient.ts` imports mermaid dynamically (own async chunk, loaded on first render) and initializes it with `securityLevel: "strict"`.
- `vite.config.ts`'s `base` must stay in sync with the directory name the deploy workflow copies the build into — the app is served from a subpath.

App chrome is Tailwind v4 + daisyUI v5 (theme via `data-theme` on `<html>`). Diagram colors come from the document's `StyleConfig` through mermaid `classDef`, not from CSS.

## ameliorate-v2

Docs only. `ontology.md` (structure, score semantics, open questions) and `UX-design.md` (what to show in which state) are outline-style markdown with tab indentation and heavy internal anchor links. `ontology.md`'s "Build a wall" example is written in its own notation — read the syntax legend under **Example → Context** before touching the example.

The docs are the source of truth; the wireframes under `wireframe/` are played around with to evaluate a design. Each `topic-landing-v<N>.html` is self-contained (no dependency beyond `versions.js`) and carries its own `CURRENT_VERSION` and inline "What's new" list, which is written once when that version is cut and not edited afterwards. To add a version: copy the newest wireframe to the next number, update its version and "What's new", and append one entry to `versions.js`.

## Conventions

- Every fact lives in one place. A doc owns the *decision*: what was chosen, what the alternatives were, what's still open. A comment owns what someone editing that line can't infer from it, and points at the doc instead of restating it (`see ./rendering.md`). A comment longer than ~3 lines that names no identifier in the code around it is likely prose that belongs in the doc.
- Commits: `type(scope): lowercase summary` (e.g. `chore(mermaid): …`, `touchup(plgr): …`). Work on a branch and PR into `main`.
- Before finishing playground work, run typecheck, test, lint, and `format:check` — CI runs the tests and build, and unformatted code shows up as noise in diffs.
