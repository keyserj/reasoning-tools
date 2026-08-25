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

## Common calculations

### "Reach" ?

#### What

"Distance" between two nodes? Calculated through some relation types. Seems better than "distance" because it implies impact - "distance" might just be "how many edges away". How does this relate to "chains"?

E.g. "importance of Support node to Topic node" might chain the "supports" scores to the root claim, then "causes" scores to the Topic node.

#### Purpose

Calculate relations between nodes, e.g. A's importance to B, or A's indirect causation on B.

#### Notes

- when attenuating something by multiplying with reach (e.g importance of Support node to Topic node), if it's convenient, it seems reasonable to short-circuit the calculation when the attenuated value reaches some floor threshold, e.g. 0.1 for importance on a normalized 0-1 scale

## UI Sections

For adding details about specific sections that could use explanation / discussion.

### Guiding Questions

#### What

#### Purpose

### Hottest Details

#### What

Show the top 5 nodes/edges to look at, excluding topic node and guiding question nodes, with pills to filter by hotness reason.

"top to look at" is calculated based on normalizing the following "hotness reasons" into a 0..1 range:
- "Important to change": top 5 (absolute value) concepts
- "Controversial": top 5 std-deviation causal concepts/edges
- "Unknowns": top 5 unanswered clarifying questions
- "Active": frequency x recency of comments and edits

#### Purpose

Highlight the most important things to see in the topic. Guiding Questions has its own separate section because at least one of those should always be forefront.

#### Calculations

Example:

When:
- A[-2,4] causes[7,8] B[-,2] causes[-3,5] C[5,8]
- Q clarifies[5,7] B

Calculate:
- "Reach, to C":
  - A causes[7.5] B causes[1] C, Q clarifies[6] B
  - normalized: A causes[7.5 / 8 ~= 0.94] B causes[1 / 8 ~= 0.13] C, Q clarifies[6 / 8 = 0.75] B
  - attenuated: A causes[0.94 * 0.13 ~= 0.12] C, Q clarifies[0.75 * 0.13 ~= 0.09] C
- "Important to change": A[1], B[1], C[6.5]
- "Important to change, relevant for C": A[1 * 0.12 ~= 0.12], B[1]
- "Controversial": A[?] causes[?] B[?] causes[?] C[?]
- "Controversial, relevant for C": A[?] causes[?] B[?] causes[?] C[?]
- "Uncertainty": B[?]
- "Uncertainty, relevant for C": B[?]
- "Active": some frecency calculation, seems somewhat common and like it shouldn't be too hard to figure out

#### Questions - unanswered

#### Questions - kind of answered

- how would an important argument surface in this "hottest details"?
  - e.g. A supports B ("important to increase") impliedFor S addresses T
    - hmm how does a Guiding Q fit into this chain?
      - A supports B respondsTo Q guides T?
      - seems like there are arguments about a question separately from arguments about scores?
        - maybe: "A is important to increase" / "A causes B" should be independently viewable via causal diagram (clicking a score?), but should also show up in IBIS where relevant?
          - IBIS should be more highlighted because it's centered around a guiding question
          - in considering this though, it seems like "claim importance to topic causal node" and "claim importance to guiding question" could be two separate calculations, both relevant
            - ugh, but does a guiding question always map back to the topic node?
              - I guess for clarity, concept map should never point at IBIS - only IBIS should point at concepts
    - interestingly, "`[Solution]` is important to increase" is very analogous to "We should `[Solution]`"
      - unfortunately this seems to mean that an explicit argument can go in either spot
  - arguments don't have a direct "importance"
    - maybe it makes sense to use truth x relevance = impact (or "importance"?)
      - how does "importance" get carried through `impliedFor`?
        - node/"important to increase": 100% carry through? because semantics are actually that claim supports importance
        - edge/"A causes B": potentially could relate to confidence somehow I guess, which maybe could be shown in calcs, but doesn't seem to make sense to affect importance?
          - technically edge claims _can_ support a solution's "importance to increase"
            - e.g. S reduces P, if a claim supports that `reduces`, it is calculated as supporting that `We should [S]`
  - so... I guess arguments have importance to a root claim, and a root claim has importance to a question and/or topic
    - I'm having a hard time thinking through how the "importance to question" and "importance to topic" will overlap, when there's importance to both
      - seems like it can differ via `Q guides T` score vs `S [causal path] T` score
        - maybe just calculate both and use the highest for calculating hotness
- should "important to change" and "unknowns" be based on average scores or max scores?
  - should there be a checkbox (similar to "attenuated" idea) for "averages" (maybe info bubble for contrasting with "maximums"...?)
  - average seems a good default, maybe "averages" checkbox could be nice to toggle
- should all these "hotness" calculations be attenuated based on reach to the topic node?
  - maybe there should be a checkbox for "attenuated" ? (would need a more colloquial name, or info bubble)
    - this seems good. then you could easily see what's most _absolutely_ hot yet know if it's relevant to discuss
      - maybe want to discuss the things that aren't "as relevant" because it might actually be relevant and just the calcs aren't right
- does it make sense for questions to have importance of "unknown-ness" propagate via causal relations of parent concept?
  - if Q clarifies B causes C:
    - it makes sense that B is uncertain based on Q
    - but I don't _think_ it makes sense for B's uncertainty to propagate to C via causation, does it?
      - if B is very uncertain, and is rated to cause C very low (1 or 2), that doesn't mean that C is only slightly uncertain
      - in fact, does B's uncertainty have any relevance to C?
        - I guess it's uncertainty specifically about B's change-importance
          - in which case, it should be uncertainty about B's change-importance relevant for C
            - I guess in theory it could be seen via a +/- range for "B's change-importance relevant for C"
              - (or a confidence %)
            - hmm in theory then, we could do something that combines the max importance and range of importance to determine if the unknown-ness is important
              - I like this, not sure how the math would do it though
- naming?: "hottest details" vs something like "items to discuss"
  - something like "items to discuss" could be more clear about the section's motivation
  - I was thinking about "items to discuss" mainly because I was wondering if this section should include nodes/edges that are explicitly marked as "I want to discuss this" by someone
    - or if we add "suggested focuses" that people can propose, would those go here too?
      - live discussion management should probably be separate from "hottest details"
      - but potentially something marked as "I want to discuss this" could get some points in the "hotness" calculation...? not sure

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

- should guiding questions be displayed with a color that indicates their "guides" score?
  - could be a neutral color like purple, maybe. low score would probably be grayer
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
    - ambiguous, and the readings rank questions differently: does the chain stop once it reaches the topic, or does it also multiply by the target concept's own change importance (so a question about a more important concept outranks an equally-weighted question about a lesser one)?
      - `scripts/questions.ts` takes the first reading, so a question's priority is only about how much of the topic runs through it
      - the second reading would mean a question can't be prioritized without also judging its subject, which conflates "what should we discuss" with "what matters"
  - a criterion is *not* reached at all: it hangs off the causal web by "fulfils", and what an option fulfils is what the [Tradeoffs table](./ontology.md#tradeoffs-table) answers, so counting it as distance too would charge it twice
    - it also ranks badly: `inexpensive` came out as the second-hottest thing in the "Build a wall" example, ahead of illegal immigration itself, because it hangs off the one branch nobody disputes
    - and routing *through* one would make every option adjacent to every other option that shares a criterion
  - claims are reached through the score they argue about rather than through causation: an implied claim _is_ its referent's score, so it sits exactly where the referent does, and "supports"/"critiques" attenuate outward from there
  - an edge sits at whichever of its two ends is nearer - a relation is equally visible from either side of itself
  - open: "answers" carries no distance, so a claim that only answers a clarifying question stays unreached even when the question is close to the topic - a question's own distance is defined by what it clarifies, so it can't be spread outward the way the rest are
  - [TODO: rest of score types]
  - how to do this for disagreement scores?
- how to normalize scores?
  - normalize to 0..1
		- 0..8: divide by 8
		- -8..8: add 8, divide by 16
  - for aggregates (multiple perspectives scored + showing):
    - calculate normalized averages _and_ normalized _standard deviations_ - high deviation should normalize close to 1
    - averaging has to pick between the magnitudes and the signed scores, and the two answer different questions:
      - distance/relevance uses the average _magnitude_, so a relation everyone calls strong while disagreeing about its direction (`wall reduces[3,-5,8] illegal immigration`) stays strong - averaging the signed scores gives nearly zero, which would read as "no relation" and push the topic's most contested branch out of view
      - anything directional (pros vs cons, a tradeoffs cell) uses the signed average, because there the group's net direction _is_ the answer
      - a concept's change importance is a magnitude too: two people who want a thing changed hard in opposite directions both think it's important to change, so `[8,-8]` should read as important-and-contested rather than as nothing to do
        - except where the score has to pick a _side_ - a calculated argument is a pro or a con, and a group split down the middle has no direction to give it, so `scripts/arguments.ts` uses the signed average there and leans on the disagreement filter to surface the split separately
- how to combine "Important to change" / "Controversial" / "Unknowns" into one "hottest" ordering?
  - each is a reason to look at something and any one of them would do on its own, so they combine as `1 - Π(1 - signal)` rather than as a max or a sum
    - a max can't say that something both contested _and_ important to change beats something only important - which is the case most worth surfacing
    - a sum would penalise anything carrying one signal, and a causal edge only ever carries controversy
  - "Controversial" needs a floor or it labels everything: a standard deviation above zero is not disagreement, and `[-8,-8,-6]` is a consensus. `scripts/ranking.ts` uses 2 points of the 0..8 scale, which in the "Build a wall" example keeps the genuinely split rows and drops nine near-unanimous ones
    - the other two need no floor - a small change importance is a small amount of something, where a small deviation is the _absence_ of controversy rather than a little of it
  - the combined number is then scaled by distance to the topic, per the question above

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
- leaning: cut a route on what it is still worth rather than on how long it is
  - `scripts/chains.ts` abandons a route below 0.001, which is under what any view's rounding can show. Weights never exceed 1, so a route only ever weakens and nothing above the threshold is missed - where a length cap would drop a long strong chain and keep a short worthless one
  - distance needs no path enumeration at all: one sweep settling nodes strongest-first gives the best route to everything, since a weaker route can't be improved by extending it
  - enumeration is still exponential where scores don't attenuate, so `walk` refuses past 20k routes rather than returning a quietly incomplete answer

### How to keep diagram from re-layouting too much?

- leaning: ?

#### Notes

- hard because focusing filters many nodes in/out
- animating node movement can help a little bit but doesn't help with building a mental model

#### Questions - unanswered

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
