import type { FeatureDef } from "../types.ts";

// The rendering lenses this ontology offers. `Edge claims` exists because rendering.md poses
// the two renderings as an open question and neither answer is obviously right: making it
// switchable is what lets the question be answered by looking at a real document rather than
// by rebuilding toGraph.ts. See ./toGraph.ts for what each option actually draws.
//
// The ids are exported so ./toGraph.ts can't drift from the table the UI is built from.

export const EDGE_CLAIMS = "edge-claims";
export const SPELLED_OUT = "spelled-out";
export const IMPLIED = "implied";

export const EDGE_DISPLAY = "edge-display";
export const EDGE_DISPLAY_DISTINGUISH = "distinguish-edge-to-edge";
export const EDGE_DISPLAY_SAME = "all-edges-same";

/**
 * The option names say what becomes of the claim an edge implies: `spelled out` writes it as
 * text in a node of its own, `implied` leaves it to be read off the arrangement.
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
    defaultOption: SPELLED_OUT,
    options: [
      {
        id: SPELLED_OUT,
        label: "spelled out",
        description:
          'Only edges someone argued about get a box; the rest stay labeled connectors. That box sits apart from the edge and writes the claim as text — "A" supports "B" — tied back to its connector by a ① marker on both.',
      },
      {
        id: IMPLIED,
        label: "implied",
        description:
          "Every edge gets a box, argued about or not, sitting on the edge between its endpoints. The claim is never written out; you read it off the arrangement A ──▶ supports ──▶ B.",
      },
    ],
    params: [
      {
        id: EDGE_DISPLAY,
        label: "Edge display",
        defaultOption: EDGE_DISPLAY_DISTINGUISH,
        onlyForOptions: [IMPLIED],
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
