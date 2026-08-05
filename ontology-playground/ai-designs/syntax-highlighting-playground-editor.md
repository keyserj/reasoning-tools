# Syntax highlighting for the ontology playground editor

## Context

The editor is a plain `<textarea>`; all source text renders in one color. This app has something most editors don't: every marker already has a color, because it produces a rendered type with a configured stroke. Highlighting that reuses those colors teaches the syntax→diagram mapping the legend exists to teach, and lets the eye hop from a line of code to its box in the diagram. The design below was settled in discussion, including stress-testing against `ameliorate-v2/ontology.md` as the stated complexity ceiling for future ontologies.

## Design decisions (settled)

**Organizing principle: hue = type identity; teal = ids; weight/opacity = typeless structure.** Body prose stays untouched `base-content`. Type colors resolve from the **live `StyleConfig` strokes** (not defaults), so the editor, legend, diagram, and Style dialog always agree — restyle a type and the editor follows.

**Dark mode is derived, not hand-picked:** `color-mix(in oklab, <stroke> 55%, white)`, which lands each stroke near its Tailwind-400 sibling. Same rule applies to the teal, so there is exactly one dark-mode adjustment. Accepted compromise: IBIS's amber `#ca8a04` is ~3.5:1 on white; live with it for now — a future fix would adjust the stroke itself, not add a syntax-specific override.

**Token kinds are a fixed shell vocabulary; tokenizers are per-ontology.** The shell owns kind→style in one place and knows nothing about any ontology's words:

| Kind | Emitted for | Style |
|---|---|---|
| `type` (+ `typeId`) | markers everywhere; arg-map's `supports`/`critiques` edge words and their `<`/`>` | `config.types[typeId].stroke`, semibold; the only hued kind besides ids |
| `keyword` | structural words with no type identity (future Ameliorate edge words and `<`/`>`) | semibold, no hue |
| `comment` | whole `/` meta lines | ~50% opacity + italic |
| `id-decl` | `&id` | teal at ~60% opacity |
| `id-ref` | `$id` | teal full + underline |
| `score-punct` | `[` `]` `,` of score brackets | ~40% opacity |
| `score-value` | digits and `-` slots | ~70% opacity (own kind so sign-tinting can refine it later) |
| `property` | `%key:` head of property lines | semibold at ~70% opacity, value stays plain |
| `tag` | future `#action`-style subtype tags | ~60% opacity, no hue |

`keyword` and `tag` are defined now but emitted by no current ontology (Ameliorate-proofing, agreed explicitly). Teal ≈ `#0d9488` — the one hue no node palette uses, so ids never masquerade as a type.

**Rejected (record why):** per-edge-type hues — Ameliorate has ~12 edge words including multiword ones, and its valence lives in scores, not words (`supports[-6]` *is* a critique), so even supports-blue would lie there; arg-map keeps blue/red words only because they map to rendered types. Property-line topic-violet — Ameliorate has document-, node-, and edge-level properties; generic styling in both ontologies wins for cross-ontology consistency.

**Deferred:** value-colored scores (revisit with Ameliorate — likely sign-tinting) and error squiggles (parser already emits per-line errors; overlay makes them cheap later).

**Approach: overlay, not CodeMirror.** Highlighted `<pre>` behind the existing textarea with transparent text, preserving EditorPane's tab/undo/mobile work. Fallback trigger, recorded: if scroll-sync or IME/mobile input breaks in ways we can't patch, switch to CodeMirror rather than fight it.

## Implementation

### 1. Contract — `src/ontology/types.ts`

```ts
export type HighlightKind = "type" | "keyword" | "comment" | "id-decl" | "id-ref"
  | "score-punct" | "score-value" | "property" | "tag";
export interface HighlightToken {
  text: string;
  kind?: HighlightKind;          // absent = plain body text
  typeId?: string;               // required when kind === "type"
}
```

Add `highlightLine: (line: string) => HighlightToken[]` to `Ontology` (required, so both ontologies must implement; `defineOntology`'s `Omit` picks it up automatically). Invariant: concatenating `token.text` reproduces the input line exactly — the renderer does no index math.

### 2. Tokenizers — `src/ontology/<id>/highlight.ts` (new, both ontologies)

Line-based, no cross-line state. Reuse the syntax regexes rather than re-deriving: move/export `ID_SUFFIX` + `REF_BODY` into each ontology's `markers.ts` (per AGENTS.md, markers.ts *is* the syntax home; parse.ts imports them back), and export `LEADING_BRACKET` from arg-map's `scores.ts`.

- **ibis/highlight.ts**: leading ws plain → `/` whole-line comment → known marker emits `type` (`?` question, `=` idea, `+` pro, `-` con, `~` note) → body: whole-body `$ref` → `id-ref`, trailing `&id` → `id-decl`, rest plain. Unknown marker: whole line plain (error strip already covers it).
- **arg-map-truth-and-relevance/highlight.ts**: as above plus — `%` lines emit `property` for the `%key:` head, value plain; `=` marker is `type:claim` with optional score bracket immediately after; `<`/`>` + edge word both take `type:supports` / `type:critiques` when the word matches `EDGE_TYPES` (else marker plain), then optional scores; score brackets lex into `score-punct`/`score-value` (slots include `-`); `~` is `type:note`.

Wire each into its `index.ts`.

### 3. Shell styles — `src/index.css`

`.tok-*` classes in index.css (it owns theme-conditional CSS; document the numbers at the rule per its convention). Hued kinds set `--tok-hue` inline from the component (`style={{ "--tok-hue": stroke }}`); CSS resolves:

```css
.tok-hued { color: var(--tok-hue); }
[data-theme="dark"] .tok-hued { color: color-mix(in oklab, var(--tok-hue) 55%, white); }
```

so no theme prop threads into the editor and both `type` and the teal id kinds share the one dark rule. Remaining kinds are opacity/weight/italic only.

### 4. Overlay — `src/components/EditorPane.tsx`

- Wrap the textarea in a relative container with an `aria-hidden` `<pre>` absolutely behind it. The `<pre>` must reproduce the textarea's text metrics exactly: same `font-mono text-base md:text-sm leading-relaxed`, same padding/border box as daisyUI's `textarea textarea-bordered` (border kept transparent on the pre), and `white-space: pre-wrap; overflow-wrap: break-word` to mirror textarea soft-wrap. `overflow: hidden`, `pointer-events: none`.
- Textarea gets `text-transparent` + explicit `caret-base-content` and `bg-transparent`; restore placeholder visibility explicitly (e.g. `placeholder:text-base-content/40`) since `::placeholder` derives from the now-transparent `color`.
- Scroll sync: `onScroll` copies `scrollTop`/`scrollLeft` to the pre (sizes match, so nothing else to sync).
- Tokens memoized from `[source, highlightLine]`; render per line, `\n` between.
- Only the **Code** tab gets the overlay; the Mermaid tab keeps today's plain readonly textarea (generated mermaid stays unhighlighted).
- New props: `highlightLine` and `config: StyleConfig` (stroke lookup; fall back to plain if a typeId is missing). Narrow props, consistent with the shell's pattern — don't pass the whole ontology.

### 5. Wiring — `src/App.tsx`

Pass `ontology.highlightLine` and `shared.config` to `EditorPane`. No other shell changes.

### 6. Tests

- `registry.test.ts`: add the contract invariant — for every line of every shipped example, `highlightLine` tokens concatenate back to the line, every `type` token's `typeId` is a rendered node type id, and `typeId` is present iff `kind === "type"`.
- `src/ontology/<id>/highlight.test.ts` (both): a handful of representative lines each asserting exact token lists — ibis: marker+body, `$ref`, `&id`, comment line, unknown marker; arg-map: `=[4,1,8] text &id`, `< supports[8,2,8] &id`, `< critiques` bad-word line, `%perspectives: [a, b]`, `= $ref`, `~ note`.

Components stay untested per repo convention (no DOM test setup) — the overlay is covered by typecheck + manual checks.

### Order

Contract + tokenizers + tests first (pure, low-risk), then CSS + overlay, then wiring. Commit style: `feat(plgr): ...` on this branch (`playground-syntax-highlighting`), PR into main.

## Verification

1. `cd ontology-playground && npm run test && npm run typecheck && npm run lint && npm run format:check` (AGENTS.md pre-finish requirement).
2. Manual, via playwright against the dev server (per AGENTS.md: check if `http://localhost:5173/` is already up; if not, ask the user to run `cd ontology-playground && npm run dev` — don't start it myself): both ontologies' default examples show colored markers/ids/scores; text alignment is pixel-exact between pre and textarea (type into a long wrapped line and compare caret vs glyphs); scroll a tall document; Tab/Shift+Tab and undo still work; placeholder visible on empty doc; Mermaid tab unaffected.
3. Live-config check: open Style, change a type's stroke → editor color follows immediately; Reset restores.
4. Both themes: toggle dark and confirm hued tokens lighten (color-mix) and opacities still read on the dark page.

## What changed during implementation

Recorded because each was decided against a measurement, and each is easy to "simplify" back into a visible bug.

**The overlay scrolls; it does not clip.** The design said `overflow: hidden` on the pre. Measured in the running app: the textarea's `clientWidth` is 322 against a 336.6px padding box, i.e. a classic scrollbar takes ~15px *out of the text column* as soon as the document overflows. A clipped pre keeps that 15px, so every soft-wrapped line would break at a different character than the textarea it sits under — the one failure the whole approach has to avoid. Both elements get `overflow: auto` instead, and the pre's scrollbar is painted away with `scrollbar-color: transparent transparent`. Note that `scrollbar-width: none` is *not* the same fix and reintroduces the bug: it takes the reserved width back.

**The overlay is positioned against an unpadded inner box.** `absolute inset-0` resolves against the containing block's *padding* box, so against the pane's `p-2` wrapper it would disagree with the `w-full h-full` both elements share by 8px a side. Dropping `w-full` instead is worse, not better: daisyUI's `.textarea` carries `width: clamp(3rem, 20rem, 100%)`, which would clamp the pre to 320px and re-wrap everything. Hence the extra `relative h-full` div.

**The overlay's content ends in a space.** A source ending in a newline gives the textarea an empty last line; without the space the pre is a line shorter, and the two disagree about whether they overflow at all. With it, both measure the same `scrollHeight` (539 on IBIS's example, 653 after typing a wrapped line). A trailing space hangs at the end of its line under `pre-wrap`, so it can't move a wrap.

**The textarea takes `relative`.** In-flow content paints *below* a positioned sibling regardless of DOM order, so without it the transparent text hides behind its own highlighting.

**`textarea-bordered` is gone.** It's daisyUI v4's name and inert in v5 — the same trap `tabs-bordered` gets a comment for two elements up. v5's `.textarea` draws the border itself.

**More of the syntax moved into `markers.ts` than the design listed:** `PROPERTY`, `EDGE_TYPE_HEAD` and `LEADING_WS` as well as `ID_SUFFIX` / `REF_BODY`, since the tokenizer needs each of them and a second copy is exactly the drift the move was for. The shared token-sink and the trailing-`&id` split live in a new `src/ontology/highlight.ts`, which is what enforces the concatenation invariant (empty slices are dropped in one place) rather than each tokenizer being trusted to.

**An unknown edge word leaves the whole line plain, not just the word.** The design said "marker plain"; emitting the marker and the rest as two adjacent plain tokens is the same pixels with more DOM.

### Still open

Measured contrast, so the numbers are on record rather than assumed. Dark mode lands every hued token between 7.6:1 and 11.3:1 on the page — the 55% white mix does what it was chosen for. Light mode is where the compromises are: `pro` 5.9, `con` 6.9, `question` 5.7, `claim` 5.2, `note` 4.8 all pass, but IBIS's amber `idea` measures **2.94:1 on white**, not the ~3.5:1 the design assumed, and `&id` (teal at 60% opacity) lands ~2.1:1. Both are as designed — the fix for the amber belongs on the stroke itself, and an id is deliberately quieter than the prose around it — but 2.94 is further under than the decision was made against.

