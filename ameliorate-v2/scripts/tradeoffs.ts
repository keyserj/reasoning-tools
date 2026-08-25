// The tradeoffs table: options down one axis, criteria across the other.
//
// `ontology.md`'s Criterion: neither axis is listed anywhere, both are traced. Criteria are
// whatever declares itself `criterion for` the question; options are the actions whose causal
// reach touches what the question is about. A cell is how much the option fulfils the criterion,
// which may be direct or may run through what the option causes.

import { CAUSAL_TYPES, pathWeight, reachFrom, walk } from "./chains.ts";
import type { Doc } from "./model.ts";
import { average } from "./scores.ts";
import { guidingQuestions } from "./questions.ts";

/** `ontology.md` tags an action explicitly, since edges can't imply that something is doable. */
export const ACTION_TAG = "action";

export interface Tradeoffs {
  questionId: string;
  optionIds: string[];
  criterionIds: string[];
  /** `[criterionId][optionId]`: a sum of fulfilment scores, so a cell can exceed one score's
   * -8..8; null where no scored `fulfils` edge reaches the criterion from the option */
  cells: Record<string, Record<string, number | null>>;
}

const downstream = { types: CAUSAL_TYPES, direction: "forward" } as const;

/**
 * The table a "what's the best way to..." question is answered with. Null when the question has
 * no criteria to weigh against, or nothing it guides to trace options from.
 *
 * The criterion's own importance isn't folded into a cell: `ontology.md` weighs a cell by it to
 * total an option, but the wireframe shows importance on the row instead, and a pre-weighted
 * cell can't be read back as the fulfilment score it was written as.
 */
export function tradeoffs(doc: Doc, questionId: string): Tradeoffs | null {
  const byId = new Map(doc.nodes.map((node) => [node.id, node]));
  const criterionIds = [
    ...new Set(
      doc.edges
        .filter((edge) => edge.type === "criterion for" && edge.targetId === questionId)
        .map((edge) => edge.sourceId)
        .filter((id) => byId.get(id)?.type === "concept"),
    ),
  ];
  if (criterionIds.length === 0) return null;

  // what the question is about, resolved the one way ./questions.ts resolves it, so the table and
  // the agenda pane can't disagree about which question opens which view
  const subjectId = guidingQuestions(doc).find((q) => q.id === questionId)?.subjectId;
  if (subjectId === undefined) return null;

  // Any causal path counts, whichever way it points: an action that only makes the situation
  // worse is still one of the things being weighed, and leaving it out would decide the question
  // before the table is read. See `ontology.md`'s Action notes.
  const reachesSubject = reachFrom(doc, subjectId, { ...downstream, direction: "backward" });
  const optionIds = doc.nodes
    .filter((node) => node.type === "concept" && node.tags.includes(ACTION_TAG))
    .filter((node) => (reachesSubject.get(node.id) ?? 0) > 0)
    .map((node) => node.id);

  const reached = new Map<string, ReturnType<typeof walk>>();
  const downstreamOf = (optionId: string): ReturnType<typeof walk> => {
    const cached = reached.get(optionId);
    if (cached) return cached;
    const paths = walk(doc, optionId, downstream);
    reached.set(optionId, paths);
    return paths;
  };

  const cells: Record<string, Record<string, number | null>> = {};
  for (const criterionId of criterionIds) {
    cells[criterionId] = {};
    for (const optionId of optionIds) {
      cells[criterionId][optionId] = fulfilment(doc, optionId, criterionId, downstreamOf(optionId));
    }
  }

  return { questionId, optionIds, criterionIds, cells };
}

/**
 * How much an option fulfils a criterion, on the -8..8 scale the score was written on.
 *
 * A `fulfils` edge may hang off the option itself or off something the option causes - the wall
 * doesn't fail to be inexpensive directly, it costs billions, and the cost is what fails. The
 * causal run is a 0..1 weight that attenuates; the fulfilment keeps its own scale so the cell
 * reads as a score.
 */
function fulfilment(
  doc: Doc,
  optionId: string,
  criterionId: string,
  downstreamPaths: ReturnType<typeof walk>,
): number | null {
  let total: number | null = null;
  for (const edge of doc.edges) {
    if (edge.type !== "fulfils" || edge.targetId !== criterionId) continue;
    // An unscored causal step still counts, at the "somewhat" default; an unscored fulfilment
    // does not, because this number is shown as the cell rather than folded into one.
    const weight = average(edge.scores);
    if (weight === null) continue;

    if (edge.sourceId === optionId) {
      total = (total ?? 0) + weight;
      continue;
    }
    for (const path of downstreamPaths) {
      if (path.toId !== edge.sourceId) continue;
      total = (total ?? 0) + pathWeight(path) * weight;
    }
  }
  return total;
}
