## TODO (meta)

- [x] add "big open questions > desirability/more-less, desirability/good-bad, desirability/importance"
- [x] put options into overview's structure, link their header to the "big open questions" section
- [x] add overall purpose
- [x] add border wall example in markdown-like syntax that shows off each part of the structure
- flesh out Concept > Basic
- [x] add Criterion to the Example
- more fleshing out?

## Overview

### Purpose

- This ontology is an attempt to make it easier for every individual to contribute their wisdom towards improving a situation, so that a group's problem-solving potential can be fully realized in the form of better, more-satisfying-for-everyone solutions.
- The beliefs driving this ontology are:
	1.  All people have unique, valuable knowledge to add to most topics.
	2.  If it was trivial to combine everyone's unique, valuable knowledge, then we'd unlock society's potential to work together and address problems.
	3.  Known processes for (a) getting up-to-speed; (b) identifying an individual's unique, valuable knowledge that hasn't been said yet; and (c) integrating that info into the current set of group knowledge; are nowhere near as effective as they could be.
	4.  The way that information is organized and presented has profound impact on improving the processes in 3.
	5.  Known ways of organizing and presenting information are nowhere near as effective as they could be.
- TODO: [The value of scored causal structures for refining contested knowledge](The%20value%20of%20scored%20causal%20structures%20for%20refining%20contested%20knowledge.md)

#### Archive

- It's hard to improve situations, especially when many people are involved, and more so when the situation is complex. Even with best effort, it's hard to effectively take into account everyone's points and counterpoints without some becoming drowned out, lost, outdated, forgotten.
	- It's a good first step to use a document instead of a verbal discussion, but that gets messy very quickly.
	- A good second step might be to use an argument map, but (TODO: [The value of scored causal structures for refining contested knowledge](The%20value%20of%20scored%20causal%20structures%20for%20refining%20contested%20knowledge.md))

### What is this?

- This is a document that defines an ontology for representing contested information about a problem or solution
- At a high level, the ontology is a "contested causal map" (naming TBD, see questions section)
	- "contested" because anyone can disagree about any of the details, via scoring and supporting, critiquing, questioning
	- "causal map" because the core of the structure is: concepts (as nodes) with causal relations (as edges) between them
- This overview's [Structure](#Structure) and [Example](#Example) sections are probably the best for quickly grasping the ontology
	- [Structure Details](#Structure%20Details) has more information (e.g. meaning, purpose, open questions) about each piece of the structure
	- [Big open questions](#Big%20open%20questions) has details about open questions that have more significant impact on the ontology than the "open questions" in the structure details section

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
			- but can be one or more of the subtypes e.g. a concept can be a topic and a goal
		- some subtypes can be determined based on the node's relations (e.g. Component)
			- others need to be specified (e.g. Anecdote/Statistic?)
	- Concept
		- Topic?
		- All - Concept causes/reduces/impedes Concept
		- Category - {Concept} categorizes Concept
		- Component - Concept has {Concept}
		- Option - {Concept} achieves Concept ?
		- Goal? - Concept achieves {Concept} ?
		- Criterion - Concept fulfils {Concept}; {Concept} criterion for Question ?
	- Question
		- Guiding Question - Guiding Question informs Topic/Guiding-Question ?
		- Clarifying Question - Clarifying Question informs Node ?
	- Claim
		- note: all scores have an implied claim, where supporting claims support a higher score, critiquing claims support a lower score
		- All - Claim supports/critiques Claim
		- Statistic
		- Anecdote
		- Option - {Claim} answers Clarifying Question
	- Source
		- All - Source mentions Claim
- Individual: Scores
	- [Concept scoring semantics: desirability? importance? more-less vs good-bad?](#Concept%20scoring%20semantics%20desirability?%20importance?%20more-less%20vs%20good-bad?)
	- Claim truth score
	- Edge weight score
		- note: scores don't make sense for these?: categorizes, has, criterion for
		- causes (opposite: reduces/impedes): how much the source moves the target: -9 = strongly reduces it, 0 = doesn't move it at all, 9 = strongly increases it
		- achieves?
		- fulfils: -9 = actively works against it, 0 = doesn't fulfil it at all, 9 = fully fulfils it
		- informs: 0 = ?, 9 = ?
		- answers: 0 = doesn't answer, 4-5 = kind of answers, 9 = fully answers
		- mentions: 0 = doesn't mention, 4-5 = kind of implies, 9 = definitely mentions
		- supports (opposite: critiques): -9 = strongly critiques, 0 = doesn't relate / hard to say, 9 = strongly supports

### Example

#### Context

- Based on arguments about "The US should 'build a wall' to reduce illegal immigration"; tries to show off one of each piece from [Structure](#Structure)
- Syntax legend:
	- `*`: Concept node type
	- `?`: Question node type - guiding vs clarifying is implied by what it informs (a topic/guiding-question vs a specific node)
	- `=`: Claim node type
	- `@`: Source node type
	- `<`: edge whose source is the child (nested) line and target is the parent line
	- `>`: edge whose source is the parent line and target is the child (nested) line
	- `[X]`: a score - node scores appear after the node type character (e.g. `*[-4]`), edge scores appear after the edge type (e.g. `causes[6]`)
	- `&some-id`: sets an id on the node/edge it follows
	- `$some-id`: references an id
  	- the node on the other end of an edge can be specified inline this way (e.g. `> reduces[3] $illegal-immig`) instead of nesting it
		- `= $some-id`: references the implied claim behind that node's/edge's score, so it can be supported/critiqued
	- `#tag`: explicitly specifies a subtype - subtypes like category/component/option/goal/criterion are implied by their edges so aren't tagged
	- `~`: a note relevant to its parent line - it would show visually if this were rendered
	- `/`: a meta comment about the example, noting something about its parent line - it wouldn't show if rendered

#### "Build a wall"

```
/ --- Concepts: the causal core ---

*[-4] Illegal immigration into the US &illegal-immig #topic
  < causes[6] &wait-causes-illegal-immig
    *[-6] Long legal processing times &long-wait
      < causes[7]
        *[-5] Administrative burden of enforcing immigration requirements &admin-burden

*[7] Legal immigration into the US &legal-immig
  > reduces[3] $illegal-immig
  < impedes[6] $long-wait

*[0] Motivations to immigrate illegally &motivations
  > categorizes
    / categorizes doesn't take a score
    *[-2] Saving money by skipping the legal process &save-money
      > causes[4] $illegal-immig
  > categorizes
    *[-3] Wanting to "disappear" (avoid government records) &disappear
      > causes[2] $illegal-immig
  > categorizes
    *[-8] Danger in home countries &danger
      > causes[7] $illegal-immig

*[8] Reduced illegal immigration &less-illegal-immig
  / goal (it's achieved by the options below)
  < achieves[3] &wall-achieves
    *[2] Border wall along the southern US border &wall
      / option
      > has
        / has doesn't take a score
        *[1] Barbed wire along the top &barbed-wire
          / component
  < achieves[6]
    *[5] Increased administrative resources for processing immigration &more-admin
      > reduces[7] $long-wait
  < achieves[5]
    *[3] Reduced immigration requirements &fewer-requirements
      ~ ambiguous: it wasn't stated which requirements would be reduced
      > reduces[6] $admin-burden

/ --- Questions ---

? What are the most effective ways to reduce illegal immigration? &best-ways
  / guiding question
  > informs[8] $illegal-immig
  < informs[7]
    ? Why do people immigrate illegally? &why-immigrate
      / guiding question informing a guiding question

? How do most people illegally enter the US? &how-enter
  / clarifying question (informs a specific node)
  > informs[7] $wall
  < answers[8]
    =[3] Most enter by crossing the border on foot between ports of entry &enter-on-foot
      / claim option
  < answers[8]
    =[7] Most enter legally and overstay visas &visa-overstay
      / claim option

/ --- Criteria: for evaluating the options (3 criteria x 3 options = a minimal tradeoffs table) ---

*[7] Inexpensive &inexpensive
  / criterion: worded so that more of it is good
  > criterion for $best-ways
    / criterion for doesn't take a score
  < fulfils[-3] $more-admin
  < fulfils[7] $fewer-requirements
  < fulfils[-7]
    *[-2] Billions of dollars of construction and maintenance spending &wall-cost
      < causes[9] $wall
        / the wall's fulfilment of "inexpensive" comes via this causal-fulfils chain (causes[9] x fulfils[-7])

*[5] Quick to implement &quick
  / fulfils edges omitted for brevity - only "inexpensive" shows them
  > criterion for $best-ways

*[8] Humane treatment of immigrants &humane
  / fulfils edges omitted for brevity - only "inexpensive" shows them
  > criterion for $best-ways

/ --- Claims: arguing about scores ---

=[6] $wait-causes-illegal-immig
  / implied claim behind the "long waits cause illegal immigration" edge score
  < supports[-4]
    =[6] Even with instant processing, people would still immigrate illegally to save money or "disappear" &still-immigrate

=[3] $wall-achieves
  / implied claim behind the "wall achieves reduced illegal immigration" edge score
  < supports[7]
    =[8] A wall physically stops crossings without needing continuous surveillance &physical-barrier
  < supports[-6]
    =[6] People will find a way over the barrier &climb-over
      < supports[5]
        =[8] It's easy to climb a fence &easy-climb
      < supports[-4]
        =[5] The wall design is tall, without handholds, and topped with barbed wire &unclimbable
  < supports[-5] $visa-overstay
    / reuse: the same claim answers a question above and critiques this edge

=[-4] $illegal-immig
  / implied claim behind the topic's concept score (supports argue it should be scored higher, critiques lower)
  < supports[5]
    =[7] Most people who immigrate illegally are protecting themselves from danger &fleeing-danger
  < supports[-4] &murder-supports-worse-score
    =[3] An illegal immigrant murdered a baby in cold blood last year &baby-murder #anecdote

=[-4] $murder-supports-worse-score
  / implied claim behind the anecdote's support edge score
  < supports[-7]
    =[8] In Texas 2012-2018, illegal immigrants were arrested for violent crimes at half the rate of native-born citizens &texas-stat #statistic
      ~ rates vary by year and state; Texas is used because it tracks immigration status in arrest data

/ --- Sources ---

@ House Judiciary hearing document, Jan 2025 (docs.house.gov) &house-doc
  > mentions[9] $texas-stat
```

#### Structure coverage

- Structure coverage (one of each piece from [Structure](#Structure)):
	- Concept
		- Topic: `illegal-immig` (`#topic`)
		- All: causes (`long-wait` causes `illegal-immig`), reduces (`legal-immig` reduces `illegal-immig`), impedes (`long-wait` impedes `legal-immig`)
		- Category: `motivations` categorizes `save-money` / `disappear` / `danger`
		- Component: `wall` has `barbed-wire`
		- Option: `wall`, `more-admin`, `fewer-requirements` (they achieve the goal)
		- Goal: `less-illegal-immig` (it's achieved by the options)
		- Criterion: `inexpensive` / `quick` / `humane` (criterion for the `best-ways` question); `more-admin` / `fewer-requirements` fulfil `inexpensive` directly, while `wall` fulfils it via a causal-fulfils chain (`wall` causes `wall-cost`, which fulfils[-7] `inexpensive`)
	- Question
		- Guiding Question: `best-ways` informs the topic; `why-immigrate` informs `best-ways`
		- Clarifying Question: `how-enter` informs `wall`
	- Claim
		- All: `easy-climb` supports `climb-over`; `unclimbable` supports[-4] (i.e. critiques) `climb-over`
		- Statistic: `texas-stat`
		- Anecdote: `baby-murder`
		- Option: `enter-on-foot` / `visa-overstay` answer `how-enter`
	- Source
		- All: `house-doc` mentions `texas-stat`
	- Scores
		- Concept score: e.g. `*[-8]` on `danger`
		- Claim truth score: e.g. `=[8]` on `texas-stat`
		- Edge weight score: causes[6], reduces[3], impedes[6], achieves[3], fulfils[7]/[-7], informs[8], answers[8], mentions[9], supports[7]/[-6]
		- Unscored edges: categorizes, has, criterion for
		- Implied claims behind scores: `= $wait-causes-illegal-immig` (a causes edge's score), `= $illegal-immig` (a concept's score), `= $murder-supports-worse-score` (a supports edge's score)
	- note: argument-map "reuse" (same claim in multiple arguments) falls out naturally from the graph: `visa-overstay` both answers `how-enter` and critiques `wall-achieves`

#### Questions - Unanswered

- questions and sources are left unscored here because [Structure](#Structure) doesn't define scores for them - should they have importance / credibility scores respectively?

#### Questions - Kind of answered

- should an implied claim's score just _be_ the score of the node/edge it wraps, or is it a separate truth score?
		- it should just _be_ the same score (shown matching here, e.g. `causes[6]` and `=[6] $wait-causes-illegal-immig`)
		- still open: is there a good way to show the score in only one of the two spots? it seems relevant in both

#### Questions - Answered

- should `answers` edges be scoreable, or do the answering claims' truth scores cover it?
	- scoreable - truth doesn't cover it because a claim can be true and yet not relevant to the question

### Benefits / goals

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

##### Option

- Option - {Concept} achieves Concept ?

###### Meaning

###### Purpose

##### Goal

- Goal? - Concept achieves {Concept} ?

###### Meaning

###### Purpose

##### Criterion

- Criterion - Concept fulfils {Concept}; {Concept} criterion for Question ?

###### Meaning

- A quality by which options can be evaluated, e.g. "inexpensive", "durable", "avoids excess"
- ideally is worded such that more of it is a good thing, for consistency (also makes "how good is a solution" slightly easier to calculate)

###### Purpose

- Enable a tradeoffs table: options along one axis, criteria along the other; each option's value = sum over criteria of (how much the option fulfils the criterion) x (how important the criterion is, -9 to 9)
	- In theory, this table could be created just by looking all the things caused/reduced by a solution, but generally it's much easier to think about through a smaller set of common criteria
- Provide a way for "causing too much of a thing" to create negative value (e.g. a solution that creates excess would poorly fulfil "avoids excess")

###### Notes

- the causal-fulfils edge chain from an Option to a Criterion determines how much the Option fulfils the Criterion
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

##### Questions - Unanswered

- can a guiding question have a parent that _isn't_ the topic itself?
  - hmm potentially guiding questions can be broken into further guiding questions? hard to say
    - in this case though, the child "guiding question" probably wouldn't make sense to be displayed in the root set of "guiding questions" for a topic
      - hmm maybe it wouldn't necessarily be more important than the parent but it could be more important than other root questions. e.g. "Why do people immigrate illegally?" guides "What are the most effective ways to reduce illegal immigration?", yet is also pretty important to the topic of illegal immigration
  - clarifying questions _do_ seem like they could have a topic parent
    - e.g. "concept: cars going too fast" < informs "question: how fast do cars go on average here?"
    - I guess this means we can't just distinguish guiding vs clarifying via looking at what the parent is
  - for now it seems like we could say that guiding questions will "guide" either the topic node or another guiding question
- how should guiding vs clarifying questions be scored?
  - clarifying seems better scored via edge because a question can relate to different nodes in different amounts of relevance
  - if there's no edge for guiding, then scoring to prioritize a guiding question will be different than scoring a clarifying question
  - a guiding edge does seem like its importance is to a topic, and we therefore have a similar problem to [TODO: link to section where we talk about node scores being all relative to topic and it not being worth moving these into an edge relation to the topic because there'd be too many edges]
- how to distinguish Guiding vs Clarifying questions?
  - definitely want to distinguish these - "guiding" help drive our understanding of the topic, clarifying are simpler, usually narrower / about something specific
  - note: guiding questions will want the ability to select from a list (e.g. "what causes this node?", "what addresses this node?", these generally can have automatic views created for them) OR be custom - clarifying questions should generally be custom (e.g. "are there any studies about this?")
  - option 1: edge type "informs" = guiding, "clarifies" = clarifying
    - + "clarifies" is clear
    - - "informs" doesn't really exclude "clarifies"
      - "guides"? seems ok
    - ? would questions themselves still need scoring, or just the edges then?
    - ? do all topics have a "topic node"?
      - seems like some topics might not have a single node for them, in which case this relation reliance wouldn't work
        - maybe making a topic node could be a requirement...? or instead of "topic" we could say "core" node, so that multiple nodes can be important for a single topic...?
  - option 2: manually specify "guiding" question (e.g. checkbox)
  - option 3: no edge = guiding, "informs" ("clarifies"?) = clarifying
  - option 4: ?
- "guiding" vs "driving" verbiage?
  - "driving"
    - + strong, like "motivating"
    - - on its own can make people think of cars rather than reasoning
  - "guiding"
    - - doesn't imply "motivating" so much

##### Guiding Question

- Guiding Question informs?/guides?/relevant for? Topic/Guiding-Question ?

###### Questions - Unanswered

- better name?
	- "driving question" - initially invokes idea of driving as in "driving a car", like a driving exam
- what edge name to use?
	- "informs" seems to imply that there's uncertainty in the topic if the question isn't answered, but that doesn't seem right
	- hmm if questions themselves are scored by importance, the edge may not matter?
		- could also do "important for" ...?

##### Clarifying Question

- Clarifying Question informs Node ?

#### Claim

##### Notes

- See [More advanced claim modeling](#More%20advanced%20claim%20modeling)

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
	- no: "desirability" score is probably more like a "credibility" score? still (-9 to 9) probably though
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

#### Concept scoring semantics: desirability/importance?

##### Questions - Unanswered

- [Concept scoring semantics: desirability? importance? more-less vs good-bad?](#Concept%20scoring%20semantics%20desirability?%20importance?%20more-less%20vs%20good-bad?)
- how to convey "I want to talk about this"?
	- does this have value asynchronously? seems like conveying "I think this is important" is sufficient asynchronously
	- synchronously, it seems like this could be handled by something like [Suggesting and voting on a new focus](https://github.com/amelioro/ameliorate/issues/314)
		- does this make sense as _part_ of the ontology...?
		- this _could_ be useful asynchronously? though maybe a "driving question"

#### Claim truth score

##### Questions - Unanswered

- are there alternative semantics for a claim's score?
- are there better names than "truth"?
	- "credence" - maybe slightly academic, but more-explicitly implies "our _belief_ that something is true" as opposed to "absolutely true"
	- "veracity"

#### Edge weight score

##### Causes (opposite: reduces/impedes)

###### Notes

- enables calculating "how much does node A cause node B?"
	- by multiplying causal weight scores
		- probably normalized to -1..1 (score / 9), so that chained causation attenuates rather than compounds
	- and this, combined with [Concept scoring semantics: ?](#Concept%20scoring%20semantics%20?): "how much does node B _matter to_ node A?"
		- by multiplying causal score by concept score e.g. goodness
- avoid duplicate edges when a chain already conveys the relation (e.g. A causes B and B causes C, plus a direct A causes C edge) - the duplicate would double-count in calculations

##### Mentions

###### Questions - Unanswered

- Does this make more sense as a 0 or 1 score? Mentions or doesn't?
	- in between could be nice for arguing whether something is ambiguously implied
		- but this seems somewhat of a niche thing to take advantage of - I'd guess that most times there's just a direct quote provided, and the Claim is a summary or direct text from that quote

## Big open questions

- these should be root-level so we can do something like e.g. "option 1" "option 2"

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
			- "desirability" is akin to "how much should this ideally exist" - 0 "should exist" = -9 desirability, 9 "should exist" = 9 desirability, 5 "should exist" = 0 desirability...? not sure how 0 desirability is represented actually
			- "change score" is akin to "how much should we have this" minus "how much we have this"
				- issue: change score should reflect _how important it is that this changes_, we don't really care as much about _how much (quantity) does this need to change_, which is what the subtraction conveys
					- e.g. if "pedestrians die in car accidents" is a 1 and should be a 0, how do we know that the 1->0 is a critical change?
- things we might want to be able to identify via scores, because they're a source of misunderstanding / disagreement to discuss
	1. how important is it for a thing to change?
	2. how much ideally should a thing exist?
	3. how much does a thing currently exist?
	4. is a thing good or bad? (calculable 2 minus 3 ? not true actually, a thing can be bad and not need to change because it's kept in check already)
- idea 1
	- change importance score: -9 really important to decrease, 0 no need to change, 9 really important to increase
	- desirability, current presence, ideal presence, scores could be clarifiers if the change score differs...?
#### Questions - Unanswered

- how do the semantics work with claims?
	- e.g. pro = scored higher / con = scored lower
	- seems like it might be possible for a pro with a "supports" score of 4 to suggest that the parent claim should be a 4?
		- this would allow a pro to advocate for a precise positive score rather than the general "this supports the score being higher"
			- would this be harder to think through?
			- would an unscored "supports" edge mean that it doesn't support?
				- probably default unscored score to like a 5 or something "somewhat supports"
			- it does seem more fitting for a claim to not be a pro or a con except through its edge, and a 0-scored "supports" _doesn't_ support
- do the semantics allow/benefit-from distinguishing the _kind_ of claim, e.g. relevance support vs importance support vs truth support?
- "how important is it to increase/decrease this?" is _within the context of the topic_ - e.g. "death" might be less avoidable in a topic like "old people surviving surgeries" vs "children getting hit by cars"
	- so node scores assume value relative to the topic, yet that relation isn't specified via edges to the topic
	- potentially each node could have an extra edge to the topic to be scored instead of scoring the node, but that seems like a lot of extra edges (same concern as Topic's "how to relate all relevant nodes to the Topic?" question)
	- probably just accept the assumption that node scores are relative to the topic, for now?

#### Option 1: desirability "how much do we like this?"

- what is it
	- score answers the question "how much do we like this?"
	- -9 really don't like, 0 indifferent, 9 really like
- good
- bad
	- calculations for "how good is a solution" aren't able to convey how much of things are created that we actually want created
		- e.g. I like chocolate so I score it a 9, but assuming I already eat as much chocolate as I need, this would result in solutions that bring me more chocolate being highly scored, even though I don't need more chocolate

#### Option 2: desirability "do we want more or less of this?"

- what is it
	- score answers the question "do we want more or less of this?"
	- -9 want way less, 0 we have the right amount, 9 want way more
- good
	- calculations for "how good is a solution" would be able to convey how much of things are created that we actually want created
		- e.g. I eat chocolate an amount I like, so I score it a 0, as opposed to a 9 (I really like chocolate), which would result in solutions that bring me more chocolate being lower scored, which is accurate because I don't need more chocolate
- bad
	- scores probably have to significantly change much more often e.g. after implementing a solution

#### Option 3: desirability "do we want this, and how important is it?"

- what is it
	- score answers the question "do we want this, and how important is it?"
	- -9 don't want and really important, 0 indifferent and not important, 9 want and really important
- good
	- doesn't have the "solution scored highly for creating good things that we don't need more of" issue because the "importance" side of the score would scale the "goodness" down
- bad
	- could be ambiguous about whether something is really good or just slightly good but really important

#### Option 4: change importance score "how important is it to change this?"

- what is it
	- score answers the question "how important is it to change this?"
	- -9 really important to decrease, 0 no need for change, 9 really important to increase
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
		- if something has a change importance of 3, and a solution `causes[9]` it, is that... good? this doesn't take into account how much it's being changed...
			- I suppose a slightly-naive-but-maybe-ok strategy would be to give that solution 3 "good" points for positively changing that
				- but taking into account how much something should change seems important... e.g. if solution B `causes[6]` it, is that sufficient? potentially the `causes[9]` could be interpreted as "causes the ideal amount"...?
					- or a change importance of `[3]` could mean that "ideally we have `causes[3]` for this"
			- hmm this issue would be solved if the concepts were worded with quantities in them... but that seems pretty terrible
		- I think it's fine to just treat the "change importance of 3" as "goodness points" for a solution, so just multiple the change importance by how much the solution causes the concept to change

### Concept scoring: relatively vs absolutely

- current leaning: relative because seems useful and lower cognitive effort ?

#### Option 1: relatively

- i.e. pick a concept on a specific topic and score relatively to that one
- somewhat depends on [Node scoring semantics: desirability? importance? more-less vs good-bad?](#Node%20scoring%20semantics%20desirability?%20importance?%20more-less%20vs%20good-bad?)
- good
	- people are naturally better at relative scoring
		- but: absolute scoring _can_ have examples at each score so that you can relatively score vs those
	- decisions within a topic are about score differences between nodes in that topic
		- e.g. a topic about pizza toppings should care that I like pepperoni better, but the score difference between pepperoni and sausage is going to be _completely_ negligible when compared to a concept like "genocide"
		- but: scoring UX could show everything as relative (e.g. no numbers shown, just ordering of nodes) while storing absolute
			- well, there's no need to store absolute in that case if absolute isn't shown, is there?
			- maybe even there could be a visual scale that shows ~6 or so scored nodes from -9 to 9, along with the one node you're trying to score
- bad
	- when a new max or min node is added, all the other nodes need to have their scores updated?

#### Option 2: absolutely

- i.e. score -9 to 9 with examples at each score e.g. -9 = genocide, 9 = preventing nuclear war
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
			- not sure how "OR" logic could be supported distinctly from "AND" logic. maybe "OR" is the default e.g. if you have "A supports C" and "B supports C"?
	- deductive: "concludes that"/"therefore" instead of "supports"? then "therefore" edge score should probably be 0 or 1, and chaining with "supports" should carry the fully "strength" of "supports"

### Should other things besides cause & effect be primary? If so, how?

- e.g. ungrounded arguments
	- - arguments can motivate discussion, but they also inherently "take a side", which seems inaccurate vs modeling reality (cause-effect)
		* maybe we could generate pro/con based on cause/effect to deal with this
	- - arguments are often how people think naturally, e.g. "we should do X because ..."
		* maybe we could generate wording / pro/con based on cause/effect to deal with this
	- - it definitely seems like we should be able to support moving from ungrounded arguments _towards_ grounded arguments (i.e. cause-effect)
- e.g. driving/guiding questions

# Archive
