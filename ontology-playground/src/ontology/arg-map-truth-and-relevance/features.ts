import type { FeatureDef } from "../types.ts";

// The rendering lenses this ontology offers. `Edge claims` exists because rendering.md poses
// the two renderings as an open question and neither answer is obviously right: making it
// switchable is what lets the question be answered by looking at a real document rather than
// by rebuilding toGraph.ts. See ./toGraph.ts for what each option actually draws.
//
// The ids are exported so ./toGraph.ts can't drift from the table the UI is built from.

export const EDGE_CLAIMS = "edge-claims";
export const EXPLICIT_SEPARATE = "explicit-separate";
export const IMPLICIT_ON_EDGE = "implicit-on-edge";

export const EDGE_DISPLAY = "edge-display";
export const EDGE_DISPLAY_DISTINGUISH = "distinguish-edge-to-edge";
export const EDGE_DISPLAY_SAME = "all-edges-same";

/**
 * Explicit vs implicit is about how an edge's claim is *displayed*, not about what the author
 * wrote: spelled out as text, versus left for the reader to infer from the arrangement. The
 * two happen to coincide in the implementation — only argued-about edges get a spelled-out
 * node — but the display distinction is the one the names draw.
 *
 * A `label` has to fit a pill sitting above the diagram; the `description` is the full
 * phrasing, and the feature panel is where it gets read. See ./rendering.md for the argument
 * each option is an answer to.
 */
export const features: FeatureDef[] = [
  {
    id: EDGE_CLAIMS,
    label: "Edge claims",
    description:
      "Every supports/critiques edge makes a claim about the two claims it joins. This is how that claim gets drawn.",
    defaultOption: EXPLICIT_SEPARATE,
    options: [
      {
        id: EXPLICIT_SEPARATE,
        label: "Explicit, separate",
        description:
          'Separate nodes for explicit edge claims. The claim is spelled out as text — "A" supports "B" — in a node of its own, drawn apart from the edge it is about and tied to it by a ① marker on both. Only edges someone argued about get one; the rest are labeled connectors.',
      },
      {
        id: IMPLICIT_ON_EDGE,
        label: "Implicit, on the edge",
        description:
          "Nodes on the edge for implicit edge claims. The claim is never written out; you read it off the arrangement A ──▶ supports ──▶ B. Every edge gets a box, argued about or not.",
      },
    ],
    params: [
      {
        id: EDGE_DISPLAY,
        label: "Edge display",
        defaultOption: EDGE_DISPLAY_DISTINGUISH,
        onlyForOptions: [IMPLICIT_ON_EDGE],
        options: [
          {
            id: EDGE_DISPLAY_DISTINGUISH,
            label: "distinguish edge→edge",
            description:
              "One ontology edge is two mermaid connectors, so draw them as the halves they are: no arrowhead on the way into the edge box, and a thick arrow out of it when it lands on another edge box rather than on a claim.",
          },
          {
            id: EDGE_DISPLAY_SAME,
            label: "all edges same",
            description:
              "Every connector is a plain arrow, so an edge reads as two arrows through a box and arguing about an edge looks like arguing about a claim.",
          },
        ],
      },
    ],
  },
];
