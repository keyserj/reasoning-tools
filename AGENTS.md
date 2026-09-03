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
- **Write the fact as a plain declarative** — subject, verb, constraint. A sentence that has to be read twice to be parsed fails however short it is, and an inverted clause or a figure of speech is usually what costs that second read: `svg-pan-zoom swallows the mousedown that would move focus, so the blur is done by hand` beats `a caret still blinking there says otherwise`.
- **Keep it present-tense — a comment is not a change log.** Even a real *why* goes in the commit body if it's a why-it-*changed*: "tried X first and backed it out", "this used to hold the selects". Only the reason the code is what it stands as today survives the next edit. A warning about how something behaves now is not history and is worth keeping (`daisyUI v5 spells this tabs-border; tabs-bordered is v4's name and is inert`).
- **A doc describes the thing, not the conversation that produced it.** Phrases like "as you suggested" or "we decided" name a discussion the reader wasn't in; attribution belongs in the commit body.
- **Name a rejected alternative only when a reader would reach for it.** "X rather than Y" is the strongest shape a comment has when Y is the obvious thing to try (`filter` rather than a heavier border, because a node's fill and stroke arrive as an inline `!important`) — but when Y is only the draft that came before, it is the change log again wearing present tense. State what is, with no foil.
- **Do comment an accepted compromise**, at the site of the awkwardness rather than only in a doc: what's awkward, why it was accepted, what the refactor would be.
- **Every fact lives in one place.** A doc owns the *decision*: what was chosen, what the alternatives were, what's still open. A comment owns what someone editing that line can't infer from it, and points at the doc instead of restating it (e.g. `see ./rendering.md`). This file is not exempt: a file's own header comment owns the reasoning behind that file, so don't re-narrate it here.
- **Never hard-wrap markdown** — one unbroken line per paragraph and per bullet, however long. Editors wrap; hard wraps only make diffs reflow lines that didn't change.

### Vocabulary

- **The source ontology owns its words; the playground owns the cross-ontology ones.** Kialo has theses, pros and cons, links and votes; IBIS has issues and positions — use those, and don't coin anything that could pass for them, since a reader takes it for the source's and goes hunting for a concept that isn't there. A word neither side has should be plainly generic, like `ClaimUsage`. Where the playground does the naming its word wins, so one document stays comparable across lenses: `Scores`, the `%perspectives` slots, notes. When both own a concept, split by role — the playground's word for the value it renders, the source's for the act: Kialo renders `Scores: [alice, bob]` and still says "nobody voted".

### Color

- **Colors follow the colorblind-safe red/blue axis** `ameliorate-v2/UX-design.md` requires, never a red-green pro/con pair — and an icon has to carry the same distinction by *shape* at the ~12px it renders at, which is why support/critique is ✅/⛔ rather than same-shape 🔵/🔴.
- **Measure a color rather than eyeballing it**: paint the computed value onto a 1px canvas and compare *sRGB code values*, since `getComputedStyle` returns `oklch`/`oklab` and will silently poison a contrast calculation.

### CSS

App chrome is Tailwind v4 + daisyUI v5 (theme via `data-theme` on `<html>`). `index.css` owns what is true app-wide and documents its numbers at the rule, so read it there rather than re-solving any of it per component.

- **Write CSS at all only when a `className` can't express the rule.** A rule that earns its own file sits beside its component (`ontology/highlight.css`, `components/EditorPane.css`) and is `@import`ed from `index.css` rather than from a `.tsx`, so it stays in Tailwind's build graph.
- **Wrap component-scoped CSS in `@layer components`** so utilities can override it. Anything that must outrank daisyUI stays unlayered in `index.css`, since `components` sorts before the `utilities` layer daisyUI nests inside.
- **Reach for the shared vocabulary before inventing one**: band titles take `section-header`, selectables take `option`/`option-selected`, and small controls take content-derived borders (`border-base-content/20`) rather than `border-base-300`, which is a surface color too weak for a 1px line on a pill.

### Workflow

- Commits: `type(scope): lowercase summary` (e.g. `chore(mermaid): …`, `touchup(plgr): …`). Work on a branch and PR into `main`.
- Before finishing playground work, run typecheck, test, lint, and `format:check`.

## Layout

- `ontology-playground/` — the only app. React + Vite + TypeScript: write a markdown-ish syntax, get a rendered mermaid diagram. Published to GitHub Pages.
- `ameliorate-v2/` — design docs for a "contested causal map" ontology and an app built on it, plus HTML wireframes of that UX.
- `site/` — the published site's root `index.html`; it just redirects into the playground.
- `.github/workflows/deploy.yml` — on pushes to `main` touching `ontology-playground/`, `site/`, or the workflow itself: tests, builds, and assembles `_site/` (playground into a subdirectory, `site/index.html` at root).
- `.github/workflows/ameliorate-v2-scripts.yml` — on pushes to `main` touching `ameliorate-v2/scripts/` or `examples/`: typecheck, test, lint, format:check. Nothing under those directories is deployed, which is why it isn't part of the deploy. Nothing runs on a PR, in either package.

## Don't start web servers yourself

When you need a server for testing, first check whether one is already running via playwright; if it isn't, ask the user to run it and give them the command for the directory in question. If the port is dead, say so rather than starting your own server. (Playwright blocks `file://`, so the wireframes need one either way, and a server you started is one the user has to go hunting for later.)

- playground: `cd ontology-playground && npm run dev` → `http://localhost:5173/`
- wireframes — serve the wireframe directory itself, not the repo root: `cd ameliorate-v2/wireframe && python3 -m http.server 8777`, then browse `http://localhost:8777/<page>.html`

## ontology-playground

There is no root `package.json`; run everything from `ontology-playground/`, whose [README](./ontology-playground/README.md) lists the scripts. Node version is pinned in `.nvmrc` (24.18.0).

A single test file or case: `npx vitest run src/ontology/arg-map-truth-and-relevance/parse.test.ts`, `npx vitest run -t "resolves \`$ref\`"`. Snapshots live in `__snapshots__/`; after deliberately changing parser or mermaid output, re-record with `npx vitest run -u` and read the diff rather than trusting it.

Vitest only collects `src/**/*.test.ts` in a `node` environment — there's no DOM test setup, so components are covered by typecheck and manual checks, not tests.

### Architecture

Per keystroke: editor text → `ontology.parse` → the ontology's own model → `ontology.toMermaid` → mermaid source plus a source map → SVG injected into `DiagramPane`. Start at `src/ontology/types.ts`, which carries the whole shell↔ontology contract, and [`src/ontology/pipeline.md`](./ontology-playground/src/ontology/pipeline.md), which owns the division of labor between an ontology's four files; each other file's header comment owns the reasoning behind that file, so read it there.

Three invariants span files, so no one file owns them:

- **Adding an ontology is a new `src/ontology/<id>/` plus one line in `registry.ts`, with no UI change.** If it seems to need one, the missing piece belongs in the contract, not in a component. The order that work goes in is [.claude/skills/add-ontology/SKILL.md](./.claude/skills/add-ontology/SKILL.md).
- **A type carries one color, decided once in the document's `StyleConfig`**, and everything showing that type reads it from there: the diagram's `classDef`, the legend, and the editor. Restyling a type in the **Style** dialog has to move all three together.
- **A drawn element carries the source lines it was written on**, which is what links the caret's line to its box and back. An ontology that doesn't fill `sourceLines` loses that silently — `pipeline.md` has the rule and `registry.test.ts` the backstop.

## ameliorate-v2

`ontology.md` (structure, score semantics, open questions) and `UX-design.md` (what to show in which state) are outline-style markdown with heavy internal anchor links. The "Build a wall" example lives in `examples/build-a-wall.txt` and is written in its own notation — read the syntax legend under `ontology.md`'s **Example → Context** before touching it.

The docs are the source of truth; the wireframes under `wireframe/` are played around with to evaluate a design. Each `topic-landing-v<N>.html` depends on `versions.js` and `prototype-bar.js` (the version switcher + info popover chrome), and from v8 on the vendored `wireframe/vendor/dagre.min.js` + `svg-pan-zoom.min.js` that lay out and pan the structure diagram — all loaded with a plain `<script src>` so a wireframe works over `file://` as well as served, and carries its own `CURRENT_VERSION` and inline "What's new" list, which is written once when that version is cut and not edited afterwards. `versions.js` has to load before `prototype-bar.js`, which is why it sits in the `<head>`. To add a version: copy the newest wireframe to the next number, update its version and "What's new", and append one entry to `versions.js`. The prototype bar is scaffolding rather than design, so unlike the rest of a cut version it isn't frozen - fixing it in `prototype-bar.js` is expected to change every version's chrome at once, including past ones.

A wireframe's numbers are derived rather than hand-written: run `npm run generate` from `ameliorate-v2/`, then paste the regenerated `examples/build-a-wall.views.json` into a wireframe as its `DATA`. [`scripts/generate.ts`](./ameliorate-v2/scripts/generate.ts)'s header owns why that bundle is committed and pasted instead of fetched, so read it there before changing a derivation. Note that a wireframe can always overwrite with its own numbers if specific values make more sense for the demo.
