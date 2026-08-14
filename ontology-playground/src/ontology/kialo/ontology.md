# Kialo

Ontology id: `kialo`. The structure behind [kialo.com](https://www.kialo.com) is a tree of pro and con claims under a thesis, with a crowd voting on each of them. How the playground draws it is kept in [rendering.md](./rendering.md).

This is an existing ontology rather than one being designed here, so this doc records what it is and what the playground implements, not open design questions.

## Structure

- Nodes
  - Question — `?`. What a set of theses are competing answers to. Only at the root, and only in a multi-thesis discussion
  - Thesis — `=`. A claim answering the question, or the root of a question-less discussion
  - Pro / Con — `+` / `-`. A claim supporting or critiquing the claim above it
- Scores, 0–4
  - a thesis is scored on **veracity**: how true it is. Nothing sits above it for it to be relevant to
  - a pro/con is scored on **impact**: [Kialo defines this](https://support.kialo-edu.com/en/hc/about-voting/) as the claim's veracity _and_ its relevance to the parent, together in one number

One claim can be used in more than one spot — `$id`, which is Kialo's _link_. Each usage is scored separately and takes its own stance, so the same claim can be a pro in one place and a con in another, and at most one of its usages may be a thesis. Text, sources and notes are shared across usages; scores and stance are not.

## What one number costs

Compare [the arg-map ontology](../arg-map-truth-and-relevance/ontology.md), which makes the relation between two claims a first-class thing with its own claim (`A supports B`), its own id and its own score. Kialo has the same relation but never materializes it: there is no edge to name, point at, or argue about, and its relevance survives only folded into the child's one number.

The cost is expressive, not cosmetic. "I grant the fact but deny it bears on this" cannot be said. [examples/build-a-wall.txt](./examples/build-a-wall.txt) carries both directions of it: casey holds `easy-climb` true but irrelevant, and `visa-overstay` false but decisive if true, and both land near 0 here for opposite reasons Kialo cannot tell apart. An argument _about_ the relation has nowhere to go either, so `little-harm` — which in arg-map attacks the edge — hangs on the thesis instead.

This is not the same question as arg-map's own open "one belief score, or separate truth and relevance?". Both answers there keep a number per claim _and_ a number per edge, and differ only in how the two are labelled.

## Questions, and what they say about a tool

A question is core to [IBIS](../ibis/ontology.md): a topic starts with one, and a new one can be raised anywhere in the tree, which is what makes IBIS a model of a _discussion_ rather than of an argument. Kialo allows a question only at the root, and only optionally — a single-thesis discussion has none at all. Arg-map has no question of any kind.

**Deliberate liberty:** Kialo permits one root question per discussion; this parser allows several, so [examples/session-storage.txt](./examples/session-storage.txt) can cover the same ground as the IBIS and arg-map versions of it.

## Example

[examples/session-storage.txt](./examples/session-storage.txt) is the syntax teacher; [examples/build-a-wall.txt](./examples/build-a-wall.txt) is adapted from arg-map's so the two can be read side by side.

- Syntax legend:
  - indentation nests a line under the line above
  - `?`: a discussion question, at column 0 only. Its children are theses
  - `=`: a thesis. Its children are arguments
  - `+` / `-`: a claim supporting or critiquing the claim above
  - `@ [url] [label]`: a source for the claim above. The label is optional
  - `~`: a note on the claim above — an authoring aside, never voted on. With no claim above it, it annotates the document instead
  - `/`: a meta comment about the example - not shown in the diagram
  - `%[key]: [value]`: document-level property (must be at column 0)
    - `%description`: what the discussion is about
    - `%perspectives: [person1, person2]`: whose scores appear, and in what order the slots are read
  - `[X,Y]`: scores, 0-4, one slot per person in the `%perspectives` order
    - on a `=` line: veracity
    - on a `+` / `-` line: that usage's impact
    - `-` in a slot: that person didn't vote
    - no brackets at all: nobody voted
  - `&some-id`: sets an id on the claim whose line it appears on
  - `$some-id`: reuses that claim here, which is Kialo's _link_. A linked claim keeps one text, one set of sources and one set of children everywhere, but takes its own stance and its own scores in each usage

## Structure Details

### Sources

Kialo attaches sources to the claim rather than to the thesis or pro/con that uses it, so they follow it everywhere it is linked, as edits to a linked claim do. This ontology does the same. The playground shows only that evidence exists — see [rendering.md](./rendering.md).

### Notes

Kialo has no note in the map; it has per-claim comment threads beside it. `~` is the playground's own authoring affordance, kept because both other ontologies have it. It attaches to a claim, or to the document when nothing is above it.
