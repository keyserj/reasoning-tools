# AGENTS.md

Instructions for every agent working in this repo. See [README.md](./README.md) for what the repo is for.

## Conventions

**Take this as current convention, not law.** The repo is largely vibe-coded and much of the rationale here was written alongside the code without audit, so challenge anything that looks wrong rather than building around it.

### Comments and docs

- **Comment only non-obvious constraints and *why* decisions, never *what* the code does.** The code already says what it does; a comment that restates it earns nothing and goes stale on the next edit.

  ```ts
  // ✅ mermaid's classDef splits its style list on commas, so a derived color has to reach it as hex
  const fill = toHex(deriveFill(color, theme));

  // ❌ derive the fill from the configured color and convert it to hex
  const fill = toHex(deriveFill(color, theme));
  ```

- **Default to fewer and shorter comments.** Take the lowest rung that works: nothing, 1-2 sentences where explanation is genuinely needed, a paragraph only when the information is critical. At 2+ paragraphs consider a separate doc, not a comment. This applies to prose in docs too, including this one.
- **Keep it present-tense — a comment is not a change log.** Even a real *why* goes in the commit body if it's a why-it-*changed*: "tried X first and backed it out", "this used to hold the selects". Only the reason the code is what it stands as today survives the next edit. A warning about how something behaves now is not history and is worth keeping (`daisyUI v5 spells this tabs-border; tabs-bordered is v4's name and is inert`).
- **Do comment an accepted compromise**, at the site of the awkwardness rather than only in a doc: what's awkward, why it was accepted, what the refactor would be.
- **Every fact lives in one place.** A doc owns the *decision*: what was chosen, what the alternatives were, what's still open. A comment owns what someone editing that line can't infer from it, and points at the doc instead of restating it (e.g. `see ./rendering.md`).
- **Never hard-wrap markdown** — one unbroken line per paragraph and per bullet, however long. Editors wrap; hard wraps only make diffs reflow lines that didn't change.

### Workflow

- Commits: `type(scope): lowercase summary` (e.g. `chore(mermaid): …`, `touchup(plgr): …`). Work on a branch and PR into `main`.
- Before finishing playground work, run typecheck, test, lint, and `format:check`.

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

- **Chrome is organised by three scopes, and a new control belongs to whichever one it acts on**: site (`Toolbar.tsx` — theme, GitHub, `Copy link`), document (`DocumentPicker.tsx` + `EditorPane.tsx` — ontology, example, source, `Syntax`), rendering (`RenderingStrip.tsx` + `DiagramPane.tsx` — features, `Style`, the diagram). The ontology counts as *document* because the language a document is written in is part of its identity; that also keeps its picker in the left pane, where the phone's pane toggle routes it for free.
- **The shell never talks to a concrete ontology**, only to `Ontology`/`RenderGraph`/`StyleConfig`/`FeatureDef` from `src/ontology/types.ts`. Node and edge `type`s are plain strings so each ontology declares its own vocabulary, and `doc` is `unknown` to the shell — `defineOntology<Doc>()` bridges it in one documented cast, so don't add another.
- **Adding an ontology = a new `src/ontology/<id>/` plus one line in `registry.ts`**, with no UI change. If it needs one, the missing piece belongs in the contract, not in a component.
- **The source ontology owns its words; the playground owns the cross-ontology ones.** Kialo has theses, pros and cons, links and votes; IBIS has issues and positions — use those, and don't coin anything that could pass for them, since a reader takes it for the source's and goes hunting for a concept that isn't there. A word neither side has should be plainly generic, like `ClaimUsage`. Where the playground does the naming its word wins, so one document stays comparable across lenses: `Scores`, the `%perspectives` slots, notes. When both own a concept, split by role — the playground's word for the value it renders, the source's for the act: Kialo renders `Scores: [alice, bob]` and still says "nobody voted".
- **Examples are shared by id** (`examples.ts`); each ontology writes the ones it can express under `examples/`, and `examples[0]` is what opens. The picker lists the *shared* table, so an example an ontology can't express greys out rather than vanishing — which reasoning a lens can't reach is half of what comparing ontologies is for.
- **Read feature state through `features.ts`'s accessors, never by indexing**: a partial state from an old link has to resolve to defaults. `Style` is passed to the strip as its own prop rather than faked as a `FeatureDef`, which keeps the features path free of a second meaning.
- **Syntax stays separate from semantics**: `markers.ts` (which leading character makes which type, and the regexes for the rest of a line) is where both readers of a line go — `parse.ts` and `highlight.ts`, the tokenizer behind the editor's colours — while `renderedNodeTypes.ts` is the single source of icons, shapes, default colours, style labels and legend rows, adding a node type should edit one table. Those tables describe the *diagram*, not the ontology: `arg-map-truth-and-relevance` renders its `supports`/`critiques` edge types as nodes, plus a `topic` header the ontology doesn't have. `ontology.md` is the statement of semantics.
- **A parsed model holds what the ontology means, not how it was written or rendered**: no line numbers (only `ParseError` carries one), and a child in the syntax is a child in the model. When rendering needs a plain node-and-edge `RenderGraph`, flatten into it in a separate `toGraph.ts` called from `toMermaid` rather than contorting the parser — flattening on the render side lets a feature vary it, and lets a lens see structured data instead of scores already baked into label strings. Every ontology has a `model.ts` and a `toGraph.ts`.
- **Each ontology directory documents itself** in `ontology.md` (what it is) and `rendering.md` (how the playground draws it). Keep them separate, since an ontology shouldn't be described in terms of one app's rendering. The README links to both and holds no syntax tables, which would drift from `legend.ts`.
- **A type carries one colour, decided once in the document's `StyleConfig`**, and everything that shows that type reads it from there: the diagram's `classDef`, the legend, and the editor, where a highlighted marker is drawn in it (`ontology/highlight.css`'s `.tok-*` rules own how a `HighlightKind` is painted, and no ontology names a colour). Restyling a type in the **Style** dialog has to move all three together. The colour is an *identity* rather than a paint value: `ontology/typeColors.ts` derives the fill, border and text a box is drawn in from it, per theme, which is what keeps any pick legible and lets one document render in either theme. Anything that needs those three has to say which theme it's asking about.
- **Colours follow the colorblind-safe red/blue axis** `ameliorate-v2/UX-design.md` requires — never a red-green pro/con pair. Icons must carry the same distinction by *shape* at the ~12px they render at, which is why support/critique is ✅/⛔ rather than same-shape 🔵/🔴.
- **The URL hash is the only persistence** apart from theme: `share/url.ts` DEFLATEs and base64url-encodes the whole `ShareState`. It is untrusted input that ends up inside generated mermaid, so it's zod-validated with a `.catch` default on every field — old and partial links must degrade to defaults rather than break. Keep that when changing `StyleConfig`.
- Wiring worth knowing: `mermaidFlowchart.ts` does the emitting and an ontology's `toMermaid.ts` only passes its lookup tables; a node's `text` may contain newlines, which become `<br/>` (how an ontology gets scores onto a second line). `mermaidClient.ts` loads mermaid dynamically with `securityLevel: "strict"`. `vite.config.ts`'s `base` must match the directory the deploy workflow copies the build into.

App chrome is Tailwind v4 + daisyUI v5 (theme via `data-theme` on `<html>`). Diagram colors come from the document's `StyleConfig` through mermaid `classDef`, not from CSS — `classDef` splits its style list on commas, so a derived colour has to reach it as hex and can't be a `color-mix()`.

**Surfaces carry three roles, and a region takes one by what it *is*, not by which component draws it**: `base-100` is the **page** (toolbar, pane content, diagram canvas), `base-200` is a **band** (section headers), `base-300` is an **edge** (dividers). Bands are the only raised chrome, so a header needs no border, and a divider belongs only where two regions share a surface. Selection is drawn in value, never hue — hue is reserved for `Copy link` and the diagram itself. Band titles take `section-header`, selectables take `option`/`option-selected`, and small controls take content-derived borders (`border-base-content/20`) rather than `border-base-300`, which is a surface colour too weak for a 1px line on a pill.

`index.css` owns what is true app-wide: both ramps, the shared class vocabulary, the daisyUI workarounds the ramps force — the ghost-button hover, `modal-box`, and the selection alphas — and the document resets, each documenting its own numbers and reasoning at the rule, so don't re-solve any of it per component. Component-scoped CSS sits beside its component (`ontology/highlight.css`, `components/editor/EditorPane.css`), `@import`ed from `index.css` rather than from a `.tsx` so it stays in Tailwind's build graph, and wrapped in `@layer components` so utilities can override it — but anything that must outrank daisyUI (the ghost hover, `modal-box`) stays unlayered in `index.css`, since `components` sorts before the `utilities` layer daisyUI nests inside. Write CSS at all only when a `className` can't express the rule. The dark ramp is matched to Mermaid Live Editor's chrome, since the diagram is Mermaid's own dark theme; re-sample the live site rather than guess if you change it. Measure rather than eyeball: paint the computed colour onto a 1px canvas and compare *sRGB code values*, since `getComputedStyle` returns `oklch`/`oklab` and will silently poison a contrast calculation.

## ameliorate-v2

Docs only. `ontology.md` (structure, score semantics, open questions) and `UX-design.md` (what to show in which state) are outline-style markdown with tab indentation and heavy internal anchor links. `ontology.md`'s "Build a wall" example is written in its own notation — read the syntax legend under **Example → Context** before touching the example.

The docs are the source of truth; the wireframes under `wireframe/` are played around with to evaluate a design. Each `topic-landing-v<N>.html` is self-contained (no dependency beyond `versions.js`) and carries its own `CURRENT_VERSION` and inline "What's new" list, which is written once when that version is cut and not edited afterwards. To add a version: copy the newest wireframe to the next number, update its version and "What's new", and append one entry to `versions.js`.
