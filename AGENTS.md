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

A single test file or case: `npx vitest run src/ontology/ibis/parse.test.ts`, `npx vitest run -t "resolves \`$ref\`"`. Snapshots live in `__snapshots__/`; after deliberately changing parser or mermaid output, re-record with `npx vitest run -u` and read the diff rather than trusting it.

Vitest only collects `src/**/*.test.ts` in a `node` environment — there's no DOM test setup, so components are covered by typecheck and manual checks, not tests.

### Architecture

Per keystroke: editor text → `ontology.parse` → `Graph` → `ontology.toMermaid` (with the doc's `StyleConfig`) → mermaid source → `renderMermaid` → SVG injected into `DiagramPane`, wrapped in svg-pan-zoom.

- `src/ontology/types.ts` holds the contract. The UI shell (`App.tsx` + `components/`) only ever talks to `Ontology`, `Graph`, and `StyleConfig`, never to a concrete ontology. Node and edge `type`s are plain strings, not a fixed union, so each ontology declares its own vocabulary.
- Adding an ontology = a new `src/ontology/<id>/` exporting an `Ontology`, plus one line in `src/ontology/registry.ts`. It should need no UI change; if it does, the missing piece belongs in the contract, not in a component.
- Inside an ontology, syntax stays separate from semantics: `markers.ts` (which leading character produces which type) is the parser's business, while `nodeTypes.ts` is the single source of icons, mermaid shapes, default colors, style-panel labels, and legend rows. Adding a node type should mean editing one table, not five files.
- `src/share/url.ts` — the entire `DocState` (ontology id + source + style config) is DEFLATEd and base64url-encoded into the URL hash, written debounced from `App.tsx`. There is no backend and no other persistence (theme is the lone localStorage item). The hash is untrusted input that ends up inside generated mermaid, so it's zod-validated on the way in, and every field carries a `.catch` default so old or partial links degrade to defaults instead of breaking. Keep that property when changing `StyleConfig`.
- `mermaidClient.ts` imports mermaid dynamically (own async chunk, loaded on first render) and initializes it with `securityLevel: "strict"`.
- `vite.config.ts`'s `base` must stay in sync with the directory name the deploy workflow copies the build into — the app is served from a subpath.

App chrome is Tailwind v4 + daisyUI v5 (theme via `data-theme` on `<html>`). Diagram colors come from the document's `StyleConfig` through mermaid `classDef`, not from CSS.

## ameliorate-v2

Docs only. `ontology.md` (structure, score semantics, open questions) and `UX-design.md` (what to show in which state) are outline-style markdown with tab indentation and heavy internal anchor links. `ontology.md`'s "Build a wall" example is written in its own notation — read the syntax legend under **Example → Context** before touching the example.

The docs are the source of truth; the wireframes under `wireframe/` are played around with to evaluate a design. Each `topic-landing-v<N>.html` is self-contained (no dependency beyond `versions.js`) and carries its own `CURRENT_VERSION` and inline "What's new" list, which is written once when that version is cut and not edited afterwards. To add a version: copy the newest wireframe to the next number, update its version and "What's new", and append one entry to `versions.js`.

## Conventions

- Commits: `type(scope): lowercase summary` (e.g. `chore(mermaid): …`, `touchup(plgr): …`). Work on a branch and PR into `main`.
- Before finishing playground work, run typecheck, test, lint, and `format:check` — CI runs the tests and build, and unformatted code shows up as noise in diffs.
