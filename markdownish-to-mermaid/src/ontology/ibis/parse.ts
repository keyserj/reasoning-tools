import type { Graph, GraphEdge, GraphNode, ParseError, ParseResult } from "../types.ts";
import { MARKER_TO_TYPE, META_MARKER } from "./icons.ts";

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

const LEADING_WS = /^[ \t]*/;
const ID_SUFFIX = /\s*&([A-Za-z0-9_]+)\s*$/;
const REF_BODY = /^\$([A-Za-z0-9_]+)$/;

interface StackFrame {
  indent: number;
  /** node these lines' children attach to (for a $ref line, the referenced id) */
  nodeId: string;
}

interface PendingRef {
  refId: string;
  parentId: string;
  type: GraphNode["type"];
  line: number;
}

/**
 * Parse the IBIS markdown-ish syntax into a {@link Graph}.
 *
 * Each non-blank line is one node, parented by indentation. Markers: `?` question,
 * `=` idea, `+` pro, `-` con, `~` note, `/` meta-comment (dropped). `&id` labels a
 * node; `$id` (as the whole body) references an existing node instead of making one.
 * Edges point child -> parent (argument-map direction).
 */
export function parse(text: string): ParseResult {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const errors: ParseError[] = [];
  const byId = new Map<string, GraphNode>();
  const pendingRefs: PendingRef[] = [];
  const stack: StackFrame[] = [];
  let autoCounter = 0;

  const nextAutoId = (): string => {
    let id: string;
    do {
      id = `n${++autoCounter}`;
    } while (byId.has(id));
    return id;
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

    // Meta-comment: parsed for syntax awareness but never added to the graph and
    // never pushed onto the stack (its would-be children attach to its parent).
    if (marker === META_MARKER) continue;

    const type = MARKER_TO_TYPE[marker];
    if (!type) {
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

    const refMatch = REF_BODY.exec(body);
    if (refMatch) {
      const refId = refMatch[1];
      if (parentId === null) {
        errors.push({ line: lineNo, message: `Reference "$${refId}" has no parent to attach to` });
      } else {
        pendingRefs.push({ refId, parentId, type, line: lineNo });
      }
      // Children indented under a $ref line attach to the referenced node.
      stack.push({ indent, nodeId: refId });
      continue;
    }

    // Normal node.
    let id: string;
    if (explicitId) {
      if (byId.has(explicitId)) {
        errors.push({ line: lineNo, message: `Duplicate id "&${explicitId}"` });
        id = nextAutoId();
      } else {
        id = explicitId;
      }
    } else {
      id = nextAutoId();
    }

    const node: GraphNode = { id, type, text: body };
    nodes.push(node);
    byId.set(id, node);
    if (parentId !== null) edges.push({ from: id, to: parentId, type });

    stack.push({ indent, nodeId: id });
  }

  // Resolve references now that every node id is known (forward refs allowed).
  for (const ref of pendingRefs) {
    if (byId.has(ref.refId)) {
      edges.push({ from: ref.refId, to: ref.parentId, type: ref.type });
    } else {
      errors.push({ line: ref.line, message: `Unknown reference "$${ref.refId}"` });
    }
  }

  const graph: Graph = { nodes, edges };
  return { graph, errors };
}
