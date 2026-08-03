# Reorganize playground chrome by scope

## Context

The toolbar currently mixes three unrelated scopes in one row: site-level controls (GitHub, theme), document-level ones (ontology, example), and rendering-level ones (Key, Style). That flattening has concrete costs:

- **`Style` is a diagram control living in the page header**, far from the diagram it restyles and from the feature strip that already sits above it.
- **`Key` is the legend for the _syntax you write_** but sits next to page-level buttons, implying it's page chrome.
- **The ontology and example `<select>`s hide their own alternatives.** You have to open a dropdown to learn other ontologies exist — and the roadmap is 4-5 ontologies × ~3 examples each, growing. Worse, an example an ontology hasn't written is simply absent from the list, so you only discover the gap from the substitution notice _after_ switching.

The organizing principle: **site / document / rendering**, with dependencies flowing left → right. The left pane is the document (which ontology it's written in, which example it started from, and the text); the right pane is a rendering of it (features, style, diagram); the toolbar keeps only what is true of the whole page, plus `Copy link`, which is the one action spanning both halves.

Outcome: alternatives are visible without a click, unwritten examples read as meaningful gaps rather than absences, and each control sits in the half it acts on.

## Naming

The left scope is **document**, and the component that picks one is `DocumentPicker`.

The ontology is the language the document is written in, and a language belongs to a document's identity rather than to its viewer — a `.md` file is a Markdown document, and you'd never say the format belongs to the previewer. That's what makes "document" cover ontology + example where narrower words don't.

Rejected:

- **Topic** — a topic is the subject matter, which is what an _example_ is; it doesn't imply a notation. It also collides hard: `topic` is already a rendered node type in `arg-map-truth-and-relevance` (`type: "topic"`, the `_topic` header box, a `:::topic` classDef, a "Topic" row in the Style panel), and that box renders in the **right** pane.
- **Source** — `DocState.source` already means the text specifically.
- **Authoring** — no collisions and more parallel with "rendering", but "render the document" reads where "render the authoring" doesn't, and this word's job is to be reached for when placing a new control.
- **Input / Output** — true of the pipeline but too bland to guide anyone.

### Consequent rename

`DocState` holds ontology + example + source **+ config + features** — everything in the URL, including rendering state — so it can't also be what "document scope" names. It's already slightly misnamed, and `App.tsx` currently has both `doc` (a `DocState`) and `parseResult.doc` (the parsed ontology model) meaning different things.

- `DocState` → `ShareState` (it lives in `share/url.ts` and is literally what gets shared)
- `App.tsx`'s `doc` / `setDoc` → `shared` / `setShared`

Mechanical, three files (`share/url.ts`, `App.tsx`, `Toolbar.tsx`).

This lands **first, on its own**, together with the `FeatureStrip.tsx` → `RenderingStrip.tsx` file rename — see [Implementation order](#implementation-order).

## Layout

Emoji are double-width, so column alignment below is approximate.

### Desktop (≥ `md`), both accordions open

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 🗺️ Reasoning Ontology Playground                    🌙   🔗 Copy link      GitHub   │ ← site
├──────────────────────────────────┬──────────────────────────────────────────────────┤
│ ▾ Ontology: IBIS                 │ Edge claims: Explicit, separate ▾      🎨 Style  │ ← rendering
│   ▐IBIS▌ ⌈Arg map: truth & rel⌉  ├──────────────────────────────────────────────────┤
├──────────────────────────────────┤                                                  │
│ ▾ Example: Session storage •edited│                   ┌───────────────┐              │
│                          ⌈Reset⌉ │                   │ ? Where do we │              │
│   ▐Session storage▌ ⌈Build a wall⌉│                  │  put sessions │              │
├──────────────────────────────────┤                   └───────┬───────┘              │
│ ┌──────┬─────────┐          ⌈Key⌉│                           │                      │
│ │ Code │ Mermaid │               │                   ┌───────┴───────┐              │
│ ├──────┴─────────┴───────────────┤                   │   = Redis     │              │
│ │                                │                   └───────────────┘              │
│ │ ? Where do we put sessions &q1 │                                                  │
│ │   = Redis &i1                  │                                          ⌈ + ⌉   │
│ │     + Fast                     │                                          ⌈ − ⌉   │
│ │                                │                                          ⌈ ⤢ ⌉   │
│ └────────────────────────────────┘                                          ⌈ ⟲ ⌉   │
└──────────────────────────────────┴──────────────────────────────────────────────────┘
  ↑ document scope                   ↑ rendering scope

  ▐selected▌   ⌈available⌉   ⌈dimmed = this ontology hasn't written it⌉
```

With IBIS selected, the example row reads `▐Session storage▌ ⌈Build a wall⌉` with the second pill **disabled and dimmed**, tooltip: _"IBIS doesn't have this example added yet."_ Today that pill simply doesn't exist.

### Mobile (< `md`), accordions collapsed by default

```
   Edit mode (default)                    View mode
┌────────────────────────────┐         ┌────────────────────────────┐
│🗺️ ⌈Edit|View⌉  🌙 🔗 GitHub│         │🗺️ ⌈Edit|View⌉  🌙 🔗 GitHub│
├────────────────────────────┤         ├────────────────────────────┤
│ ▸ Ontology: IBIS           │         │ Edge claims: Explicit ▾    │
├────────────────────────────┤         │                   🎨 Style │
│ ▸ Example: Session storage │         ├────────────────────────────┤
├────────────────────────────┤         │                            │
│ ┌──────┬─────────┐    ⌈Key⌉│         │      ┌─────────────┐       │
│ │ Code │ Mermaid │         │         │      │ ? Where do  │       │
│ ├──────┴─────────┴─────────┤         │      └──────┬──────┘       │
│ │ ? Where do we put        │         │             │              │
│ │   sessions &q1           │         │      ┌──────┴──────┐       │
│ │   = Redis &i1            │         │      │  = Redis    │       │
│ │     + Fast               │         │      └─────────────┘       │
│ │                          │         │                     ⌈+⌉    │
│ └──────────────────────────┘         │                     ⌈−⌉    │
└────────────────────────────┘         └────────────────────────────┘
```

The collapsed summary row naming the current selection is the entire point of collapsing — and the pane toggle routes each control correctly for free: `Key` is reachable while editing, `Style` while viewing.

### What moved

| Control | From | To |
| --- | --- | --- |
| Ontology `<select>` | toolbar | `Ontology` accordion, pills |
| Example `<select>` | toolbar | `Example` accordion, pills |
| `Reset` | toolbar | `Example` summary row |
| `Key` | toolbar + ☰ | editor tab row, right-aligned |
| `Style` | toolbar + ☰ | rendering strip, right-aligned |
| `🌙` theme | toolbar (`md`+) + ☰ | toolbar, all widths |
| `GitHub` | toolbar (`md`+) + ☰ | toolbar, all widths |
| `☰` dropdown | toolbar | **deleted** |

At 375px the toolbar comes to roughly `🗺️ 20 + [Edit|View] 114 + 🌙 42 + 🔗 42 + GitHub 70 + gaps ≈ 300px` against ~351px usable, so everything fits on one line. Only `Copy link`'s **text** form would push it over, so that button keeps its existing icon/text swap.

## Implementation order

Four steps, each leaving the app working, ordered so the diffs that need the least attention come first.

1. **Renames only, zero behavior change.** `git mv FeatureStrip.tsx RenderingStrip.tsx` plus `DocState` → `ShareState` and `App.tsx`'s `doc` → `shared`. Landing the file move on its own is what lets git record it at 100% similarity; bundled with the `Style` button it may score as delete-plus-add and render the whole file as new — turning the diff you'd most want to skim into the one you can't. Same logic for `ShareState`, which touches `App.tsx` and `Toolbar.tsx`, the two files the redesign rewrites most.
2. **Move `Key` and `Style`.** Into `EditorPane`'s tab row and `RenderingStrip` respectively; delete both from `Toolbar`; `RenderingStrip` starts always rendering. Small and self-contained.
3. **`DocumentPicker`.** The accordions, examples driven from the shared table, `Toolbar` losing its selects and the `☰` dropdown, `App` wiring. This is the step that wants real review.
4. **`AGENTS.md`.**

## Changes

### 1. New `src/components/DocumentPicker.tsx`

Two stacked accordion sections — `Ontology` and `Example`, each on its own line — above the editor tabs. Both independently toggleable and open at once (unlike `RenderingStrip`, which allows one open panel at a time; the difference is deliberate).

Props (prop-driven like `Toolbar`, rather than importing the registry directly):

```ts
interface Props {
  ontologyList: Ontology[];
  ontology: Ontology;        // the selected one
  examples: ExampleDef[];    // the shared EXAMPLES table, not ontology.examples
  exampleId: string | null;
  dirty: boolean;
  onOntologyChange: (id: string) => void;
  onExampleChange: (id: string) => void;
  onResetExample: () => void;
}
```

A local `PickerSection` sub-component in the same file renders both sections (move it out only if a third caller appears):

```ts
interface PickerOption {
  id: string;
  label: string;
  /** why it can't be picked; renders disabled with this as the tooltip */
  unavailable?: string;
}

interface SectionProps {
  label: string;          // "Ontology" / "Example"; also the pill group's aria-label
  summary: string;        // summary-row text right of the label
  options: PickerOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  action?: ReactNode;     // rendered beside the toggle, outside it
}
```

**Summary row** — each section's always-visible clickable line, as distinct from the pill list that expands beneath it. The name comes from `<summary>`'s relationship to `<details>`, which is the semantics being reproduced; "header" is avoided because the page already has one.

We don't use literal `<details>`/`<summary>`: `open` has to be driven by the media-query check below, and a `Reset` button inside a `<summary>` toggles the disclosure on click unless suppressed. The `aria-expanded` + state pattern from `FeatureStrip` is both consistent with the codebase and less fiddly.

The summary row reads `▾ Ontology: IBIS` / `▾ Example: Session storage • edited`, always — an always-correct summary is simpler than one that only appears when collapsed, and it is the entire contract of the collapsed state on mobile. `Reset` moves here from the toolbar, passed as `action` and rendered as a **sibling** of the toggle button, never nested inside it (a button inside a button is invalid HTML and would swallow the click).

Because the summary row always carries the edited marker, pills carry no marker of their own; the redundancy isn't worth the extra prop.

**Summaries**: ontology → `ontology.label`; example → `exampleLabel(exampleId) ?? "Custom"` plus `" • edited"` when `dirty`. `null` is the only route to "Custom" (see `decodeState` — an id the ontology doesn't ship is normalized to `null`), so no pill represents it and the `CUSTOM` sentinel `<option>` value disappears entirely.

**Example availability** comes from the shared table via the existing `findExample(ontology, id)` in `src/ontology/examples.ts`: `undefined` → ``unavailable: `${ontology.label} doesn't have this example added yet` ``, rendered as a `disabled` pill with that as its `title`. `registry.test.ts` already asserts every ontology's example ids come from the shared table, so the shared list is guaranteed to be a superset.

**Open state** lives in each `PickerSection` (like `FeatureStrip`'s `openId`), initialized from a media query mirroring `readInitialTheme`'s pattern in `App.tsx`:

```ts
/** Tailwind's `md`. Duplicated from the class names below because the initial open state is a
    JS decision; if a third place needs it, hoist it rather than adding a fourth literal. */
const WIDE_QUERY = "(min-width: 48rem)";
const [open, setOpen] = useState(() => window.matchMedia?.(WIDE_QUERY).matches ?? true);
```

Read once at mount, not tracked across resizes — crossing the breakpoint mid-session is rare next to the cost of overriding a choice the reader already made. Document that as an accepted compromise in the file.

**This state must not enter `ShareState`/the URL hash.** The hash is a document; accordion open/closed is a UI session.

**Pills**: `role="group" aria-label={label}` with `aria-pressed` per button, matching the existing pane-toggle pattern in `Toolbar.tsx:136-150`. Selected → `btn-xs btn-primary`; available → `btn-xs btn-ghost` with a `border-base-300` border so unselected pills still read as pills; unavailable → the same plus the `disabled` attribute.

### 2. `src/components/EditorPane.tsx` — gains the `Key` button

Tab row becomes a flex row: the `role="tablist"` container, then `Key` pushed right with `ml-auto`, **outside** the tablist (a non-tab child of a tablist is an a11y problem). It's a `btn btn-xs btn-ghost`, not a `tab`, so the row doesn't imply three modes — it opens the existing `Legend` modal, which keeps its `max-w-4xl` width. Visible on both tabs; hiding it on the Mermaid tab would make the row jump for no gain.

**The first tab is relabelled from the ontology's name to `Code`** (mermaid.live's word for the same thing). The picker above already names the ontology, so the tab was repeating it — and a variable-length label here is a liability: at 320px, `Arg map: truth & relevance` + `Mermaid` + `Key` overflowed and daisyUI's `tabs` wrapped to two lines with `Key` floating between them. A fixed label makes the row immune to however long an ontology chooses to call itself, which matters more as ontologies are added. `ontologyLabel` stays a prop — it still names the ontology in the `Key` tooltip and, more importantly, in the textarea's `aria-label`, where a screen reader should hear "IBIS source" rather than "Code".

New prop: `onToggleLegend: () => void`.

Root drops `h-full`, `border-r`, `bg-base-100` (they move to the column wrapper in `App.tsx`) and gains `flex-1 min-h-0`, so the textarea shrinks when both accordions are open rather than pushing itself out of the column — the same reason `DiagramPane.tsx:74` carries `min-h-0`.

### 3. `FeatureStrip.tsx` → `RenderingStrip.tsx` — gains the `Style` button

- Rename the file and default export.
- Delete `if (features.length === 0) return null;` — the strip now always renders, since `Style` lives there and IBIS declares no features.
- New prop `onOpenStyle: () => void`, rendered as the last child of the pill row: `btn btn-xs btn-ghost font-normal ml-auto`, labelled `🎨 Style`, **with no `▾` caret**. That absence is what tells you it opens a dialog rather than expanding in place, so two identical-looking pills never behave differently.
- Rewrite the file's header comment: it currently promises "an ontology with no features renders no strip at all," which stops being true, and it should describe the strip as the rendering-scope bar hosting both ontology-declared features and the shell's own `Style` control.

The generic contract survives: `Style` is passed in by the shell as its own prop and is **not** faked as a `FeatureDef`, so nothing in the features path learns what a feature means.

### 4. `src/components/Toolbar.tsx` — site scope only

Delete: both `<select>`s, `Reset`, the `CUSTOM` constant, the `exampleLabel` import, `Key`, `Style`, and the entire `☰` dropdown along with its `menuOpen` state and the `pointerdown`/`Escape` dismissal effect (`Toolbar.tsx:50-64`) — that workaround exists for a menu that no longer has any items.

Drop the corresponding props: `ontologyList`, `examples`, `dirty`, `onOntologyChange`, `onExampleChange`, `onResetExample`, `onToggleLegend`, `onToggleConfig`. Keep `doc`/`shared` (still needed for `buildShareUrl`), `theme`, `pane`, `onPaneChange`, `onToggleTheme`.

Remove `hidden md:inline-flex` from theme and GitHub. **Keep `Copy link`'s icon/text swap.** Update the wrapping comment, which explains a wrap caused by controls that no longer live here, and keep `flex-wrap` as a 320px fallback. Promote the title from `hidden lg:inline` to `hidden md:inline` now that there's room.

### 5. `src/App.tsx` — wiring

The left column becomes a flex column composing `DocumentPicker` + `EditorPane`, mirroring how the right column already composes `RenderingStrip` + `DiagramPane`:

```jsx
<div className={`absolute inset-0 z-10 flex flex-col border-r border-base-300 bg-base-100 md:static md:w-2/5 md:min-w-70 md:max-w-160 ${pane === "view" ? "hidden md:flex" : ""}`}>
  <DocumentPicker … />
  <EditorPane … onToggleLegend={() => setLegendOpen((v) => !v)} />
</div>
```

**`md:block` must become `md:flex`** in the hidden branch, or it overrides `flex` and silently breaks the desktop column.

Pass `onOpenStyle` to `RenderingStrip`, import `EXAMPLES` from `./ontology/examples.ts` for `DocumentPicker`, and drop the now-unused `Toolbar` props. `legendOpen`/`configOpen` state, `Legend`, `ConfigPanel`, `switchOntology`, `switchExample`, `resetExample`, drafts, and the substitution notice are unchanged — the notice's trigger simply narrows to ontology switches, since a missing example is no longer clickable.

### 6. `AGENTS.md`

- Update the feature bullet: `components/FeatureStrip.tsx` → `RenderingStrip.tsx`, noting it always renders and also hosts the shell's `Style` button.
- Add a short line stating the site / document / rendering split and where each kind of control belongs, since that's now the rule a new control has to be placed by.
- Note in the examples bullet that the picker shows examples an ontology hasn't written as disabled pills.

## Out of scope

Making the `Style` panel expand inline instead of opening a modal. The backdrop dimming the diagram you're recoloring is a real wart, but a 6-type × 3-swatch table doesn't fit in the strip without a compact redesign. Left as a later call.

## Verification

No parser or mermaid output changes, so `npm run test` should pass **untouched** — itself the check that this is UI-only. From `ontology-playground/`:

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test
```

Browser checks (per AGENTS.md, check whether a dev server is already running via playwright first; if not, ask for `cd ontology-playground && npm run dev`):

- **Desktop**: both accordions open on load; toolbar holds only title, 🌙, Copy link, GitHub.
- **Gap display**: on arg-map both example pills are live; switch to IBIS and `Build a wall` dims with its tooltip. Select `Build a wall` on arg-map, then switch to IBIS — the substitution notice still fires and the `Example:` summary row updates to match.
- **Edited state**: type in the editor → the summary row reads `• edited` and `Reset` appears in it; `Reset` clears both. Confirm `Reset` does not toggle the accordion.
- **Key / Style**: `Key` opens the legend from the editor tab row on both tabs; `Style` opens the config modal from the strip; IBIS (zero features) still shows the strip with `Style` in it.
- **Layout**: confirm the `tabs-bordered` underline still renders correctly now that the tablist sits inside a flex row — adjust with CSS if the border no longer spans as intended.
- **Mobile at 375px and 320px**: toolbar on one line at 375px (wrapping gracefully at 320px); accordions collapsed by default with summary rows naming the selection; `Key` reachable in Edit mode and `Style` in View mode.
- **Dark mode**: verify a disabled pill is visibly distinct from an unselected-but-available one in **both** themes — `index.css` deliberately widened the dark base ramp, and dimmed-on-dim is the likely casualty.
- **Sharing**: copy a link, reload it — document state restores and the accordions open per viewport rather than per hash.
