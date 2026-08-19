// Which concepts the structure pane draws, and what runs between them.
//
// `UX-design.md` asks for the top nodes to the topic rather than everything, so the set comes
// from ./ranking.ts - the same judgement the highlights list uses, so the two panes can't
// disagree about what matters. Dropping nodes breaks the relations that ran through them, which
// is what the indirect edges below put back.

import { CAUSAL_TYPES, stepWeight } from "./chains.ts";
import type { EdgeTypeName } from "./markers.ts";
import type { Doc, Edge } from "./model.ts";
import { findTopic } from "./model.ts";
import { rank } from "./ranking.ts";
import { UNSCORED_RELATION, type Scores } from "./scores.ts";

export interface DiagramEdge {
  id: string;
  sourceId: string;
  targetId: string;
  /** the relation as written for a direct edge; for an indirect one, what the route works out to */
  type: EdgeTypeName;
  /** the edge's own scores, or null when no single edge asserts this */
  scores: Scores | null;
  /** -1..1: the edge's own weight, or the strongest route's for an indirect one */
  weight: number;
  /** the undrawn concepts the strongest route passes through, in order; empty when drawn as-is */
  via: string[];
}

export interface Diagram {
  nodeIds: string[];
  edges: DiagramEdge[];
}

const DEFAULT_LIMIT = 10;
/**
 * How many undrawn concepts a route may cross. A longer one has attenuated to near nothing and
 * describes a connection too remote to read as one arrow, and the search branches exponentially.
 */
const MAX_HIDDEN_RUN = 4;

/**
 * The topic plus the concepts ranked closest to it, and every causal relation between them -
 * including the ones that only exist by way of concepts left out.
 */
export function diagram(doc: Doc, limit = DEFAULT_LIMIT): Diagram {
  const topic = findTopic(doc);
  if (!topic) return { nodeIds: [], edges: [] };

  const byId = new Map(doc.nodes.map((node) => [node.id, node]));
  const causal = doc.edges.filter((edge) => CAUSAL_TYPES.includes(edge.type));
  // `ontology.md`'s Causal map is concepts and their causal relations, so a concept with no
  // causal edge has nothing to draw here however highly it ranks - a criterion reaches the topic
  // through `fulfils`, which belongs to the tradeoffs table rather than to this view.
  const inWeb = new Set(causal.flatMap((edge) => [edge.sourceId, edge.targetId]));

  const shown = [topic.id];
  for (const item of rank(doc)) {
    if (shown.length >= limit) break;
    if (item.kind !== "node" || !inWeb.has(item.id)) continue;
    if (byId.get(item.id)?.type !== "concept") continue;
    shown.push(item.id);
  }

  const visible = new Set(shown);
  const edges: DiagramEdge[] = [];

  for (const edge of causal) {
    if (!visible.has(edge.sourceId) || !visible.has(edge.targetId)) continue;
    edges.push({
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      type: edge.type,
      scores: edge.scores,
      weight: stepWeight(edge, UNSCORED_RELATION),
      via: [],
    });
  }

  edges.push(...indirectEdges(causal, visible, edges));

  // A concept qualified on a relation the limit then cut, so it would be drawn with nothing
  // attached - which reads as unrelated rather than as not shown. The topic stays regardless:
  // it anchors the view even when nothing else survives.
  const connected = new Set(edges.flatMap((edge) => [edge.sourceId, edge.targetId]));
  const nodeIds = shown.filter((id) => id === topic.id || connected.has(id));
  return { nodeIds, edges };
}

/**
 * The relations left dangling by the concepts that aren't drawn: where a route runs from one
 * shown concept to another entirely through hidden ones, it reappears as a single edge marked
 * with what it passed through.
 *
 * Without these a diagram that drops one middle concept silently strands whole branches, which
 * reads as "unrelated" rather than "not shown". The route's own signs decide what it says: two
 * reductions in a row compose into an increase.
 *
 * Where several routes connect the same pair the strongest stands for them, the same choice
 * ./chains.ts makes for distance and for the same reason - routes can share steps, so adding
 * them up would count those steps twice.
 */
function indirectEdges(causal: Edge[], visible: Set<string>, direct: DiagramEdge[]): DiagramEdge[] {
  const alreadyDrawn = new Set(direct.map((edge) => `${edge.sourceId}..${edge.targetId}`));
  const found = new Map<string, DiagramEdge>();

  const explore = (
    startId: string,
    currentId: string,
    weight: number,
    via: string[],
    seen: Set<string>,
  ): void => {
    for (const edge of causal) {
      if (edge.sourceId !== currentId) continue;
      const nextId = edge.targetId;
      if (seen.has(nextId)) continue;
      const nextWeight = weight * stepWeight(edge, UNSCORED_RELATION);

      if (visible.has(nextId)) {
        // a relation drawn as itself, or one the drawn graph already states
        if (via.length === 0 || alreadyDrawn.has(`${startId}..${nextId}`)) continue;
        // a route the scores say carries nothing is not a relation to draw
        if (nextWeight === 0) continue;
        const type: EdgeTypeName = nextWeight < 0 ? "reduces" : "causes";
        const id = `${startId}..${type}..${nextId}`;
        const existing = found.get(id);
        if (!existing) {
          found.set(id, {
            id,
            sourceId: startId,
            targetId: nextId,
            type,
            scores: null,
            weight: nextWeight,
            via: [...via],
          });
        } else if (Math.abs(nextWeight) > Math.abs(existing.weight)) {
          existing.weight = nextWeight;
          existing.via = [...via];
        }
        continue;
      }

      if (via.length >= MAX_HIDDEN_RUN) continue;
      seen.add(nextId);
      explore(startId, nextId, nextWeight, [...via, nextId], seen);
      seen.delete(nextId);
    }
  };

  for (const startId of visible) explore(startId, startId, 1, [], new Set([startId]));
  return [...found.values()].sort((a, b) => a.id.localeCompare(b.id));
}
