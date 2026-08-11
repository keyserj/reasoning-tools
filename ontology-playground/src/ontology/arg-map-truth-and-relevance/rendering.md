# Rendering: argument map (truth and relevance)

How the playground draws [this ontology](./ontology.md) — a separate question from what the ontology _is_, and a smaller one than an ideal app UX (this ontology has no equivalent of ameliorate-v2's `UX-design.md`). Nearly all of it lives in [toGraph.ts](./toGraph.ts), which flattens the parsed model into the shared `Graph`.

## Edge claims: two renderings, switchable

Every supports/critiques edge makes a claim — `A supports B` — which can itself be scored and argued about, and mermaid can't point an arrow at another arrow. Both ways of drawing that are implemented, and the **Edge claims** feature ([features.ts](./features.ts)) switches between them live. Neither is obviously right, which is why this is a switch rather than a decision.

**Spelled out** (the default). An edge is a labeled connector, `source ──"✅ ① supports [8,2,8]"──▶ target`. An edge someone argued about — one that is another edge's endpoint, or that carries a note — _additionally_ gets a **detached** node whose text spells its claim out (`① "wall-reduces" supports "wall"`, each side quoted and truncated to ~40 chars), and the arguments hang off that node instead of off either endpoint.

- boxes appear only where something was actually argued, which is most of the box-count saving
- the source text already reads this way: `= $reduction-supports-wall` is a block about a claim you can state in words
- against: one concept has two visual forms, and a reader can't tell from the diagram which edges _could_ be argued about
- the circled digit is what ties the two forms together — circled rather than `[1]`, which would read as a one-perspective score row. Numbered per document in source order; past ⑳ it falls back to `(21)`
- the node is also anchored to the connector's **target** with the invisible `~~~` connector, which buys rank and nothing else: on build-a-wall ① still lands at the far side of the diagram, because the node's real edges (its arguers) pull it toward their own column
- a detached node is a plain `claim`, not a `supports`/`critiques` box: its text already says which it is, and the connector carries the blue/red. The cost is that those two _node_ styles only bite in the **implied** rendering, while the legend and style panel offer them either way
- a labeled connector always says type + scores; there is no param for saying less

**Implied.** Every edge is reified into a node between its endpoints: `source ──▶ [✅ supports 8,2,8] ──▶ target`.

- arguing about an edge is then structurally identical to arguing about a claim, which is what this ontology says they are — every `$ref` resolves to a plain node and no case is special
- it puts every score in a box, uniformly
- against: roughly double the box count — build-a-wall renders ~12 edge boxes that carry no argument of their own
- reifying costs a connector the ontology doesn't have: `source ──▶ box` and `box ──▶ target` are one relationship drawn as two. The **Edge display** param decides whether to admit that — `distinguish edge→edge` (default) drops the arrowhead on the way in (`---`) and thickens the way out when it lands on another edge box (`==>`); `all edges same` draws both as `-->`
- thick rather than dashed for edge→edge because `note` already owns dashed

Because edges can become nodes, `renderedNodeTypes.ts` lists `supports` and `critiques` even though the ontology calls them edge types; because they can also become connectors, `renderedEdgeTypes.ts` lists them too. That's the point of the "rendered" prefix: what can appear as a box is not the same set as what the ontology is made of, and it depends on the lens.

Labeled connectors are colored, since without color a supports and a critiques connector differ only by the word in the label. The color is the one the document configures for the matching _node_ type: `EdgeTypeDef.colorTypeId` names that type rather than freezing a hex, so a connector and the box it is the other form of are one entry in the **Style** panel and always agree. It takes the same border role a node's outline does, so it lifts in dark mode instead of sinking into the canvas. (How mermaid's `linkStyle` indices are counted is a trap documented where it's handled, in `../mermaidFlowchart.ts`.)

### Questions - Unanswered

- which rendering is best?
- is a marker plus a rank anchor enough to make a detached node findable, or does the tie have to be drawn? A _visible_ dashed arrowless line to both endpoints is the remaining alternative, and it would have to earn its keep against the layout cost below
- does `distinguish edge→edge` still read at a glance once several edges point at edges, or does the thick connector become another kind of noise?

## Scores

Scores render on a second line, in the same `[5,2,8]` form as the source, so a claim reads as its text then its score row. `toGraph.ts` puts a newline in the node's text and the shared renderer turns it into a `<br/>`.

## The topic header

`%description` and `%perspectives` render as one `topic` box. It earns its place: a score row like `[5,2,8]` can't be decoded without knowing the slot order.

Left unconnected it was a graph component of its own, and dagre dropped it in among the claims where it read like part of the argument. It's now anchored to the first root claim by an `anchor` edge, which uses mermaid's invisible `~~~` connector so it draws nothing and only fixes rank.

- direction is load-bearing and easy to get backwards: the default layout is `BT`, where an edge's **target** is ranked above its **source**. So the edge runs `root ~~~ _topic`, not the other way round — verified in the browser, not assumed
- "first root claim" means the first claim in document order that never appears as an edge's source. With several top-level claims the header attaches to just one of them

### Questions - Unanswered

- is anchoring to only the first root right when a document has several unrelated top-level claims? The header will sit above one of them rather than above the whole diagram
  - [session-storage](./examples/session-storage.txt) makes this visible on a default example: its two competing root claims leave the header hanging above `redis` alone
  - the alternative is mermaid frontmatter (`---\ntitle: "..."\n---`), a true caption outside the graph, which would need `title?: string` on the shared `Graph`. Titles are single-line with no wrapping, so a long `%description` becomes one very wide line
  - note a title would reach mermaid from the URL hash, so it would need newline-stripping and quote-escaping — same threat model as `src/share/url.ts`

## Colors and icons

Colors follow the colorblind-safe red/blue axis that [ameliorate-v2's UX-design.md](../../../../ameliorate-v2/UX-design.md) requires ("needs a colorblind-safe diverging palette, not red-green"), reusing the wireframes' `RB = { neg: "#b2182b", pos: "#2166ac" }`. Each type declares one color, and the fill, border and text a box is drawn in are derived from it per theme (`../typeColors.ts`).

- `supports` vs `critiques` is the one pair that _needs_ color to separate it — same shape, same structural role
- icons split the same way: ✅ / ⛔ for the support/critique axis, unrelated pictograms (💬 📝 📋) for content. The pair must stay distinguishable by _shape_ at the ~12px they render at, since that is what carries the distinction when color can't — a check against a barred circle survives that, same-shape 🔵 / 🔴 wouldn't. The emoji do carry their own green/red, the pairing the colors avoid, but it rides on top of shapes that already differ rather than doing the work
