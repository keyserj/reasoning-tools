# IBIS

Ontology id: `ibis`. [Issue-based information system](https://en.wikipedia.org/wiki/Issue-based_information_system) — the classic question/idea/pro/con argument map, and the playground's first ontology. How the playground draws it is kept in [rendering.md](./rendering.md).

This is a well-established ontology rather than one being designed here, so this doc records what the playground implements rather than settling open questions.

## Structure

- Nodes
  - Question / Issue - something to resolve
  - Idea / Position - a possible answer to a question
  - Pro / Con - an argument for or against whatever it hangs under
  - Note - an annotation, shown but not argued with
- Edges
  - one edge type per node type, always pointing from a child **up** to the parent it answers, supports or objects to
  - the edge carries no information of its own: which kind of edge it is follows entirely from the child's type, so there is nothing to say about an edge that the child doesn't already say

## Example

[examples/session-storage.txt](./examples/session-storage.txt) — two questions about session storage and background jobs, chosen to show off the syntax rather than to actually make an argument.

- Syntax legend:
  - indentation nests a line under the line above
  - `?`: Question / Issue
  - `=`: Idea / Position
  - `+`: Pro
  - `-`: Con
  - `~`: a note relevant to its parent line - shown in the diagram
  - `/`: a meta comment about the example - not shown in the diagram
  - `&some_id`: sets an id on the node whose line it appears on
  - `$some_id`: references an id, attaching the existing node under a new parent instead of creating one. The whole line body must be the reference

## Structure Details

### Notes

- there is no score, no perspective and no notion of an argument's strength
- a pro or con can hang off another pro or con, which is how objections to an argument get expressed. There's no distinction between rebutting a claim and undercutting its relevance — both are just a child con
