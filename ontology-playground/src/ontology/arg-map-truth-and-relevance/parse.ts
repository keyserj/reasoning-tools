import type { ParseError } from "../types.ts";
import type { Note } from "../notes.ts";
import type { ArgDoc, Claim, Edge } from "./model.ts";
import {
  DESCRIPTION_KEY,
  EDGE_TYPE_HEAD,
  EXPECTED_MARKERS,
  EDGE_TYPES,
  type EdgeType,
  ID_SUFFIX,
  LEADING_WS,
  MARKER_TO_KIND,
  PERSPECTIVES_KEY,
  PROPERTY,
  REF_BODY,
  isEdgeType,
} from "./markers.ts";
import { type Scores, takeScores } from "./scores.ts";

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

const BRACKETED_LIST = /^\[(.*)\]$/;

interface ClaimFrame {
  kind: "claim";
  indent: number;
  /** the claim (or, for a `= $ref` block, the referenced claim or edge) children attach to */
  id: string;
}

interface EdgeFrame {
  kind: "edge";
  indent: number;
  pending: PendingEdge;
}

type Frame = ClaimFrame | EdgeFrame;

/**
 * A `<` or `>` line, held open until the claim nested under it supplies the other endpoint.
 * `valid` is false once the line has an error that makes the edge unusable — the frame is
 * still pushed so its child gets absorbed instead of cascading more errors.
 */
interface PendingEdge {
  id: string;
  type: EdgeType;
  scores: Scores | null;
  parentId: string;
  /** `<` = the nested child is the source; `>` = the child is the target */
  childIsSource: boolean;
  line: number;
  endpointFound: boolean;
  valid: boolean;
}

/**
 * Parse this ontology's syntax into its own {@link ArgDoc} model.
 *
 * Lines: `=` claim, `<`/`>` a supports/critiques edge, `~` note, `%key: value` document
 * property, `/` meta-comment (dropped). Scores follow their marker directly (`=[4,1,8]`,
 * `supports[8,2,8]`). `&id` names the claim or edge on the line; `= $id` references one
 * instead of declaring it, which is how an argument attaches to an *edge's* implied claim.
 *
 * This is the whole of parsing: turning the model into something mermaid can draw is a
 * rendering decision, and lives in ./toGraph.ts behind the `Edge claims` feature.
 */
export function parse(text: string): { doc: ArgDoc; errors: ParseError[] } {
  const claims: Claim[] = [];
  const edges: Edge[] = [];
  const errors: ParseError[] = [];
  const usedIds = new Set<string>();
  const refUses: { refId: string; line: number }[] = [];
  // A note names its owner by id, and the owner may not exist yet: an edge only materializes
  // once the claim nested under it is read, and a `= $ref` block can point further down the
  // file. So notes are filed at the end, when every id is known.
  const pendingNotes: { note: Note; ownerId: string }[] = [];
  const docNotes: Note[] = [];
  // `%perspectives` may appear anywhere, so slot counts can't be checked until the end. This
  // is the only reason a line number outlives the loop; nothing in the model carries one.
  const scored: { scores: Scores; line: number }[] = [];
  const pendingEdges: PendingEdge[] = [];
  const stack: Frame[] = [];
  const autoCounters: Record<string, number> = {};
  let description: string | undefined;
  let perspectives: string[] = [];

  const nextAutoId = (prefix: string): string => {
    let id: string;
    do {
      autoCounters[prefix] = (autoCounters[prefix] ?? 0) + 1;
      id = `${prefix}${autoCounters[prefix]}`;
    } while (usedIds.has(id));
    return id;
  };

  /** Claim the line's `&id`, falling back to an auto id when it's missing or taken. */
  const takeId = (explicit: string | undefined, prefix: string, line: number): string => {
    if (explicit === undefined) return nextAutoId(prefix);
    if (usedIds.has(explicit)) {
      errors.push({ line, message: `Duplicate id "&${explicit}"` });
      return nextAutoId(prefix);
    }
    return explicit;
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
    const kind = MARKER_TO_KIND[marker];

    if (!kind) {
      errors.push({
        line: lineNo,
        message: `Unrecognized marker "${marker}" (expected ${EXPECTED_MARKERS})`,
      });
      continue;
    }

    // A meta-comment is parsed for syntax awareness but never reaches the graph and never
    // becomes a parent: a line indented under one attaches to whatever it was nested in.
    if (kind === "meta") continue;

    // This line's parent is the nearest shallower frame still on the stack.
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent: Frame | null = stack.length > 0 ? stack[stack.length - 1] : null;

    if (kind === "property") {
      const match = PROPERTY.exec(content);
      if (!match) {
        errors.push({ line: lineNo, message: 'Expected a property of the form "%key: value"' });
        continue;
      }
      const [, key, value] = match;
      // Per-line properties are valid syntax but nothing consumes them yet, so they are
      // rejected loudly rather than dropped silently.
      if (indent > 0) {
        errors.push({
          line: lineNo,
          message: `Properties are only supported at the document level (column 0), but "%${key}" is indented`,
        });
      } else if (key === DESCRIPTION_KEY) {
        description = value.trim();
      } else if (key === PERSPECTIVES_KEY) {
        const list = BRACKETED_LIST.exec(value.trim());
        if (!list) {
          errors.push({
            line: lineNo,
            message: `"%${PERSPECTIVES_KEY}" expects a list, e.g. [alice, bob, casey]`,
          });
        } else {
          perspectives = list[1]
            .split(",")
            .map((name) => name.trim())
            .filter((name) => name !== "");
        }
      } else {
        errors.push({
          line: lineNo,
          message: `Unknown property "%${key}" (expected %${DESCRIPTION_KEY} or %${PERSPECTIVES_KEY})`,
        });
      }
      continue;
    }

    if (kind === "claim") {
      // Scores bind tightly to the marker (`=[4,1,8]`), so read them before trimming.
      const { scores, rest, messages } = takeScores(content.slice(1));
      for (const message of messages) errors.push({ line: lineNo, message });

      let body = rest.trim();
      const idMatch = ID_SUFFIX.exec(body);
      const explicitId = idMatch?.[1];
      if (idMatch) body = body.slice(0, idMatch.index).trim();

      const refMatch = REF_BODY.exec(body);
      let nodeId: string;
      if (refMatch) {
        const refId = refMatch[1];
        if (scores !== null) {
          errors.push({
            line: lineNo,
            message: `"$${refId}" can't carry scores — the line that declares it holds them`,
          });
        }
        if (explicitId !== undefined) {
          errors.push({ line: lineNo, message: `"$${refId}" can't also set an id with "&"` });
        }
        refUses.push({ refId, line: lineNo });
        nodeId = refId;
      } else {
        if (body === "") {
          errors.push({ line: lineNo, message: "A claim needs some text" });
          continue;
        }
        nodeId = takeId(explicitId, "c", lineNo);
        usedIds.add(nodeId);
        claims.push({ id: nodeId, text: body, scores, notes: [] });
        if (scores !== null) scored.push({ scores, line: lineNo });
      }

      if (parent?.kind === "edge") {
        const pending = parent.pending;
        if (pending.endpointFound) {
          errors.push({
            line: lineNo,
            message: `This "${pending.childIsSource ? "<" : ">"}" line already has a claim nested under it`,
          });
        } else {
          pending.endpointFound = true;
          if (pending.valid) {
            edges.push({
              id: pending.id,
              type: pending.type,
              sourceId: pending.childIsSource ? nodeId : pending.parentId,
              targetId: pending.childIsSource ? pending.parentId : nodeId,
              scores: pending.scores,
              notes: [],
            });
            if (pending.scores !== null) {
              scored.push({ scores: pending.scores, line: pending.line });
            }
          }
        }
      } else if (parent?.kind === "claim") {
        errors.push({
          line: lineNo,
          message:
            'A claim must be attached with a "<" or ">" line, not nested directly under another claim',
        });
      }

      stack.push({ kind: "claim", indent, id: nodeId });
      continue;
    }

    if (kind === "note") {
      let body = content.slice(1).trim();
      const idMatch = ID_SUFFIX.exec(body);
      const explicitId = idMatch?.[1];
      if (idMatch) body = body.slice(0, idMatch.index).trim();

      const id = takeId(explicitId, "t", lineNo);
      usedIds.add(id);
      if (!parent) {
        // Nothing above it: a note about the document rather than about any one line.
        docNotes.push({ id, text: body });
        continue;
      }
      pendingNotes.push({
        note: { id, text: body },
        ownerId: parent.kind === "claim" ? parent.id : parent.pending.id,
      });
      // A note is a leaf, so it never becomes a frame: a sibling claim at the same indent
      // still counts as the enclosing edge line's endpoint.
      continue;
    }

    // `<` or `>`: an edge line.
    const childIsSource = kind === "edge-from-child";
    let body = content.slice(1).trim();
    const idMatch = ID_SUFFIX.exec(body);
    const explicitId = idMatch?.[1];
    if (idMatch) body = body.slice(0, idMatch.index).trim();

    const word = EDGE_TYPE_HEAD.exec(body)?.[1] ?? "";
    const edgeType: EdgeType | null = isEdgeType(word) ? word : null;
    if (edgeType === null) {
      errors.push({
        line: lineNo,
        message: `Unknown edge type "${word}" (expected ${EDGE_TYPES.join(" or ")})`,
      });
    }

    const { scores, rest, messages } = takeScores(body.slice(word.length));
    for (const message of messages) errors.push({ line: lineNo, message });
    if (rest.trim() !== "") {
      errors.push({ line: lineNo, message: `Unexpected text after "${word}": "${rest.trim()}"` });
    }

    let parentId: string | null = null;
    if (!parent) {
      errors.push({
        line: lineNo,
        message: `A "${marker}" line needs a claim above it to attach to`,
      });
    } else if (parent.kind === "edge") {
      errors.push({
        line: lineNo,
        message: `A "${marker}" line can't nest under another edge line — argue about an edge with a "= $edge-id" block`,
      });
    } else {
      parentId = parent.id;
    }

    const id = takeId(explicitId, "l", lineNo);
    usedIds.add(id);
    const pending: PendingEdge = {
      id,
      type: edgeType ?? "supports",
      scores,
      parentId: parentId ?? "",
      childIsSource,
      line: lineNo,
      endpointFound: false,
      valid: edgeType !== null && parentId !== null,
    };
    pendingEdges.push(pending);
    stack.push({ kind: "edge", indent, pending });
  }

  for (const pending of pendingEdges) {
    if (pending.valid && !pending.endpointFound) {
      errors.push({
        line: pending.line,
        message: `A "${pending.childIsSource ? "<" : ">"}" line needs a claim nested under it`,
      });
    }
  }

  // Resolved last so a reference may point at something declared further down the file.
  for (const use of refUses) {
    if (!usedIds.has(use.refId)) {
      errors.push({ line: use.line, message: `Unknown reference "$${use.refId}"` });
    }
  }

  // A note whose owner never resolved (`~` under a `= $nope`) is dropped rather than left
  // ownerless: the unknown reference is already reported above, and keeping it would put a
  // note box in the diagram attached to nothing.
  const owners = new Map<string, Claim | Edge>();
  for (const claim of claims) owners.set(claim.id, claim);
  for (const edge of edges) owners.set(edge.id, edge);
  for (const { note, ownerId } of pendingNotes) owners.get(ownerId)?.notes.push(note);

  if (perspectives.length > 0) {
    for (const { scores, line } of scored) {
      if (scores.length !== perspectives.length) {
        errors.push({
          line,
          message: `Expected ${perspectives.length} scores to match %${PERSPECTIVES_KEY}, got ${scores.length}`,
        });
      }
    }
  }

  errors.sort((a, b) => a.line - b.line);

  return { doc: { description, perspectives, claims, edges, notes: docNotes }, errors };
}
