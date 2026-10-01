# Replace mermaid with dagre and our own SVG

## Context

The diagram trails the Code tab on every ontology/example switch, and on every keystroke. Typing in a large document freezes the editor itself: mermaid renders every intermediate text in sequence and blocks the page while it does. Mermaid's text-in, SVG-out interface buys us nothing a user sees — nobody edits the generated mermaid — and it is where nearly all the time goes. Layout itself is cheap; mermaid's way of building the picture is not.

Goal: the diagram updates in the same frame as the editor, typing never stalls, and mermaid survives only as an export format.

## Measured facts

All measured with Playwright against the dev server (Chrome), using CDP CPU profiles and traces, and by wrapping `mermaid.render` to time each call. "Big" is Ameliorate v2's Build a wall: 79 nodes, 86 edges.

| What | Number |
| --- | --- |
| Switch → diagram, big | ~850ms (was 6.5-7s before the `lh` fix below) |
| Switch → diagram, Arg map T&R Build a wall / Kialo / small examples | ~280ms / ~210ms / 70-160ms |
| `mermaid.render`, big text, in the app vs an empty page | ~700-780ms vs ~350-370ms |
| `mermaid.render`, a one-node diagram | ~10ms (fixed overhead is small; cost scales with size) |
| Inside that render: dagre layout / native measurement calls / DOMPurify | ~21ms / ~470ms over ~700 calls / ~97ms |
| One keystroke → diagram, small / big | +126ms / +891ms |
| 6 keystrokes 40ms apart, small: last char visible / diagram | +539ms / +619ms (6 full renders) |
| 6 keystrokes 40ms apart, big: last char visible / diagram | **+3.9s** / +4.6s (6 full renders) |
| Prototype of this design on the big graph, in the app page | **~23ms**: measure labels 2.9, dagre 13.9, build + insert SVG 5.9 |

- **Why mermaid is slow**: it inserts each node, then measures it (`getBoundingClientRect`, `getBBox`, `getTotalLength`), ~700 times for the big graph. Each measurement forces a style recalc and layout. It also deep-clones its whole config on every `getConfig()` call and DOMPurifies the output.
- **Why it is worse inside the app**: daisyUI ships six `:root:has(…)` rules (the theme-controller selectors and the modal scroll lock). Any DOM change makes Chrome re-evaluate them, which means walking the whole document, old diagram included. Harmless once per render; costly 700 times per render.
- **The `lh` regression** (fixed separately, see step 0): while an element styled in `lh` units is on the page, Chrome turns every `<html>` restyle into a whole-page restyle. Combined with the `:has()` rules, that made each of mermaid's ~700 measurements restyle ~700 elements. It arrived with the caret-line band (`b3f84c3`).
- **Renders pile up**: mermaid serializes `render` calls, and DiagramPane's `cancelled` flag discards a stale result only after it has been computed, so N keystrokes cost N full renders.
- **Mermaid's flowchart defaults** (read off the running instance): font `"trebuchet ms", verdana, arial, sans-serif` at 16px, `nodeSpacing` 50, `rankSpacing` 50, node `padding` 15, `wrappingWidth` 200, `diagramPadding` 8, `curve: basis`, HTML labels.
- **dagre's defaults that bite** (read in the graphlib/dagre source mermaid bundles, `dagre-d3-es`, the same lineage as `@dagrejs/dagre`): an edge's key is `from␁to␁name`, with a shared default name when none is given, so unnamed parallel edges overwrite each other even in a multigraph. And `labelpos` defaults to `'r'`; for anything but `'c'` dagre also widens the edge by `labeloffset` (10), shifting spacing as well as the label (`layout.js:153`).
- **Mermaid's stadium** builds one list of points along its curved outline, draws the shape from them, and intersects edges against the same points (`intersect.polygon`).
- **Prior art in this repo**: the Ameliorate wireframes from v8 on already draw with vendored dagre + svg-pan-zoom: labels in `foreignObject`, `viewportSelector` so svg-pan-zoom transforms a `<g>` we own, edge ends re-intersected against their boxes (`trimToRect`), and the same B-spline curve mermaid draws (`curveThrough`). See `ameliorate-v2/wireframe/topic-landing-v10.html` around `edgePath`.

The prototype left out shapes other than a rectangle, curves, theming and pan/zoom init (svg-pan-zoom's init costs ~15ms today), so expect 30-50ms for the real thing on the big graph — still 15-25× faster, and a few ms for small documents.

## Design

### Pipeline

Per keystroke: text → `ontology.parse` → the ontology's model → `ontology.toGraph` → `RenderGraph` → `layoutDiagram` (measure labels, dagre) → React SVG. All synchronous, in the same React commit as the editor, so both panes paint in the same frame. Mermaid text is generated only when you copy it.

### Contract — `src/ontology/types.ts`

- **`toMermaid(doc, config, features, theme) → MermaidOutput` becomes `toGraph(doc, config, features) → RenderGraph`.** `theme` leaves the ontology contract: only the renderer and the exporter turn a type's color into paint. Every ontology's `toMermaid.ts` is already `flowchart(toGraph(…), …)`, so each `index.ts` wires its existing `toGraph` in with a one-line adapter (kialo passes `config.showIcons`, arg-map T&R and Ameliorate pass `features`) and `toMermaid.ts` is deleted.
- **`NodeTypeDef.shape` becomes a name instead of mermaid brackets**, and **`EdgeTypeDef.connector` likewise**. Both are rendering vocabulary the playground owns. The mapping is closed and exhaustive over what the five ontologies use:

  | mermaid today | `NodeShape` | used by |
  | --- | --- | --- |
  | `["…"]` | `rect` | most types |
  | `("…")` | `rounded` | Ameliorate |
  | `(["…"])` | `stadium` | Arg map T&R, Ameliorate |
  | `[["…"]]` | `subroutine` | topic headers |
  | `{{"…"}}` | `hexagon` | IBIS, Kialo |
  | `{"…"}` | `diamond` | Ameliorate |
  | `[/"…"/]` | `parallelogram` | notes |

  | mermaid today | `Connector` | used by |
  | --- | --- | --- |
  | `-->` | `arrow` | the default everywhere |
  | `---` | `line` | the half of an edge that runs into an edge box |
  | `-.->` | `dotted-arrow` | notes |
  | `~~~` | `invisible` | anchors (`anchoring.ts`) |

  Every ontology's `DEFAULT_CONNECTOR` is `"-->"`, so the per-ontology constant goes and the renderer defaults to `arrow`.
- **`SourceMap` and `MermaidOutput` go.** They exist to get from mermaid's DOM ids back to source lines. Our renderer draws each element straight from a `RenderNode`/`RenderEdge`, which already carries `lines`.

### Layout — `src/diagram/layout.ts` (pure)

`layoutDiagram(graph, types, config, measure) → DiagramLayout`, where `measure` is injected so the function runs under vitest's node environment with a fake.

- Drops an edge whose endpoint is missing (an unresolved `$ref` mid-typing), exactly as `flowchart()` does today.
- Adds nodes and edges to dagre in `RenderGraph` order. Several `toGraph.ts` files rely on emission order deciding where boxes land ("mermaid draws boxes in the order they're emitted"); that order is really dagre's initial ordering, so it carries over.
- dagre (`@dagrejs/dagre`, currently 3.1.1: ESM, ships its own types, one dependency on `@dagrejs/graphlib`) runs with mermaid's defaults: `rankdir` from `config.direction`, `nodesep` 50, `ranksep` 50, margins 8.
- **Every edge is named** by its index in the list of drawn edges, in a `multigraph`. Without a name, parallel edges between the same two boxes overwrite each other (see Measured facts) — a child plus a repeated `$ref` in a valid basic argument is enough to lose one. Source lines stay on our own edge records rather than in dagre's labels.
- **Labeled edges set `labelpos: "c"`** along with their label's measured size, so dagre reserves a slot centered on the connector, where mermaid draws it today. dagre's default (`"r"`, offset 10px) would put the label beside the line and widen its spacing.
- A box's outer size is its label's size plus the shape's own allowance (a stadium adds its end caps, a hexagon its points, a diamond is the label's width + height square).
- **Each shape is one outline: a list of points, used both to draw it and to trim edges against it**, so the two can't disagree. Curved outlines (the stadium's caps, the rounded rectangle's corners) are approximated by points along the curve, as mermaid does for its stadium. One polygon intersection serves every shape, with no rectangle special case.
- Edge ends are re-intersected against those outlines, then drawn as the wireframe's tripled-end B-spline. dagre lays out self-loops itself, and their ends are trimmed the same way.
- `invisible` connectors shape the layout and are not drawn.
- Output: positioned nodes (shape, box, label lines, type, `dashed`, source `lines`), drawn edges (path `d`, connector, color type, label box, source `lines`), the viewBox, and the picture key (see Rendering). The empty graph returns the placeholder text instead.

### Measuring labels — `src/diagram/measure.ts`

Labels stay HTML in a `foreignObject`, as mermaid and the wireframe draw them today: wrapped at 200px, mermaid's padding, a node's `\n` as a line break, and mermaid's font (`"trebuchet ms"` at 16px), kept for now so the look doesn't change underneath you.

- **One forced layout per render.** A single hidden host holds the labels not yet measured: write them all, then read them all. Results are cached by label text and label kind, so a keystroke measures only the label it changed, and a switch measures each label once.
- **One label class, shared by the measurer and the renderer** and not scoped under `.diagram-pane`, since the host lives outside it. If the two ever disagree, text spills out of its box, so they must not be able to.
- **Accepted compromise**: `layoutDiagram` runs inside a `useMemo` and the measurer reads the DOM, which a pure render isn't supposed to do. It's idempotent and cached, so StrictMode's double render and React discarding a render are both harmless. The alternative is a layout effect that measures and sets state, which costs a second render pass for nothing. The comment at the call site says this.
- **Rejected for now: SVG `<text>` with canvas `measureText` and our own word wrapping.** It would make layout fully pure and skip the DOM read, but it changes the typography and makes us own line breaking. Fallback trigger: if `foreignObject` misbehaves under svg-pan-zoom's transform in Safari, switch to this.

### Rendering — `src/components/Diagram.tsx` + `DiagramPane.tsx`

- React renders the `<svg>`: edges first, then boxes, so lines sit under the boxes they end on. Document text reaches the DOM only as React text children.
- svg-pan-zoom gets `viewportSelector` pointing at our viewport `<g>` (the wireframe's setup), so React owns the content and svg-pan-zoom only owns that `<g>`'s transform. `cappedFit`, `syncZoomLimits` and the ResizeObserver stay as they are.
- **Refit when the picture's structure changes, and only then.** Not when its bounds change: different structures can share bounds, like a label edited to the same width or a different graph of the same size. The trigger is a **picture key**: a serialization of the picture's geometry and text (shapes, positions, sizes, label text, connector kinds, dashing). It leaves out colors, the theme and source lines.
  - A label edit changes the structure, so typing refits, as today.
  - A color-only change keeps your view: a recolor in the Style dialog, or toggling the theme. Today both refit. Colors never affect size, so the layout is identical and React just repaints the fills.
  - An edit that only moves lines (a comment, a blank line above) keeps your view, as today.
- **The effect writes the `viewBox`, not React.** svg-pan-zoom deletes the attribute when it initializes, and React won't restore a value it thinks is unchanged, so restarting for a same-size picture would find none. On a key change the effect sets the `viewBox` from the layout, then destroys and re-initializes svg-pan-zoom.
- **Color**: a node's fill, border and text come from `deriveTypeStyle` as inline styles, as today. A connector with a `colorTypeId` takes that type's border color, with one arrowhead `<marker>` per color in use (markers don't inherit stroke). Default edge, arrowhead and edge-label colors come from daisyUI tokens in `Diagram.css`, replacing mermaid's light/dark themes.
- **Linking gets simpler.** Each drawn element knows its `lines`, so `is-linked`/`is-active` are classes computed from `activeLine` during render, and a tap reads `lines[0]` off the element it landed on. The normalize-and-tag pass and the DOM-id parsing in `diagramTargets.ts` go away. Toggling a class doesn't rebuild the SVG, so caret moves still keep pan/zoom. `TAP_SLOP` and the pointer handling stay.
- **Errors**: a layout throw would be our bug, not the document's. Catch it, keep the last good picture up, and show the existing error alert.

### Export — `src/ontology/mermaidExport.ts`

`mermaidFlowchart.ts` becomes the exporter: the same emission (`classDef`, `linkStyle`, escaping, id sanitizing), minus the source map, self-loop segment bookkeeping and `eN@` edge names. It maps `NodeShape`/`Connector` back to mermaid syntax. It is the only remaining reason `typeColors.ts` derives hex, and its comment saying so stays true.

The `mermaid` npm package is removed: exporting is string building.

**The surface is a "Copy as Mermaid" button in the rendering strip, next to 🎨 Style**, replacing the Mermaid tab.

- **Placement:** it exports the rendered diagram, with the current style and features applied, so it sits with the controls that shape that diagram. That also keeps it out of the editor's band, whose row has to fit 320px.
- **Behavior:** the text is generated on click. Feedback follows Copy link's pattern ("Copied!"). If clipboard access fails, App's existing notice says so; unlike Copy link, there's no address bar to fall back on.
- **With the tab gone, "Code" becomes a plain band header.** It needs an explicit height, since daisyUI's `tab` is what gave that band its 40px.
- **The tab's state goes too**: `activeTab`/`EditorTab` in App and EditorPane, and the `mermaidText` prop. The textarea always holds the source and the overlay is always on. A diagram click no longer switches tabs first, the caret request no longer waits for the Code tab, and refJump's comment about the Mermaid tab goes.

### What goes away

`mermaidClient.ts`, the `mermaid` dependency (and the lazy chunk it loaded), the Mermaid tab and its state, DOMPurify on the render path, `diagramTargets.ts`'s id parsing, the self-loop source-map special case, and DiagramPane.css's selectors on mermaid's classes (`g.node`, `path.flowchart-link`, `g.edgeLabels g.label`). The `:root:has()` PostCSS strip and the SVG cache proposed earlier are no longer needed: with one measurement per render, `:has()` costs one document walk, and a render is cheap enough that a cache saves nothing worth having.

**Security** gets simpler too. `escapeLabel`'s second reason — a shared link smuggling `<img>` beacons through mermaid's HTML labels — doesn't apply when text reaches the DOM as React text. Escaping stays in the exporter for whatever renders the exported mermaid. `share/url.ts`'s note about hashes reaching mermaid source becomes about the export only.

## Order

Each step is its own commit. **Stop for review at every boundary; don't commit unprompted.**

0. **The `<br>` fix already in the working tree.** It's independent of mermaid: the `lh` × `:has()` interaction turns any DOM change into a whole-page restyle, and typing changes the overlay's DOM on every keystroke. Reword its comment so it doesn't name mermaid, e.g. "Not `min-height: 1lh`: in Chrome, an `lh` unit on the page makes every restyle that daisyUI's `:has()` rules trigger cover the whole page, so every DOM change costs a full restyle."
1. **Shape and connector names.** The type tables move to `NodeShape`/`Connector`; `flowchart()` maps them back to brackets and arrows. A pure refactor: mermaid output, and so every snapshot, is unchanged.
2. **Layout and measurer, unused by the app.** `src/diagram/` with its tests.
3. **The switch.** The `toGraph` contract, `Diagram.tsx` in DiagramPane, and the Mermaid tab reading the exporter, so the tab keeps working until step 4. Delete `mermaidClient.ts` and the id parsing; drop the dependency. Take the baseline screenshots for the visual review *before* this step, while mermaid still draws.
   - **Then measure a keystroke on the big document** to decide on deferral. Under ~50ms, stay synchronous, which keeps the diagram in the same frame as the editor.
   - Over ~50ms, wrap the graph in `useDeferredValue`. React then paints the keystroke first, renders the diagram right after, and skips to the latest text when typing outruns it. The cost is the diagram landing a frame or so after the editor. It's a few lines either way, because the layout already runs inside a memo.
4. **Copy as Mermaid.** The button replaces the Mermaid tab, "Code" becomes a header, and the tab state goes (see Export).
5. **Docs sweep** (below).

## Tests

- `layout.test.ts` with a fake measurer (e.g. a fixed width per character), over every example of every ontology: every node has a finite position, every drawn edge starts and ends on its boxes' outlines, `invisible` edges aren't drawn, edges to missing nodes are dropped, self-loops produce a path, each `direction` maps to the right `rankdir`.
- **Parallel edges**: the reviewer's repro — a basic argument with a child and a repeated `$ref` — lays out as two connectors, each with its own source lines.
- **Edge labels**: a label's center sits on its connector's path, not beside it.
- **Geometry**, per shape: edges approaching head-on and at oblique angles end on the drawn outline within 1px, the stadium's caps and the diamond's points included. Self-loops end on their box's outline too. And the B-spline's endpoints land on the given points.
- **Picture key**: unchanged by shifting every source line by one, by a recolor, or by a theme change. Changed by a same-width label edit, and by a different graph with the same bounds.
- `registry.test.ts`'s linking contract moves from `SourceMap` to `RenderGraph`, keeping what it checks today: every line in range, and every node carries lines. Its edge check (every mapped edge id appears in the text) has no counterpart, since edges are drawn straight from the graph. Plus every example lays out without throwing.
- Exporter snapshots stay, re-recorded once in step 3 because `eN@` names leave; read the diff (AGENTS.md).
- Delete `diagramTargets.test.ts` and the self-loop source-map tests in `mermaidFlowchart.test.ts`.

## Verification

- `npm run typecheck && npm test && npm run lint && npm run format:check`.
- Playwright on the running dev server, re-running this session's measurements:
  - **Switch**: the diagram changes in the same frame as the editor, on every ontology, big example included.
  - **Typing**: on the big document, six keystrokes 40ms apart all appear as typed, with no queued renders.
  - **Pan/zoom**: zoom into a region, then recolor a type in the Style dialog and toggle the theme. The view stays put. Edit a comment: it stays put. Edit a label: it refits.
  - **Copy as Mermaid**: the clipboard holds the exporter's text and the button shows "Copied!". With clipboard permission denied, the notice appears instead.
- **Visual review**: screenshot every ontology × example × theme, mermaid baseline against the new renderer. Check each of the seven shapes, arrowheads (touching curved outlines, not floating off a stadium's cap), colored connectors, dashed copies, notes and their dotted connectors, edge labels (Arg map T&R's spelled-out lens), self-loops, the empty-document placeholder, and the topic header staying above the argument.
- **Linking**, per the linking design's checklist: caret ↔ box both ways, a `$ref` copy, clicking a labeled connector at its midpoint, a pan that doesn't count as a click.

## Docs to update in step 5

- `AGENTS.md`: the architecture line ("→ `ontology.toMermaid` → mermaid source plus a source map → SVG injected"), the layout blurb ("get a rendered mermaid diagram"), and its comment example, which uses mermaid's `classDef` (still true, now of the exporter).
- `src/ontology/pipeline.md`: the emission row of the table and the source-map paragraph.
- `.claude/skills/add-ontology/SKILL.md`, `README.md` (the stack list, `npm run test`'s description), `types.ts`'s header.
- Mermaid named as the renderer in: each ontology's `rendering.md`, the `renderedNodeTypes.ts`/`renderedEdgeTypes.ts` headers (Arg map T&R's `link` comment), the "mermaid draws boxes in the order they're emitted" comments in `toGraph.ts`, `ids.ts`, `features.ts`, `RenderingStrip.tsx`, `index.css`'s dark-ramp rationale ("the diagram is Mermaid's own dark theme"), `share/url.ts`.
- **User-facing text**: Arg map T&R's feature description ("One ontology edge is two mermaid connectors…") and the two `session-storage.txt` examples ("doesn't show up in mermaid").
