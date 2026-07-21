## Overview

### Purpose

- This ontology is an attempt to make it easier for every individual to contribute their wisdom towards improving a situation, so that a group's problem-solving potential can be fully realized in the form of better, more-satisfying-for-everyone solutions.
- The beliefs driving this ontology are:
	1.  All people have unique, valuable knowledge to add to most topics.
	2.  If it was trivial to combine everyone's unique, valuable knowledge, then we'd unlock society's potential to work together and address problems.
	3.  Known processes for (a) getting up-to-speed; (b) identifying an individual's unique, valuable knowledge that hasn't been said yet; and (c) integrating that info into the current set of group knowledge; are nowhere near as effective as they could be.
	4.  The way that information is organized and presented has profound impact on improving the processes in 3.
	5.  Known ways of organizing and presenting information are nowhere near as effective as they could be.
- TODO: [The value of scored causal structures for refining contested knowledge](The-value-of-scored-causal-structures-for-refining-contested-knowledge.md)

#### Archive

- It's hard to improve situations, especially when many people are involved, and more so when the situation is complex. Even with best effort, it's hard to effectively take into account everyone's points and counterpoints without some becoming drowned out, lost, outdated, forgotten.
	- It's a good first step to use a document instead of a verbal discussion, but that gets messy very quickly.
	- A good second step might be to use an argument map, but (TODO: [The value of scored causal structures for refining contested knowledge](The-value-of-scored-causal-structures-for-refining-contested-knowledge.md))

### What is this?

- This is a document that defines an ontology for representing contested information about a problem or solution
- At a high level, the ontology is a "contested causal map" (naming TBD, see questions section)
	- "contested" because anyone can disagree about any of the details, via scoring and supporting, critiquing, questioning
	- "causal map" because the core of the structure is: concepts (as nodes) with causal relations (as edges) between them
- This overview's [Structure](#Structure) and [Example](#Example) sections are probably the best for quickly grasping the ontology
	- [Structure Details](#structure-details) has more information (e.g. meaning, purpose, open questions) about each piece of the structure
	- [Core features](#core-features) goes deeper into what the structure + scores enable (e.g. calculated arguments)
	- [Big open questions](#big-open-questions) has details about open questions that have more significant impact on the ontology than the "open questions" in the structure details section
- UX design for an app implementing this ontology lives in the sibling doc [UX-design](./UX-design.md) - its mockups are built from this doc's [Example](#Example)

#### Questions - Unanswered

- is "causal map" appropriate naming if there can be arguments not tied to cause / effect?
	- seems like "contested topic map" could be better I guess, since "topic" implies we're discussing a specific _thing_, but the "map" might be any map of details to help discuss that thing (rather than specifically causal or argument)
		- except ["topic map" is a formal thing](https://en.wikipedia.org/wiki/Topic_map) already... the idea seems similar but more formalized/generic than mine...?
	- _can_ there be arguments that aren't tied at least to a _concept_ in the causal map?
		- at least most arguments can probably be tied to a concept, but does it make sense to do this if the concept isn't yet tied to other concepts?
			- we could make concepts for all arguments behind the scenes, but the name should definitely be based on the main visuals - if concepts aren't core on all topics, then it probably shouldn't be called a "concept" map

### Structure

- Shared: Nodes & Edges
	- notes:
		- a node can be only one of the types (Concept, Question, Claim, Source)
			- but can be one or more of the subtypes e.g. a concept can be a topic and an action
		- some subtypes can be determined based on the node's relations (e.g. Component)
			- others need to be specified (e.g. Action, Anecdote/Statistic?)
	- Concept
		- Topic?
		- All - Concept causes/reduces/impedes Concept
		- Category - {Concept} categorizes Concept
		- Component - Concept has {Concept}
		- Action - {Concept} tagged `#action`
		- Criterion - Concept fulfils {Concept}; {Concept} criterion for Question ?
	- Question
		- Guiding Question - Guiding Question guides Topic/Guiding-Question ?
		- Clarifying Question - Clarifying Question clarifies Node
	- Claim
		- note: all scores have an implied claim, where supporting claims support a higher score, critiquing claims support a lower score
		- note: many arguments about a score can be _calculated_ from causation instead of manually claimed (see [Calculated arguments](#calculated-arguments))
		- All - Claim supports/critiques Claim
		- Statistic
		- Anecdote
		- Option - {Claim} answers Clarifying Question
	- Source
		- All - Source mentions Claim
- Individual: Scores
	- note: all scores use one of two ranges - bipolar -8..8 (the scored thing has a meaningful opposite) or unipolar 0..8 (it doesn't); see [Score ranges](#Score-ranges) for more details
	- [Concept scoring semantics: desirability? importance? more-less vs good-bad?](#concept-scoring-semantics-desirability-importance-more-less-vs-good-bad)
	- Claim truth score: -8 = completely opposite of true, 0 = completely absent of truth, 8 = completely true
		- claims use only 0..8 scoring if "opposite" isn't defined
	- Edge weight score
		- note: scores don't make sense for these?: categorizes, has, criterion for
		- causes (opposite: reduces/impedes): how much the source moves the target: -8 = strongly reduces it, 0 = doesn't move it at all, 8 = strongly increases it
		- fulfils: -8 = actively works against it, 0 = doesn't fulfil it at all, 8 = fully fulfils it
		- guides: how much exploring the question would advance the target topic/question: 0 = no bearing on it, 8 = central to it (most progress on the target runs through this question)
		- clarifies: how contingent the target node is on the answer: 0 = answer wouldn't change anything about it, 8 = answer could completely reshape how we see/score it
		- answers: 0 = doesn't answer, 4 = kind of answers, 8 = fully answers
		- mentions: 0 = doesn't mention, 4 = kind of implies, 8 = definitely mentions
		- supports (opposite: critiques): -8 = strongly critiques, 0 = neither supports nor critiques, 8 = strongly supports

### Example

#### Context

- Based on arguments about "The US should 'build a wall' to reduce illegal immigration"; tries to show off one of each piece from [Structure](#Structure)
- Scores convey three users' perspectives via the `Perspectives` line - the main nodes are scored by everyone, some things by only some people, and some by nobody
- Syntax legend:
	- `*`: Concept node type
	- `?`: Question node type
		- guiding vs clarifying is implied by edge type: `guides` (agenda-setting) vs `clarifies` (fact-requesting)
	- `=`: Claim node type
	- `@`: Source node type
	- `<`: edge whose source is the child (nested) line and target is the parent line
	- `>`: edge whose source is the parent line and target is the child (nested) line
	- `%[key]: [value]`: key-value property definition for the parent line
  	- `Claim` property `opposite`: indicates phrasing for the opposite meaning of the claim. Enables -8..8 scale for explicit claim's truth score, rather than 0..8.
	- `Perspectives: [person1, person2, person3]`: declares whose scores appear in the example
	- `[X,Y,Z]`: scores, one slot per person in the `Perspectives` order - node scores appear after the node type character (e.g. `*[-4,0,-8]`), edge scores appear after the edge type (e.g. `causes[6,2,-]`)
		- `-` in a slot: that person didn't score it
		- a scoreable node/edge with no brackets at all: nobody scored it
	- `&some-id`: sets an id on the node/edge it follows
	- `$some-id`: references an id
		- references are prefixed with the referent's type character (e.g. `* $illegal-immig`, `? $best-ways`, `= $visa-overstay`)
		- `= $some-id` on a concept's/edge's id: references the implied claim behind that thing's score, so it can be supported/critiqued/clarified
			- implied claims have standard phrasing:
				- concept's change-importance scores: `$node is important to increase`
				- edge scores: `$source-node [edge type] $target-node` (edges are verbs that claim a relation between the source and target)
				- claim's truth score: `[node's text]` (claims are worded as evaluable statements already)
			- explicit claims can have any text - ideally causal ones get promoted into the causal map and calculated instead (see [Calculated arguments](#calculated-arguments))
	- `#tag`: explicitly specifies a subtype (e.g. `#action`) - subtypes like category/component/criterion are implied by their edges so aren't tagged
	- `~`: a note relevant to its parent line - it would show visually if this were rendered
	- `/`: a meta comment about the example, noting something about its parent line - it wouldn't show if rendered

#### "Build a wall"

```
Perspectives: [alice, bob, casey]
  / rough personas so the scores tell a story: alice is moderate, bob doubts illegal immigration is a big problem and opposes the wall, casey wants illegal immigration reduced hard and favors the wall

/ --- Concepts: the causal core ---

*[-4,0,-8] Illegal immigration into the US &illegal-immig #topic
  < causes[6,2,-] &wait-causes-illegal-immig
    *[-6,-3,-7] Long legal processing times &long-wait
      < causes[7,-,8]
        *[-5,-,-6] Administrative burden of enforcing immigration requirements &admin-burden

*[7,8,2] Legal immigration into the US &legal-immig
  > reduces[3,7,1]
    * $illegal-immig
  < impedes[6,8,-]
    * $long-wait

*[0,-,-] Motivations to immigrate illegally &motivations
  > categorizes
    / categorizes doesn't take a score
    *[-2,-,-5] Saving money by skipping the legal process &save-money
      > causes[4,-,7]
        * $illegal-immig
  > categorizes
    *[-3,-,-] Wanting to "disappear" (avoid government records) &disappear
      > causes[2,-,6]
        * $illegal-immig
  > categorizes
    *[-8,-8,-6] Danger in home countries &danger
      > causes[7,8,3]
        * $illegal-immig

/ --- Actions ---

*[2,-7,8] Border wall along the southern US border &wall #action
  > reduces[3,-5,8] &wall-reduces
    * $illegal-immig
  > has
    / has doesn't take a score
    * Barbed wire along the top &barbed-wire
      / component; nobody scored it, so no score brackets at all
  < clarifies
    ? How tall is the proposed wall design? &how-tall
      / clarifying question about a plain node (vs how-enter, which clarifies an edge)

*[5,8,2] Increased administrative resources for processing immigration &more-admin #action
  > reduces[7,8,-]
    * $long-wait

*[3,7,-4] Reduced immigration requirements &fewer-requirements #action
  ~ ambiguous: it wasn't stated which requirements would be reduced
  > reduces[6,7,-]
    * $admin-burden

/ --- Questions ---

? What are the most effective ways to reduce illegal immigration? &best-ways
  / guiding question (agenda-setting)
  > guides[7,5,8]
    * $illegal-immig
  < guides[6,8,1]
    ? Why do people immigrate illegally? &why-immigrate
      / guiding question guiding another guiding question

? How do most people illegally enter the US? &how-enter
  / clarifying question (fact-requesting); it clarifies an edge by targeting the edge's implied claim - note the `=` on the reference
  > clarifies[6,-,3]
    = $wall-reduces
  < answers[7,-,6]
    =[3,1,8] Most enter by crossing the border on foot between ports of entry &enter-on-foot
      / claim option
  < answers[7,8,-]
    =[7,8,1] Most enter legally and overstay visas &visa-overstay
      / claim option

/ --- Criteria: for evaluating the options (3 criteria x 3 options = a minimal tradeoffs table) ---

*[7,8,2] Inexpensive &inexpensive
  / criterion: worded so that more of it is good
  > criterion for
    / criterion for doesn't take a score
    ? $best-ways
  < fulfils[-3,-4,-]
    * $more-admin
  < fulfils[7,-,6]
    * $fewer-requirements
  < fulfils[-7,-8,-2]
    *[-2,-4,-] Billions of dollars of construction and maintenance spending &wall-cost
      < causes[8,8,8]
        / the wall's fulfilment of "inexpensive" comes via this causal-fulfils chain (causes[8,8,8] x fulfils[-7,-8,-2]); everyone agrees the wall costs money
        * $wall

*[5,3,8] Quick to implement &quick
  / fulfils edges omitted for brevity - only "inexpensive" shows them
  > criterion for
    ? $best-ways

*[8,8,3] Humane treatment of immigrants &humane
  / fulfils edges omitted for brevity - only "inexpensive" shows them
  > criterion for
    ? $best-ways

/ --- Claims: arguing about scores ---

=[6,2,-] $wait-causes-illegal-immig
  / implied claim behind the "long waits cause illegal immigration" edge score; slots match the edge's slots, so person3 has "-" here too
  < supports[-4,-,-6]
    =[6,-,8] Even with instant processing, people would still immigrate illegally to save money or "disappear" &still-immigrate
      / explicit claim, but causal: it's essentially pointing at the save-money/disappear causes edges, so it could be promoted and become a calculated argument

=[3,-5,8] $wall-reduces
  / implicit claim behind the "wall reduces illegal immigration" edge score
  < supports[7,-,8]
    =[8,-,8] A wall physically stops crossings without needing continuous surveillance &physical-barrier
      %opposite: A wall physically _aids_ crossings without needing continuous surveillance
  < supports[-,-7,-3]
    =[2,7,1] Hardened borders trap circular migrants who used to return home &caging-effect
      < supports[-,7,4]
        =[3,8,2] Re-crossing a hardened border is costly and dangerous, so seasonal migrants stay and bring their families over &costly-recrossing
  < supports[-6,-8,-]
    =[6,8,1] People will find a way over the barrier &climb-over
      < supports[5,7,-]
        =[8,8,-] It's easy to climb a fence &easy-climb
      < supports[-4,-,-8]
        =[5,-,8] The wall design is tall, without handholds, and topped with barbed wire &unclimbable
  < supports[-5,-8,-]
    / reuse: the same claim answers a question above and critiques this edge
    = $visa-overstay

=[-4,0,-8] $illegal-immig is important to increase
  / implicit claim behind the topic's concept score, with standardized node-score wording; its score is the node's score, so alice/casey are saying "no - decrease"; supports argue for a higher score, critiques lower
  < supports[5,8,-]
    =[7,8,2] Most people who immigrate illegally are protecting themselves from danger &fleeing-danger
  < supports[-4,-,-8] &murder-supports-worse-score
    =[3,-,8] An illegal immigrant murdered a baby in cold blood last year &baby-murder #anecdote

=[-4,-,-8] $murder-supports-worse-score
  / implied claim behind the anecdote's support edge score
  < supports[-7,-,-3]
    =[8,-,4] In Texas 2012-2018, illegal immigrants were arrested for violent crimes at half the rate of native-born citizens &texas-stat #statistic
      ~ rates vary by year and state; Texas is used because it tracks immigration status in arrest data

/ --- Sources ---

@ House Judiciary hearing document, Jan 2025 (docs.house.gov) &house-doc
  > mentions[8,-,-]
    = $texas-stat
```

#### Structure coverage

- Structure coverage (one of each piece from [Structure](#Structure)):
	- Concept
		- Topic: `illegal-immig` (`#topic`)
		- All: causes (`long-wait` causes `illegal-immig`), reduces (`legal-immig` reduces `illegal-immig`), impedes (`long-wait` impedes `legal-immig`)
		- Category: `motivations` categorizes `save-money` / `disappear` / `danger`
		- Component: `wall` has `barbed-wire`
		- Action: `wall` / `more-admin` / `fewer-requirements` (tagged `#action`; each reduces the topic problem or one of its causes)
		- Criterion: `inexpensive` / `quick` / `humane` (criterion for the `best-ways` question); `more-admin` / `fewer-requirements` fulfil `inexpensive` directly, while `wall` fulfils it via a causal-fulfils chain (`wall` causes `wall-cost`, which fulfils[-7,-8,-2] `inexpensive`)
	- Question
		- Guiding Question: `best-ways` guides the topic; `why-immigrate` guides `best-ways`
		- Clarifying Question: `how-tall` clarifies the `wall` node; `how-enter` clarifies the `wall-reduces` edge, via the edge's implied claim
	- Claim
		- All: `easy-climb` supports `climb-over`; `unclimbable` supports[-4,-,-8] (i.e. critiques) `climb-over`
		- Statistic: `texas-stat`
		- Anecdote: `baby-murder`
		- Option: `enter-on-foot` / `visa-overstay` answer `how-enter`
		- Implicit vs explicit: claim-tree roots are implicit (implied claims with standardized wording, e.g. `= $illegal-immig is important to increase`); free-text claims (e.g. `still-immigrate`) are explicit
	- Source
		- All: `house-doc` mentions `texas-stat`
	- Scores
		- Perspectives: score brackets hold one slot per person, in the `Perspectives: [alice, bob, casey]` order
			- scored by everyone: the main nodes, e.g. `*[-4,0,-8]` on the topic, `*[2,-7,8]` on `wall`
			- scored by some (`-` = that person didn't score): e.g. `*[-2,-,-5]` on `save-money`, `mentions[8,-,-]`
			- scored by nobody (brackets omitted): `barbed-wire`, the `clarifies` edge from `how-tall`
		- Concept score: e.g. `*[-8,-8,-6]` on `danger`
		- Claim truth score: e.g. `=[8,-,4]` on `texas-stat`
		- Edge weight score: one on each scoreable edge type - causes, reduces, impedes, fulfils, guides, clarifies, answers, mentions, supports
		- Unscored edges (never take scores): categorizes, has, criterion for
		- Implied claims behind scores: `= $wait-causes-illegal-immig` (a causes edge's score), `= $illegal-immig` (a concept's score), `= $murder-supports-worse-score` (a supports edge's score)
		- Oppositional scores: `wall reduces[3,-5,8] illegal-immig` - casey (`8`) believes it reduces, bob (`-5`) believes it increases
	- note: argument-map "reuse" (same claim in multiple arguments) falls out naturally from the graph: `visa-overstay` both answers `how-enter` and critiques `wall-reduces`

#### Questions - Unanswered

- questions and sources are left unscored here because [Structure](#Structure) doesn't define scores for them - should they have importance / credibility scores respectively?

#### Questions - Kind of answered

- should an implied claim's score just _be_ the score of the node/edge it wraps, or is it a separate truth score?
  - it should just _be_ the same score (shown matching here, e.g. `causes[6,2,-]` and `=[6,2,-] $wait-causes-illegal-immig`)
  - still open: is there a good way to show the score in only one of the two spots? it seems relevant in both

#### Questions - Answered

- should `answers` edges be scoreable, or do the answering claims' truth scores cover it?
	- scoreable - truth doesn't cover it because a claim can be true and yet not relevant to the question

### Benefits / goals

- significantly improved maintenance of the contested information
  - many arguments don't need to be manually written or maintained - they can be calculated from causation + individual scores - see [Calculated arguments](#calculated-arguments)

### Downsides / known missing things

- downsides
- known missing things that seem like they can be added later / with an implementation
	- history (probably of nodes / edges / scores)
	- suggestions / forking

### Improvement ideas

## Structure Details

### Shared: Nodes & Edges

#### Concept

##### Purpose

1. Enable breaking down arguments into smaller pieces, so that discussions can be more precise
2. Model real-world relations, so that discussions are better-grounded in reality

##### Topic

###### Meaning

###### Purpose

###### Notes

- good
	- this could be nice as a "concept" because most (all?) Ameliorate topics have a problem or solution node that go hand-in-hand with the topic
		- as a "concept", the Topic wouldn't need to have a different entity from the node - it could clearly be the same thing
	- this also would allow calculating e.g. "how important is node X to the topic?"
- bad

###### Questions - Unanswered

- [Do all topics have a topic node? Can there be multiple topic nodes?](#do-all-topics-have-a-topic-node-can-there-be-multiple-topic-nodes)
- how to relate all relevant nodes to the Topic?
	- there would be so many more edges stored if every node had to have an edge to the Topic
		- these edges don't make sense to be argued or anything like that either
	- potentially nodes and edges could have a `topicId` which is the node id, though that seems a bit jank because why relate via id when nodes normally relate to each other via edge?

##### All

- All - Concept causes/reduces/impedes Concept

###### Meaning

- An idea, a thing, a phenomenon - something to discuss
- ==Example: "" _causes_ "" (TODO: find immigration example to use for all of these?)==

###### Purpose

- Enable precise discussion - rather than having to agree / disagree about entire sentences / paragraphs, concepts allow us to discuss a specific thing or a specific relation between things

###### Notes

###### Ideas

###### Questions - Unanswered

###### Questions - Kind of answered

###### Questions - Answered

###### Questions - Archive

##### Category

- Category - {Concept} categorizes Concept

###### Meaning

###### Purpose

##### Component

- Concept has {Concept}

###### Meaning

###### Purpose

##### Action

- Action - {Concept} tagged `#action`

###### Meaning

- Something that could be done about the situation - a potential intervention (e.g. building a wall)

###### Purpose

- Identify the things a group could do, and become an option in a tradeoffs table (see [Criterion](#Criterion))

###### Notes

- a "what's the best solution?" Question's options are calculated: trace causal edges from the Question's target to find actions that reduce it
  - e.g. `best-ways` guides `illegal-immig`, so its options are the actions whose causal paths reduce `illegal-immig`: `wall` / `more-admin` / `fewer-requirements`

###### Questions - Unanswered

- naming: "Action" vs "Option"?
	- "Option" implies a decision/question that it's an option _for_, actions aren't always an option when they're first created
	- using "Action" also frees "Option" to mean the question-relative role: an action can be an option for a question, mirroring how claims can be options for a clarifying question
- when calculating a Question's options, which actions count?
	- for a question like "what's the best solution?": actions whose causal paths reduce the question's target
  	- but should actions scored as _causing_ the target be included too, since people can disagree about whether something causes or reduces it?
			- potentially: include any action where at least one person's scores trace to reducing the target
	- for other questions: not sure

##### Criterion

- Criterion - Concept fulfils {Concept}; {Concept} criterion for Question ?

###### Meaning

- A quality by which options can be evaluated, e.g. "inexpensive", "durable", "avoids excess"
- ideally is worded such that more of it is a good thing, for consistency (also makes "how good is a solution" slightly easier to calculate)

###### Purpose

- Enable a tradeoffs table: options along one axis, criteria along the other; each option's value = sum over criteria of (how much the option fulfils the criterion) x (how important the criterion is, -8 to 8)
	- In theory, this table could be created just by looking all the things caused/reduced by a solution, but generally it's much easier to think about through a smaller set of common criteria
- Provide a way for "causing too much of a thing" to create negative value (e.g. a solution that creates excess would poorly fulfil "avoids excess")

###### Notes

- the causal-fulfils edge chain from an Action to a Criterion determines how much the Action fulfils the Criterion
- criteria are typically pretty contextual to the thing they're criterion for, so they generally don't make sense to reuse across different decisions
- the tradeoffs table uses the same "multiply edge weights by concept scores" calculation as "how good is a solution", viewed as a table restricted to Criterion nodes

###### Questions - Unanswered

- sometimes criteria seem to make sense being directly caused by other concepts, and sometimes they seem like they can only be "fulfilled" - might be based on how the criterion is worded? awkward
	- hypothesis: criteria that are _properties of the option itself_ (e.g. "inexpensive", "durable") can only be fulfilled, while criteria that are _outcomes in the world_ (e.g. "reduced admin burden") can be caused?

###### Questions - Kind of answered

- "{Concept} criterion for [solving] Concept" seems too narrow
	- should be able to have Criterion for achieving a positive thing, like a Goal
	- should be able to have Criterion for other evaluations too, like "which subproblem matters most"
	- trying: a Criterion is really criterion for a _decision_, so it relates to a Question (e.g. "what are the most effective ways to reduce illegal immigration?") instead of to the problem directly - that covers goals and other evaluations too

#### Question

##### Notes

- the subtypes differ on the answer side: clarifying questions are generally answered by claims (via `answers` edges), while guiding questions generally don't have a concrete answer - they make sense to be "answered" by a view, probably generated based on relevant causal nodes (e.g. a tradeoffs-table view for "what are the most effective ways to reduce illegal immigration?")
  - this can double as a sanity check: a "guiding" question that accumulates `answers` claims was probably clarifying all along

##### Questions - Unanswered

- how should guiding vs clarifying questions be scored?
  - clarifying seems better scored via edge because a question can relate to different nodes in different amounts of relevance
  - if there's no edge for guiding, then scoring to prioritize a guiding question will be different than scoring a clarifying question
  - a guiding edge does seem like its importance is to a topic, and we therefore have a similar problem to [TODO: link to section where we talk about node scores being all relative to topic and it not being worth moving these into an edge relation to the topic because there'd be too many edges]
- "guiding" vs "driving" verbiage?
  - "driving"
    - + strong, like "motivating"
    - - on its own can make people think of cars rather than reasoning
  - "guiding"
    - - doesn't imply "motivating" so much

##### Questions - Kind of answered

- can a guiding question have a parent that _isn't_ the topic itself?
  - hmm potentially guiding questions can be broken into further guiding questions? hard to say
    - in this case though, the child "guiding question" probably wouldn't make sense to be displayed in the root set of "guiding questions" for a topic
      - hmm maybe it wouldn't necessarily be more important than the parent but it could be more important than other root questions. e.g. "Why do people immigrate illegally?" guides "What are the most effective ways to reduce illegal immigration?", yet is also pretty important to the topic of illegal immigration
  - clarifying questions _do_ seem like they could have a topic parent
    - e.g. "concept: cars going too fast" < informs "question: how fast do cars go on average here?"
    - I guess this means we can't just distinguish guiding vs clarifying via looking at what the parent is
  - for now it seems like we could say that guiding questions will "guide" either the topic node or another guiding question
  - note: this is somewhat similar to the idea that all node scores are relative to the topic (see [Topic](#Topic)'s "how to relate all relevant nodes to the Topic?"). but guiding questions having an edge to topic/question nodes doesn't seem like it'd be too many edges, compared to all nodes having edges to the topic
- how to distinguish Guiding vs Clarifying questions?
  - definitely want to distinguish these - guiding questions are agenda-setting (they help drive our understanding of the topic), clarifying questions are fact-requesting (simpler, usually narrower / about something specific)
  - option 1: edge type "guides" = guiding, "clarifies" = clarifying
    - + "clarifies" is clear
    - - "informs" doesn't really exclude "clarifies"
      - "guides"? seems ok
    - ? would questions themselves still need scoring, or just the edges then?
    - ? do all topics have a "topic node"?
      - promoted to a big open question: [Do all topics have a topic node? Can there be multiple topic nodes?](#do-all-topics-have-a-topic-node-can-there-be-multiple-topic-nodes)
  - option 2: manually specify "guiding" question (e.g. checkbox)
  - option 3: no edge = guiding, "informs" ("clarifies"?) = clarifying
    - - conflicts with guiding questions being able to guide other guiding questions (they'd need an edge)
  - option 4: ?
  - trying: option 1 - distinguish via edge type: "guides" = guiding (agenda-setting), "clarifies" = clarifying (fact-requesting)

##### Guiding Question

- Guiding Question guides Topic/Guiding-Question ?

###### Notes

- guiding questions will want the ability to select from a list (e.g. "what causes this node?", "what addresses this node?", these generally can have automatic views created for them) OR be custom - clarifying questions should generally be custom (e.g. "are there any studies about this?")

###### Questions - Unanswered

- better name?
	- "driving question" - initially invokes idea of driving as in "driving a car", like a driving exam

###### Questions - Kind of answered

- what edge name to use?
	- "informs" seems to imply that there's uncertainty in the topic if the question isn't answered, but that doesn't seem right
	- hmm if questions themselves are scored by importance, the edge may not matter?
		- could also do "important for" ...?
	- trying: "guides" - self-documenting since it matches the subtype name

##### Clarifying Question

- Clarifying Question clarifies Node ?

###### Notes

- questions should be able to clarify edges too - easiest way seems to be having the question clarify the edge's implied claim (implied claims are nodes, so `clarifies Node` already covers this); see `how-enter` in the [Example](#Example)

#### Claim

##### Notes

- See [More advanced claim modeling](#more-advanced-claim-modeling)
- Non-causal arguments - e.g. evidence about truth (statistics, anecdotes, source mentions), definitional disputes, pure value assertions - make sense to exist via explicit claims. But causal arguments are ideally converted into causal form (concepts + causal edges) so that they're _calculated_ into the argument map instead of manually maintained (see [Calculated arguments](#calculated-arguments)).

##### Questions - Unanswered

##### Questions - Kind of answered

#### Source

##### Questions - Unanswered

- Does this make sense as a Concept subtype? Rather than its own Node type
	- yes: it seems like a Concept
	- no: it doesn't want the same cause/effect edges
		- egh technically sources _could_ be discussed based on the effects they create
			- potentially sources could create effects via components
				- e.g. "Source: {News Show}" has "Component: {Segment}" or "Component: {Person with sarcastic personality}" causes "Concept: Misinformation"
		- but the core intention behind Source is to discuss Claims that it "mentions"
	- no: "desirability" score is probably more like a "credibility" score? still (-8 to 8) probably though
		- egh if sources are discussed based on the effects they create, then desirability might make sense to score
	- no: Concept is supposed to be "higher" than Claim in this ontology, but Source's primary relation is to Claim
		- but maybe it's ok for Concept not to be "higher" than Claim?
			- there are other issues with Concept being "higher" than Claim, e.g. the open question of what to do about Claims that don't tie to a Concept (if that's possible)
	- potentially Source could have "credible for Topic" relation ?
		- kind of nice to allow sources to have different credibility based on the topic

### Individual: Scores

#### Purpose

There are a few different kinds of scores, as specified below. The reasons for these scores are mainly to:

1. allow individual opinions to be succinctly and precisely expressed, making it easy to identify agreement and disagreement
2. allow individual opinions to be specified separately from reasoning, so that the shared map structure can capture all reasons without perspective-based conflict
3. allow views to be generated automatically based on specific individuals' perspectives

#### Notes

- default scores in UX probably display something like `-`, but for calculations these would generally be 4 (positive midpoint) or 0, depending on the meaning of the score
  - e.g. concept implicit claim defaults to 0 ("not important to change")
  - e.g. "causes" implicit claim defaults to 4 ("somewhat causes")

#### Score ranges

- all scores use one of two ranges: -8..8 ("bipolar" - the scored thing has a meaningful opposite) or 0..8 ("unipolar" - it doesn't)
- why -8..8 / 0..8 (previously -9..9 / 1..9):
	- absence lives at 0 everywhere ("doesn't cause at all", "doesn't mention", "completely absent of truth", "no need to change")
	- 0..8 has an odd number of options (9), so 4 is a midpoint that can be used for defaults if appropriate; a 0..9 range would put the midpoint at 4.5

##### Questions - Unanswered

- is there better terminology than "unipolar vs bipolar" for the score ranges?
  - these terms are good because they're established in surveying literature
  - but bipolar seems more-colloquially related to the medical condition. would be ideal to avoid this connection
  - "magnitude vs directional" - directional seems decent in that it somewhat implies "opposite", but poor in that there can be many directions
  - "non-negative vs signed" - "signed" is a bit non-colloquial. "non-negative" is a bit mathematical/non-semantic
  - "bidirectional vs unidirectional" - mouthful, also bidirectional doesn't necessarily imply "opposite"
  - "magnitude vs oppositional" - "oppositional" seems a little off for some reason

#### Concept scoring semantics: desirability/importance?

##### Questions - Unanswered

- [Concept scoring semantics: desirability? importance? more-less vs good-bad?](#concept-scoring-semantics-desirability-importance-more-less-vs-good-bad)
- how to convey "I want to talk about this"?
	- does this have value asynchronously? seems like conveying "I think this is important" is sufficient asynchronously
	- synchronously, it seems like this could be handled by something like [Suggesting and voting on a new focus](https://github.com/amelioro/ameliorate/issues/314)
		- does this make sense as _part_ of the ontology...?
		- this _could_ be useful asynchronously? though maybe a "driving question"

#### Claim truth score

##### Notes

- need to define "opposite" claim in order to expand scoring range from 0..8 to -8..8
  - implicit claims will intentionally either have this defined or not defined, based on what makes sense (e.g. "A causes B" has opposite "A reduces B", but "A guides B" doesn't have opposite because it doesn't seem like something like "creates chaos for" makes sense)

##### Questions - Unanswered

- is it possible for child claims to distinctly advocate for "absence of truth" separately from "opposite of truth"?
	- seems like it might be possible for a claim with a "supports" score of 4 to suggest that the parent claim should be a 4?
		- this would also allow a claim to advocate for a precise positive score rather than the general "this supports the score being higher"
			- would this be harder to think through?
  	- i.e. a claim that supports that the parent has "absence of truth" would have "supports" score of 0, and a claim that supports that the parent has "opposite of truth" could have "supports" score of -8
    	- wait... "supports" score of 0 should mean that the child claim is not relevant / doesn't impact belief in the parent claim...
      	- I guess this might mean that we _can't_ separate "absence" vs "opposite" arguments via scoring...?
        	- feels like there should be a way to adjust the word "supports" such that 0 means "supports that parent has a truth score of 0"
          	- then again, this seems like it would mean that we _can't_ suggest that a claim is irrelevant / has no effect on the parent's truth score
  	- notes for if we _could_ have "supports" score mean that parent truth score should be that value (seems like we can't do this right now, because of no way for score to mean "child has no relevance to parent")
    	- however: then we'd have to calculate critique-ness based on "critiques" score _relative to_ the parent's current score
      	- e.g. if parent's score is 7 and child "supports" score is 5, then it's really critique pointing towards -2 change of score
      	- this does seem _doable_ at least
    	- also however: how would the precise scoring possibly fit into the implied claim wording / scoring segments...
      	- currently "supports" implied claim is "A supports B" or maybe "A supports truth of B" with segments of -8 = "strongly believe opposite", 0 = "don't believe", 8 = "strongly believe"
        	- huh maybe this verbiage actually _does_ work with the precise scoring?
          	- well, it's unclear if multiple supports should be averaged or somehow added... e.g. does 10 "supports[3]" mean the parent should be 3 or does it mean that parent should be 8? seems like there might be no way to tell.
	- annoyingly, if we can't distinctly advocate absence vs opposite, then our children claims slightly misalign from the parent score semantics, since the parent score _can_ convey opposite. not the end of the world I guess.
- would an unscored "supports" edge mean that it doesn't support?
	- probably default unscored score to like a 4 or something "somewhat supports"
- do the semantics allow/benefit-from distinguishing the _kind_ of claim, e.g. relevance support vs importance support vs truth support?
  - relevance to parent / impact on parent seems all tied in via the "supports" edge - could argue about this by pointing claims at the edge
- are there alternative semantics for a claim's score?
- are there better names than "truth"?
	- "credence" - maybe slightly academic, but more-explicitly implies "our _belief_ that something is true" as opposed to "absolutely true"
	- "veracity"

#### Edge weight score

##### Causes (opposite: reduces/impedes)

###### Notes

- enables calculating "how much does node A cause node B?"
	- by multiplying causal weight scores
		- probably normalized to -1..1 (score / 8), so that chained causation attenuates rather than compounds
	- and this, combined with [Concept scoring semantics](#concept-scoring-semantics-desirability-importance-more-less-vs-good-bad): "how much does node B _matter to_ node A?"
		- by multiplying causal score by concept score e.g. goodness
- avoid duplicate edges when a chain already conveys the relation (e.g. A causes B and B causes C, plus a direct A causes C edge) - the duplicate would double-count in calculations

##### Guides

###### Notes

- `guides` weights can chain the same way causal weights do, to prioritize questions within the question hierarchy: e.g. if Q2 guides[7] Q1 and Q1 guides[8] the topic, Q2's priority relative to the topic multiplies (and attenuates) through the chain
- the chaining can also extend through causal edges to prioritize a guiding question in relation to any node (see Clarifies notes below), since topic nodes are concepts in the causal web
	- especially relevant if multiple topic nodes are allowed in the future (e.g. a topic "build a wall" that reduces a topic "illegal immigration" - separate topics would allow people to focus on "build a wall" specifically, as opposed to generally looking at "illegal immigration")

##### Clarifies

###### Notes

- `clarifies` scores indicate uncertainty about the clarified node (until the question is answered)
- enables prioritizing a question in relation to _any_ node in the map, not just the node it directly clarifies, using the same multiply-along-edges machinery as causal chains (see Causes notes above)
	- e.g. for a question clarifying C, where A causes B causes C: multiplying C's scored importance x the causal chain weights (A causes B, B causes C) x the clarifies weight conveys how much impact the question has on A (how uncertain we are about it)

##### Mentions

###### Questions - Unanswered

- Does this make more sense as a 0 or 1 score? Mentions or doesn't?
	- in between could be nice for arguing whether something is ambiguously implied
		- but this seems somewhat of a niche thing to take advantage of - I'd guess that most times there's just a direct quote provided, and the Claim is a summary or direct text from that quote

## Core features

- features enabled by the structure
- other candidates that could migrate here from notes elsewhere: the tradeoffs table (see [Criterion](#Criterion)), question prioritization via guides/clarifies chaining (see [Edge weight score](#edge-weight-score)), "how good is a solution" calculation

### Calculated arguments

#### Meaning

- many of the arguments in an argument map about a node's score can be _calculated_ based on causation to/from the node, rather than manually maintained as claims:
	- arguments supporting a higher score: nodes with positive score that this node causes, nodes with negative score that this node reduces
	- arguments supporting a lower score: nodes with negative score that this node causes, nodes with positive score that this node reduces, nodes that impede this node ? (see questions - not sure if impediments should be included - should "change importance" include attainability?)
- e.g. in the [Example](#Example), "the wall costs billions" doesn't need to be a manual claim critiquing the wall's score - `wall causes[8,8,8] wall-cost`, combined with `wall-cost`'s negative scores, _is_ that con, calculably
- this reuses the "multiply edge weights by concept scores" machinery from "how good is a solution" (see Causes notes under [Edge weight score](#edge-weight-score)) - the argument map is that calculation decomposed per-neighbor, displayed as pros/cons

#### Purpose

1. make the contested information easier to maintain: causes are often reused across many arguments, so updating a few cause-effect relations (or concept scores) automatically updates every calculated argument they participate in - in a manual argument map, each affected argument would have to be found and edited by hand
	- e.g. `long-wait` feeds calculated arguments in multiple places (its `causes` edge argues about the topic's score; `more-admin reduces long-wait` argues for `more-admin`) - one update to `long-wait`'s score or edges flows to all of them
2. keep the shared structure more side-free in wording
  - "X causes Y" just models reality, and calculated arguments can use standardized wording - manual claim wording usually reads as taking a side (e.g. "people will find a way over the barrier")
	- the side of the calculated argument is also based on the viewer's own scores rather than baked into the shared structure; though non-causal supports edges using a -8 to 8 score also allows claim pro/con status to be calculated

#### Notes

- claim lifecycle: claims can temporarily be manually added to an argument chain, but ideally they're then converted into causal form (concepts + causal edges) and thereby calculated into the argument map instead
	- some arguments aren't causal and stay as manual claims - candidates: evidence about truth (statistics, anecdotes, source mentions), definitional disputes, pure value assertions
	- the [Example](#Example)'s claims sort accordingly: `physical-barrier` / `climb-over` / `visa-overstay` / `still-immigrate` / `fleeing-danger` are causal at heart (promotable), while `texas-stat` / `baby-murder` / `unclimbable` are evidence/specifics that stay manual
- arguments about a causal _edge's_ weight seem partly calculable too:
	- competing causes: `still-immigrate` (critiquing `wait-causes-illegal-immig`) is essentially pointing at the sibling causes of `illegal-immig` (`save-money`, `disappear`) as competing explanations
	- mechanism decomposition: `climb-over` and `visa-overstay` critique `wall-reduces`; decomposing that edge into its mechanism (wall reduces "crossings on foot between ports of entry", which causes `illegal-immig`) turns them into ordinary causal arguments about the intermediate node ("people climb over" reduces the wall's effect on it; "most enter via visa overstay" caps its weight on `illegal-immig`)

#### Questions - Unanswered

- do _incoming_ edges argue about a node's score?
	- "Y impedes X": an impediment seems to speak to how attainable X is, not how important it is to change X - e.g. `long-wait impedes legal-immig` doesn't seem to argue that `legal-immig` should be scored lower (alice and bob score it high while fully agreeing it's impeded)
  	- but attainability _does_ seem to relate to "is this is a good option?" because if it's easier to attain then that's a plus. perhaps the impedance should show up in the tradeoffs table but not in the arguments about "is X important to increase?"
	- "Y causes X": `danger causes illegal-immig` feels like it carries the `fleeing-danger` argument ("they're fleeing danger" supports a less-negative topic score), but strictly the argument's causal content is an _outgoing_ edge that doesn't exist yet (illegal immigration reduces the harm those people face) - should promotion prefer creating that outgoing edge, or should sympathetic/incriminating incoming causes count as arguments somehow?
- which arguments are irreducibly non-causal, beyond the candidates in the notes above?
- how should scores migrate when a claim is promoted to causal form?
  - do old truth score + supports weight map 1:1 onto the new concept score + causal edge weight?
    - seems like they may be different-but-related judgments
    - when something has been promoted, could prompt prior scorers to re-score

## Big open questions

- these should be root-level so we can do something like e.g. "option 1" "option 2"

### Is it ok that the three distinct concept score meanings can only have two distinct forms of justification?

- current leaning: yes, seems ok that these are not distinct - keeping the question open in case better ideas for distinguishing come up
- what:
  - a further-positive score means "important to increase", a further-negative score means "important to decrease", a lower absolute-value score means "not important to change"
  - but the claim that's justified behind this score is technically "X is important to increase" - meaning critiques are ambiguous between meaning "important to decrease" vs "not important to change"
- thoughts
- ideas
  - instead of one claim, should we have three claims - one for each meaning?
    - no way - there would be a ton of overlap e.g. a support for "important to increase" would almost always be a critique for "important to decrease" and "not important to change"
  - instead of one claim having "supports" / "critiques", can we have three edge types?
    - same issue as above - even "supports increase" vs "supports decrease" vs "supports no change" seem to have some overlapping justification... e.g. a claim at the same time may "supports decrease" _and_ "supports no change" if the claim conveys that "critiques increase"
  - supports edge score might be able to indicate _which score_ the child claim supports in the parent - see the [Concept scoring semantics](#concept-scoring-semantics-desirability-importance-more-less-vs-good-bad) unanswered question about a pro suggesting a precise score for its parent

### Should claim truth scores be the _only_ possible scores?

- (rather than having other score types and having to match claim scores to them)
- option 1: everything has its own score type (causes, guides, supports, change-importance)
- option 2: only claim truth scores
	- idea: all scores could be about a claim, with scores being negative if an opposite is defined
		- e.g. rather having a concept change-importance score where -8 = important to decrease, 0 = not important to change, 8 = important to increase; with an associated claim truth score -8..8 for "X is important to increase", where negative means opposite i.e. "important to decrease"; we could potentially _only_ have the claim truth score which shows on the concept node directly
	- good
  	- consistency! we could show the same UX for all scores, maybe something like:
    	- show claim e.g. bipolar "A causes B" / "it's important to increase A" / "A fulfills B", unipolar "Q guides Topic" / "Avg walking speed is 4 mph"
    	- show score slider with each segment labeled
			- bipolar: show opposite claim ("A reduces B" / "it's important to decrease A" / "A reduces fulfillment of (??) B")
	- questions
  	- what should segments be labeled?
    	- this seems like it could work for all claims?: -8 = strongly believe _opposite_, -4 = somewhat believe _opposite_, 0 = don't believe, 4 = somewhat believe, 8 = strongly believe
  	- what is opposite of "fulfills"?
    	- e.g. `[solution] fulfills 'inexpensive'/'reduces vehicle speeds'`
      	- agh not sure how this would work - it seems like some criteria have a clear opposite ('_increases_ vehicle speeds') and some don't (I suppose 'expensive' is the opposite of 'inexpensive'? but semantically speaking, this seems the same as "absence of inexpensive")
        	- maybe the "fulfills" score should be 0 to 8 unless the criterion itself has an "opposite" defined?
- questions
  - hmm would we still want to show different colors based on the type of score?
    - would it be enough to show colors based on unipolar vs bipolar scores?
      - no
    - hmm it does seem like it could be nice to color differently based on the specific score's meaning e.g. causal vs supports vs guides vs importance... but not sure if that'd be too cluttery/confusing to figure out
      - the currently-planned coloring was to have good/bad coloring, which works for "important to increase/decrease", "increases an important-to-increase concept"
      - maybe for claim nodes, purple = true, grey = untrue, yellow = opposite of true? seems like it should be different from good/bad color because true is not necessarily "good". Hmm what about claim edges though? they probably don't make sense to be the same color because a negative score is a critique which just means "not true", rather than "opposite"... hmm...
		- which scores should be which colors should be a separate open question
		- notably, regardless of the modeling choice, we should be able to color scores differently based on what they're about, not based on their scale
			- and we can achieve this coloring no matter the answer to this question - if we go all truth scores, then we potentially could have a "claim semantic type" property to specify that this is a "causes" claim vs "change importance claim" etc.

### Concept scoring semantics: desirability? importance? more-less vs good-bad?

- current leaning: Option 4 (change importance), multiplied with causal weights to calculate "how good is a solution" (see Option 4's questions); desirability / current presence / ideal presence as optional clarifier scores when change scores conflict?

#### Notes

- Old issue with not too much to add: [Thought - node scores are a bit ambiguous](https://github.com/amelioro/ameliorate/issues/452)
- More-recent issue with some useful thoughts: [Option to color nodes based on goodness/badness](https://github.com/amelioro/ameliorate/issues/837)
- seems like "change score" and "desirability score" both could be pretty useful
	- "change score" is useful for figuring out how important we each think it is for a thing to change, why we might want solutions
	- but "desirability score" is useful for identifying what we think of as "ideal end state", is this thing good or bad, does it exist
	- having both scores seems like a lot to think through
		- could it be easier if you specify a "how much we have this" score vs "how much we should have this" score?
			- visually it could be as easy as clicking twice - first click is "how much does this currently exist?" "how much should this ideally exist?"
			- "desirability" is akin to "how much should this ideally exist" - 0 "should exist" = -8 desirability, 8 "should exist" = 8 desirability, 4 "should exist" = 0 desirability...? not sure how 0 desirability is represented actually
			- "change score" is akin to "how much should we have this" minus "how much we have this"
				- issue: change score should reflect _how important it is that this changes_, we don't really care as much about _how much (quantity) does this need to change_, which is what the subtraction conveys
					- e.g. if "pedestrians die in car accidents" is a 2 and should be a 1, how do we know that the 2->1 is a critical change?
- things we might want to be able to identify via scores, because they're a source of misunderstanding / disagreement to discuss
	1. how important is it for a thing to change?
	2. how much ideally should a thing exist?
	3. how much does a thing currently exist?
	4. is a thing good or bad? (calculable 2 minus 3 ? not true actually, a thing can be bad and not need to change because it's kept in check already)
- idea 1
	- change importance score: -8 really important to decrease, 0 no need to change, 8 really important to increase
	- desirability, current presence, ideal presence, scores could be clarifiers if the change score differs...?
#### Questions - Unanswered

- "how important is it to increase/decrease this?" is _within the context of the topic_ - e.g. "death" might be less avoidable in a topic like "old people surviving surgeries" vs "children getting hit by cars"
	- so node scores assume value relative to the topic, yet that relation isn't specified via edges to the topic
	- potentially each node could have an extra edge to the topic to be scored instead of scoring the node, but that seems like a lot of extra edges (same concern as Topic's "how to relate all relevant nodes to the Topic?" question)
	- probably just accept the assumption that node scores are relative to the topic, for now?

#### Option 1: desirability "how much do we like this?"

- what is it
	- score answers the question "how much do we like this?"
	- -8 really don't like, 0 indifferent, 8 really like
- good
- bad
	- calculations for "how good is a solution" aren't able to convey how much of things are created that we actually want created
		- e.g. I like chocolate so I score it an 8, but assuming I already eat as much chocolate as I need, this would result in solutions that bring me more chocolate being highly scored, even though I don't need more chocolate

#### Option 2: desirability "do we want more or less of this?"

- what is it
	- score answers the question "do we want more or less of this?"
	- -8 want way less, 0 we have the right amount, 8 want way more
- good
	- calculations for "how good is a solution" would be able to convey how much of things are created that we actually want created
		- e.g. I eat chocolate an amount I like, so I score it a 0, as opposed to an 8 (I really like chocolate), which would result in solutions that bring me more chocolate being lower scored, which is accurate because I don't need more chocolate
- bad
	- scores probably have to significantly change much more often e.g. after implementing a solution

#### Option 3: desirability "do we want this, and how important is it?"

- what is it
	- score answers the question "do we want this, and how important is it?"
	- -8 don't want and really important, 0 indifferent and not important, 8 want and really important
- good
	- doesn't have the "solution scored highly for creating good things that we don't need more of" issue because the "importance" side of the score would scale the "goodness" down
- bad
	- could be ambiguous about whether something is really good or just slightly good but really important

#### Option 4: change importance score "how important is it to change this?"

- what is it
	- score answers the question "how important is it to change this?"
	- -8 really important to decrease, 0 no need for change, 8 really important to increase
- good
	- doesn't have the "solution scored highly for creating good things that we don't need more of" issue because we're scoring how much they should change rather than how good they are
- bad
	- scores probably have to significantly change much more often e.g. after implementing a solution
	- if this is the only score, it wouldn't help convey 1. how good a thing is, 2. how much we currently have of a thing, 3. how much we ideally would have, which are all frequent points of misunderstanding
		- could have these as secondary scores to specify if there's disagreement about change importance...?
			- ugh, specifying multiple scores in the text syntax (see example) seems awkward
	- overshoot isn't captured: a solution that causes way more of a thing than needed still gains value from it via multiplication, when the excess should really count as negative
		- mitigation: when seriously evaluating solutions, create [Criteria](#Criterion) worded such that more of them is a good thing (e.g. "inexpensive", "durable", "avoids excess") - overshoot then creates negative value by poorly fulfilling e.g. "avoids excess"
		- overshoot probably won't happen too often, so handling it via explicit modeling (criteria) rather than automatically in calculations seems reasonable
- questions
	- how would "how good is a solution" be calculated with causation and this score?
		- if something has a change importance of 3, and a solution `causes[8]` it, is that... good? this doesn't take into account how much it's being changed...
			- I suppose a slightly-naive-but-maybe-ok strategy would be to give that solution 3 "good" points for positively changing that
				- but taking into account how much something should change seems important... e.g. if solution B `causes[6]` it, is that sufficient? potentially the `causes[8]` could be interpreted as "causes the ideal amount"...?
					- or a change importance of `[3]` could mean that "ideally we have `causes[3]` for this"
			- hmm this issue would be solved if the concepts were worded with quantities in them... but that seems pretty terrible
		- I think it's fine to just treat the "change importance of 3" as "goodness points" for a solution, so just multiple the change importance by how much the solution causes the concept to change

### Concept scoring: relatively vs absolutely

- current leaning: relative because seems useful and lower cognitive effort ?

#### Option 1: relatively

- i.e. pick a concept on a specific topic and score relatively to that one
- somewhat depends on [Node scoring semantics: desirability? importance? more-less vs good-bad?](#concept-scoring-semantics-desirability-importance-more-less-vs-good-bad)
- good
	- people are naturally better at relative scoring
		- but: absolute scoring _can_ have examples at each score so that you can relatively score vs those
	- decisions within a topic are about score differences between nodes in that topic
		- e.g. a topic about pizza toppings should care that I like pepperoni better, but the score difference between pepperoni and sausage is going to be _completely_ negligible when compared to a concept like "genocide"
		- but: scoring UX could show everything as relative (e.g. no numbers shown, just ordering of nodes) while storing absolute
			- well, there's no need to store absolute in that case if absolute isn't shown, is there?
			- maybe even there could be a visual scale that shows ~6 or so scored nodes from -8 to 8, along with the one node you're trying to score
- bad
	- when a new max or min node is added, all the other nodes need to have their scores updated?

#### Option 2: absolutely

- i.e. score -8 to 8 with examples at each score e.g. -8 = genocide, 8 = preventing nuclear war
- good
- bad
	- decisions about something only somewhat important would have negligible differences between their options
		- e.g. a topic about pizza toppings should care that I like pepperoni better, but the score difference between pepperoni and sausage is going to be _completely_ negligible when compared to a concept like "genocide"
		- but: could having scoring calculations adjust (expand?) based on the min and max scores in a topic

### More advanced claim modeling

- current leaning: should add these but they likely won't require major refactoring of the ontology so can figure it out later
- Would more-advanced claim modeling fit into this ontology cleanly? E.g. multi-premise, deductive instead of just inductive
	- multi-premise: seems like edges would need to become hyperedges...? with a list of source nodes and a list of target nodes e.g. A, B supports C
		- potentially a claim could also be used as a "grouper" to combine other claims. instead of "A, B supports C", it could be "D supports C", "D has premise A" and "D has premise B"
			- what would the text in this "grouper" be? I guess it probably makes sense to have _no_ text and just visually display it as a grouping around the other two claims...?
			- not sure how "OR" logic could be supported distinctly from "AND" logic. maybe "OR" is the default e.g. if you separately have "A supports C" and "B supports C"?
  	- critically, it seems like causal relations might need to mirror whatever change is made here to claim relations - e.g. "A AND B causes C" as a modeling possibility rather than just "A causes C" and "B causese C"
	- deductive: "concludes that"/"therefore" instead of "supports"? then "therefore" edge score should probably be 0 or 1, and chaining with "supports" should carry the fully "strength" of "supports"

### Should other things besides cause & effect be primary? If so, how?

- e.g. ungrounded arguments
	- - arguments can motivate discussion, but they also inherently "take a side", which seems inaccurate vs modeling reality (cause-effect)
		- maybe we could generate pro/con based on cause/effect + perspective scores to deal with this (fleshed out in [Calculated arguments](#calculated-arguments))
	- - arguments are often how people think naturally, e.g. "we should do X because ..."
		- maybe we could generate wording / pro/con based on cause/effect + perspective scores to complement this
	- - it definitely seems like we should be able to support moving from ungrounded arguments _towards_ grounded arguments (i.e. cause-effect)
		- see the claim lifecycle notes in [Calculated arguments](#calculated-arguments)
- e.g. driving/guiding questions

### Do all topics have a topic node? Can there be multiple topic nodes?

- current leaning: ?
- context: some structure relies on topic node(s) existing
	- guiding questions guide the topic node (or other guiding questions)
	- node scores are assumed to be relative to the topic
	- question prioritization can chain through causal edges because topic nodes are concepts in the causal web (see Guides/Clarifies notes under [Edge weight score](#edge-weight-score))
- do all topics have a topic node?
	- seems like some topics might not have a single node that represents them, in which case relations that rely on a topic node wouldn't work
		- maybe making a topic node could be a requirement...?
		- or instead of "topic" we could say "core" node, so that multiple nodes can be important for a single topic...?
- can there be multiple topic nodes?
	- multiple topic nodes could be useful for focusing: e.g. a topic "build a wall" that reduces a topic "illegal immigration" - separate topics would allow people to focus on "build a wall" specifically, as opposed to generally looking at "illegal immigration"
		- perhaps these would be considered "subtopics", but sticking with "topic" terminology for now
	- note: the "core" nodes idea above feels similar to allowing multiple topic nodes

### Should goals be explicitly modeled?

- current leaning: no
  - concepts with large positive/negative scores act as implicit goals, and Guiding Questions imply goals a little more explicitly
  - seems like the explicit modeling is mostly duplicate
- context: the example previously had a goal node `*[8,2,8] Reduced illegal immigration` with `achieves` edges from each option
	- it duplicated the topic node ("Reduced illegal immigration" is just "Illegal immigration into the US" plus the desire to reduce it), with scores roughly the topic's inverted
	- it ended up with no edge to the topic node at all - the options only connected to the causal web via their side effects (e.g. `more-admin` reduces `long-wait`) - suggesting `achieves` edges float alongside the causal structure rather than being part of it

#### Option 1: implicit goals - no Goal nodes or achieves edges

- what is it
	- a "goal" is any concept whose score conveys a strong desire for change (e.g. the topic's `*[-4,0,-8]` implies the goal "reduce illegal immigration"); options connect to the causal web via ordinary causes/reduces/impedes edges
- good
	- fewer node/edge types to learn
	- no duplicate "Reduced X" nodes splitting scores and discussion between them and "X"
	- avoids `achieves` edges paralleling causal chains, which would double-count in calculations (same concern as the duplicate-edges note under Causes)
	- arguing "does the wall achieve the goal?" becomes arguing about a causal edge (`wall-reduces`), which is exactly the grounded-in-mechanism discussion the ontology wants - notably, the example's achieves claims (`physical-barrier`, `climb-over`, `visa-overstay`) were all causal arguments anyway and transferred to the reduces edge unchanged
- bad
	- nothing explicitly declares "what we're trying to accomplish" - newcomers must infer it from scores
		- mitigation: guiding questions carry the agenda (e.g. "What are the most effective ways to reduce illegal immigration?" states the goal pretty directly)
	- Option loses its defining relation ("{Concept} achieves Concept") - what makes a concept an option, and where does a tradeoffs table get its list of options?
		- resolved: manual `#action` tag (subtype renamed to [Action](#Action)); a question's options are calculated by tracing causal edges from the question's target (e.g. `best-ways` guides `illegal-immig`, so its options are the actions whose causal paths reduce `illegal-immig`)
	- "how good is an option" is no longer anchored to a single goal node - it becomes a sum over every scored concept the option causally touches
		- this seems more correct anyway (side effects automatically count), but it's a bigger calculation and harder to explain

#### Option 2: explicit Goal nodes + achieves edges

- what is it
	- what the example previously had: options `achieves` a goal node representing the desired end state
- good
	- explicitly declares intent - a newcomer can see what the group wants at a glance
	- gives Option a clean defining relation, and tradeoffs tables a clean anchor ("options = concepts with achieves edges to the goal")
- bad
	- goal nodes tend to be inversions of concepts already in the map, so they duplicate nodes and split scoring/discussion
	- `achieves` edges shortcut causal chains, double-counting in calculations
	- `achieves` invites ungrounded assertion ("the wall achieves the goal") where a causal edge would demand a mechanism

# Archive

## Big open questions

### How should implied claim's score relate to the score on the parent that implies it?

- concern: right now these lines imply a critical inconsistency:
  - from structure definition: `Claim truth score: 1 = completely false, 5 = might be true or false, 9 = completely true`
  - from the example: `*[-4,0,-9] Illegal immigration into the US &illegal-immig #topic`
  - from the example: `=[-4,0,-9] $illegal-immig is important to increase`
  - so claim truth scores are supposed to be 1 (false) to 9 (true), but implied claims can be about any node or edge, and node and edge scores can be -9 to 9 OR 1 to 9, depending on the type of node / edge.
  - we also specify that the parent node/edge score should always match the implied claim score, being one in the same. due to the above, this is impossible.
- answer: all scores become truth scores, and truth scores support "opposite" (-8..0) scoring so the full possible range of meanings is covered
  - see [Should claim truth scores be the _only_ possible scores?](#should-claim-truth-scores-be-the-only-possible-scores)
	- AI summary of these thoughts:
		1. claim truth scores became -8 = completely opposite of true, 0 = completely absent of truth, 8 = completely true (see [Claim truth score](#claim-truth-score))
		2. all scales shifted from -9..9 / 1..9 to -8..8 / 0..8, so their tops align and absence sits at 0 everywhere (see [Score ranges](#Score-ranges))
		- with those, the parent-score-to-claim-score mapping is the identity for every parent scale:
			- concept change-importance: `$X is important to increase` scored -8 = the opposite is true ("important to decrease"), 0 = absent of truth ("not important to change"), 8 = completely true
			- bipolar edges (causes/fulfils/supports): `$A causes $B` scored -8 = the opposite relation holds (reduces), 0 = no relation, 8 = fully holds
			- unipolar edges (guides/clarifies/answers/mentions): the implied claim just never uses the negative half
		- explicit claims default to 0..8 unless "opposite"/"absent" phrasings are defined for them, so the negative half only exists where it's meaningful (see [Claim truth score](#claim-truth-score))
- thoughts
  - we want concept scores to be -9 to 9; this is critical for allowing the map to switch between displaying opposites ("causes" vs "reduces") based on perspective
  - truth scores don't make sense to be negative, because "false" doesn't mean "opposite of truth" any more than "absence of truth".
    - hmm... technically this may be based on the context of the parent claim. if the parent is about "causes", then it may be appropriate for the claim to have an "opposite of true" (reduces) score value available separately from "absence of truth" (doesn't cause or reduce)
      - it feels janky and overly/unnecessarily-complex though to allow claims to have different score meanings based on what the claim is about. does not seem appropriate.
        - this intuition ended up being the answer anyway: distinguishing "opposite of true" from "absent of truth" is exactly what lets one claim scale absorb every parent scale - the de-janking move was making the -8..8 range universal, with the negative half unlocked by opposite/absent phrasings rather than varying score _meanings_ per claim
  - the core issue seems to be that the parent score (e.g. -9 important to decrease, 0 not important to change) includes different meaning than the implied score (e.g. X is important to increase):
- rejected ideas
  - can we just convert the parent's score into a 1-9 claim range score?
    - I don't think so. main issues with this:
      - it seems like the score mismatch would be confusing... if I scored a -6 for the parent, why does the implied claim have e.g. a 3? I didn't score that!
      - also lossy: the conversion collapses "not important to change" and "important to decrease" into the same low-truth region
  - can we just have the implied claim score _in addition_ to the parent score?
    - this is very suboptimal because:
      - children supports/critiques make sense to be used for both scores
      - the parent score will likely be confusing if the implied claim, with its children supports/critiques, does not directly tie to it
