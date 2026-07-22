## What is this?

- UX design for an app that implements the sibling [ontology](./ontology.md)
- Central design question: when a user goes to view a topic, what should be shown?
- Mockups use the ontology's ["Build a wall" example](./ontology.md#Example)
	- mockups are viewed as **danny**: experienced with the app, new to this topic, no scores on it yet

### Notes

- Mockups are text-based so they're easy to diff and iterate on
- Plan: once a few states stabilize, generate a clickable HTML wireframe from this spec to evaluate those; the spec stays the source of truth and the wireframe is regenerated from it, never hand-edited

## High-level UX ideas

- split panes: agenda pane on left, structure pane on right
  - panes stay in sync based on interactions made in the other pane
  - mobile might show just agenda pane, with swipe or button to get to the structure pane
- perspectives selector can switch to any subset of people's scores
  - group scores are averaged but node/edge-label borders are gradient-colored to convey score distribution
    - option to show disagreement scores (standard deviation)

### Agenda pane

- text; owns everything ranked, aggregated, and explained - answers "what should I look at and why?"
- initially: a topic brief, assembled from the ontology's own prioritization signals (node types / relations / scores)
- master-detail stack: the brief is the root; clicking any node (in either pane) pushes a detail view with back/breadcrumb navigation

### Structure pane

- shows generally non-linear visuals (e.g. diagram/table) to help aid comprehension, answers "how does this fit together?"
- keep node visuals light (text, score colors?)
- initially: show top scored nodes with relations between them

#### Questions

- [How to keep diagram from re-layouting too much?](#how-to-keep-diagram-from-re-layouting-too-much)

### Structure summary

- idea: in the agenda pane, generate an AI summary of what's displaying in the structure pane
  - based on nodes/edges and calculated important indicators (e.g. heavy disagreement, high importance to change) per node/edge
  - sentences in the generated summary include references to nodes/edges, which _are clickable_ to highlight them in the structure pane (second click: see this part's details)
  - users can edit the summary to improve it
- what's specifically in the summary:
  - causal map: could just list off what's agreed as important to increase/decrease, what's most debated, what's most uncertain
	- table: 
	- argument tree: 
- this seems like it'd be really good for helping convey how to read the structure pane

#### Questions - unanswered

- should "click to highlight part" + "second click to see part details" behaviors be standard?
  - seems like there might be spots that want "single click to see part details"
  - we can just keep this in mind and consider further when other examples come up

#### Questions - kind of answered

- how to store the generated summarys? so that AI usage is reduced, and users are able to persist an edited summary
  - perhaps cached based on the set of nodes/edges passed-in?
    - customizing the view would trigger many AI regenerations though
    - seems best to actually store the summary based on a "view"
      - where a view is automatically created for canned guiding questions, and can manually be saved as well
      - probably recalculate whenever a view is updated, or at least whenever a view's displayed nodes/edges changes

### Score-based node/edge-label border gradients

- what is it
	- one equal-width band per scorer, sorted by score
- good
  - conveys score distributions
	- consensus renders as a near-solid color, disagreement as a visible sweep
	- the node itself shows the disagreement, so no number needed until selection reveals detail
- notes
	- use hard stops between bands rather than a smooth gradient, to avoid suggesting in-between scores that don't exist
	- needs a colorblind-safe diverging palette, not red-green

### Minimaps

- seems good to have a minimap of some kind (or multiple) to help:
  - build a mental map of the topic, which is a lot easier if there's a visual that stays relatively consistent as nodes are added/removed
  - convey where the current node is, with respect to the topic node
  - convey the size of the topic
- note: these seem really nice, but maybe not required for an initial, bare prototype

#### Questions - unanswered

- are these worth the space they take up, the clutter they add?
  - guess they just need to be tested to feel it out

#### Questions - kind of answered

- where would these minimaps fit?
  - desktop:
    - above diagram, collapsible? also with tabs to switch between kinds of minimaps
  - mobile:
    - swipe down from top? from agenda pane _or_ structure pane
    - swipe left/right to switch between kinds of minimaps

#### Idea 1: Sunburst

- see old Ameliorate sunburst prototype
  - similar to Kialo sunburst, see image https://media.discordapp.net/attachments/1057707973482401899/1436410272473415831/image.png?ex=6a61a990&is=6a605810&hm=8c2be6d265d964582aa618b182d03f6dbe63f01480bc515e3f38c3876424b5ff&=&format=webp&quality=lossless
	- center circle is the topic node
  	- nodes related to the topic node are in circular segments surrounding the center circle
    	- segments colored based on change-importance score?
      	- would be nice if there was a more semantically-distinct coloring, like problem vs solution... but maybe change-importance is good enough
      	- ooh ooh ooh! maybe different "kinds" of sunburst to rotate through:
        	- color like a heatmap where there's activity (discussion? recent/frequent editing?)
        	- color based on disagreement
		- logic gates between layers indicate if edge is "A causes/reduces B", "A has B", with direction
		- nth layer from center is nodes that are n edges away
		- selected / highlighted node should be reflected, maybe via border and/or border margin

#### Idea 2: Minimap of diagram with all concept nodes rendered

## States

### What to show when topic selected (i.e. on entry, when no node / edge selected)

- Agenda pane
  - note: each section here sorts items by score, and "show more/less" if there are any to show/hide
  - note: all scores here should be scaled by distance to the topic node (see question in subsection for how)
	- heading: `Topic [topic node]`, `Guide me through the topic`
	- section: `Basics` (`[topic description]`)
	- section: `Guiding Questions`: top 5 guiding questions (top one is selected, and default is "what's important to consider in this topic?")
		- if structure editing + < 5 items: "add guiding question"
	- section: `Hottest Details`: top 5 of all nodes/edges excluding topic node (normalized scores, see question in subsection for how), with pills to filter
		- "Important to change": top 5 (absolute value) concepts
		- "Controversial": top 5 std-deviation causal concepts/edges
		- "Unknowns": top 5 unanswered clarifying questions
- Structure pane
  - (top 1/4, switch between, collapsible) generated current-view summary, sunburst
  - show view based on selected guiding question (default: top 10 important nodes to the Topic)

#### Questions - unanswered

- what happens when a different guiding question is selected?
  - do we stay with "topic" selected? do we actually view details of the guiding question?
- how to visually organize all these sections?
  - tabs? "Overview" / "Questions" / "Hot" / "Change" / "Disagreement" / "Unknowns"
  - seems like "Topic" should be pinned at the top, but what about its description?
    - seems like description might generally be very high level and that "overview" will usually be more useful...?
      - maybe "Basics" first tab, for e.g. description
- where to put "Structure Overview"? it seems a bit off since it's just describing what's in the structure pane
  - maybe it should fit with the minimaps, above the structure itself?

#### Questions - kind of answered

- should the topic brief convey the scores via more than just sorting the items top-to-bottom?
  - would be nice to show the scores colored with a pie-distribution background
    - might even be good to use the backgrounds or borders to gradient-color it
    - will have to see if these options make the visual too cluttered
- should "Guiding Questions" be above "Hottest Details"?
  - guiding questions generally seems more useful for focusing people's thoughts
  - but if "hottest details" would generally include the top guiding question, maybe that's a better top-level section...?
    - and "hottest details" will always have top things to care about, whereas there may only be one guiding question (default: "what's important to consider in this topic")
      - I guess if the default is "what's important", then "hottest details" will be shown in the structure pane already?
- should the top guiding question be selected by default, with "what's important to consider in this topic?" as a default guiding question?
  - seems good, especially if the "what's important" is a default fallback
- should the structure pane show nodes/edges based always on the selected guiding question's view?
  - if user has customized the view, probably show that
  - if no guiding question selected, and topic is selected: show top 10 important nodes to the topic
  - if no guiding question selected, and part is selected: show part's default guiding question's view?
    - e.g. [negative concept] might have default guiding question "what is the best way of reducing [negative concept]?"
    - e.g. [action] might have default guiding question "what is [action]?" or "what tradeoffs are involved with [action]?"
- how to scale scores by distance to topic node?
  - concept scores: can be multiplied across the causal scores until the path reaches the topic node
  - "guides"/"clarifies" scores: multiply along path until reaching target concept node, then that node multiplies following "concept scores" strategy
  - [TODO: rest of score types]
  - how to do this for disagreement scores?
- how to normalize scores?
  - normalize to 0..1
		- 0..8: divide by 8
		- -8..8: add 8, divide by 16
  - for aggregates (multiple perspectives scored + showing):
    - calculate normalized averages _and_ normalized _standard deviations_ - high deviation should normalize close to 1

#### Questions - answered

- how should "Open questions" rank unscored questions (like `how-tall`) against scored ones?
  - unscored questions can probably just use a default score of 4 (scale 0..8)

### What to show when node / edge selected

- Agenda pane
  - ?
- Structure pane
  - top 10 nodes directly/indirectly related to this?
		- topic node
		- "top" calculated based on importance to topic? or importance to _this_ node? probably topic?

#### Questions - unanswered

- where do different guiding questions (and their views) fit in here?
  - ?
- what to show differently based on node / edge type?
  - Node types
		- Concept (Basic):
		- Concept (Action):
		- Concept (Component):
		- Concept (Category):
		- Concept (Criterion):
		- Claim:
		- Question (Guiding):
		- Question (Clarifying):
		- Source:
	- Edge types: seems like there's much less to show for edges?
  	- causes/reduces/impedes:
  	- has:
  	- categorizes:
  	- correlates with:
  	- supports/critiques:
  	- guides:
  	- clarifies:
  	- mentions:

### "Guide me through the topic"

- one at a time, in some order ("hottest"?), select each node / edge (that has been scored)
- add a "guiding" bar below topic at top of screen: `[previous] [current (dropdown showing list to guide through)] [next]`

#### Questions - unanswered

- does "guide me" conflict in naming with "guiding question"?
  - these are different things, unless "guiding question" actually is tied in directly with the "guide me" tour

#### Questions - kind of answered

- how should "guide me through the topic" work?
  - maybe agenda pane shows the node/edge notes, comments, summary view aspects
	- maybe structure pane shows top 10 "important to this node" nodes? ("show more"?)
  	- maybe also the relation to the topic node and/or to the "important to topic node" nodes...?
  - since importance scores (concepts, questions) are relative, should we show the highest/lowest of each first (and keep them showing after)?
    - so that users can get a feel for the relativity
    - this seems possible in the agenda pane

## UX flow example

## Big open questions

### There are a lot of calculations that multiply scores across paths - how to keep this performant?

- not sure if there will be performance issues here
- math is usually pretty performant but it seems like a lot of calculations need to be made
  - there must be a way to effectively cache/reuse calculations, since many calculations are similar / across same paths

### How to keep diagram from re-layouting too much?

- leaning: ?

#### Notes

- hard because focusing filters many nodes in/out
- animating node movement can help a little bit but doesn't help with building a mental model

#### Questions - Unanswered

- is there some non-diagram format that we could keep around as a visual aid that is easier to keep stable than a diagram?
  - like Kialo's sunburst view, but with our node types (something like this https://www.figma.com/design/XqLnSqZrFxifevzznGgsKH/Focused-nodes-design?node-id=161-2&p=f&t=FRsDMDZLspne9eh0-0)

#### Option 1: static full layout, camera-only focus

- what is it
	- lay out the view's full node set once; focusing dims/hides nodes and moves the camera, but surviving nodes never move
- questions
  - how to make it easy to read the undimmed nodes without having to zoom in/out a lot?
    - mainly a concern when there are a lot of nodes showing, which seems like would be pretty often if we aren't filtering nodes out

#### Option 2: incremental layout (pin survivors)

- what is it
	- when revealing/hiding forces placement changes, pin the surviving nodes and only place the new ones (e.g. ELK's "interactive" mode)
