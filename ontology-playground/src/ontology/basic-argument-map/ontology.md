# Basic argument map

Ontology id: `basic-argument-map`. A subset of [IBIS](../ibis/ontology.md) with no Questions: Idea, Pro, and Con become Claim, Support, and Critique. See [rendering.md](./rendering.md) for how the playground draws it.

## Structure

- Claim states something without taking a supporting or critical stance toward its parent.
- Support argues for its parent; Critique argues against its parent. Any of the three types can be a root or nest under any other type.
- Edges point from child to parent. Their types follow the child: Claim `relatesTo`, Support `supports`, and Critique `critiques`. Edges carry no independent information.
- A reference reuses one node and retains its declared type, regardless of the marker on the reference line. A Claim referenced with `- $id` is still a Claim, not a Critique.
- Notes are the playground's authoring aid, attached to a node or to the document. There are no scores, perspectives, properties, or topic headers.

## Syntax

- `=`: Claim
- `+`: Support
- `-`: Critique
- `~`: a note attached to the enclosing node, or to the document when there is no enclosing node. Notes are leaves; a note cannot annotate another note.
- `/`: a comment hidden from the diagram
- `&some_id`: a trailing node or note ID, using letters, digits, and underscores; a leading underscore is reserved for the renderer
- `$some_id`: a whole node-line body that attaches an existing node under a parent. Forward references are allowed, and children of a reference attach to the referenced node.
- Indentation nests a line under the nearest shallower node line. Tabs expand to four-column stops.

`?` is an unrecognized marker, including on reference lines. Invalid markers produce an error and skip that line without discarding valid surrounding lines, matching IBIS's error recovery.

## Example

[Session storage](./examples/session-storage.txt) has three root claims about Redis, Postgres, and background jobs. A reused critique shows how one argument can attach to multiple parents.

## Implementation

The parser, highlighter, and graph projection are independent copies of IBIS's. Both ontologies are expected to change infrequently, so the duplicated logic keeps their implementations local; repeated maintenance would be a reason to extract shared helpers.
