// Which guiding questions to offer, and in what order.
//
// A guiding question sets the agenda, so its priority is how much of the topic runs through it.
// `ontology.md`'s Guides note prices that by chaining: a question guiding another question
// multiplies through it, and because a question may guide a concept rather than the topic node,
// the chain carries on through the causal web to reach the topic.

import { type WalkOptions, magnitudeProduct, topicReach, walk } from "./chains.ts";
import type { Doc } from "./model.ts";
import { findTopic } from "./model.ts";
import { UNSCORED_RELATION } from "./scores.ts";

export interface GuidingQuestion {
  id: string;
  text: string;
  /** 0..1: how much of the topic runs through this question */
  priority: number;
  /** what the question's `guides` edge points at, which is what its view is about */
  guidesId: string;
}

// Only `guides`. A guiding question's chain runs question -> question -> topic, so every hop is
// itself a `guides` edge; letting `clarifies` in would price an agenda by an unrelated question's
// uncertainty instead.
const guiding: WalkOptions = { types: ["guides"], direction: "forward" };

/**
 * Every question with a `guides` edge, most central first.
 *
 * Priority stops at the topic and does not go on to multiply by what the question is about.
 * `UX-design.md`'s "then that node multiplies following concept scores" can be read as doing
 * that, which would rank a question by the importance of its subject as well as by its own
 * weight; the two readings are recorded there, and this takes the narrower one.
 */
export function guidingQuestions(doc: Doc): GuidingQuestion[] {
  const topic = findTopic(doc);
  if (!topic) return [];
  const reaches = topicReach(doc, topic.id);

  const questions: GuidingQuestion[] = [];
  for (const node of doc.nodes) {
    if (node.type !== "question") continue;
    const guides = doc.edges.filter((edge) => edge.type === "guides" && edge.sourceId === node.id);
    if (guides.length === 0) continue;

    let priority = 0;
    // the edge the winning chain set off along, so the number and the view it opens agree
    let guidesId = guides[0].targetId;
    for (const path of walk(doc, node.id, guiding)) {
      const chain = magnitudeProduct(path, UNSCORED_RELATION) * (reaches.get(path.toId) ?? 0);
      if (chain > priority) {
        priority = chain;
        guidesId = path.steps[0].edge.targetId;
      }
    }
    // kept even at zero: a question about something off the causal web still sets an agenda
    questions.push({ id: node.id, text: node.text, priority, guidesId });
  }

  return questions.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}
