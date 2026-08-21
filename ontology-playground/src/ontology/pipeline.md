# The four layers of an ontology

Each `src/ontology/<id>/` is the same four steps, and most questions about "where does this belong?" are answered by which of them may know what. `types.ts` is the contract they meet at; this file is the division of labor between them.

| File                                      | Owns                                                                                                    | May not know                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `parse.ts`                                | the syntax: markers, indentation, ids, and **where each thing was written**                             | how anything is drawn                                        |
| `model.ts`                                | what the ontology means: its own vocabulary and relations                                               | mermaid, colors, shapes; which line an entity was written on |
| `toGraph.ts`                              | the rendering decision: which boxes and connectors a model becomes, under the lens the features ask for | mermaid's spelling                                           |
| `toMermaid.ts` + `../mermaidFlowchart.ts` | emission: identifiers, escaping, `classDef`, `linkStyle`                                                | anything about the ontology                                  |

## Source positions belong to the syntax, not to the model

A line number is a fact about how a document was _written_, not about what it means — the same argument reads the same whether it starts on line 1 or line 40. So the entities in `model.ts` don't carry one. They come out of `parse.ts` in a table beside them instead: `SourceLines`, keyed by the id of the thing the line declared (`types.ts`).

`toGraph.ts` copies those lines onto each `RenderNode`/`RenderEdge` it builds, so `flowchart()` can emit a `SourceMap` keyed by the mermaid ids it mints. That map is how a line of text and the box it drew find each other. (`ParseError` carries a line of its own, straight off the parser's loop — it never needs the table.)

**An ontology that doesn't fill `sourceLines` loses editor↔diagram linking, and nothing else breaks.** No type error, no failing render — the boxes simply stop lighting up. `registry.test.ts` fails an ontology whose examples map nothing, which is the backstop.

Which lines map is a rendering question, so it is answered here rather than in the parser: a box leads with the line that wrote _it_ (a Kialo copy leads with the `$ref` line that reuses the claim, not the line declaring it) and carries the lines of the claim's other uses after, so the caret on any use lights up every copy; a connector takes the line that says the two are related (usually the child's); and anything the document didn't write — an anchor, mermaid's empty-graph placeholder — takes none. `lines[0]` is where a click on the element puts the caret.

## Why flattening sits on the render side

`toGraph.ts` is part of rendering, not of the model, because how a model is drawn can depend on the feature lens it is drawn through: arg-map's edge claims are connectors under one option and boxes under another, from one unchanged `ArgDoc`. An ontology whose model already is a `RenderGraph` simply hands it through.
