import {
  scoresOf,
  subtypesOf,
  type Doc,
  type Edge,
  type Node,
} from "../../ontology/ameliorate-v2/model.ts";
import { addDocumentNotes, addNotes, type NoteOwner } from "../../ontology/notes.ts";
import { formatScores, type Scores } from "../../ontology/scores.ts";
import type { RenderGraph } from "../../ontology/types.ts";

// Temporary projection for the visual review; source linking follows the parser move.
// Decisions and measurements live in ../../../ai-designs/ameliorate-v2-rendering-spike.md.
export type View = "full" | "causal";
export type EdgeClaims = "spelled-out" | "implied";

const CAUSAL_TYPES = new Set(["causes", "reduces", "impedes"]);
const SIDE_MAX = 70;

function withScores(text: string, scores: Scores | null): string {
  return scores === null ? text : `${text}\n${formatScores(scores)}`;
}

function marker(n: number): string {
  return n <= 20 ? String.fromCodePoint(0x245f + n) : `(${n})`;
}

function selectView(doc: Doc, view: View): { nodes: Node[]; edges: Edge[] } {
  if (view === "full") return doc;
  const concepts = new Set(doc.nodes.filter((node) => node.type === "concept").map((n) => n.id));
  const edges = doc.edges.filter(
    (edge) =>
      CAUSAL_TYPES.has(edge.type) && concepts.has(edge.sourceId) && concepts.has(edge.targetId),
  );
  const endpoints = new Set(edges.flatMap((edge) => [edge.sourceId, edge.targetId]));
  return { nodes: doc.nodes.filter((node) => endpoints.has(node.id)), edges };
}

export function toGraph(doc: Doc, view: View, display: EdgeClaims): RenderGraph {
  const visible = selectView(doc, view);
  const nodeById = new Map(doc.nodes.map((node) => [node.id, node]));
  const edgeById = new Map(doc.edges.map((edge) => [edge.id, edge]));
  const impliedByReferent = new Map(
    visible.nodes.flatMap((node) =>
      node.impliedForId ? [[node.impliedForId, node] as const] : [],
    ),
  );
  const graph: RenderGraph = { nodes: [], edges: [] };
  const usedIds = new Set([
    ...doc.nodes.map((node) => node.id),
    ...doc.edges.map((edge) => edge.id),
    ...[...doc.nodes, ...doc.edges, doc].flatMap((owner) => owner.notes.map((note) => note.id)),
  ]);
  const freshId = (base: string): string => {
    let id = base;
    for (let i = 1; usedIds.has(id); i++) id = `${base}_${i}`;
    usedIds.add(id);
    return id;
  };

  function claimText(id: string, depth = 0): string {
    if (depth >= 3) return id;
    const node = nodeById.get(id);
    if (node) {
      if (!node.impliedForId) return node.text;
      const text = claimText(node.impliedForId, depth + 1);
      return nodeById.has(node.impliedForId) ? `${text} is important to increase` : text;
    }
    const edge = edgeById.get(id);
    if (!edge) return id;
    const side = (endpoint: string) => {
      const text = claimText(endpoint, depth + 1);
      return text.length > SIDE_MAX ? `${text.slice(0, SIDE_MAX - 1).trimEnd()}…` : text;
    };
    return `"${side(edge.sourceId)}" ${edge.type} "${side(edge.targetId)}"`;
  }

  const displayIds = new Map<string, string>();
  const marks = new Map<string, string>();
  for (const node of visible.nodes) {
    const referent = node.impliedForId;
    if (!referent) continue;
    if (display === "implied" && edgeById.has(referent)) {
      displayIds.set(node.id, referent);
    } else {
      marks.set(referent, marker(marks.size + 1));
    }
  }

  const noteBoxes = new Map<string, string>();
  if (display === "spelled-out") {
    for (const edge of visible.edges) {
      if (edge.notes.length === 0 || impliedByReferent.has(edge.id)) continue;
      noteBoxes.set(edge.id, freshId(`_note_owner_${edge.id}`));
      marks.set(edge.id, marker(marks.size + 1));
    }
  }

  for (const node of visible.nodes) {
    if (displayIds.has(node.id)) continue;
    const mark = marks.get(node.impliedForId ?? node.id);
    const tags = [...new Set([...node.tags, ...subtypesOf(node, doc)])];
    const parts = [
      withScores(`${mark ? `${mark} ` : ""}${claimText(node.id)}`, scoresOf(node, doc)),
    ];
    if (tags.length > 0) parts.push(tags.map((tag) => `#${tag}`).join(" "));
    if (node.properties.description) parts.push(node.properties.description);
    if (node.properties.opposite) parts.push(`Opposite: ${node.properties.opposite}`);
    graph.nodes.push({ id: node.id, type: node.type, text: parts.join("\n") });
  }

  if (display === "implied") {
    for (const edge of visible.edges) {
      graph.nodes.push({ id: edge.id, type: "relation", text: withScores(edge.type, edge.scores) });
    }
  } else {
    for (const edge of visible.edges) {
      const id = noteBoxes.get(edge.id);
      if (id) {
        graph.nodes.push({
          id,
          type: "relation",
          text: withScores(`${marks.get(edge.id)} ${claimText(edge.id)}`, edge.scores),
        });
      }
    }
  }

  const known = new Set(graph.nodes.map((node) => node.id));
  const displayId = (id: string) => displayIds.get(id) ?? id;
  for (const edge of visible.edges) {
    const from = displayId(edge.sourceId);
    const to = displayId(edge.targetId);
    if (!known.has(from) || !known.has(to)) continue;
    if (display === "implied") {
      graph.edges.push(
        { from, to: edge.id, type: "half" },
        { from: edge.id, to, type: "relation" },
      );
    } else {
      const mark = marks.get(edge.id);
      const scores = edge.scores === null ? "" : ` ${formatScores(edge.scores)}`;
      graph.edges.push({
        from,
        to,
        type: "relation",
        label: `${mark ? `${mark} ` : ""}${edge.type}${scores}`,
      });
    }
  }

  for (const referent of marks.keys()) {
    const box = impliedByReferent.get(referent)?.id ?? noteBoxes.get(referent);
    const target = displayId(edgeById.get(referent)?.targetId ?? referent);
    if (box && known.has(target)) {
      graph.edges.push({ from: box, to: target, type: "anchor" });
    }
  }

  const noteOwners: NoteOwner[] = visible.nodes.map((node) => ({
    id: displayId(node.id),
    notes: node.notes,
  }));
  for (const edge of visible.edges) {
    const id =
      display === "implied"
        ? edge.id
        : (impliedByReferent.get(edge.id)?.id ?? noteBoxes.get(edge.id));
    if (id) noteOwners.push({ id, notes: edge.notes });
  }
  addNotes(
    graph.nodes,
    graph.edges,
    noteOwners.filter((owner) => known.has(owner.id)),
    {},
  );

  const sources = new Set(visible.edges.map((edge) => edge.sourceId));
  const root = visible.nodes.find((node) => !sources.has(node.id)) ?? visible.nodes[0];
  const roots = root ? [displayId(root.id)] : [];
  addDocumentNotes(graph.nodes, graph.edges, doc.notes, roots, {});
  if (doc.perspectives.length > 0) {
    const id = freshId("_score_context");
    graph.nodes.push({ id, type: "context", text: `Scores: [${doc.perspectives.join(", ")}]` });
    for (const from of roots) graph.edges.push({ from, to: id, type: "anchor" });
  }
  return graph;
}
