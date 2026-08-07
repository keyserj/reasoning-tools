# Rendering: IBIS

IBIS's model already _is_ a node-and-edge graph, so rendering doesn't actually add any new elements (as opposed to arg-map-truth-and-relevance, which e.g. renders edges into nodes so they can be pointed to).

## Nodes and edges

- one rendered node type per ontology node type, so `renderedNodeTypes.ts` and the ontology agree exactly
- questions are hexagons, everything else a rectangle, and notes a parallelogram to read as an aside
- notes attach with a dotted edge; every other edge is a solid arrow
- default layout is `BT`, so parent questions sit at the top while argument edges point upward at them, matching how the source text reads top-down

## Colors and icons

Colors follow the same red/blue axis as [ameliorate-v2's UX-design.md](../../../../ameliorate-v2/UX-design.md) and as the arg-map ontology uses, so the two ontologies stay comparable on the same topic. Each type declares one color, and the fill, border and text a box is drawn in are derived from it per theme (`../typeColors.ts`).

- `pro` is blue and `con` red, reusing the wireframes' `RB = { neg: "#b2182b", pos: "#2166ac" }`
- `idea` is yellow: it suits the 💡 icon, and blue-vs-yellow is the second colorblind-safe axis, so ideas stay distinct from both pros and cons
- `note` is grey, which suits an annotation
- icons work the same way as in the arg-map ontology: ✅ / ⛔ for the pro/con axis, unrelated pictograms (❓ 💡 📝) for the rest. Shape has to carry the pro/con distinction on its own for anyone who can't use the color, and a check against a barred circle does that at icon size

### Questions - Unanswered

- `question` purple sits fairly close to `pro` blue under protanopia. The hexagon shape and ❓ icon separate them in practice, but a different hue for questions could be worth considering
