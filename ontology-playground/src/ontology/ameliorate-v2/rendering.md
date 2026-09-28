# Rendering: Ameliorate v2

The playground draws the structure and written scores of the [Ameliorate v2 ontology](./ontology.md). [toGraph.ts](./toGraph.ts) projects the semantic document into the shared graph without changing its entities or scores. Calculated arguments, tradeoffs, perspective selection, and the wireframes' navigation remain outside this renderer.

## Views and relation display

Defaults are **Full structure / Implied / bottom-to-top**. Full structure preserves argument-only documents such as Session storage. Bottom-to-top keeps arguments below the proposition they discuss; the shared direction control also offers top-to-bottom, left-to-right, and right-to-left.

**Causal only** keeps causes/reduces/impedes relations whose endpoints are known concepts, and those concepts. Correlations, arguments, questions, and unrelated concepts disappear. Notes follow their semantic parent: a note on a filtered implied claim disappears even if its referent remains. Document notes and score context remain. Session storage contains no causal relations, so this view shows only its document context.

**Implied** draws each relation as a box, with an arrowless incoming half and an outgoing arrow. An edge-implied claim shares its referent's box, and its arguments and notes attach there. Claims about a concept's importance remain separate. Each connector half is drawn independently when its endpoint is known, preserving useful structure while typing an incomplete relation.

**Spelled out** draws relations as labeled arrows. Referenced implied claims appear in separate boxes with matching numbered markers on their referents; invisible anchors help position them. A relation note uses the implied-claim box when one exists, or a rendering-only attachment box otherwise. An attachment box does not create a semantic claim for an unscoreable relation. Concept-implied wording says “[concept] is important to increase”; edge-implied wording quotes its endpoints. Nested wording is bounded, with ID fallback for cycles and unresolved references.

## Labels and source links

Scores display as written, including negative and missing values. An implied claim reads its referent's score. `Scores: [alice, bob, …]` explains slot order; there is no score aggregation or perspective filtering. Tags and relation-derived subtypes annotate base types, and descriptions and opposite wording stay with their owner. The topic remains a concept.

Relation boxes, connectors, and editor relation words share the configurable Relation color. It starts neutral because the same relation word can carry opposite score signs across perspectives. Node shapes and icons distinguish the base types; the shared style pipeline derives colors for each theme.

A box's first source line is its click destination; all its source lines activate it from the editor. A merged relation box starts with the relation declaration, followed by its implied-claim references. A separate implied claim starts with its own reference. Notes and their attachment connectors point to note lines; invisible anchors have no targets. Mermaid replaces self-loops with three segments, which the shared emitter maps to the relation line. Mermaid draws only the last self-loop on a node.

## Examples and limits

Session storage preserves the Arg map example's wording, claims, relations, scores, and notes; its document description is a document note. Build a wall imports the [canonical example](../../../../ameliorate-v2/examples/build-a-wall.txt) directly, so edits there update the playground too.

The full Build a wall map needs zoom and pan in both displays. Implied makes arguments attach directly to their relation; Spelled out keeps the complete proposition beside its arguments, but matching it to a distant connector can require panning. Causal only / Spelled out provides the clearest overview. Direction changes do not make the full map readable at fit-to-screen scale. The [rendering experiment](../../../ai-designs/ameliorate-v2-rendering-spike.md) records measurements and screenshots.
