# Add Ameliorate v2 to the ontology playground

## Summary

Add Ameliorate v2 as a playground ontology for inspecting its structure and written scores. The existing parser provides most of the semantic implementation; rendering implied claims and keeping a dense graph understandable are the largest remaining tasks. Move the reusable code into the playground and let the existing scripts import it directly. The ontology document remains the source of truth as the design evolves.

- Ship **Full structure** and **Causal only** views, with Full structure as the initial default.
- Keep **Edge claims: Spelled out / Implied**, with Implied as the initial default for both Ameliorate and the existing argument-map ontology. Keep BT as the initial direction and offer top-to-bottom (TD, represented as TB in the playground) alongside LR in the experiment.
- Ship a small session-storage example first and reuse the original build-a-wall example as the comprehensive example.
- Preserve current parsing and validation behavior, including documented discrepancies with the ontology specification.
- Defer calculated arguments, tradeoffs tables, perspective selection, score-distribution coloring, and the wireframes' agenda/detail navigation. The scripts do not yet implement calculated arguments or tradeoffs, and those features involve additional semantic and UI decisions.

The [main ontology document](../../ameliorate-v2/ontology.md) owns the ontology's meaning and open questions. The [playground pipeline](../src/ontology/pipeline.md) owns the separation between parsing, semantic models, graph projection, and Mermaid emission. Follow the [add-ontology skill](../../.claude/skills/add-ontology/SKILL.md) when implementing.

## Major differences from existing playground ontologies

| Area | Existing ontologies | Ameliorate v2 consequence |
| --- | --- | --- |
| Semantic structure | IBIS has issues, positions, and arguments; Kialo has theses and pro/con usages; the truth-and-relevance map has claims and supports/critiques edges. | Concepts, questions, claims, sources, and 15 relation phrasings need their own model and projection. The argument-map renderer supplies useful patterns, but its semantic assumptions do not transfer wholesale. |
| Subtypes and properties | The current rendered types cover most distinctions directly. | A concept can carry multiple tags, while relations imply category, component, and criterion subtypes. Render these as annotations on the base type; descriptions and opposites stay with their owners. |
| Scores | Scores represent beliefs or votes, with scales specific to each ontology. | Scores can represent importance, causal influence, fulfillment, or belief depending on their owner. Signed values and opposite wording matter; a relation word alone cannot determine its score's meaning or color. |
| Claims about relations | The argument map already allows arguments about an edge's relevance. | Both concepts and scoreable relations can have implied claims. An implied claim reads its referent's score, and its representation changes between Spelled out and Implied. |
| Views | Existing switches mainly change argument presentation. | Causal only filters the semantic graph before rendering. An argument-only document can have no causal diagram; filtering must retain the right notes and source links. |
| Density | Existing examples largely show discussion structure. | Build-a-wall combines causal structure, arguments, structural relations, properties, and reuse: 38 semantic nodes and 41 relations, including four implied claims. A real rendering experiment is necessary to assess readability. |
| Diagnostics and source links | The shell displays errors, and current parsers record source locations for editor/diagram linking. | The parser also returns warnings but currently discards its internal locations. Add generic warning display and document-level source locations. |
| Runtime and assets | Existing ontology implementations and examples live inside the playground. | The wireframe generator continues to run the moved parser directly in Node, and build-a-wall remains an external raw text import. These introduce import and dev-server constraints. |
| Scope | Playground ontologies present their models through a common shell. | This port displays structure and written scores. It does not reproduce the wireframes' derived views or navigation, or implement unsettled ontology rules. |

## Code location and runtime

`src/ontology/ameliorate-v2/` owns the model, parser, validation, markers, score parsing, ID helpers, diagnostics, and their unit tests. The remaining scripts import these files directly:

```ts
import { parse } from "../../ontology-playground/src/ontology/ameliorate-v2/parse.ts";
import type { Doc } from "../../ontology-playground/src/ontology/ameliorate-v2/model.ts";
```

There is no separate shared core, package, public facade, or compatibility wrapper. A short comment beside the generator's cross-directory imports acknowledges the awkward dependency and the expectation that these scripts eventually migrate into the playground. Keep generation, question ranking, highlight calculations, and aggregation with their current consumer; some use `toSorted`, while the playground targets ES2022.

The imported files remain plain TypeScript that runs in both environments. Runtime imports must not pull in registration, React, Node APIs, or Vite raw assets; filesystem reads and JSON output stay in the generator. Use existing playground helpers when their semantics match, without building a generalized ontology parser or predicting future ontology changes. Preserve generated IDs and the committed views bundle during the relocation.

### Compiler settings

Leave both packages' current TypeScript configurations unchanged for the port. The playground uses `module: ESNext` with `moduleResolution: bundler`; the scripts use `module: NodeNext` with `moduleResolution: nodenext`. Both already enable `strict`. NodeNext models a different runtime, not a higher level of type safety.

- NodeNext uses file extensions and the nearest package's `type` to model Node's ESM/CommonJS behavior. In ESM, relative imports need explicit extensions and directory imports do not implicitly resolve an index file. Bundler resolution allows extensionless imports because the bundler can resolve them. Both modes support package `exports` and `imports`. [TypeScript module resolution reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html#the-moduleresolution-compiler-option)
- The scripts' `generate` command is `node scripts/generate.ts`, so their existing NodeNext check models their actual runner and follows imports into the playground. That is the reason to keep it while this runner remains. Switching to a transforming runner is a separate tooling choice. Node's native TypeScript execution strips types without typechecking or reading `tsconfig.json`. [Node TypeScript support](https://nodejs.org/docs/latest-v24.x/api/typescript.html)
- `verbatimModuleSyntax` requires type-only imports to be marked explicitly, such as `import type { Doc }`. This prevents an interface import from being preserved as a runtime value import. [TypeScript option reference](https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html)
- `erasableSyntaxOnly` rejects TypeScript constructs that need JavaScript generation, such as enums and constructor parameter properties. Native type stripping cannot handle those constructs by erasure alone. [TypeScript option reference](https://www.typescriptlang.org/tsconfig/erasableSyntaxOnly.html)

The last two flags already exist in the scripts and apply when their typecheck follows the moved files. Adding them to the whole playground would enforce restrictions that its bundler does not require. Neither flag replaces Node-compatible import resolution. Target/library versions and DOM/JSX support are separate settings, not effects of NodeNext.

### Example loading and CI

Keep [build-a-wall.txt](../../ameliorate-v2/examples/build-a-wall.txt) at its current location and import it with `?raw` from the ontology registration module. Both `build-a-wall` and `session-storage` already exist in the shared examples table.

Add `../ameliorate-v2/examples` to Vite's `server.fs.allow`, alongside `searchForWorkspaceRoot(".")` for the playground root. Vite resolves the relative entry against its app root; run commands from the playground as documented. Preserve the existing allowed-host configuration. The external raw import needs this explicit allowance in development; a successful production build does not verify dev-server access. Verify loading and updates after an edit through `npm run dev`.

Add the external build-a-wall text file to the deployment workflow's paths so an example-only edit rebuilds the app. Keep the scripts workflow as it is; do not add cross-package CI triggers or a blanket requirement to run both packages for every playground change. The relocation and parser-metadata steps verify the remaining scripts explicitly because those changes affect their imports or input model.

## Syntax, model, and diagnostics

Preserve the existing grammar: `*`, `?`, `=`, and `@` declare concepts, questions, claims, and sources; `<` and `>` declare directed relations; `%` supplies properties; `&id` and `$id` declare and reuse identities; `#tag` supplies explicit subtypes; `~` adds notes; `/` adds non-rendered comments. Scores stay attached to their markers, and reference lines do not acquire independent scores, properties, or tags. Keep current indentation handling, multiword relation matching, forward-reference resolution, and error recovery.

An implied claim remains a semantic node linked to its referent through `impliedForId`. Its score is read from the referent, never copied into an independently editable score. Referencing an explicit claim reuses that claim directly. Keep subtype combinations, including a concept that is both a topic and an action, and derive relation-defined subtypes from the model.

Preserve known validation limitations: negative `fulfills` scores are accepted without the target's `%opposite`; question/source scores and some tag or subtype combinations remain permissive. Retain the existing tests that pin this behavior. Changes to these rules belong in subsequent ontology work.

Add optional `warnings: ParseError[]` to the shared `ParseResult` contract and the typed `defineOntology` parsing signature. Existing ontologies can omit warnings. Pass them through the generic editor diagnostics and distinguish warnings from errors. Do not discard them or turn them into errors. This is a shared contract/UI enhancement, with no Ameliorate-specific component branches.

### Source locations

“Source metadata” means the editor line numbers associated with each parsed entity. It enables caret-to-diagram highlighting and clicking a diagram element to return to its declaration. For example, `sourceLines.wall = [5, 18]` records a declaration on line 5 and a reuse on line 18. This has no connection to the ontology's evidence-source node type.

Add these fields to `Doc`, keeping line numbers off semantic nodes and edges:

```ts
sourceLines: SourceLines; // entity ID -> 1-based editor lines
perspectiveLines: number[]; // the document's %perspectives lines
```

- Record declarations, every resolved reference use, notes, and rendered node-property lines. Keep perspective locations outside the entity dictionary so metadata cannot collide with accepted user IDs.
- Record a relation's own `<` or `>` line for its connectors. Record each implied-claim reference block under the resolved implied claim, including repeated and forward references.
- In `toGraph.ts`, place the appropriate declaration or implied-claim reference first for each drawn box, followed by its other uses. When a referent and its implied claim share a rendered box, merge their source locations without duplicates. The first line is the click destination; every associated reference line must highlight the representation it names.
- Map note boxes and their attachment connectors to their note lines. Map rendered properties to the box that displays them. Comments, invisible layout anchors, and empty-state placeholders have no source targets.
- Keep renderer-generated IDs collision-free against IDs accepted by the current parser, including underscore-prefixed IDs. Do not impose a new parser restriction to accommodate a header or other synthetic box.

## Rendering

`toGraph.ts` projects the unchanged semantic model into `RenderGraph`; `toMermaid.ts` delegates emission and escaping to the existing shared renderer. Rendering features must not rewrite scores, node identities, or relation wording.

### Views and relation display

Use feature IDs `view` and `edge-claims`, with options `full` / `causal` and `spelled-out` / `implied`. Keep the existing Spelled out / Implied vocabulary. Each ontology owns its feature definitions, so Ameliorate can explain its own semantics without changing the argument map's features or shared URLs.

- **Full structure** includes all declared nodes and relations, referenced implied claims, and notes.
- **Causal only** includes causes/reduces/impedes relations and their concept endpoints, with notes belonging to visible elements and the score context. Correlations, questions, arguments, and unrelated concepts are excluded. Filtering operates on the semantic graph before relation display is chosen.
- **Spelled out** keeps relations as connectors labeled with their written wording and scores. Referenced implied claims appear as separate claim boxes. Matching numbered markers tie a claim box to its concept or relation; layout anchors help position detached boxes. A note on a relation also needs an attachment box. For an unscoreable relation such as `has`, that box is only a rendering representation and must not create a semantic implied claim.
- **Implied** draws every visible relation as a box between its endpoints. Use an arrowless incoming half and an outgoing arrow. An edge's implied-claim arguments attach to that same relation box, without a duplicate implied-claim box or score. Concept-implied claims remain distinct from their concepts. Reused explicit nodes remain shared.

Derive concept-implied wording as “[concept text] is important to increase” and edge-implied wording from its source, written relation, and target. Nested implied claims need bounded wording with ID fallback for unresolved or cyclic references. Empty and partially typed documents must remain renderable; omit connectors whose endpoints cannot be drawn.

### Labels, styling, and highlighting

Show written scores unchanged, with `Scores: [alice, bob, ...]` explaining slot order when perspectives are supplied. Display node descriptions and opposite wording with their owners; keep the topic as a concept rather than replacing it with a document header. Render tags and relation-derived subtypes as label annotations so subtype combinations do not require an expanding set of exclusive node types.

Give concepts, questions, claims, sources, and notes their own rendered types. Use a neutral relation style for relation boxes and connectors: a word such as `supports` can carry negative scores or opposite signs across perspectives, so the word alone must not acquire a pro/con color. Reuse the existing type-color pipeline for node styles, and keep any future score coloring on the repository's red/blue axis.

Implement a line-local tokenizer using the parser's markers and regexes. Node markers use their rendered type; relation words and direction markers use the existing `keyword` kind; subtype tags use `tag`; IDs, references, properties, scores, and comments use their existing kinds. Handle multiword relations and trailing combinations of IDs and tags while preserving every input character. The highlight contract already supports these kinds, but the tokenizer and its tests still need implementation.

## Examples and documentation

Register ontology ID `ameliorate-v2` with label **Ameliorate v2**, and add it to the playground README. Ship examples in this order:

1. **Session storage:** use the [truth-and-relevance example](../src/ontology/arg-map-truth-and-relevance/examples/session-storage.txt) as the closest syntax and score-scale baseline. Preserve its six claims, five relations, wording, scores, explicit IDs, reused operational-cost claim, objection to the speed argument, and notes. Change only `%description: Where should we keep web session state?` into a document note with the same wording. Use this as the default and preserve the example identity when switching ontologies.
2. **Build a wall:** load the original file unchanged to exercise the larger ontology and rendering limits.

The current IBIS, Kialo, and argument-map examples already differ in some details; this port does not expand their combined subject matter. In particular, do not add causal propositions or reframe recommendations as scored action concepts to demonstrate more of Ameliorate. That changes what the example says. An argument-only session-storage example is valid; Causal only can show just its document context. Build-a-wall demonstrates the causal ontology.

Keep a short syntax-teaching placeholder for an empty editor. The local `src/ontology/ameliorate-v2/ontology.md` contains only `[Ameliorate v2 ontology](../../../../ameliorate-v2/ontology.md)`. `rendering.md` owns rendering choices, limitations, and findings from the early experiment.

## Implementation order and acceptance

Each numbered step is a separate review boundary. Implement only that step, run its checks, create one focused commit on the working branch, and report the commit and results. Stop for user review before starting the next step. If a step exposes a decision that changes the remaining design, update the plan before continuing.

Step 1 is reviewed; its [rendering findings and screenshots](./ameliorate-v2-rendering-spike.md) document the full map's need for zoom and pan. The selected defaults are BT / Full structure / Implied, with top-to-bottom also available. Step 2 is implemented and awaiting review: the moved implementation and snapshot remain byte-for-byte identical, all four projected graphs match, and native generation reproduces the views bundle unchanged. Both packages pass their checks, with 335 playground tests and 54 remaining script tests. Steps 3–5 have not started.

Every implementation step runs the playground's typecheck, tests, lint, and `format:check`. Scripts checks are additionally called out where their code or parsed input changes. Inspect deliberate snapshot changes before committing them.

### 1. Render the real example before porting

Add a development-only HTML entry at `ai-designs/ameliorate-v2-rendering-spike.html`, loading a small React harness under `src/experiments/ameliorate-v2/` so TypeScript and lint cover it. The harness imports the existing script parser and the original build-a-wall text, runs a temporary `toGraph` projection through `flowchart`, and mounts the existing `DiagramPane`. Pass `activeLine={null}` and a no-op `onPickLine`; source maps can be empty for this visual experiment.

Implement the rendering rules above in the temporary projection, with controls for both views, both edge-claim displays, theme, and BT/TB/LR direction. Include actual notes, descriptions, opposites, tags, and written scores. Add the Vite filesystem allowance described above so the external raw example loads in development. Registration and the parser contract remain outside this step.

Acceptance: inspect both themes, fit-to-view and readable zoom, reused-node connections, detached claim markers, and the causal core. Trace the wall-reduces argument to its referent. Record screenshots, rendered node/connector counts, the chosen direction, and findings about the Full structure / Implied defaults beside the harness. Readability and any resulting default changes are reviewed before the parser moves.

Follow the repository's server rule: check for an existing server through Playwright; if unavailable, ask the user to run `cd ontology-playground && npm run dev`. Do not start a server.

### 2. Relocate the parser and update script imports

Move `model.ts`, `parse.ts`, `validate.ts`, `markers.ts`, `scores.ts`, `ids.ts`, and `diagnostics.ts` from `ameliorate-v2/scripts/` into `src/ontology/ameliorate-v2/`. Move `parse.test.ts`, `validate.test.ts`, `ids.test.ts`, `scores.test.ts`, and the parser snapshot with them: 93 existing tests. Adjust the moved parser test's fixture loader to import `../../../../ameliorate-v2/examples/build-a-wall.txt?raw`.

Update imports in `generate.ts`, `questions.ts`, `highlights.ts`, `aggregate.ts`, their tests, and the experiment. Keep the remaining 54 generation, ranking, highlight, and aggregation tests under the scripts' existing Vitest configuration. Add the short dependency comment at the generator's imports and the link-only local ontology document. Leave compiler configurations and parser behavior unchanged; helper cleanup can follow in a later step if needed.

Acceptance: run both packages' existing checks and run `npm run generate` from `ameliorate-v2/`. This exercises the imports under native Node as well as the scripts' tests. The parser snapshot, generated IDs, and committed `build-a-wall.views.json` must remain identical. An unchanged bundle requires no wireframe data or version update. The commit should read primarily as file moves and import-path changes.

### 3. Record editor source lines

Add the two `Doc` fields described under Source locations and implement a small line-recording helper in `parse.ts`. Use `idTable()` for the entity dictionary so accepted IDs such as `__proto__` remain safe. The parser already has most of the necessary positions:

- Record node declarations where `declaredAt` is populated, and note positions when note IDs are allocated. Accepted node-property lines append to their owner; `%perspectives` lines go into `perspectiveLines`.
- `PendingEdge.line` identifies the relation line. File it when the explicit edge ID is known, or in `nameUnnamedEdges` when the derived ID becomes final.
- `RefUse.line` survives until `resolveReferences`. Give that pass a line-recording callback so ordinary references are filed under their resolved node and `= $concept-or-edge` uses under the resolved implied claim. Include repeated and forward uses. The distinct forms `* $wall` and `= $wall` must not be conflated.
- Keep the existing order of reference resolution, unnamed-edge naming, and validation. The internal `declaredAt` map can continue serving validation; no need to redesign validation around the new arrays.

Acceptance: add focused parser cases for declaration-first ordering, forward/repeated references, implied claims, properties, and node/edge/document notes. Update snapshots only for the new document fields. Run the scripts' checks and generator again: generation selects semantic fields explicitly, so the views bundle must remain unchanged. This commit adds editor locations to the returned document; separating it from relocation makes that behavioral addition visible in review.

### 4. Complete graph projection and highlighting

Promote the experiment's projection into `src/ontology/ameliorate-v2/toGraph.ts`, using the existing signature `toGraph(doc: Doc, features: FeatureState): RenderGraph`. Add `toMermaid.ts` as the normal wrapper around `flowchart(toGraph(...), config, tables, theme)`, plus local feature, node-type, edge-type, legend, and default-config tables. Keep `DiagramPane` and the shared graph shape unchanged.

- Build node, edge, and implied-claim-by-referent lookups once per projection. A `selectView` helper selects visible semantic entities without mutating `Doc`; scoring and subtype lookup still use the original document.
- A bounded `claimText` helper derives concept/edge-implied wording, truncates nested endpoint text, and falls back to IDs for missing or cyclic references. Spelled out keeps the semantic implied-claim ID for its separate box and uses markers to identify its referent. A relation note can reuse that box or receive a rendering-only attachment box.
- Implied assigns each relation box its edge ID. Build a display-ID map from edge-implied claim IDs to their referent edge IDs, omit those duplicate claim boxes, and remap every connector endpoint through it. Concept-implied claims keep their own IDs. Merge edge and implied-claim notes under the displayed owner, and read the score only from its original owner.
- Pass source lines to every written box and connector. A merged relation box starts with the edge's own line, then includes its implied references; a detached implied claim starts with its own reference. Normalize note-owner IDs before calling `addNotes`; use `addDocumentNotes` for document notes. Allocate collision-free IDs for score context and any synthetic boxes. Anchors have no source targets.
- Use concept/question/claim/source types, the shared note type, a neutral relation type for boxes and connectors, and a separate score-context type if needed. Read configurable colors through the existing style tables. Reuse `flowchart`, `formatScores`, note helpers, `createTokenSink`, and `pushScores` where applicable. Keep Ameliorate's signed score parsing; the shared numeric parser currently accepts only unsigned score slots.
- Implement `highlightLine` from the parser's markers and `takeEdgeType` multiword matching. Peel trailing ID/tag spans as the parser does, then emit those spans in their original order; a single trailing-ID regex cannot handle interleaved tags. Apply suffix highlighting only where the parser accepts suffixes, leaving note bodies plain. The shared `keyword` and `tag` kinds already exist.

Acceptance: test all four view/display combinations, aliasing of edge-implied arguments, score ownership, notes and source maps after filtering, signed/missing scores, multiword relations, and exact tokenizer concatenation. Include empty/incomplete input, cycles, user IDs resembling synthetic IDs, and documents without topic, perspectives, or causal relations. Inspect the projection and Mermaid snapshots and reconnect the harness to this implementation for visual comparison.

### 5. Register the ontology, examples, and generic warnings

Add `index.ts` with `defineOntology<Doc>`, the `ameliorate-v2` registry entry, and the README bullet. Register the two examples in the order above; import build-a-wall directly with `?raw`. Keep the local ontology document link-only and put the experiment's enduring rendering decisions in `rendering.md`. Add the external example to deployment paths. Remove the temporary harness once the app reproduces its reviewed rendering.

Extend `ParseResult` and the typed parsing signature in `defineOntology` with `warnings?: ParseError[]`. The existing parser's result already supplies this field. Pass it from `App.tsx` to an optional `warnings` prop in `EditorPane.tsx`, defaulting to an empty array; show labeled warnings alongside errors in the existing diagnostics area. Keep this generic and preserve rendering of recoverable partial documents. No ontology-specific component branch or new diagnostics framework is needed.

`RenderingStrip` already reads the feature tables, and `share/url.ts` derives its ontology/feature schema from registration. Source locations and diagnostics are parsed state, so they do not add URL fields or require a share-format migration.

Acceptance: add a focused session-storage parity check against the argument-map example's claims, relation meaning, scores, and notes, normalizing their different implied-claim representations. Run the playground's standard checks and production build, including registry backstops. In the dev server verify external-example loading and reload after editing that file. In the browser check both examples, both themes, all feature combinations, Style changes, narrow layout, pan/zoom, generic warnings, editor/diagram linking, Ctrl/⌘-click references, and share URL round-trips. Confirm existing ontologies retain their examples and feature states. Use typecheck and manual checks for the component change, following the repository's existing testing setup.

## Investigation baseline

The 2026-09-05 investigation finds that build-a-wall parses with no errors or warnings into 38 semantic nodes and 41 relations, including four implied claims. Both packages pass their existing checks: 147 script tests and 238 playground tests, plus typecheck, lint, and formatting. A Vite build performed without writing files bundles and executes the parser with the original example and no external runtime imports. No rendered Ameliorate diagram is verified by that experiment.

Further checks establish that the current playground typechecks with both discussed TypeScript flags enabled, while NodeNext still catches extensionless imports that bundler resolution accepts. These experiments do not require adopting the flags. Vite's installed development access checks reject the external `?raw` request under the default allowlist and accept it when the examples directory is explicitly allowed. Live dev-server loading and diagram readability remain implementation acceptance checks.

The 2026-09-12 review tests the argument-map session-storage text with only `%description` converted to a document note. The existing Ameliorate parser returns no errors or warnings, with all six explicit claims' wording, IDs, scores, and notes unchanged, five relations, and one implied claim about the speed-supports-Redis relation. This establishes that the example can preserve the existing information without adding causal assertions.
