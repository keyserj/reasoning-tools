# Reasoning Ontology Playground

A playground for developing and comparing reasoning ontologies. Can also be used to visualize reasoning via any of the implemented ontologies. Try it out at https://keyserj.github.io/reasoning-tools/ontology-playground/.

People wanting to visualize their reasoning: pick an ontology, write your reasoning in the ontology's markdown-like syntax, see a rendered [mermaid](https://mermaid.js.org) diagram. Everything is stored in the URL so you can easily share what you see.

Ontology designers:

- add your ontology — plug it in at `src/ontology/registry.ts`
- add ontology-specific visualization features you'd like to try (e.g. algorithms for performing score calculations, plus adding calculated scores into generated mermaid nodes)
- take an example written in another ontology and see how it looks in yours

LLMs are pretty great at plugging into this playground, so trying out your ideas is cheap! Feel free to make an issue or pull request to suggest another ontology or improvements to an existing one.

The first ontology is **IBIS** argument maps ([Issue-based information system](https://en.wikipedia.org/wiki/Issue-based_information_system) on Wikipedia).

[TODO] More ontologies — the "see how it looks in yours" bullet above isn't possible until there's a second one.

[TODO] A shared set of examples, so the same reasoning can be viewed through each ontology.

## IBIS syntax

One node per line; indentation nests a line under the line above it.

| Marker | Meaning |
| ------ | ------- |
| `?` | Question / issue |
| `=` | Idea / position (answers its parent question) |
| `+` | Pro (supports its parent) |
| `-` | Con (objects to its parent) |
| `~` | Note (shown, attached to its parent) |
| `/` | Meta-comment (dropped from the diagram) |
| `&id` | Label a node so it can be referenced |
| `$id` | Reference an existing node instead of creating a new one |

Edges point from a child up to the parent it supports, objects to, or answers (argument-map direction). Full key is in the app under **Key**.

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
