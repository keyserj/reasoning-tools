# Rendering: IBIS

IBIS's model is already node-and-edge shaped, so rendering adds nothing to the argument itself (as opposed to arg-map-truth-and-relevance, which e.g. renders edges into nodes so they can be pointed to). The one thing it does add is a box per note, which is the only form a note is ever drawn in.

## Nodes and edges

- one rendered node type per ontology node type, plus `note`, which is the playground's rather than IBIS's — see `../notes.ts`
- questions are hexagons, everything else a rectangle, and notes a parallelogram to read as an aside
- notes attach with a dotted edge; every other edge is a solid arrow
- default layout is `BT`, so parent questions sit at the top while argument edges point upward at them, matching how the source text reads top-down

## Colors and icons

Colors follow the same red/blue axis as [ameliorate-v2's UX-design.md](../../../../ameliorate-v2/UX-design.md) and as the arg-map ontology uses, so the two ontologies stay comparable on the same topic. Each type declares one color, and the fill, border and text a box is drawn in are derived from it per theme (`../typeColors.ts`).

- `pro` is blue and `con` red, reusing the wireframes' `RB = { neg: "#b2182b", pos: "#2166ac" }`
- `idea` is amber and `note` sticky-note yellow, on the split argued in [the arg-map ontology's rendering.md](../arg-map-truth-and-relevance/rendering.md#colors-and-icons). Amber suits the 💡 icon, and warm-vs-blue is the second colorblind-safe axis, so ideas stay distinct from both pros and cons
- `question` is gray: a question is a prompt rather than something to take a position on, and gray is the only neutral in the palette. Zinc `#71717a` rather than a slate gray, whose hue sits five degrees off `pro` blue and derives to a fill that reads as pale blue beside one
- icons work the same way as in the arg-map ontology: ✅ / ⛔ for the pro/con axis, unrelated pictograms (❓ 💡 📝) for the rest. Shape has to carry the pro/con distinction on its own for anyone who can't use the color, and a check against a barred circle does that at icon size

### Questions - Unanswered

- the gray/blue comparison above is made on derived _fills_, which is the weakest of the three roles: in light mode a type's border is the literal color picked, and `#64748b` against `#2166ac` separates plainly there. If slate turns out to read fine in practice, the zinc pick is worth revisiting
