# markdownish-to-mermaid

A static, backend-free web app (in the spirit of [mermaid.live](https://mermaid.live), but
minimal). Write a markdown-like syntax on the left; a rendered [mermaid](https://mermaid.js.org)
diagram appears on the right. The whole document is stored in the URL hash, so links are
shareable with no server.

The first (and currently only) ontology is **IBIS** argument maps. The app shell is
ontology-agnostic — new converters plug into `src/ontology/registry.ts`.

Live: https://keyserj.github.io/reasoning-tools/

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

Edges point from a child up to the parent it supports, objects to, or answers (argument-map
direction). Full key is in the app under **Key**.

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

Pushing to `main` (touching this folder) runs `.github/workflows/deploy.yml`, which builds and
publishes `dist/` to GitHub Pages. The repo's **Settings → Pages → Source** must be set to
**GitHub Actions** once.

## Tech

React + Vite + TypeScript, Tailwind v4 + daisyUI v5 (app chrome), mermaid (rendering,
lazy-loaded), svg-pan-zoom (pan/zoom), fflate (URL compression), oxlint + oxfmt.
