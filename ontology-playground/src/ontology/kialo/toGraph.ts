import type { RenderEdge, RenderNode, RenderGraph } from "../types.ts";
import {
  type Argument,
  type Claim,
  type KialoDoc,
  type Placement,
  isArgument,
  isThesis,
  placementsByClaim,
} from "./model.ts";
import { type Scores, formatScores } from "./scores.ts";

// How this ontology gets drawn — the one file to rewrite if the rendering should change; the
// reasoning is in ./rendering.md.
//
// The problem it solves: a score and a stance belong to a *placement*, but a claim placed twice
// is still one box. So a box speaks for its placement only when it has exactly one, and
// otherwise stays neutral and lets the connectors speak.

/** Id of the header node. Leading `_` is already a safe mermaid identifier. */
const TOPIC_ID = "_topic";

/** Marks a claim as having evidence without putting a URL in the diagram. */
const SOURCE_ICON = "🔗";

/** Scores go on their own line; ../mermaidFlowchart.ts turns the newline into a `<br/>`. */
function withScores(text: string, scores: Scores | null): string {
  return scores === null ? text : `${text}\n${formatScores(scores)}`;
}

/**
 * The header's text: what's being discussed, and how to read a score row. Perspectives keep the
 * bracketed, comma-separated shape of a score row (and of the `%perspectives` line they come
 * from), so `[3,1]` can be read off the header slot by slot instead of by inference.
 */
function topicText(doc: KialoDoc): string {
  const parts: string[] = [];
  if (doc.description) parts.push(doc.description);
  if (doc.perspectives.length > 0) parts.push(`Votes: [${doc.perspectives.join(", ")}]`);
  return parts.join("\n");
}

/**
 * The placement a claim's box speaks for, or `null` when it has to stay neutral.
 *
 * A single argument is folded into the box: that is the ordinary claim, and folding is what
 * keeps a Kialo diagram as plain as an IBIS one. Anything else — a thesis, which has a veracity
 * but no stance, or a claim placed twice, whose placements disagree — leaves the box a plain
 * `claim` and pushes what the placements say onto the connectors.
 */
function foldedArgument(placements: Placement[]): Argument | null {
  if (placements.length !== 1) return null;
  const only = placements[0];
  return isArgument(only) ? only : null;
}

/** A claim's box: its stance if it has just one, the score that goes with it, and its sources. */
function claimNode(claim: Claim, placements: Placement[], showIcons: boolean): RenderNode {
  const folded = foldedArgument(placements);
  // A placement is a thesis or an argument, never both, and a claim may be a thesis only once,
  // so a box reaches here with at most one score to show and no precedence to settle.
  const thesis = placements.find(isThesis);

  const evidence = showIcons && claim.sources.length > 0 ? ` ${SOURCE_ICON}` : "";
  return {
    id: claim.id,
    type: folded === null ? "claim" : folded.stance,
    text: withScores(`${claim.text}${evidence}`, thesis?.veracity ?? folded?.impact ?? null),
  };
}

/** Flatten a {@link KialoDoc} into the shared {@link RenderGraph}. */
export function toGraph(doc: KialoDoc, showIcons: boolean): RenderGraph {
  const nodes: RenderNode[] = [];
  const edges: RenderEdge[] = [];
  const byClaim = placementsByClaim(doc);

  const header = topicText(doc);
  if (header !== "") nodes.push({ id: TOPIC_ID, type: "topic", text: header });

  for (const question of doc.questions) {
    nodes.push({ id: question.id, type: "question", text: question.text });
  }

  for (const claim of doc.claims) {
    const placements = byClaim.get(claim.id) ?? [];
    nodes.push(claimNode(claim, placements, showIcons));
    for (const note of claim.notes) {
      nodes.push({ id: note.id, type: "note", text: note.text });
      edges.push({ from: note.id, to: claim.id, type: "note" });
    }
  }

  // A thesis under a question is drawn plainly: which question it answers is the whole of what
  // the connector says, and its veracity is already on the box.
  for (const thesis of doc.theses) {
    if (thesis.questionId !== null) {
      edges.push({ from: thesis.claimId, to: thesis.questionId, type: "link" });
    }
  }

  // An argument the box folded is drawn plainly too — repeating the stance on the connector
  // would say it twice. An unfolded one is the only thing left to carry it, so it takes the
  // stance's color and icon, plus its own impact, which is the score the box couldn't show.
  for (const argument of doc.arguments) {
    const folded = foldedArgument(byClaim.get(argument.claimId) ?? []);
    if (folded !== null) {
      edges.push({ from: argument.claimId, to: argument.parentClaimId, type: "link" });
      continue;
    }
    edges.push({
      from: argument.claimId,
      to: argument.parentClaimId,
      type: argument.stance,
      // No label when nobody voted: the color still says which stance it is, and an empty
      // label would only reserve space. The icon rides on the label, so it goes too.
      ...(argument.impact === null ? {} : { label: formatScores(argument.impact) }),
    });
  }

  // Direction is load-bearing: the default layout is BT, where an edge's *target* is ranked
  // above its source, so a root is the source and the header the target. Every root is anchored
  // rather than just the first, which is what keeps the header above the whole diagram instead
  // of over one column of it.
  if (header !== "") {
    const roots = [
      ...doc.questions.map((question) => question.id),
      ...doc.theses.filter((thesis) => thesis.questionId === null).map((thesis) => thesis.claimId),
    ];
    for (const rootId of roots) edges.push({ from: rootId, to: TOPIC_ID, type: "anchor" });
  }

  return { nodes, edges };
}
