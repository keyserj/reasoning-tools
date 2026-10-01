import type { FeatureDef } from "../types.ts";

export const VIEW = "view";
export const FULL = "full";
export const CAUSAL = "causal";
export const DEFAULT_VIEW = FULL;

export const EDGE_CLAIMS = "edge-claims";
export const SPELLED_OUT = "spelled-out";
export const IMPLIED = "implied";
export const DEFAULT_EDGE_CLAIMS = IMPLIED;

export const features: FeatureDef[] = [
  {
    id: VIEW,
    label: "View",
    description: "Which parts of the document appear in the diagram.",
    defaultOption: DEFAULT_VIEW,
    options: [
      {
        id: FULL,
        label: "Full structure",
        description: "All concepts, questions, claims, sources, relations, and notes.",
      },
      {
        id: CAUSAL,
        label: "Causal only",
        description:
          "Causes, reduces, and impedes relations between concepts. Notes follow their visible owners; document notes and score context remain.",
      },
    ],
  },
  {
    id: EDGE_CLAIMS,
    label: "Edge claims",
    description: "How relations and the claims behind their scores appear in the diagram.",
    defaultOption: DEFAULT_EDGE_CLAIMS,
    options: [
      {
        id: SPELLED_OUT,
        label: "spelled out",
        description:
          "Relations are labeled arrows. Referenced implied claims appear in separate boxes with matching numbered markers; relation notes also receive an attachment box.",
      },
      {
        id: IMPLIED,
        label: "implied",
        description:
          "Each relation is a box between its endpoints. Arguments about its score attach to that box. Claims about a concept's importance remain separate.",
      },
    ],
  },
];
