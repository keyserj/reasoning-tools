// The `~` note: an aside a reader is shown but nobody argues with. It belongs to the playground
// rather than to any ontology here — kialo's ontology.md says so outright, and none of the three
// has a note in its own vocabulary — so what a note *is* and how it's drawn live together at this
// level, and an ontology's model only says which of the things it does own a note hangs off.

import type { EdgeTypeDef, NodeTypeDef, RenderEdge, RenderNode } from "./types.ts";

export interface Note {
  id: string;
  text: string;
}

/** Anything a note hangs off. Claims, arg-map's edges and IBIS's nodes all satisfy it. */
export interface NoteOwner {
  id: string;
  notes: Note[];
}

/** Shared by the rendered node type, the connector and `StyleConfig.typeColors`. */
export const NOTE_TYPE_ID = "note";

/**
 * The box a note is drawn in, spread into each ontology's `renderedNodeTypes` so the one-table
 * rule still holds. `description` is legend prose and the one field worth overriding, since what
 * a note is exempt from differs — a Kialo vote, an arg-map score.
 */
export const noteNodeType: NodeTypeDef = {
  id: NOTE_TYPE_ID,
  label: "Note",
  icon: "📝",
  description: "An aside attached to its parent. Drawn in the diagram, but never argued with.",
  // A parallelogram, which is what makes it read as an aside rather than as part of the argument.
  shape: ['[/"', '"/]'],
  // Sticky-note yellow, on the warm-band split argued in arg-map-truth-and-relevance/rendering.md.
  defaultColor: "#d3ad20",
};

/** Dotted, so a note reads as attached to the argument rather than as a move within it. */
export const noteEdgeType: EdgeTypeDef = { id: NOTE_TYPE_ID, connector: "-.->" };

/**
 * Draw each owner's notes: a box per note, on a dotted connector back to the thing it annotates.
 *
 * Callers pass the owners that actually have a node to attach to — arg-map has owners that don't,
 * since an un-argued edge under `spelled out` earns no box — which is what keeps this free of any
 * one ontology's rules.
 */
export function addNotes(nodes: RenderNode[], edges: RenderEdge[], owners: NoteOwner[]): void {
  for (const owner of owners) {
    for (const note of owner.notes) {
      nodes.push({ id: note.id, type: NOTE_TYPE_ID, text: note.text });
      edges.push({ from: note.id, to: owner.id, type: NOTE_TYPE_ID });
    }
  }
}
