// The `~` note: an aside a reader is shown but nobody argues with. It belongs to the playground
// rather than to any ontology here — kialo's ontology.md says so outright, and none of the three
// has a note in its own vocabulary — so what a note *is* and how it's drawn live together at this
// level, and an ontology's model only says which of the things it does own a note hangs off.

import type { EdgeTypeDef, NodeTypeDef, RenderEdge, RenderNode, SourceLines } from "./types.ts";
import { ANCHOR_TYPE_ID } from "./anchoring.ts";

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
export function addNotes(
  nodes: RenderNode[],
  edges: RenderEdge[],
  owners: NoteOwner[],
  sourceLines: SourceLines,
): void {
  for (const owner of owners) {
    for (const note of owner.notes) {
      const lines = sourceLines[note.id];
      nodes.push({ id: note.id, type: NOTE_TYPE_ID, text: note.text, lines });
      // The `~` line writes the note *and* attaches it, so it draws both the box and the dotted
      // connector back to what it annotates.
      edges.push({ from: note.id, to: owner.id, type: NOTE_TYPE_ID, lines });
    }
  }
}

/**
 * Draw notes that annotate the document rather than any one element: a box with nothing to point
 * at, ranked above the roots so it reads as a caption instead of being parked in the argument.
 *
 * The anchor runs root -> note because `BT` ranks a target above its source — see ./anchoring.ts.
 */
export function addDocumentNotes(
  nodes: RenderNode[],
  edges: RenderEdge[],
  notes: Note[],
  rootIds: string[],
  sourceLines: SourceLines,
): void {
  for (const note of notes) {
    nodes.push({ id: note.id, type: NOTE_TYPE_ID, text: note.text, lines: sourceLines[note.id] });
    for (const rootId of rootIds) {
      edges.push({ from: rootId, to: note.id, type: ANCHOR_TYPE_ID });
    }
  }
}
