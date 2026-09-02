## What is this?

- UX design for an app that implements the sibling [ontology](./ontology.md)
  - the [wireframes](./wireframe/index.html) attempt to implement some of this design
- Main goals:
  - give the feeling of high-level topic understanding on entry, with clear motivation + opportunities to drill into details further
  - allow progressive formalization (using only ibis, vs only ibis + tradeoffs, vs ibis + tradeoffs + cause-effect)
  - show off how cause-effect can generate / auto-update explanations, arguments, tradeoffs
  - prototype a demo of audio -> text -> ibis -> ameliorate-v2

## High-level UX ideas

- split panes: agenda pane on left, structure pane on right
  - panes stay in sync based on interactions made in the other pane
  - mobile might show just agenda pane, with swipe or button to get to the structure pane
- perspectives selector can switch to any subset of people's scores
  - group scores are averaged but node/edge-label borders are gradient-colored to convey score distribution
    - option to show disagreement scores (standard deviation)

### Agenda pane

- text; has ranked / aggregated lists, answers "what should I look at and why?"
- initially: a topic brief (description, questions, hot details), picked based on scores
- master-detail stack: the brief is the root; clicking any node (in either pane) pushes a detail view with back/breadcrumb navigation

#### Questions - unanswered

- should the topic brief convey the scores via more than just sorting the items top-to-bottom?
  - would be nice to show the scores colored with a pie-distribution background
    - might even be good to use the backgrounds or borders to gradient-color it
    - will have to see if these options make the visual too cluttered

#### Questions - answered

- should "Guiding Questions" be above "Hottest Details"?
  - guiding questions generally seems more useful for focusing people's thoughts
  - but if "hottest details" would generally include the top guiding question, maybe that's a better top-level section...?
    - and "hottest details" will always have top things to care about, whereas there may only be one guiding question (default: "what's important to consider in this topic")
      - I guess if the default is "what's important", then "hottest details" will be shown in the structure pane already?
  - no, because "hottest details" is more like "here are things to check out if you want to", but "guiding questions" is like "start here, these drive the topic"


### Structure pane

- shows generally non-linear visuals (e.g. diagram/table) to help aid comprehension, answers "how does this fit together?"
- keep node visuals light (text, score colors?)
- initially: show top scored nodes with relations between them

#### Questions - unanswered

- should the structure pane show nodes/edges based always on the selected guiding question's view?
  - if user has customized the view, probably show that
  - if no guiding question selected, and topic is selected: show top 10 important nodes to the topic
  - if no guiding question selected, and part is selected: show part's default guiding question's view?
    - e.g. [negative concept] might have default guiding question "what is the best way of reducing [negative concept]?"
    - e.g. [action] might have default guiding question "what is [action]?" or "what tradeoffs are involved with [action]?"
- [How to keep diagram from re-layouting too much?](#how-to-keep-diagram-from-re-layouting-too-much)

### Structure summary

- idea: above the structure's visual, generate an AI summary of what's displaying in the structure pane
  - based on nodes/edges and calculated important indicators (e.g. heavy disagreement, high importance to change) per node/edge
  - sentences in the generated summary include references to nodes/edges, which _are clickable_ to highlight them in the structure pane (second click: see this part's details)
  - users can edit the summary to improve it
- what's specifically in the summary:
  - causal map: could just list off what's agreed as important to increase/decrease, what's most debated, what's most uncertain
	- table: main considerations between options, what's most debated / uncertain
	- argument tree: is there a general leaning or general disagreement, standout arguments
- this seems like it'd be really good for helping convey how to read the structure pane

#### Questions - unanswered

- should "click to highlight part" + "second click to see part details" behaviors be standard?
  - seems like there might be spots that want "single click to see part details"
  - we can just keep this in mind and consider further when other examples come up

#### Questions - kind of answered

- how to store the generated summaries? so that AI usage is reduced, and users are able to persist an edited summary
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

"Reach" (wording TBD) is basically "how relevant A is to T", calculated by multiplying the normalized edge scores between A and T.

E.g. "importance of Support node to Topic node" might chain the "supports" scores to the root claim, then "causes" scores to the Topic node.

WARNING: "reach" makes calculations a bit complex / not obvious where the numbers come from just from looking at a few nodes. I'm not sure if this is actually worth using.

#### Purpose

Calculate relations between nodes, e.g. A's importance to B, or A's indirect causation on B.

#### Notes

- when attenuating something by multiplying with reach (e.g importance of Support node to Topic node), if it's convenient, it seems reasonable to short-circuit the calculation when the attenuated value reaches some floor threshold, e.g. 0.1 for importance on a normalized 0-1 scale

### Score normalization

#### What

"Normalization" is when a score range is shifted in order to make calculations easier for the score.

E.g. for Hottest Details, we might shift the -8..8 change importance score to 0..1 by taking absolute value and then dividing by 8.

#### Purpose

For calculations like reach / attenuation, we normalize scores so that they can be multiplied by each other to create a number which fades over distance.

For e.g. Hottest Details we also want to normalize so that different scores can be compared directly, to be put into a single, sorted listed.

#### Questions - answered

- how to normalize scores?
  - normalize to 0..1
		- 0..8: divide by 8
		- -8..8: absolute value, then divide by 8
  		- generally if we're normalizing to 0..1, we probably care about magnitude
    		- we do at least for normalizing change importance for "hottest details"
  		- if direction is significant, we can consider normalizing to -1..1 or adding 8 and dividing by 16
  - for aggregates (multiple perspectives scored + showing):
    - calculate normalized averages _and_ normalized _standard deviations_ - high deviation should normalize close to 1

## UI Sections

For adding details about specific sections that could use explanation / discussion.

### Guiding Questions

#### What

Show the top 3 questions that motivate exploration of the topic.

These should be clickable and show a view that centers around answering that question. When a subquestion comes up, we can switch our focus to that, with the context that it helps us answer the parent.

#### Purpose

Provide reasons why we're discussing the topic, ultimate questions to answer. And, make it easy to stay focused on investigating a single question.

#### Notes

- if structure editing + < 5 items: "add guiding question" (... or always show when editing?)

#### Calculations

Which questions to show? Guiding Questions (manually specified) which have a final `guides` relation to the topic node. Take the top 3 based on attenuated `guides`/`clarifies` edge scores.

We'll call this the Guiding Score (name TBD). If a question does not have a path to the topic node that exclusively has `guides`/`clarifies` edges, the question has a Guiding Score of 0.

Example:

When:
- GQ3 clarifies[5,7] GQ2 clarifies[4,7] GQ1 guides[8,6] T
- GQ4 guides[4,4] T (purpose: show direct-but-lower-score `guides` as ranked above GQ3's indirect-but-higher-score `clarifies`)
- GQ4 clarifies[2,5] GQ1 guides[8,6] T (purpose: show multiple paths just take max score)
- CQ1 clarifies[8,8] T, GQ5 clarifies[8,8] T (purpose: show 0 score when does not guide topic)

Calculate normalized Guiding Score (name TBD) for each question:
- GQ1[7 / 8 ~= 0.88]
- GQ2[(5.5 / 8) * (7 / 8) ~= 0.60]
- GQ3[(6 / 8) * ~0.60 ~= ~0.45]
- GQ4(guides T path)[4 / 8 = 0.50]
- GQ4(clarifies GQ1 path)[(3.5 / 8) * (7 / 8) ~= 0.38]
- GQ4[max(0.50, 0.38) = 0.50]
- CQ1[0], GQ5[0]

So the top 3 questions would be GQ1[0.88], GQ2[0.60], GQ4[0.50].

#### Questions - unanswered

- what happens when a different guiding question is selected?
  - do we stay with "topic" selected? do we actually view details of the guiding question?
    - "topic" shouldn't stay selected, let's view the guiding question's details
- should guiding questions be displayed with a color that indicates their "guides" score?
  - could be a neutral color like purple, maybe. low score would probably be grayer

#### Questions - kind of answered

- should the top guiding question be selected by default, with "what's important to consider in this topic?" as a default guiding question?
  - seems good, especially if the "what's important" is a default fallback
  - but we should first determine what UX would look like with a guiding question selected
    - I'm thinking it'd be good to give the topic overview without focusing on a specific question first, so people know there are multiple questions, and can easily see top disagreement/importance/etc. at a glance
- how should "Open questions" rank unscored questions (like `how-tall`) against scored ones?
  - unscored questions can probably just use a default score of 4 (scale 0..8)

### Hottest Details

#### What

Show the top 20 nodes/edges to look at ("show more" to see beyond the top 5), excluding topic node, with pills to filter by hotness reason.

These should all show in the same list, but clicking a pill should filter to the top 5 nodes/edges for that hotness reason. Fewer than 20 can show if the same node/edge appears for multiple hotness reasons.

"top to look at" is calculated based on normalizing the following "hotness reasons" into a 0..1 range:
- "Important to change": top 5 (absolute value) concepts
- "Controversial": top 5 population-std-deviation nodes/edges
- "Unknowns": top 5 unanswered clarifying questions
- "Active": top 5 nodes/edges by frequency x recency of comments and edits

#### Purpose

Highlight the most important things to see in the topic. Guiding Questions has its own separate section because at least one of those should always be forefront.

#### Notes

- For calculating controversy, we normalize the population std dev to 0..1 by dividing by 4 (half of 0..8 range) and clamping to 1 (because -8..8 normalizes to 0..2 when dividing by 4).
  - 4 is used for both -8..8 and 0..8 scales because a point of disagreement means the same on both scales. then we clamp to 1 because the -8..8 will be in the 0..2 range. we're ok with a range of 9-16 being treated as the same as a range of 8.
  - this normalizes a change-importance of 8 to equal a disagreement range of 8 or more, and a change-importance of 4 to a disagreement range of 4

#### Calculations

##### Basic

Example:

When:
- A[-2,4] causes[7,8] B[-,2] causes[-3,5] C[5,8]
- Q clarifies[5,7] B

Calculate:
- "Important to change" (averaged): A[1], B[2], C[6.5]
- "Important to change" (normalized): A[1 / 8 ~= 0.13], B[2 / 8 ~= 0.25], C[6.5 / 8 ~= 0.81]
- "Controversial" (population std dev): A[3] causes[0.5] B[0] causes[4] C[1.5], Q clarifies[1] B
- "Controversial" (normalized): A[3 / 4 = 0.75] causes[0.5 / 4 ~= 0.13] B[0 / 4 = 0] causes[4 / 4 = 1] C[1.5 / 4 ~= 0.38], Q clarifies[1 / 4 = 0.25] B
- "Unknowns" (averaged) : Q[6]
- "Unknowns" (normalized): Q[6 / 8 = 0.75]
- "Active": some frecency calculation, seems somewhat common and like it shouldn't be too hard to figure out

###### Questions - answered

- should unscored nodes be counted in averages and std deviations?
  - yes: makes it clearer when something is probably worth scoring
    - but: this can probably be done in a less-side-effect-y way, like having that person's UI point it out
  - no: all scores get thrown off when a new person joins and hasn't scored yet
  - let's go with no. we can show in a different way when something should be scored.

##### Attenuation ?

Attenuation is the idea of multiplying the scores of edges between two nodes (e.g. T->A->B has two edges between T and A) (i.e. calculating [reach](#reach-)) and then optionally multiplying that by another value to scale that value based on reach from e.g. T to A. One example is to calculate how much change importance of A is attributable to topic node T, which would multiply T's reach to A by A's change importance.

WARNING: this calculation is a bit complex / not obvious where the numbers come from just from looking at a few nodes. I'm not sure if this is actually worth using.

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
- "Important to change, relevant for C": A[1 * 0.12 ~= 0.12], B[1] (TODO: 1. not normalized, 2. B not attenuated, 3. C missing)
- "Controversial": A[?] causes[?] B[?] causes[?] C[?]
- "Controversial, relevant for C": A[?] causes[?] B[?] causes[?] C[?]
- "Uncertainty": B[?]
- "Uncertainty, relevant for C": B[?]
- "Active": some frecency calculation, seems somewhat common and like it shouldn't be too hard to figure out

###### Questions - unanswered

- does attenuation of importance make sense to calculate in both causal directions, upstream + downstream?
  - what about attenuation of controversy/uncertainty?
  - direction seems like it should affect the calculation
    - If A causes Topic T causes C, A's change importance relative to T should probably be the reach to T multiplied by _T's change importance_
      - maybe we shouldn't call this A's change importance
        - it's basically the amount we should change A because it causes T some amount, and we want to change T
        - maybe "A's calculated change importance"...?
        - C's "change importance relative to T" I think is really trying to capture _why_ T should increase or decrease
          - maybe this could alternatively be worded as "T's calculated change importance", calculated from downstream effect change importance
          - doesn't seem to make sense for "whatever causes T" to contribute as a reason to change T.
- does attenuation make sense to calculate per perspective before averaging?
  - e.g. using bob's scores for importance x each edge, as opposed to averaging perspectives and multiplying
    - would this affect the calculation? I think so?

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
- is "hottest details" a distraction, if the goal of the landing is to give a high-level understanding?
  - hmm... does the diagram help with the high-level understanding, if it shows the top causal nodes?
  - arguments seem like they should always be in-context of either a question or causal node
    - so they're more like "here are places where things are happening" rather than "here is the high level"
      - this also seems useful, but it might be nice to have an obvious distinction if both are going to be on the landing
- should "important to change" and "unknowns" be based on average scores or max scores?
  - should there be a checkbox (similar to "attenuated" idea) for "averages" (maybe info bubble for contrasting with "maximums"...?)
  - average seems a good default, maybe "averages" checkbox could be nice to toggle
- should all these "hotness" calculations be attenuated based on reach to the topic node?
  - maybe there should be a checkbox for "attenuated" ? (would need a more colloquial name, or info bubble)
    - this seems good. then you could easily see what's most _absolutely_ hot yet know if it's relevant to discuss
      - maybe want to discuss the things that aren't "as relevant" because it might actually be relevant and just the calcs aren't right
  - one significant advantage to _not_ attenuating is that it's must simpler, and easier to follow for people
    - but if it leads to people talking about less-relevant things, it may not be worth avoiding attenuation
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
- naming?: "hottest details" vs something like "items to discuss" vs "highlights"
  - something like "items to discuss" could be more clear about the section's motivation
  - I was thinking about "items to discuss" mainly because I was wondering if this section should include nodes/edges that are explicitly marked as "I want to discuss this" by someone
    - or if we add "suggested focuses" that people can propose, would those go here too?
      - live discussion management should probably be separate from "hottest details"
      - but potentially something marked as "I want to discuss this" could get some points in the "hotness" calculation...? not sure
  - "highlights" isn't clear if it's for an overview of the topic or of what's currently going on?

## States

### What to show when topic selected (i.e. on entry, when no node / edge selected)

- Agenda pane
  - note: each section here sorts items by score, and "show more/less" if there are any to show/hide
  - heading: `Topic [topic node]`, `Guide me through the topic`
  - section: `Basics` (`[topic description]`)
  - section: [Guiding Questions](#guiding-questions)
  - section: [Hottest Details](#hottest-details)
- Structure pane
  - (top 1/4, switch between, collapsible) generated current-view summary, sunburst
  - show view based on selected guiding question (default: top 10 important nodes to the Topic)

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

## Big open questions

## Medium open questions

### There are a lot of calculations that multiply scores across paths - how to keep this performant?

- not sure if there will be performance issues here
- math is usually pretty performant but it seems like a lot of calculations need to be made
  - there must be a way to effectively cache/reuse calculations, since many calculations are similar / across same paths

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
