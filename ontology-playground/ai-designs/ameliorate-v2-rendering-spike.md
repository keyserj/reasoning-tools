# Ameliorate v2 rendering experiment

The real build-a-wall example renders through the existing Mermaid emitter and `DiagramPane` in both views, both edge-claim displays, and both themes. Direction options are BT, top-to-bottom, and LR. The main obstacle is density: the full map needs zoom and pan to read. Changing direction does not make the complete example readable at fit-to-screen scale.

[Open the experiment](http://localhost:5173/reasoning-tools/ontology-playground/ai-designs/ameliorate-v2-rendering-spike.html) with the playground dev server running. Its entry is [the HTML harness](./ameliorate-v2-rendering-spike.html); the temporary [projection](../src/experiments/ameliorate-v2/toGraph.ts) imports the existing script model, and [the component](../src/experiments/ameliorate-v2/Experiment.tsx) imports the original parser and example. This implements step 1 of [the integration plan](./add-ameliorate-v2.md). Parser relocation and registration follow review.

## Defaults and limitations

- Keep **BT** as the initial direction. It fits the causal view better than LR and keeps arguments below the proposition they discuss. Top-to-bottom is available as **TD**, using the playground's existing `TB` value; Mermaid treats TD and TB identically.
- Use **Full structure / Implied** as the integration defaults, and Implied as the existing argument-map ontology's default. Full structure preserves an argument-only example such as session-storage. Implied attaches arguments directly to the relation box, at the cost of an extra row of relation boxes between claims. Its full-map fit scale is slightly larger than Spelled out's because the layout distributes the boxes differently; box count alone does not predict readability.
- Keep **Spelled out** available to show the complete relation proposition beside its arguments. Build-a-wall's full view requires zoom and pan in both displays.
- **Causal only / Spelled out** is the clearest overview of build-a-wall. It retains 11 concepts, 11 causal relations, the relevant note, and score context. It intentionally omits the wall's arguments, criteria, and questions.

The rendering represents all written scores without interpreting a negative `supports` score as positive support. Relation connectors and boxes use a neutral style; node shapes and icons distinguish the base types. Tags and relation-derived subtypes appear as annotations. The topic's full description and the two written opposites remain with their nodes, increasing label height. At a readable zoom, long cross-map connectors and detached-claim matching still require panning. These are accepted limits of this experiment, not evidence that the final browsing experience is solved.

## Measurements

Measured in Chromium on 2026-09-12 at a 1440 × 1000 viewport, with a 1440 × 895 diagram pane. Bounds come from the laid-out SVG viewport's `getBBox()`; text size is the 16px label font multiplied by the fit transform. Both themes produce the same geometry. These measurements describe the full-width experiment; the playground's editor will leave less horizontal space.

| View | Edge claims | Boxes | Visible connectors | Invisible anchors |
| --- | --- | ---: | ---: | ---: |
| Full structure | Spelled out | 41 | 43 | 5 |
| Full structure | Implied | 79 | 84 | 2 |
| Causal only | Spelled out | 13 | 12 | 1 |
| Causal only | Implied | 24 | 23 | 1 |

Full structure includes all 38 semantic nodes and 41 relations from the original document. Three edge-implied claims merge into their relation boxes in Implied; the concept-implied claim stays separate. Box counts also include notes and score context; visible connector counts include note attachments.

| View / edge claims | BT bounds | BT fit text | LR bounds | LR fit text |
| --- | ---: | ---: | ---: | ---: |
| Full / Spelled out | 6027 × 2198 | 3.8px | 2922 × 3790 | 3.8px |
| Full / Implied | 5282 × 3008 | 4.4px | 3781 × 3318 | 4.3px |
| Causal / Spelled out | 1688 × 1359 | 10.4px | 2434 × 1057 | 9.4px |
| Causal / Implied | 1704 × 1715 | 8.3px | 2664 × 1079 | 8.6px |

## Tracing the wall-reduces argument

In Spelled out, the detached **①** claim reads `"Border wall along the southern US border" reduces "Illegal immigration into the US"`, with `[3,-5,8]`. The same marker and score appear on the causal connector. The physical-barrier, caging-effect, climb-over, and visa-overstay claims point to that detached claim; how-enter clarifies it. Visa-overstay also remains connected as an answer to how-enter. At 0.854× zoom, about 13.7px text, the argument cluster is readable, but the original causal connector is outside the viewport and must be found by panning or zooming out.

In Implied, those arguments reach the original `wall-reduces` relation box, which displays `reduces` and `[3,-5,8]` once. There is no duplicate implied-claim box. At 0.812× zoom, about 13px text, the relation and its immediate arguments are readable; following its long incoming/outgoing connectors to the concept endpoints still requires panning. This display makes attachment structural, while Spelled out keeps the complete proposition visible locally.

| Screenshot | Light | Dark |
| --- | --- | --- |
| Full / Spelled out, BT fit | [Light](./ameliorate-v2-rendering-spike/full-spelled-out-bt-light.png) | [Dark](./ameliorate-v2-rendering-spike/full-spelled-out-bt-dark.png) |
| Full / Implied, BT fit | [Light](./ameliorate-v2-rendering-spike/full-implied-bt-light.png) | [Dark](./ameliorate-v2-rendering-spike/full-implied-bt-dark.png) |
| Causal / Spelled out, BT fit | [Light](./ameliorate-v2-rendering-spike/causal-spelled-out-bt-light.png) | [Dark](./ameliorate-v2-rendering-spike/causal-spelled-out-bt-dark.png) |
| Causal / Implied, BT fit | [Light](./ameliorate-v2-rendering-spike/causal-implied-bt-light.png) | [Dark](./ameliorate-v2-rendering-spike/causal-implied-bt-dark.png) |
| Wall argument / Spelled out, BT zoom | [Light](./ameliorate-v2-rendering-spike/wall-argument-spelled-out-light.png) | [Dark](./ameliorate-v2-rendering-spike/wall-argument-spelled-out-dark.png) |
| Wall argument / Implied, BT zoom | [Light](./ameliorate-v2-rendering-spike/wall-argument-implied-light.png) | [Dark](./ameliorate-v2-rendering-spike/wall-argument-implied-dark.png) |

LR fit comparisons: [Full / Spelled out](./ameliorate-v2-rendering-spike/full-spelled-out-lr-light.png) and [Causal / Spelled out](./ameliorate-v2-rendering-spike/causal-spelled-out-lr-light.png).

Top-to-bottom reverses BT's ranks and has the same unscaled bounds. Its score-context box follows the sinks to the bottom. TD fit comparisons: [Full / Implied](./ameliorate-v2-rendering-spike/full-implied-td-light.png) and [Causal / Implied](./ameliorate-v2-rendering-spike/causal-implied-td-light.png).

## Verification and remaining work

All 24 view/display/direction/theme combinations render successfully, including the eight top-to-bottom combinations. The existing zoom, fit, and drag controls work on the experiment. Editing the external example updates the diagram through Vite, including adding and removing a document note; the original example is restored unchanged. Fresh loading and example updates produce no browser errors. Four focused tests protect the real example's reused claim, implied-claim aliasing and score ownership, model immutability, and causal filtering with notes.

The experiment uses empty source maps and provides no editor, tokenizer, style dialog, or ontology registration. General parser recovery, synthetic-ID edge cases, and the full source-linking test matrix remain in later plan steps. The temporary harness is outside the production entry graph and is removed after integration reproduces its reviewed behavior.
