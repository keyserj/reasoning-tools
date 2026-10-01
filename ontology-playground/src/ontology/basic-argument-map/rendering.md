# Rendering: Basic argument map

Each node gets one rectangular box, including when references attach it to multiple parents. A node's box maps to its declaration and reference lines; each connector maps to the line that attaches its child.

Argument connectors are plain solid arrows from child to parent. The default layout is `BT`, placing parents above their children. There are no rendering features.

The palette and icons match [IBIS](../ibis/rendering.md): Claim is amber `#d97706` with 💡, Support is blue `#2166ac` with ✅, and Critique is red `#b2182b` with ⛔. Support and Critique differ in icon shape as well as color. Each type's configured color drives the diagram, editor, and legend together.

Notes use the shared yellow 📝 parallelogram and a dotted connector to their owner. Document notes sit above the roots, positioned with invisible connectors.
