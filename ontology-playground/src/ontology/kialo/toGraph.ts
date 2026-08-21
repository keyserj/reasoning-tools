import type { RenderEdge, RenderNode, RenderGraph } from "../types.ts";
import { ANCHOR_TYPE_ID } from "../anchoring.ts";
import { addDocumentNotes, addNotes } from "../notes.ts";
import { TOPIC_ID } from "../topic.ts";
import { type Claim, type ClaimUsage, type KialoDoc, isArgument, usagesByClaim } from "./model.ts";
import { type Scores, formatScores } from "./scores.ts";

// How this ontology gets drawn — the one file to rewrite if the rendering should change. A score
// and a stance belong to one usage of a claim, so a usage rather than a claim is what gets a box;
// ./rendering.md lays out what that costs.

/** Marks a claim as having evidence without putting a URL in the diagram. */
const SOURCE_ICON = "🔗";

/** Marks every box of a claim that is used in more than one place. */
const REUSE_ICON = "🔀";

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

/** The box a usage draws as, see ./rendering.md for details. */
function usageNode(
  claim: Claim,
  usage: ClaimUsage,
  reused: boolean,
  showIcons: boolean,
  lines: number[] | undefined,
): RenderNode {
  const badges = showIcons
    ? `${reused ? ` ${REUSE_ICON}` : ""}${claim.sources.length > 0 ? ` ${SOURCE_ICON}` : ""}`
    : "";
  return {
    id: boxId(claim.id, usage),
    type: isArgument(usage) ? usage.stance : "thesis",
    text: withScores(`${claim.text}${badges}`, isArgument(usage) ? usage.impact : usage.veracity),
    ...(usage.viaRef ? { dashed: true } : {}),
    ...(lines ? { lines } : {}),
  };
}

/**
 * Which box a usage is. The declaring usage takes the claim's own id, so everything that names a
 * claim — a note's owner, a child's parent — lands on it without a lookup; a copy takes its own,
 * which `parse.ts` has already kept clear of every claim id.
 */
function boxId(claimId: string, usage: ClaimUsage): string {
  return usage.viaRef ? usage.id : claimId;
}

/** Flatten a {@link KialoDoc} into the shared {@link RenderGraph}. */
export function toGraph(doc: KialoDoc, showIcons: boolean): RenderGraph {
  const nodes: RenderNode[] = [];
  const edges: RenderEdge[] = [];
  const byClaim = usagesByClaim(doc);

  const header = topicText(doc);
  if (header !== "") {
    nodes.push({ id: TOPIC_ID, type: "topic", text: header, lines: doc.sourceLines[TOPIC_ID] });
  }

  for (const question of doc.questions) {
    nodes.push({
      id: question.id,
      type: "question",
      text: question.text,
      lines: doc.sourceLines[question.id],
    });
  }

  for (const claim of doc.claims) {
    const usages = byClaim.get(claim.id) ?? [];
    // Every usage's box carries every usage's lines, its own first (where a click lands), so
    // the caret on any use of a claim lights up the original and each copy at once.
    const usageLines = usages.flatMap((usage) => doc.sourceLines[usage.id] ?? []);
    for (const usage of usages) {
      const own = doc.sourceLines[usage.id] ?? [];
      const lines = [...own, ...usageLines.filter((line) => !own.includes(line))];
      nodes.push(
        usageNode(claim, usage, usages.length > 1, showIcons, lines.length > 0 ? lines : undefined),
      );
    }
    // Per claim rather than in one pass, so a note's box is declared next to the claim it is
    // about; mermaid draws boxes in the order they're emitted. A claim whose declaring line was
    // rejected has no box for a note to hang off, and ../notes.ts asks callers to say so.
    addNotes(nodes, edges, usages.some((usage) => !usage.viaRef) ? [claim] : [], doc.sourceLines);
  }

  // Every connector is plain: each box carries its own stance and score, so which question a
  // thesis answers, or which claim an argument is about, is the whole of what one says.
  for (const thesis of doc.theses) {
    if (thesis.questionId !== null) {
      edges.push({
        from: boxId(thesis.claimId, thesis),
        to: thesis.questionId,
        type: "link",
        lines: doc.sourceLines[thesis.id],
      });
    }
  }

  // A parent is named by claim, so it resolves to the box that declares it — which is what
  // leaves a copy childless without anything here having to suppress children.
  for (const argument of doc.arguments) {
    edges.push({
      from: boxId(argument.claimId, argument),
      to: argument.parentClaimId,
      type: "link",
      lines: doc.sourceLines[argument.id],
    });
  }

  const roots = [
    ...doc.questions.map((question) => question.id),
    ...doc.theses
      .filter((thesis) => thesis.questionId === null)
      .map((thesis) => boxId(thesis.claimId, thesis)),
  ];

  // Direction is load-bearing and easy to get backwards: the default layout is BT, where an
  // edge's *target* is ranked above its source, so a root is the source and the header the
  // target. Anchoring every root rather than just the first is argued in ./rendering.md.
  if (header !== "") {
    for (const rootId of roots) edges.push({ from: rootId, to: TOPIC_ID, type: ANCHOR_TYPE_ID });
  }

  addDocumentNotes(nodes, edges, doc.notes, roots, doc.sourceLines);

  return { nodes, edges };
}
