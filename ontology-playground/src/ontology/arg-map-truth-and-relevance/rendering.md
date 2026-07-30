# Rendering: argument map (truth and relevance)

How the playground draws [this ontology](./ontology.md) — a separate question from what the ontology _is_, and a smaller one than an ideal app UX (this ontology has no equivalent of ameliorate-v2's `UX-design.md`). Nearly all of it lives in [toGraph.ts](./toGraph.ts), which flattens the parsed model into the shared `Graph`.

## Links are reified into boxes

Every supports/critiques link becomes a node between its endpoints: `source ──▶ [✅ supports 8,2,8] ──▶ target`.

- mermaid can't point an arrow at another arrow, and a `= $some-link-id` block does exactly that
- reifying makes arguing about a link structurally identical to arguing about a claim, which is what this ontology says they are — so every `$ref` resolves to a plain node and no case is special
- it also puts every score in a box, uniformly

Because links become nodes, `renderedNodeTypes.ts` lists `supports` and `critiques` even though the ontology calls them edge types. That's the point of the "rendered" prefix: what can appear as a box is not the same set as what the ontology is made of.

### Questions - Unanswered

- does reification stay readable as a topic grows? It roughly doubles the box count, and the example already renders ~15 link boxes
  - the alternative: draw links as labeled mermaid edges (`-- "supports [8,2,8]" -->`) and give each argued-about link its own _unattached_ mini argument map, rooted at a claim spelling out the implied claim ("wall-reduces supports wall"). That mirrors how the source text already reads
  - against: one concept would have two visual forms, and a reader can't tell which links _could_ be argued about
  - swapping strategies means rewriting `toGraph.ts` and nothing else, which is why the parser produces [model.ts](./model.ts)'s richer model rather than a `Graph` directly

## Scores

Scores render on a second line, in the same `[5,2,8]` form as the source, so a claim reads as its text then its score row. `toGraph.ts` puts a newline in the node's text and the shared renderer turns it into a `<br/>`.

## The topic header

`%description` and `%perspectives` render as one `topic` box. It earns its place: a score row like `[5,2,8]` can't be decoded without knowing the slot order.

Left unconnected it was a graph component of its own, and dagre dropped it in among the claims where it read like part of the argument. It's now anchored to the first root claim by an `anchor` edge, which uses mermaid's invisible `~~~` connector so it draws nothing and only fixes rank.

- direction is load-bearing and easy to get backwards: the default layout is `BT`, where an edge's **target** is ranked above its **source**. So the edge runs `root ~~~ _topic`, not the other way round — verified in the browser, not assumed
- "first root claim" means the first claim in document order that never appears as a link's source. With several top-level claims the header attaches to just one of them

### Questions - Unanswered

- is anchoring to only the first root right when a document has several unrelated top-level claims? The header will sit above one of them rather than above the whole diagram
  - the alternative is mermaid frontmatter (`---\ntitle: "..."\n---`), a true caption outside the graph, which would need `title?: string` on the shared `Graph`. Titles are single-line with no wrapping, so a long `%description` becomes one very wide line
  - note a title would reach mermaid from the URL hash, so it would need newline-stripping and quote-escaping — same threat model as `src/share/url.ts`

## Colors and icons

Colors follow the colorblind-safe red/blue axis that [ameliorate-v2's UX-design.md](../../../../ameliorate-v2/UX-design.md) requires ("needs a colorblind-safe diverging palette, not red-green"), reusing the wireframes' `RB = { neg: "#b2182b", pos: "#2166ac" }`.

- `supports` vs `critiques` is the one pair that _needs_ color to separate it — same shape, same structural role
- claims are warm and pale on purpose: they're the majority of boxes, so a loud fill would bury the link boxes that matter most
- icons split the same way: ✅ / ⛔ for the support/critique axis, unrelated pictograms (💬 📝 📋) for content. The pair must stay distinguishable by _shape_ at the ~12px they render at, since that is what carries the distinction when color can't — a check against a barred circle survives that, same-shape 🔵 / 🔴 wouldn't. The emoji do carry their own green/red, the pairing the fills avoid, but it rides on top of shapes that already differ rather than doing the work
