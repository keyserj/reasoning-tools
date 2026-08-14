import type { RenderEdge, RenderNode, RenderGraph } from "../types.ts";
import { ANCHOR_TYPE_ID } from "../anchoring.ts";
import { addDocumentNotes, addNotes } from "../notes.ts";
import {
  type Argument,
  type Claim,
  type ClaimUsage,
  type KialoDoc,
  isArgument,
  isThesis,
  usagesByClaim,
} from "./model.ts";
import { type Scores, formatScores } from "./scores.ts";

// How this ontology gets drawn — the one file to rewrite if the rendering should change. A score
// and a stance belong to one usage of a claim, but a claim reused elsewhere is still one box;
// ./rendering.md lays out what this does about that.

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
  if (doc.perspectives.length > 0) parts.push(`Scores: [${doc.perspectives.join(", ")}]`);
  return parts.join("\n");
}

/** The usage a claim's box speaks for, or `null` when it has to stay neutral — see ./rendering.md. */
function foldedArgument(usages: ClaimUsage[]): Argument | null {
  if (usages.length !== 1) return null;
  const only = usages[0];
  return isArgument(only) ? only : null;
}

/** A claim's box: which usage it speaks for, the score that goes with it, and its sources. */
function claimNode(claim: Claim, usages: ClaimUsage[], showIcons: boolean): RenderNode {
  const folded = foldedArgument(usages);
  // A claim may be a thesis only once, and a thesis usage never folds, so a box reaches here with
  // at most one score to show.
  const thesis = usages.find(isThesis);

  const evidence = showIcons && claim.sources.length > 0 ? ` ${SOURCE_ICON}` : "";
  return {
    id: claim.id,
    type: thesis !== undefined ? "thesis" : folded === null ? "claim" : folded.stance,
    text: withScores(`${claim.text}${evidence}`, thesis?.veracity ?? folded?.impact ?? null),
  };
}

/** Flatten a {@link KialoDoc} into the shared {@link RenderGraph}. */
export function toGraph(doc: KialoDoc, showIcons: boolean): RenderGraph {
  const nodes: RenderNode[] = [];
  const edges: RenderEdge[] = [];
  const byClaim = usagesByClaim(doc);

  const header = topicText(doc);
  if (header !== "") nodes.push({ id: TOPIC_ID, type: "topic", text: header });

  for (const question of doc.questions) {
    nodes.push({ id: question.id, type: "question", text: question.text });
  }

  for (const claim of doc.claims) {
    const usages = byClaim.get(claim.id) ?? [];
    nodes.push(claimNode(claim, usages, showIcons));
    // Per claim rather than in one pass, so a note's box is declared next to the claim it is
    // about; mermaid draws boxes in the order they're emitted.
    addNotes(nodes, edges, [claim]);
  }

  // Plain: which question it answers is the whole of what the connector says, and the thesis's
  // veracity is already on its box.
  for (const thesis of doc.theses) {
    if (thesis.questionId !== null) {
      edges.push({ from: thesis.claimId, to: thesis.questionId, type: "link" });
    }
  }

  // A folded argument is plain too — its box already says the stance. An unfolded one is the
  // only thing left to carry it, so it takes the stance and the score the box couldn't show.
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

  const roots = [
    ...doc.questions.map((question) => question.id),
    ...doc.theses.filter((thesis) => thesis.questionId === null).map((thesis) => thesis.claimId),
  ];

  // Direction is load-bearing and easy to get backwards: the default layout is BT, where an
  // edge's *target* is ranked above its source, so a root is the source and the header the
  // target. Anchoring every root rather than just the first is argued in ./rendering.md.
  if (header !== "") {
    for (const rootId of roots) edges.push({ from: rootId, to: TOPIC_ID, type: ANCHOR_TYPE_ID });
  }

  addDocumentNotes(nodes, edges, doc.notes, roots);

  return { nodes, edges };
}
