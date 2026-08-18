# Rendering: Kialo

How the playground draws [this ontology](./ontology.md) — a separate question from what the ontology _is_. Nearly all of it lives in [toGraph.ts](./toGraph.ts), which flattens the parsed model into the shared `RenderGraph`.

## A box per usage

A score and a stance belong to one usage of a claim, not to the claim itself ([ontology.md](./ontology.md)), so a usage is what gets a box. Every box is then colored by its own stance and carries its own score, and every connector is plain.

The usage written as `$id` draws as a **copy**: dashed border, no children, and 🔀 on it and on every other box of that claim. Children hang off the claim, so they reach the box that declares it without being suppressed here — a reader who wants them looks at the original. This is what Kialo's own UI does, showing a linked claim inline wherever it is used.

The cost is that the drawn graph is a tree: two branches sharing a claim are matched by eye, by their text and their 🔀, rather than traced along an edge. A later lens that moves stance onto the connectors would restore the shared box, and copies are still expected to be the default.

A `= $id` thesis is no special case — it is a dashed `thesis`, which means it can draw as a childless box under its question while the arguments hang off the `+` or `-` that declared the text. Accepted: treating every `$id` alike is worth more than the exception, and moving the `$` to the other usage is a one-line edit.

`thesis` and `claim` are separate types for naming rather than color — "Claim" is the wrong word in the **Syntax** and **Style** dialogs for the box a `=` line makes — which is why `claim` sits commented out in [renderedNodeTypes.ts](./renderedNodeTypes.ts) rather than deleted, waiting for the lens above.

## Sources

A claim with sources gets a `🔗` appended to its text and the URL never reaches the diagram. Sources are the one thing a real Kialo discussion has dozens of — the map this ontology was reviewed against carries 64 — so a box each would swamp the argument, and the useful fact at a glance is that evidence exists at all. It's an icon, so it rides on `showIcons` like every other; that's the one icon this ontology adds itself rather than leaving to the shared renderer, which is why `toMermaid` passes `showIcons` down into `toGraph`.

## Scores

Scores render on a second line, in the same `[3,1]` form as the source, so a claim reads as its text then its scores. `toGraph.ts` puts a newline in the node's text and the shared renderer turns it into a `<br/>`.

Kialo itself draws a four-bar impact meter showing the crowd's average, plus a gauge for how many people voted. Per-perspective slots are the playground's shape instead, so the same document can be written in any of the three ontologies and compared slot for slot. The average is derivable from them; which way round to store it isn't a close call.

## The topic header

`%description` and `%perspectives` render as one `topic` box. It earns its place: a score row like `[3,1]` can't be decoded without knowing the slot order.

Left unconnected it would be a graph component of its own, and dagre drops those in among the claims where they read like part of the argument. Every root — each question, plus any thesis with no question — is anchored to it by an `anchor` edge, which uses mermaid's invisible `~~~` connector so it draws nothing and only fixes rank.

- direction is load-bearing and easy to get backwards: the default layout is `BT`, where an edge's **target** is ranked above its **source**. So the edge runs `root ~~~ _topic`, not the other way round
- every root rather than the first, so a document with two questions gets a header above both instead of above one column. (Arg-map still anchors only its first root, and records that as an open question.)

## Colors and icons

The palette is the other ontologies', so the same topic stays comparable across lenses: `pro` blue and `con` red from ameliorate-v2's colorblind-safe `RB = { neg: "#b2182b", pos: "#2166ac" }`, `thesis` and `claim` amber and `note` yellow on the warm-band split argued in [the arg-map ontology's rendering.md](../arg-map-truth-and-relevance/rendering.md#colors-and-icons), `question` gray, `topic` violet.

- `pro` vs `con` is the pair that _needs_ color, and a box is the only place it appears: no connector here is colored, since none of them carries a stance
- `question` is gray because a question is a prompt rather than something to take a position on, and because gray is what is left once amber, yellow, red, blue and violet are spoken for
- ✅ / ⛔ carry the same pair by silhouette, for the reason [arg-map's rendering.md](../arg-map-truth-and-relevance/rendering.md#colors-and-icons) gives
