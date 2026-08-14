# Reasoning Ontology Playground

A playground for developing and comparing reasoning ontologies. Can also be used to visualize reasoning via any of the implemented ontologies. Try it out at https://keyserj.github.io/reasoning-tools/ontology-playground/.

People wanting to visualize their reasoning: pick an ontology, write your reasoning in the ontology's markdown-like syntax, see a rendered [mermaid](https://mermaid.js.org) diagram. Everything is stored in the URL so you can easily share what you see.

Ontology designers:

- add your ontology — plug it in at `src/ontology/registry.ts`
- add ontology-specific visualization features you'd like to try (e.g. algorithms for performing score calculations, plus adding calculated scores into generated mermaid nodes)
- take an example written in another ontology and see how it looks in yours

LLMs are pretty great at plugging into this playground, so trying out your ideas is cheap! Feel free to make an issue or pull request to suggest another ontology or improvements to an existing one.

## Ontologies

Each lives in `src/ontology/<id>/` and documents itself: `ontology.md` for what it is, `rendering.md` for how the playground draws it, `ideal-ux-design.md` for what an ideal app might look like (not all ontologies have this one). The full syntax key is also in the app under **Syntax**.

- **[IBIS](./src/ontology/ibis/ontology.md)** ([rendering](./src/ontology/ibis/rendering.md)) — the classic question / idea / pro / con argument map.
- **[Argument map: truth and relevance](./src/ontology/arg-map-truth-and-relevance/ontology.md)** ([rendering](./src/ontology/arg-map-truth-and-relevance/rendering.md)) — claims joined by supports/critiques edges, where each edge is itself a claim that can be scored and argued about.
- **[Kialo](./src/ontology/kialo/ontology.md)** ([rendering](./src/ontology/kialo/rendering.md)) — pro/con claims under a thesis, each voted 0-4 on one number that folds how true it is together with how much it bears on its parent.

## Examples

Each ontology has a set of examples that show off its syntax and features. The playground can switch between ontologies while keeping the same example, so you can see how the same reasoning looks through different lenses.

## Features

Each ontology can declare features that change how the playground renders its model. These just help you play around with different ways of displaying the same underlying model.

## Develop

```bash
npm install
npm run dev        # start the dev server
npm run test       # vitest (parser + mermaid generation)
npm run typecheck  # tsc --noEmit
npm run lint       # oxlint
npm run format     # oxfmt (in place); format:check to verify
npm run build      # production build into dist/
```

## Deploy

Pushing to `main` (touching this folder or `site/`) runs the repo-root `.github/workflows/deploy.yml`, which builds this app into `ontology-playground/` of the published site and copies `site/index.html` to the root as a redirect. The repo's **Settings → Pages → Source** must be set to **GitHub Actions** once.

The app is served from a subpath, so `base` in `vite.config.ts` must stay in sync with the directory name used by the workflow.

## Tech

React + Vite + TypeScript, Tailwind v4 + daisyUI v5 (app chrome), mermaid (rendering, lazy-loaded), svg-pan-zoom (pan/zoom), fflate (URL compression), oxlint + oxfmt.
