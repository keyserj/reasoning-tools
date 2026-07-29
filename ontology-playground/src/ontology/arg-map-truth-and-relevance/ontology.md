# Argument map: truth and relevance

Ontology id: `arg-map-truth-and-relevance`. Not implemented in the playground yet — this doc and [example.txt](./example.txt) are where the syntax gets settled first.

This ontology is essentially a narrowing of [ameliorate-v2's contested causal map](../../../../ameliorate-v2/ontology.md) down to claims and supports/critiques edges.

## Structure

- Shared: Nodes & Edges
  - Claim - the only node type
  - supports / critiques - the only edge types, always between claims
    - every edge has its own claim, `A supports B` / `A critiques B`, which can itself be supported/critiqued
- Individual: Scores
  - every score is belief in some claim, 0..8: 0 = don't believe it at all, 8 = strongly believe it
  - a claim's score reads as "truth"; an edge's score reads as "relevance", because of what its claim says (i.e. `A supports B` / `A critiques B`); nothing in the syntax distinguishes these

## Example

### Context

[example.txt](./example.txt) - "Build a wall", adapted from ameliorate-v2's example of the same name so the two ontologies can be compared on the same subject matter. Like any adaptation it's lossy, and what it loses says something about both ontologies: a weighted `causes` edge between concepts can only appear here as a claim whose score is belief in it, and the criteria, questions and sources have no home in this ontology at all.

Scores convey three people's perspectives via the `%perspectives` line.

- Syntax legend:
  - indentation nests a line under the line above
  - `=`: Claim node type (the only node type)
  - `<`: edge whose source is the child (nested) line and target is the parent line
    - edge types: supports, critiques
  - `>`: edge whose source is the parent line and target is the child (nested) line
  - `%[key]: [value]`: key-value property definition - for the parent line when indented, for the document as a whole when at column 0
    - `%description`: a high-level description of the topic - why are we discussing it?
    - `%perspectives: [person1, person2, person3]`: declares whose scores appear in the example, and in what order
  - `[X,Y,Z]`: scores, 0-8, one slot per person in the `%perspectives` order
    - on a claim, after `=` (e.g. `=[4,0,8]`): belief in the claim, roughly "truth"
    - on an edge, after the edge type (e.g. `supports[6,2,-]`): belief in the edge's claim, roughly "relevance"
    - `-` in a slot: that person didn't score it
    - a scoreable claim/edge with no brackets at all: nobody scored it
  - `&some-id`: sets an id on the claim or edge whose line it appears on
  - `$some-id`: references an id; reference lines start with `=`
    - `= $some-id` on an edge's id: references the edge's claim, so it can be supported/critiqued
      - edge's claim: `$source-node [supports|critiques] $target-node`
    - a reference line never carries scores - the declaration holds them; where that hurts readability, the example echoes the referent's score in a `/` comment
  - `~`: a note relevant to its parent line - it would show visually if this were rendered
  - `/`: a meta comment about the example, noting something about its parent line - it wouldn't show if rendered

### What the example shows

- **A claim's score and its link's score pulling apart, in both directions.** `visa-overstay` is casey at claim 1 / link 8: he fully grants that _if_ most immigrants overstay visas the wall is beside the point, and denies the premise. `crime-stat` is casey at claim 5 / link 1: he grants the statistic and denies it bears on harm. This is what the "if true" framing buys — without it, casey has one number per argument and no way to say which half he objects to.
- **A link as the thing being argued.** Bob's whole position is the `= $reduction-supports-wall` block: not that the wall wouldn't work, but that whether it works barely bears on whether to build it.
- **Undercut vs rebut.** `unclimbable` doesn't say `climb-over` is false — it attacks whether fence-climbing evidence transfers to this design, so it hangs off `= $climb-easy-supports`. `climb-over` itself is a plain rebut of `wall-reduces`.
- **Reuse.** `wall-cost` critiques the thesis and supports `more-judges`.

### Questions - Unanswered

- should `= $barrier-supports-reduction` become a third implied-claim block?
  - bob's score of 3 there is currently unexplained, and the natural undercut is a reuse of `$visa-overstay`
  - it would also show a reference used as an argument _inside_ an implied-claim block, which nothing in the example currently does
  - against: three implied-claim blocks may be more than the example needs to make the point

## Structure Details

### Shared: Nodes & Edges

#### Claim

##### Notes

- claims are worded as evaluable statements, since their score is belief in them. A claim and its opposite are separate claims (see [Individual: Scores](#individual-scores))

#### Supports / Critiques

##### Notes

- direction lives in the edge type, not in the sign of a score, which is why the range is 0..8 with no negatives
  - the cost: one edge can't hold a disagreement about _direction_ (alice thinks X supports Y, bob thinks the same X counts against Y). If that comes up, use parallel supports and critiques edges between the same pair. It didn't come up in the example
  - ameliorate-v2 instead uses one `supports` type on -8..8, where a negative score means "actually critiques" - that holds per-person direction disagreement in a single number, which this ontology gives up for legibility

##### Questions - Unanswered

- parallel supports and critiques edges between the same pair can attract overlapping arguments - is manual reuse enough to handle that?
  - "not supports" and "not critiques" overlap at "not true in either direction", so a claim like "X has no bearing on Y" argues against both edges at once and would otherwise be written twice, once under each edge's claim
  - the mitigation is to reuse that claim via `$ref`, the way `wall-cost` is reused in the example
  - it only helps slightly - each edge still carries its own argument, and a reader has to notice the two are the same claim
  - probably not worth more than that: parallel edges should be rare to begin with, so overlapping arguments about them are rarer still

### Individual: Scores

#### Questions - Unanswered

- one belief score for everything, or separate truth and relevance scores?
  - currently one, but it's a recent call and not settled
  - for one score:
    - it's explicit that every score is some "belief" (which implies opinion / something that could be wrong)
    - same score everywhere has a nice consistency
      - since the app's purpose is to _debate_, the belief score gives a nice _debate_ scale to everything, everything worded in terms of "believe" so that it's clear that these things are not absolutely true / relevant / etc.
  - against one score:
    - there's a more-clear distinction between "truth" and "relevance", which are somewhat standard in argument mapping
      - clearer distinction also makes it easier to have them behave differently e.g. via coloring
    - score scales could be labeled more precisely
      - truth: 0 = don't believe, 8 = strongly believe
      - relevance: 0 = not relevant, 8 = definitely relevant
