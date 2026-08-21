# Link the editor's caret line to its diagram node/edge, both ways

## Context

The playground draws a diagram from a text document, but nothing connects the two halves on screen: you read a box in the diagram and have to find its line by eye, and you edit a line and have to find its box by eye. The editor's syntax overlay was built partly to make that hop easier ("the overlay is what makes a line of source and its box in the diagram findable from each other" — EditorPane.tsx:159-166), and color-by-type gets you close, but on a document with a dozen same-colored claims it stops helping.

Wanted: put the caret on a line and its box (and the connector that line creates) lights up in the diagram; click a box or connector and its line lights up in the editor, the way VS Code paints the caret's line.

The interesting part is that **no source position survives the parse today, deliberately** — a rule currently stated in five places (three `model.ts` headers, two `parse.ts` bodies). That decision is what this change reopens; everything else is plumbing.

## What exists today

- **Editor** — [EditorPane.tsx](ontology-playground/src/components/editor/EditorPane.tsx): a plain `<textarea>` with transparent text over a `<pre>` overlay that re-renders `source.split("\n").map(highlightLine)` as token spans, lines separated by bare `"\n"` text nodes. No element corresponds to a line yet.
- **Diagram** — [DiagramPane.tsx](ontology-playground/src/components/DiagramPane.tsx): `container.innerHTML = result.svg`, then svg-pan-zoom. No click handling of any kind today.
- **Pipeline** — `ontology.parse(text) → doc` then `ontology.toMermaid(doc, config, features, theme) → string` ([App.tsx:86-93](ontology-playground/src/App.tsx#L86-L93)). Each `toMermaid` wraps `toGraph` + the shared [`flowchart()`](ontology-playground/src/ontology/mermaidFlowchart.ts#L75), which mints mermaid-safe ids in `buildIdMap` (mermaidFlowchart.ts:59).
- **Reusable**: `revealLine(el, line)` (refJump.ts:69, module-private, **0-based** `line`) already scrolls a textarea line into view.

So the job is: **carry a line number from the parser to the emitted mermaid element, plus one piece of shared UI state.**

## Design

### The one piece of state

**`activeLine: number | null` in `App`** — the line being pointed at. The editor paints a band on it; the diagram marks every element whose `lines` contain it. Two writers, no derived twin, so a "selected node" can never disagree with the band:

- the caret, via `onSelect` on the textarea;
- a diagram click, which sets `activeLine` **directly** — a click deliberately doesn't focus the textarea, and React's select plugin only tracks the focused element, so the caret move it triggers reports nothing back.

**Clearing it** (your point, adopted): one rule — *pointing at nothing clears*. A `click` listener at the app root clears `activeLine` unless the click landed on a mapped diagram element or inside the textarea. That covers clicking the diagram's empty canvas, the toolbar, the pickers, or anywhere else in the chrome, and it costs one listener rather than a focus-tracking scheme. Escape clears too, extending what Escape already does in the editor (EditorPane.tsx:91-94). Blur alone does **not** clear: after clicking a node, focus is on the diagram and the band has to stay.

### Decisions taken

- **Coverage**: lines that produce a box or a connector — claims/theses/questions/notes, and arg-map's edge lines — plus `%description`/`%perspectives` mapping to the topic header box (kialo and arg-map; IBIS has no property lines and no header box). `@ source` lines and `/` comments map to nothing; the editor still bands the caret's line, the diagram just shows nothing.
- **Click**: place the caret on the line and `revealLine` it, **without** focusing the textarea, so clicking node to node doesn't yank the keyboard around or pop the on-screen keyboard on a phone.
- **Edge identity**: `flowchart()` gives each edge an explicit mermaid id (`fast e0@--> redis`), which mermaid writes onto the SVG path and its label as `data-id`. **Fallback trigger**: if naming every edge turns out to muddy `flowchart()` — say the id has to be threaded somewhere it doesn't belong — switch to keying by emission order and matching the Nth `path.flowchart-link`, the same ordering `linkStyle` already bets on. (The `e0@` in the Mermaid tab's output is not itself a reason to switch; it's valid mermaid and the tab is a debugging view.)
- **Affordance** (your point): mapped elements get `cursor: pointer` and a faint hover mark, both applied via a class set during the same pass that normalizes the SVG, so unmapped chrome (the `_empty` placeholder, anchor edges) stays inert rather than lying about being clickable.
- **Look**: start with neutral, value-only marking (consistent with `option-selected`, and with "color means type identity" everywhere else) — **but this needs to be looked at before it's settled**; see [Visual review](#visual-review).

### Making the two element kinds address the same way

Mermaid is inconsistent here, and it's worth flattening once rather than living with it at every lookup (verified in the running app):

| | `id` | `data-id` |
|---|---|---|
| node `g.node` | `<svgId>-flowchart-<ourId>-<n>` | **absent** |
| edge `path.flowchart-link` | `<svgId>-<edgeId>` | `<edgeId>` |
| edge label `g.edgeLabels g.label` | absent | `<edgeId>` |

`<n>` is mermaid's own render counter (0, 1, 2 …), not an id of ours — our id is the middle segment. So: right after injection, **normalize** — walk `g.node`, parse the middle segment out of `id`, and write it to `data-id`. After that one pass every linkable element answers `el.dataset.id`, the marking scan and the click handler share one lookup, and the whole "how mermaid spells an id" coupling lives in ~5 lines instead of being spread across both.

### Facts measured in the running app (mermaid 11.15), not assumed

- An edge's **label is a separate element** — `g.edgeLabels g.label[data-id]` wrapping a `foreignObject`. A click at an edge's midpoint lands in the label, not the path, so a selector of `g.node, path.flowchart-link` alone would make arg-map's labeled connectors — the fattest pointer targets on screen — dead. Clicks bubble out of the `foreignObject`, and `closest()` crosses it.
- Without an explicit id, mermaid's auto key is `L_<from>_<to>_<counter>` where counter is `0`, then `existingLinks.length + 1` — **the sequence skips 1** (flowDiagram-I6XJVG4X.mjs:293-306) — and it's ambiguous, since mermaid ids contain `_`. With `e0@`, `getEdgeId` (chunk-5ZQYHXKU.mjs:541-550) returns the given id verbatim and the renderer writes `${diagramId}-${edge.id}` plus `data-id` (chunk-KSCS5N6A.mjs:714, 743).
- Anchor edges (`~~~`) render **without** the `flowchart-link` class, so they fall out of any link query on their own — which suits them carrying no lines.
- `classDef` output lands as `#<svgId> .claim>* { …!important }`. A stylesheet rule of ours **cannot** beat it on `stroke`/`fill` (an id in the selector outranks class-only, `!important` on both sides) — confirmed: `stroke-width: 4px !important` on a node child stayed 1.5px. `filter` is untouched by mermaid, so a halo works from CSS. Marks are applied imperatively anyway, so `el.style.setProperty("stroke", …, "important")` is available if the visual review wants a border — important-inline outranks important-stylesheet.
- An edge's color is an **inline** `style` attribute, which a stylesheet `!important` does beat — confirmed on `stroke`/`stroke-width`.
- Rebuilding the overlay as one `display:block` span per line leaves every glyph and both scroll extents **pixel-identical** (measured on the live overlay: same x/y per line, `scrollWidth` 663 → 663, `scrollHeight` 517 → 517; line height 22.75px).

## Where the line number lives: B, the side table

```ts
// kialo/model.ts — the entities are untouched
export interface KialoDoc {
  …
  /** 1-based source lines per entity id; the syntax's own fact, kept out of the entities */
  sourceLines: Record<string, number[]>;
}

// kialo/parse.ts — one line beside each id mint, where `lineNo` is already in scope (parse.ts:91-93)
const id = takeId(explicitId, "q", lineNo);
sourceLines[id] = [lineNo];

// kialo/toGraph.ts
nodes.push({ ...usageNode(claim, usage, reused, showIcons), lines: doc.sourceLines[usage.id] });
```

Three things that were wrong or unclear in the previous draft, now resolved:

- **The topic node** doesn't need a `headerLines` field — your suggestion works, with one tweak: make the map's values `number[]` rather than `number`, and the topic box is just another key (`TOPIC_ID`) holding the `%description` and `%perspectives` lines. Arrays also cover any future entity written across more than one line, so nothing special-cases.
- **"Two namespaces" was overstated.** Every id in a doc comes from one `usedIds` set (kialo/parse.ts:50; claims, questions, notes via `takeId`, usages via `nextAutoId`), so ids are already globally unique — one map, no collisions. The lookup site always knows which entity it is rendering, so `boxId`'s claim-id-or-usage-id rule never has to be re-derived from a key. **So don't change `boxId`**: making every box use `usage.id` would trade readable mermaid ids (`redis --> fast`) for `a3 --> t1` to solve a problem that isn't there.
- **Nothing forces a new entity into the table** — accepted, as you said: a missing entry shows up immediately in testing as "this box doesn't light up", the cross-ontology contract test catches a whole ontology forgetting, and the add-ontology skill gets a line about it.

**Fallback**: if the map's call sites start needing lookups the entity doesn't obviously own, put `line` on the entities instead. The boundary (`RenderNode.lines`) doesn't move, so that's a local change.

**Snapshots** (your correction, adopted): ids are already deterministic — auto counters run in document order (`nextAutoId`, parse.ts:68-76) — so snapshots only move when behavior does. The re-record rides in the same commit as the code change that caused it, which is how the diff stays legible. Under B the parse snapshots gain one `sourceLines` block per document rather than a field per entity.

## Implementation

### 1. Contract — `src/ontology/types.ts`

```ts
export interface RenderNode {
  …
  /** 1-based source lines this element was written on; the first is its declaring line — where a
      click on it puts the caret, when the others are continuations (the topic box's two `%` lines) */
  lines?: number[];
}
export interface RenderEdge { …; lines?: number[] }

/** Which source lines each drawn element came from, keyed by the id mermaid gives it in the SVG. */
export interface SourceMap {
  /** mermaid node id (the `<id>` in `flowchart-<id>-<n>`) → 1-based lines */
  nodes: Record<string, number[]>;
  /** the edge id emitted for it → 1-based lines; matches the SVG's `data-id` */
  edges: Record<string, number[]>;
}

/** What `toMermaid` now returns. Not "Diagram" — that word is the drawn picture (DiagramPane). */
export interface MermaidOutput { text: string; sourceMap: SourceMap }

toMermaid: (doc, config, features, theme) => MermaidOutput;
```

`lines` is optional so an ontology that doesn't set it degrades to "no linking" rather than breaking. The map is built on the *render* side because which element a line owns depends on the feature lens (arg-map's edge claims are a connector under one option and a box under another).

### 2. The map — `src/ontology/mermaidFlowchart.ts`

`flowchart()` returns `MermaidOutput`. It already has `idMap` and the `emitted` counter; add in the two loops:

```ts
if (id && node.lines?.length) sourceMap.nodes[id] = node.lines;
// edges: name it so the SVG can be asked which one it is
const edgeId = `e${emitted}`;
lines.push(`  ${from} ${edgeId}@${connector}${label} ${to}`);
if (edge.lines?.length) sourceMap.edges[edgeId] = edge.lines;
```

The empty-graph early return (line 81) returns an empty map. The comment at lines 100-104 ("mermaid can't name an edge") becomes half-true and needs rewording: it can't *target* one in `linkStyle` except by index, but it can name one for identity.

### 3. `sourceLines` per ontology

For `kialo/`, `ibis/`, `arg-map-truth-and-relevance/`:

- `parse.ts`: record `sourceLines[id] = [lineNo]` beside each id mint (kialo: questions ~186, notes ~222 and the `docNotes` branch, claims ~256, theses ~278, arguments ~299; plus the `%` branch accumulating onto `TOPIC_ID`).
- `toGraph.ts`: read `lines` onto each `RenderNode`/`RenderEdge`. A kialo box is a *usage*, so it reads the usage's entry; a `$ref` copy reads its own line, not the declaration's. **A connector takes the line of the child that creates it** — kialo's `+`/`-` line, IBIS's nested line (ibis/toGraph.ts:29-33), arg-map's edge line — so the caret on a claim marks both its box and the arrow it hangs from. `notes.ts` sets `lines` on both the note box and its dotted connector. Anchor edges (`anchoring.ts`) get none.
- `TOPIC_ID` is per-ontology today (kialo/toGraph.ts:12, arg-map/toGraph.ts) while `parse.ts` needs the same constant — hoist it to a shared module rather than duplicating the string.

### 4. Editor: caret line + line bands

- **Caret** — `onSelect` on the textarea, gated to the Code tab. React's select plugin listens to `keydown`/`keyup`/`selectionchange`/`mouseup` and fires on plain caret moves, not just ranges, so no `selectionchange` fallback is needed. Compute the line with a tiny tested helper `lineAt(source, offset)` (count `"\n"` before it, 1-based).
- **Overlay** — wrap each line's tokens in `<span className="editor-line">` inside one `<div className="editor-lines">`, dropping the `"\n"` fragments. The wrapper takes `width: max-content; min-width: 100%` so a band spans the full scroll width; an empty line keeps its height with a zero-width space. The trailing-space hack at EditorPane.tsx:189-191 goes away with it. **Fallback trigger**: if the restructured overlay drifts out of register with the textarea in any browser, drop it and paint one absolutely-positioned band in the `relative h-full` wrapper instead, at `paddingTop + (line-1)*lineHeight - scrollTop` — the arithmetic `revealLine` already does.
- **Moving the caret on a pick** — a bare `pickedLine` prop can't work: equal to `activeLine` it re-fires on every arrow-key move and drags the caret to column 0; separate, it goes stale when the same node is clicked twice. Pass `caretRequest: { line: number; nonce: number } | null` (or an imperative handle) and act on the nonce. The effect does `setSelectionRange(start, start)` + `revealLine`, **no** `.focus()`. Export `revealLine` from refJump.ts and state its convention — it is 0-based today while `SourceMap` lines are 1-based, following `ParseError`.
- **CSS** — the band's alpha belongs on the ladder `index.css:84-114` documents, since that file owns those numbers: one rung below `option-selected`'s 22%, because this marks position rather than choice. The rule itself sits in `EditorPane.css` under `@layer components`.

### 5. Diagram: normalize, mark, click — `DiagramPane.tsx` (+ `DiagramPane.css`, `diagramTargets.ts`)

- Props gain `sourceMap`, `activeLine`, `onPickLine(line)`.
- **Normalize on injection**: write `data-id` onto every `g.node` (parsed from its mermaid id) and add a `linked` class to every element the map knows, so `cursor: pointer` and the hover mark attach to exactly what is clickable. `diagramTargets.ts` owns the parsing, is pure, and is unit-tested (vitest is node-only).
- **Mark against the SVG that is actually on screen.** `renderMermaid` is awaited, so a new `sourceMap` prop arrives before the SVG it describes is injected; marking off the prop would paint the wrong box for a frame (auto ids renumber as you type). Store the injected SVG and the map it came from together in state, and key the marking effect on that pair plus `activeLine`.
- The effect clears `.is-active`, then **scans** — one line can mark several elements (one arg-map line under `implied` makes a node *and* two connectors, arg-map/toGraph.ts:114-129).
- **Click**: one listener on the container. Record `clientX/Y` on `mousedown`; on `click`, bail if the pointer moved >~4px (a pan, not a click), else `closest("[data-id]")` → `sourceMap` → `lines[0]` → `onPickLine`; a click that finds nothing mapped clears `activeLine`, per the rule above. Mermaid's `securityLevel: "strict"` is untouched — these are our own DOM listeners, not mermaid `click` directives, so the untrusted-document reasoning in mermaidFlowchart.ts:27-48 stands.
- **CSS** — `DiagramPane.css`, `@import`ed from `index.css`: `.linked { cursor: pointer }`, a faint hover mark, and `g.node.is-active > * { filter: drop-shadow(…) }` / `path.flowchart-link.is-active { stroke-width: 3.5px !important; … }`, per the measured facts.

### 6. Wiring — `src/App.tsx`

- `mermaidText` memo becomes a `mermaid` memo (`{ text, sourceMap }`); `.text` goes to EditorPane's Mermaid tab, both go to DiagramPane.
- `const [activeLine, setActiveLine] = useState<number | null>(null)`, cleared in `switchOntology`/`switchExample`, by the app-root click rule, and by Escape. Not part of `ShareState` — it's where *you* are looking, not part of the document, same reasoning as `markerHighlights`.
- `onPickLine(line)` sets `activeLine` **and** bumps the caret request. Two cases it must handle rather than ignore: if the **Mermaid tab** is showing, switch to Code first — the same textarea is showing generated output, and moving the caret into it would scroll someone else's language. On **mobile** (`pane === "view"`, App.tsx:179-183) the editor column is `display:none`, where `revealLine` reads `clientHeight === 0` and writes a scrollTop that doesn't stick; leave the pane alone (switching would hide the diagram you just clicked) and re-apply the caret request when the editor becomes visible.

### 7. Tests

- **Write first**: the cross-ontology contract test in `registry.test.ts` — for every ontology × example, the source map is non-empty, every line in it is within `1..lineCount`, and every node key appears as an id in the emitted text. It's the only thing that catches a future ontology forgetting `lines`, which is the failure an optional `lines?` and an unenforced side table invite.
- `registry.test.ts:44` (`expect(ontology.toMermaid(...)).toContain("flowchart")`) and all three `toMermaid.test.ts` files move to `.text`; add a case per ontology asserting a known line maps to the expected node key and edge id.
- `toGraph.test.ts` ×3: `lines` on a representative box, on a `$ref` copy (its own line), and on a note.
- Re-record parse snapshots with `npx vitest run -u` in the same commit, and **read the diff** (AGENTS.md).
- New unit tests: `lineAt`, `diagramTargets` parsing.

### 8. Docs — including the duplication you flagged

The "positions are a syntax fact" rule is stated five times because no file owns the layering it comes from. **Add `src/ontology/pipeline.md`**: one short doc naming the layers and what each may know — `parse.ts` owns syntax (and syntax-only facts: line numbers, marker spelling), `model.ts` owns semantics, `toGraph.ts` owns rendering decisions, `mermaidFlowchart.ts` owns emission — plus the two directions that cross them (a `RenderNode`'s `lines` links the panes; `StyleConfig` colors one type in three places). Then delete the duplicated paragraph from the three `model.ts` headers and two `parse.ts` bodies, leaving each with a pointer, exactly as AGENTS.md's "every fact lives in one place" asks. It also gives the add-ontology skill something to link instead of re-explaining.

Also: AGENTS.md's architecture line now ends in mermaid text *plus* a source map, and should point at `pipeline.md` rather than growing a third invariant bullet; `.claude/skills/add-ontology/SKILL.md` gains one line about filling `sourceLines`; `types.ts`'s header keeps the contract detail.

**`ai-designs/text-diagram-linking.md`** — the existing doc's shape is decent, and since these are historical snapshots the "What changed during implementation" section is right. Three changes I'd make: (1) a **Measured facts** section of its own, with how each was measured — the mermaid/DOM findings above are the expensive part to re-derive, and they're currently the kind of thing that gets buried in prose; (2) **Fallback triggers** as a named section rather than scattered asides, since that's what the existing doc's most useful line is ("if scroll-sync or IME/mobile input breaks, switch to CodeMirror"); (3) keep **Rejected (and why)**, which is the best thing in the existing doc, and drop the step-by-step implementation list down to a short "shape of the change" — the steps go stale the day they land, and the plan file already holds them.

### Order

Three commits, reviewable on their own. **Stop for review at each boundary — don't commit unprompted.**

1. **Editor line band alone** (step 4 minus the caret request, plus `activeLine` and its clearing rule in App): useful by itself, and it proves the overlay restructuring before anything depends on it.
2. **Source map through the pipeline** (steps 1-3, 7, and the `pipeline.md` half of 8). Not "no UI change" — the return-type change touches all three `toMermaid.ts`, `App.tsx:90-93`, EditorPane's Mermaid tab and `registry.test.ts:44`. This is the load-bearing commit.
3. **Diagram normalize, marking and clicking** (step 5, the caret request, the rest of 6).

## Verification

The dev server is already running on 5173 — don't start one.

- `npm run typecheck && npm test && npm run lint && npm run format:check` from `ontology-playground/`.
- Playwright against `http://localhost:5173/reasoning-tools/ontology-playground/`, for **each of the three ontologies** and both examples:
  - caret on a claim line → exactly one `g.node.is-active` plus its connector; arrow up and down the file, including onto a blank line and a `/` comment (nothing marked).
  - a `$ref` line marks the dashed copy, its declaring line marks the original — the case that proves lines beat text matching.
  - `%description` line marks the topic box (kialo, arg-map).
  - click a node → the right line bands and scrolls into view, and `document.activeElement` is **not** the textarea.
  - click a labeled connector at its midpoint under arg-map's `spelled out` — the case that dies if the click selector misses the label element.
  - hover a node and a connector: pointer cursor and hover mark on mapped elements, nothing on the `_empty` placeholder.
  - click the diagram's empty canvas, then a toolbar button, then press Escape — each clears the band; a drag across empty canvas pans without clearing.
  - flip the **Edge claims** lens and confirm an edge line marks a connector under one option and a box under the other.
  - click a node while the **Mermaid tab** is showing, and on a **narrow viewport** while the diagram pane is showing.
  - Ctrl/⌘-click a `$ref`: refJump's own `setSelectionRange` (refJump.ts:113) now moves `activeLine` to the declaration — confirm that's what happens, since the two features share the caret rather than the click path.
  - type a line in the middle of the document and confirm the marking survives the re-render and still points at the right box (auto ids renumber; the map is rebuilt with them).
  - scroll the editor sideways on a long line and confirm the band still spans it.

### Visual review

The neutral marking is a starting point, not a settled decision — **screenshot it in both themes on a dense document and compare against the alternatives before locking it in**: (a) neutral halo + band, (b) one accent hue (the teal `&id`/`$id` already own) in both panes, (c) dimming everything unmarked to ~35%. A neutral halo may not read against a light fill; (c) may flicker as the caret moves. A stroke change is available too, via imperative `setProperty(…, "important")`. All are a handful of lines each — try them before the ai-design doc records a decision. The hover mark needs the same pass: it has to be clearly weaker than the active mark.

## Open questions / deferred

- **Selection ranges**: v1 marks the line at `selectionStart` only. Marking every line of a multi-line selection extends easily on both sides; skipped until the single-line case feels right.
- **`@ source` lines** map to nothing. Folding them into their claim's `lines` needs the parser to register them under the owning claim's key.
- **Pan the marked node into view** when the caret moves? Probably not — the diagram already resets pan/zoom on every keystroke, and auto-panning on top of that would be worse before it's better. Worth revisiting together with that reset.
- **Thin connector hit targets**: with edge labels clickable this may be a non-issue. If it isn't, insert a transparent wide-stroke twin path per link during the normalize pass rather than restyling the visible one.
- **Error lines**: the parse-error strip (EditorPane.tsx:226) knows a line and now has somewhere to send it — clickable errors are a natural follow-up, not part of this.
