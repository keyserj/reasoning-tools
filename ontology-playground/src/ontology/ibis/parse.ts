import type { ParseError, SourceLines } from "../types.ts";
import type { Note } from "../notes.ts";
import type { IbisDoc, IbisEdge, IbisNode } from "./model.ts";
import {
  ID_SUFFIX,
  LEADING_WS,
  MARKER_TO_TYPE,
  META_MARKER,
  NOTE_MARKER,
  REF_BODY,
} from "./markers.ts";

const TAB_SIZE = 4;

/** Visual width of a leading-whitespace run, expanding tabs to the next tab stop. */
function indentWidth(ws: string): number {
  let col = 0;
  for (const ch of ws) {
    if (ch === "\t") col += TAB_SIZE - (col % TAB_SIZE);
    else col += 1;
  }
  return col;
}

interface StackFrame {
  indent: number;
  /** node these lines' children attach to (for a $ref line, the referenced id) */
  nodeId: string;
}

interface PendingRef {
  refId: string;
  parentId: string;
  line: number;
}

/**
 * Parse the IBIS markdown-ish syntax into an {@link IbisDoc}: one node per non-blank line,
 * parented by indentation, read through the markers ./markers.ts defines. Edges point child ->
 * parent and hold nothing else, which is ./model.ts's business.
 */
export function parse(text: string): { doc: IbisDoc; errors: ParseError[] } {
  const nodes: IbisNode[] = [];
  const edges: IbisEdge[] = [];
  const errors: ParseError[] = [];
  const byId = new Map<string, IbisNode>();
  const pendingRefs: PendingRef[] = [];
  // Filed at the end: a note under a `$ref` line owns an id that may be declared further down.
  const pendingNotes: { note: Note; ownerId: string }[] = [];
  const docNotes: Note[] = [];
  const sourceLines: SourceLines = {};
  const stack: StackFrame[] = [];
  let lastNoteIndent: number | null = null;
  let autoCounter = 0;
  let edgeCounter = 0;

  // Notes and edges share the node id space: every one of them ends up as something the diagram
  // has to tell apart, and `sourceLines` files them all under the one key space.
  const noteIds = new Set<string>();
  const edgeIds = new Set<string>();
  const isIdTaken = (id: string): boolean => byId.has(id) || noteIds.has(id) || edgeIds.has(id);

  const nextAutoId = (): string => {
    let id: string;
    do {
      id = `n${++autoCounter}`;
    } while (isIdTaken(id));
    return id;
  };

  /** File the line a thing was written on under its id. */
  const fileLine = (id: string, line: number) => {
    (sourceLines[id] ??= []).push(line);
  };

  /** `l` for link, as arg-map's edges take, and not the `e<n>` mermaid names its own edges. */
  const nextEdgeId = (): string => {
    let id: string;
    do {
      id = `l${++edgeCounter}`;
    } while (isIdTaken(id));
    edgeIds.add(id);
    return id;
  };

  /** An explicit `&id` if it's free, else a fresh one and a reported duplicate. */
  const takeId = (explicitId: string | undefined, lineNo: number): string => {
    if (explicitId === undefined) return nextAutoId();
    if (isIdTaken(explicitId)) {
      errors.push({ line: lineNo, message: `Duplicate id "&${explicitId}"` });
      return nextAutoId();
    }
    return explicitId;
  };

  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNo = i + 1;
    if (raw.trim() === "") continue;

    const ws = LEADING_WS.exec(raw)?.[0] ?? "";
    const indent = indentWidth(ws);
    const content = raw.slice(ws.length);
    const marker = content[0];

    // A note is a leaf, so a `~` indented under one is annotating a note — which none of these
    // ontologies express. Cleared by any other line, so a later sibling note is still fine.
    const noteAbove = lastNoteIndent;
    lastNoteIndent = marker === NOTE_MARKER ? indent : null;

    // Meta-comment: parsed for syntax awareness but never added to the graph and
    // never pushed onto the stack (its would-be children attach to its parent).
    if (marker === META_MARKER) continue;

    const type = MARKER_TO_TYPE[marker];
    if (type === undefined && marker !== NOTE_MARKER) {
      errors.push({
        line: lineNo,
        message: `Unrecognized marker "${marker ?? ""}" (expected ? = + - ~ /)`,
      });
      continue;
    }

    // Find this line's parent: the nearest shallower frame still on the stack.
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop();
    const parentId = stack.length > 0 ? stack[stack.length - 1].nodeId : null;

    // Pull a trailing `&id` off the body, then see if the remainder is a `$ref`.
    let body = content.slice(1).trim();
    const idMatch = ID_SUFFIX.exec(body);
    const explicitId = idMatch?.[1];
    if (idMatch) body = body.slice(0, idMatch.index).trim();

    // The `~` note, which is the one marker with no node type: it annotates the line above
    // rather than answering it. A note is a leaf and never becomes a frame, so a line nested
    // under one attaches to the note's own parent — and `$id` in its body stays prose, since a
    // note never reuses something declared elsewhere.
    if (type === undefined) {
      if (noteAbove !== null && indent > noteAbove) {
        errors.push({ line: lineNo, message: 'A "~" note can\'t hang off another note' });
        continue;
      }
      const id = takeId(explicitId, lineNo);
      noteIds.add(id);
      fileLine(id, lineNo);
      // Nothing above it: a note about the document rather than about any one node.
      if (parentId === null) docNotes.push({ id, text: body });
      else pendingNotes.push({ note: { id, text: body }, ownerId: parentId });
      continue;
    }

    const refMatch = REF_BODY.exec(body);
    if (refMatch) {
      const refId = refMatch[1];
      if (parentId === null) {
        errors.push({ line: lineNo, message: `Reference "$${refId}" has no parent to attach to` });
      } else {
        pendingRefs.push({ refId, parentId, line: lineNo });
      }
      // Children indented under a $ref line attach to the referenced node.
      stack.push({ indent, nodeId: refId });
      continue;
    }

    // Normal node.
    const id = takeId(explicitId, lineNo);
    fileLine(id, lineNo);
    const node: IbisNode = { id, type, text: body, notes: [] };
    nodes.push(node);
    byId.set(id, node);
    // The line writes the node *and* nests it, so it draws the connector as well as the box.
    if (parentId !== null) {
      const edgeId = nextEdgeId();
      fileLine(edgeId, lineNo);
      edges.push({ id: edgeId, from: id, to: parentId });
    }

    stack.push({ indent, nodeId: id });
  }

  // Resolve references now that every node id is known (forward refs allowed).
  for (const ref of pendingRefs) {
    if (byId.has(ref.refId)) {
      const edgeId = nextEdgeId();
      fileLine(edgeId, ref.line);
      edges.push({ id: edgeId, from: ref.refId, to: ref.parentId });
    } else {
      errors.push({ line: ref.line, message: `Unknown reference "$${ref.refId}"` });
    }
  }

  // A note whose owner never resolved (`~` under a `$nope`) is dropped rather than left
  // ownerless: the unknown reference is already reported, and keeping it would put a note box
  // in the diagram attached to nothing.
  for (const { note, ownerId } of pendingNotes) byId.get(ownerId)?.notes.push(note);

  const doc: IbisDoc = { nodes, edges, notes: docNotes, sourceLines };
  return { doc, errors };
}
