import type { ParseError } from "./diagnostics.ts";
import type { Doc, Edge, Node, NodeType, Note } from "./model.ts";
import {
  DESCRIPTION_KEY,
  type EdgeTypeName,
  EXPECTED_MARKERS,
  ID_SUFFIX,
  LEADING_WS,
  MARKER_TO_KIND,
  MARKER_TO_NODE_TYPE,
  NODE_TYPE_TO_MARKER,
  OPPOSITE_KEY,
  PERSPECTIVES_KEY,
  PROPERTY,
  REF_BODY,
  REF_HEAD,
  TAG_SUFFIX,
  edgeTypeDef,
  takeEdgeType,
} from "./markers.ts";
import { allocateId, edgeIdBase, impliedClaimId, slugify } from "./ids.ts";
import { type Scores, takeScores } from "./scores.ts";
import { validate } from "./validate.ts";

// The legend says two spaces per nesting level. Tabs aren't used, but expanding one to the next
// even column keeps a stray tab from reading as a level of its own.
const TAB_SIZE = 2;

const BRACKETED_LIST = /^\[(.*)\]$/;

/** Per `ontology.md`'s Structure Details. */
const PROPERTY_OWNER: Record<string, NodeType | undefined> = {
  [DESCRIPTION_KEY]: "concept",
  [OPPOSITE_KEY]: "claim",
};

/**
 * An implied claim stands behind a score, so it only means something where there is one to argue
 * about. `ontology.md`'s legend derives its wording from a concept, an edge or a claim, and
 * questions and sources carry no score for it to be about.
 */
const CAN_IMPLY_CLAIM: Record<NodeType, boolean> = {
  concept: true,
  claim: true,
  question: false,
  source: false,
};

function indentWidth(ws: string): number {
  let column = 0;
  for (const char of ws) {
    if (char === "\t") column += TAB_SIZE - (column % TAB_SIZE);
    else column += 1;
  }
  return column;
}

interface NodeFrame {
  kind: "node";
  indent: number;
  /** what children attach to; for a reference line, the placeholder its target resolves from */
  id: string;
  /** the declaration this line opened, or null when the line was a `$ref` */
  node: Node | null;
  /** shares the declaration's array, so a `~` under it lands on the node directly */
  notes: Note[];
}

interface EdgeFrame {
  kind: "edge";
  indent: number;
  pending: PendingEdge;
}

type Frame = NodeFrame | EdgeFrame;

/**
 * A `<` or `>` line, held open until the node nested under it supplies the other endpoint. Its
 * id can't be settled before then, because an unnamed edge is named after both of its endpoints.
 * `valid` goes false once the line has an error that makes the edge unusable - the frame is
 * still pushed, so its child is absorbed instead of cascading more errors.
 */
interface PendingEdge {
  explicitId?: string;
  type: EdgeTypeName;
  scores: Scores | null;
  parentId: string;
  /** `<` = the nested child is the source; `>` = the child is the target */
  childIsSource: boolean;
  line: number;
  endpointFound: boolean;
  valid: boolean;
  notes: Note[];
}

interface RefUse {
  refId: string;
  line: number;
  marker: string;
  /**
   * Stands in for the reference until it resolves. Ids are `[A-Za-z0-9_-]`, so a leading NUL
   * can't collide with one a document wrote - which matters, because resolution rewrites edge
   * endpoints by value and would otherwise move an edge that merely shared the spelling.
   */
  sentinel: string;
  notes: Note[];
}

interface UnnamedEdge {
  edge: Edge;
  line: number;
}

export interface ParseResult {
  doc: Doc;
  errors: ParseError[];
  /** things worth changing that still parse, e.g. an auto id that needed a collision suffix */
  warnings: ParseError[];
}

/**
 * Parse this ontology's syntax into its {@link Doc} model.
 *
 * Lines are read through the markers ./markers.ts defines, per `ontology.md`'s Example -> Context
 * legend. This is the one entry point: whole-document rules that need the assembled model live in
 * ./validate.ts and run at the end of it, rather than being a step a caller could skip.
 */
export function parse(text: string): ParseResult {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const errors: ParseError[] = [];
  const warnings: ParseError[] = [];
  const usedIds = new Set<string>();
  const declaredNodeTypes = new Map<string, NodeType>();
  const refUses: RefUse[] = [];
  const pendingEdges: PendingEdge[] = [];
  const unnamedEdges: UnnamedEdge[] = [];
  const docNotes: Note[] = [];
  const stack: Frame[] = [];
  // `%perspectives` may appear anywhere, so slot counts can't be checked until the end. This is
  // the only reason a line number outlives the loop; nothing in the model carries one.
  const declaredAt = new Map<string, number>();
  let lastNoteIndent: number | null = null;
  let perspectives: string[] = [];

  const claimId = (explicit: string, line: number): boolean => {
    if (usedIds.has(explicit)) {
      errors.push({ line, message: `Duplicate id "&${explicit}"` });
      return false;
    }
    usedIds.add(explicit);
    return true;
  };

  /** A generated id that had to be suffixed is the one part of an id that document order moves. */
  const deriveId = (base: string, line: number): string => {
    const { id, collided } = allocateId(usedIds, base);
    if (collided) {
      warnings.push({
        line,
        message: `Generated id "${id}" needed a suffix because "${base}" is taken - give it an explicit "&id" so it doesn't shift when lines move`,
      });
    }
    return id;
  };

  const reserveId = (explicit: string | undefined, base: string, line: number): string =>
    explicit !== undefined && claimId(explicit, line) ? explicit : deriveId(base, line);

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

    // A `/` comment never becomes a parent, so a line indented under one attaches to whatever
    // encloses the comment. It doesn't clear the note context below either, so a comment can sit
    // between two sibling notes.
    if (kind === "meta") continue;

    // A note is a leaf, so a `~` indented under one would be annotating a note, which the
    // ontology has no notion of. Cleared by any other line, so a later sibling note is fine.
    const noteAbove = lastNoteIndent;
    lastNoteIndent = kind === "note" ? indent : null;

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent: Frame | null = stack.length > 0 ? stack[stack.length - 1] : null;

    if (kind === "property") {
      const match = PROPERTY.exec(content);
      if (!match) {
        errors.push({ line: lineNo, message: 'Expected a property of the form "%key: value"' });
        continue;
      }
      const [, key, value] = match;
      if (!parent) {
        if (key === PERSPECTIVES_KEY) {
          if (perspectives.length > 0) {
            errors.push({ line: lineNo, message: `"%${PERSPECTIVES_KEY}" is already set` });
          }
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
            message: `Unknown document property "%${key}" (expected %${PERSPECTIVES_KEY})`,
          });
        }
      } else if (parent.kind === "node" && parent.node) {
        const ownerType = PROPERTY_OWNER[key];
        if (ownerType === undefined) {
          errors.push({
            line: lineNo,
            message: `Unknown property "%${key}" (expected %${DESCRIPTION_KEY} or %${OPPOSITE_KEY})`,
          });
        } else if (parent.node.type !== ownerType) {
          errors.push({
            line: lineNo,
            message: `"%${key}" belongs to a ${ownerType}, not a ${parent.node.type}`,
          });
        } else if (parent.node.properties[key] !== undefined) {
          errors.push({
            line: lineNo,
            message: `"%${key}" is already set on "${parent.node.id}"`,
          });
        } else {
          parent.node.properties[key] = value.trim();
        }
      } else {
        errors.push({
          line: lineNo,
          message: `"%${key}" has to be nested under a declaration - a reference or edge line can't carry properties`,
        });
      }
      continue;
    }

    if (kind === "note") {
      const body = content.slice(1).trim();
      if (noteAbove !== null && indent > noteAbove) {
        errors.push({ line: lineNo, message: 'A "~" note can\'t hang off another note' });
        continue;
      }
      const { id } = allocateId(usedIds, `note-${slugify(body)}`);
      const note: Note = { id, text: body };
      // A note is a leaf, so it never becomes a frame: a sibling node at the same indent still
      // counts as the enclosing edge line's endpoint.
      if (!parent) docNotes.push(note);
      else if (parent.kind === "node") parent.notes.push(note);
      else parent.pending.notes.push(note);
      continue;
    }

    if (kind === "node") {
      const nodeType = MARKER_TO_NODE_TYPE[marker] as NodeType;
      const { scores, rest, messages } = takeScores(content.slice(1));
      for (const message of messages) errors.push({ line: lineNo, message });

      let body = rest.trim();
      if (scores === null && messages.length === 0 && body.startsWith("[")) {
        errors.push({
          line: lineNo,
          message: `Scores attach directly to the marker, as "${marker}[6,2,-] ..."`,
        });
      }
      const tags: string[] = [];
      let explicitId: string | undefined;
      for (;;) {
        const tagMatch = TAG_SUFFIX.exec(body);
        if (tagMatch) {
          tags.unshift(tagMatch[1]);
          body = body.slice(0, tagMatch.index).trim();
          continue;
        }
        const idMatch = ID_SUFFIX.exec(body);
        if (idMatch) {
          if (explicitId !== undefined) {
            errors.push({ line: lineNo, message: 'A line can only set one "&id"' });
          } else {
            explicitId = idMatch[1];
          }
          body = body.slice(0, idMatch.index).trim();
          continue;
        }
        break;
      }

      let frameId: string;
      let declared: Node | null = null;
      const refMatch = REF_BODY.exec(body);
      const refHead = refMatch ? null : REF_HEAD.exec(body);
      if (refMatch || refHead) {
        const refId = (refMatch ?? refHead)![1];
        if (refHead) {
          errors.push({
            line: lineNo,
            message: `A reference line carries nothing but "${marker} $${refId}" - the text of "$${refId}" comes from what it names`,
          });
        }
        if (scores !== null) {
          errors.push({
            line: lineNo,
            message: `"$${refId}" can't carry scores - the line that declares it holds them`,
          });
        }
        if (explicitId !== undefined) {
          errors.push({ line: lineNo, message: `"$${refId}" can't also set an id with "&"` });
        }
        if (tags.length > 0) {
          errors.push({ line: lineNo, message: `"$${refId}" can't also carry a "#tag"` });
        }
        // `=` on a non-claim names the implied claim behind its score, which needs a node of its
        // own so a `supports` edge can target it without colliding with the referent's own edges.
        // Whether it is one isn't known until every declaration is read, so this stands in.
        const sentinel = `\u0000ref${refUses.length}`;
        const notes: Note[] = [];
        refUses.push({ refId, line: lineNo, marker, sentinel, notes });
        frameId = sentinel;
        stack.push({ kind: "node", indent, id: frameId, node: null, notes });
      } else {
        if (body === "") {
          errors.push({ line: lineNo, message: `A "${marker}" line needs some text` });
          continue;
        }
        frameId = reserveId(explicitId, slugify(body), lineNo);
        declaredAt.set(frameId, lineNo);
        declaredNodeTypes.set(frameId, nodeType);
        declared = {
          id: frameId,
          text: body,
          type: nodeType,
          tags,
          properties: {},
          scores,
          notes: [],
        };
        nodes.push(declared);
        stack.push({ kind: "node", indent, id: frameId, node: declared, notes: declared.notes });
      }

      if (parent?.kind === "edge") {
        const pending = parent.pending;
        if (pending.endpointFound) {
          errors.push({
            line: lineNo,
            message: `This "${pending.childIsSource ? "<" : ">"}" line already has a node nested under it`,
          });
        } else {
          pending.endpointFound = true;
          if (pending.valid) {
            const sourceId = pending.childIsSource ? frameId : pending.parentId;
            const targetId = pending.childIsSource ? pending.parentId : frameId;
            const edge: Edge = {
              id: "",
              type: pending.type,
              sourceId,
              targetId,
              scores: pending.scores,
              notes: pending.notes,
            };
            // an `&id` nobody else took settles it here; otherwise the edge waits for
            // ./nameUnnamedEdges, which can only name it once its endpoints have resolved
            if (pending.explicitId !== undefined && claimId(pending.explicitId, pending.line)) {
              edge.id = pending.explicitId;
              declaredAt.set(edge.id, pending.line);
            } else {
              unnamedEdges.push({ edge, line: pending.line });
            }
            edges.push(edge);
          }
        }
      } else if (parent?.kind === "node") {
        errors.push({
          line: lineNo,
          message:
            'A node has to be attached with a "<" or ">" line, not nested directly under another node',
        });
      }
      continue;
    }

    const childIsSource = kind === "edge-from-child";
    let body = content.slice(1).trim();
    let explicitId: string | undefined;
    const idMatch = ID_SUFFIX.exec(body);
    if (idMatch) {
      explicitId = idMatch[1];
      body = body.slice(0, idMatch.index).trim();
    }

    const { type, rest: afterType } = takeEdgeType(body);
    if (type === null) {
      const word = body.split(/[\s[]/)[0];
      errors.push({ line: lineNo, message: `Unknown edge type "${word}"` });
    }

    const { scores, rest, messages } = takeScores(afterType);
    for (const message of messages) errors.push({ line: lineNo, message });
    // a malformed score row is already reported; the text it left behind is the same mistake
    if (rest.trim() !== "" && type !== null && messages.length === 0) {
      errors.push({
        line: lineNo,
        message: `Unexpected text after "${type}": "${rest.trim()}"`,
      });
    }

    let parentId: string | null = null;
    if (!parent) {
      errors.push({
        line: lineNo,
        message: `A "${marker}" line needs a node above it to attach to`,
      });
    } else if (parent.kind === "edge") {
      errors.push({
        line: lineNo,
        message: `A "${marker}" line can't nest under another edge line - argue about an edge with a "= $edge-id" block`,
      });
    } else {
      parentId = parent.id;
    }

    const pending: PendingEdge = {
      explicitId,
      type: type ?? "causes",
      scores,
      parentId: parentId ?? "",
      childIsSource,
      line: lineNo,
      endpointFound: false,
      valid: type !== null && parentId !== null,
      notes: [],
    };
    pendingEdges.push(pending);
    stack.push({ kind: "edge", indent, pending });
  }

  for (const pending of pendingEdges) {
    if (pending.valid && !pending.endpointFound) {
      errors.push({
        line: pending.line,
        message: `A "${pending.childIsSource ? "<" : ">"}" line needs a node nested under it`,
      });
    }
  }

  resolveReferences(refUses, { nodes, edges, declaredNodeTypes, deriveId, errors });
  nameUnnamedEdges(unnamedEdges, usedIds, declaredAt);

  const doc: Doc = { perspectives, nodes, edges, notes: docNotes };
  const validated = validate(doc, declaredAt);
  errors.push(...validated.errors);
  warnings.push(...validated.warnings);
  errors.sort((a, b) => a.line - b.line);
  warnings.sort((a, b) => a.line - b.line);
  return { doc, errors, warnings };
}

interface ResolveContext {
  nodes: Node[];
  edges: Edge[];
  declaredNodeTypes: Map<string, NodeType>;
  deriveId: (base: string, line: number) => string;
  errors: ParseError[];
}

/**
 * Settle what every `$id` pointed at, which can only happen once the whole file is read: a
 * reference may name something declared further down, and `= $x` means one thing when `x` is a
 * claim and another when it's a concept or an edge.
 *
 * Only an edge that was given an `&id` can be referenced - an unnamed edge's id doesn't exist
 * yet at this point, because it's derived from the endpoints being resolved here.
 */
function resolveReferences(refUses: RefUse[], ctx: ResolveContext): void {
  const { nodes, edges, declaredNodeTypes, deriveId, errors } = ctx;
  const edgeIds = new Set(edges.map((edge) => edge.id).filter((id) => id !== ""));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  /** one implied claim per referent, however many blocks argue about it */
  const impliedByReferent = new Map<string, Node>();
  const resolved = new Map<string, string>();

  const edgeTypeById = new Map(edges.map((edge) => [edge.id, edge.type]));

  for (const use of refUses) {
    const referentType = declaredNodeTypes.get(use.refId);
    const isEdge = edgeIds.has(use.refId);
    if (referentType === undefined && !isEdge) {
      errors.push({ line: use.line, message: `Unknown reference "$${use.refId}"` });
      resolved.set(use.sentinel, use.refId);
      continue;
    }

    if (use.marker === "=" && referentType !== "claim") {
      // An implied claim stands behind a score. Where there isn't one, resolve to the claim that
      // would have been minted - nothing declares it, so whatever hung off this block reads as
      // pointing at it, and ./validate.ts stays quiet rather than reporting the same mistake
      // again as a wrong endpoint type.
      const edgeType = edgeTypeById.get(use.refId);
      const scoreless =
        referentType !== undefined && !CAN_IMPLY_CLAIM[referentType]
          ? `a ${referentType} has none - reference it as "${NODE_TYPE_TO_MARKER[referentType]} $${use.refId}"`
          : edgeType !== undefined && !edgeTypeDef(edgeType).scoreable
            ? `a "${edgeType}" edge has none`
            : null;
      if (scoreless !== null) {
        errors.push({
          line: use.line,
          message: `"= $${use.refId}" argues about a score, and ${scoreless}`,
        });
        resolved.set(use.sentinel, impliedClaimId(use.refId));
        continue;
      }
      let implied = impliedByReferent.get(use.refId);
      if (!implied) {
        const id = deriveId(impliedClaimId(use.refId), use.line);
        implied = {
          id,
          text: "",
          type: "claim",
          tags: [],
          properties: {},
          scores: null,
          notes: [],
          impliedForId: use.refId,
        };
        impliedByReferent.set(use.refId, implied);
        nodes.push(implied);
        byId.set(id, implied);
      }
      implied.notes.push(...use.notes);
      resolved.set(use.sentinel, implied.id);
      continue;
    }

    const expected = referentType ? NODE_TYPE_TO_MARKER[referentType] : "=";
    if (use.marker !== expected) {
      errors.push({
        line: use.line,
        message: `"$${use.refId}" is ${isEdge ? "an edge" : `a ${referentType}`}, so the reference should read "${expected} $${use.refId}"`,
      });
    }
    byId.get(use.refId)?.notes.push(...use.notes);
    resolved.set(use.sentinel, use.refId);
  }

  for (const edge of edges) {
    edge.sourceId = resolved.get(edge.sourceId) ?? edge.sourceId;
    edge.targetId = resolved.get(edge.targetId) ?? edge.targetId;
  }
}

/**
 * Name each edge the example didn't, now that both endpoints are settled. The id uses the
 * relation's canonical spelling, so `a reduces b` and `a causes[-n] b` - the same statement -
 * land on one id. ./validate.ts is what tells a document that asserted both; here the second one
 * just takes a suffix, since its own name is no worse for the collision.
 */
function nameUnnamedEdges(
  unnamed: UnnamedEdge[],
  usedIds: Set<string>,
  declaredAt: Map<string, number>,
): void {
  for (const { edge, line } of unnamed) {
    const base = edgeIdBase(edge.sourceId, edgeTypeDef(edge.type).canonical, edge.targetId);
    const { id } = allocateId(usedIds, base);
    edge.id = id;
    declaredAt.set(id, line);
  }
}
