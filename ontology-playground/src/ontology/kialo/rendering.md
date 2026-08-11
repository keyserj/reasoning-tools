# Rendering: Kialo

How the playground draws [this ontology](./ontology.md) — a separate question from what the ontology _is_. Nearly all of it lives in [toGraph.ts](./toGraph.ts), which flattens the parsed model into the shared `Graph`.

## One box, two placements

A vote and a stance belong to a _placement_, not to a claim ([ontology.md](./ontology.md)), but a claim placed twice is still one box in the diagram. Kialo's own UI dodges this by showing one location at a time; a whole-tree diagram can't.

So a box speaks for its placement only when it has exactly one, and otherwise stays neutral and lets the connectors speak:

- **exactly one argument** → a `pro` / `con` box carrying that argument's impact, and a plain connector. This is the ordinary claim, and folding is what keeps a Kialo diagram as plain as an IBIS one
- **a thesis** → a plain `claim` box carrying its veracity. There is no stance to show: nothing sits above it
- **placed twice or more** → a plain `claim` box with no votes on it, and every connector takes its placement's stance color, icon and impact

That last case is why there is no `thesis` node type: a thesis and a twice-placed claim are one rendering case, a box that can't carry a single stance, so both are `claim`. It leaves six node types, and makes this palette IBIS's plus a `topic`.

An unfolded connector with no votes is drawn colored but unlabeled — the color still says which stance it is, and mermaid hangs the edge icon off the label, so that goes too.

### Questions - Unanswered

- is the neutral box findable? A reader scanning for red and blue may read amber as "not an argument" rather than "an argument twice over". The connectors say it, but only if you follow them
- three placements of one claim ([session-storage](./examples/session-storage.txt)'s `ops-cost`) is where this gets busiest. It reads at that size; it isn't obvious it would at ten

## Sources

A claim with sources gets a `🔗` appended to its text, and the URL never reaches the diagram. Sources are the one thing a real Kialo discussion has dozens of — the map this ontology was reviewed against carries 64 — so a box each would swamp the argument, and the useful fact at a glance is that evidence exists at all. It's an icon, so it rides on `showIcons` like every other; that's the one icon this ontology adds itself rather than leaving to the shared renderer, which is why `toMermaid` passes `showIcons` down into `toGraph`.

## Votes

Votes render on a second line, in the same `[3,1]` form as the source, so a claim reads as its text then its votes. `toGraph.ts` puts a newline in the node's text and the shared renderer turns it into a `<br/>`.

Kialo itself draws a four-bar impact meter showing the crowd's average, plus a gauge for how many people voted. Per-perspective slots are the playground's shape instead, so the same document can be written in any of the three ontologies and compared slot for slot. The average is derivable from them; which way round to store it isn't a close call.

## The topic header

`%description` and `%perspectives` render as one `topic` box. It earns its place: a vote row like `[3,1]` can't be decoded without knowing the slot order.

Left unconnected it would be a graph component of its own, and dagre drops those in among the claims where they read like part of the argument. Every root — each question, plus any thesis with no question — is anchored to it by an `anchor` edge, which uses mermaid's invisible `~~~` connector so it draws nothing and only fixes rank.

- direction is load-bearing and easy to get backwards: the default layout is `BT`, where an edge's **target** is ranked above its **source**. So the edge runs `root ~~~ _topic`, not the other way round
- every root rather than the first, so a document with two questions gets a header above both instead of above one column. (Arg-map still anchors only its first root, and records that as an open question.)

## Colors and icons

The palette is the other ontologies', so the same topic stays comparable across lenses: `pro` blue and `con` red from ameliorate-v2's colorblind-safe `RB = { neg: "#b2182b", pos: "#2166ac" }`, `claim` amber and `note` yellow on the warm-band split argued in [the arg-map ontology's rendering.md](../arg-map-truth-and-relevance/rendering.md#colors-and-icons), `question` grey, `topic` violet.

- `pro` vs `con` is the pair that _needs_ color, and it needs it in two places at once — the box and the connector. Both read `StyleConfig` through `EdgeTypeDef.colorTypeId`, so restyling "Pro" moves them together
- `question` is grey because a question is a prompt rather than something to take a position on, and because grey is what is left once amber, yellow, red, blue and violet are spoken for
- icons carry the pro/con distinction by silhouette as well as hue: ✅ against ⛔ survives at the ~12px they render at, where same-shape 🔵 / 🔴 wouldn't
