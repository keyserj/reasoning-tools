import type { ParseError, ParseResult } from "../types.ts";
import type { ArgDoc, Claim, Link, Note } from "./model.ts";
import {
  DESCRIPTION_KEY,
  EXPECTED_MARKERS,
  LINK_TYPES,
  type LinkType,
  MARKER_TO_KIND,
  PERSPECTIVES_KEY,
  isLinkType,
} from "./markers.ts";
import { type Scores, takeScores } from "./scores.ts";
import { toGraph } from "./toGraph.ts";

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
// Ids are kebab-case here (`&wall-reduces`), so `-` is part of the charset.
const ID_SUFFIX = /\s*&([A-Za-z0-9_-]+)\s*$/;
const REF_BODY = /^\$([A-Za-z0-9_-]+)$/;
const PROPERTY = /^%([A-Za-z0-9_-]+)\s*:\s*(.*)$/;
const LINK_TYPE_HEAD = /^([A-Za-z]+)/;
const BRACKETED_LIST = /^\[(.*)\]$/;

interface ClaimFrame {
  kind: "claim";
  indent: number;
  /** the claim (or, for a `= $ref` block, the referenced claim or link) children attach to */
  id: string;
}

interface LinkFrame {
  kind: "link";
  indent: number;
  pending: PendingLink;
}

type Frame = ClaimFrame | LinkFrame;

/**
 * A `<` or `>` line, held open until the claim nested under it supplies the other endpoint.
 * `valid` is false once the line has an error that makes the link unusable — the frame is
 * still pushed so its child gets absorbed instead of cascading more errors.
 */
interface PendingLink {
  id: string;
  type: LinkType;
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
 * Lines: `=` claim, `<`/`>` a supports/critiques link, `~` note, `%key: value` document
 * property, `/` meta-comment (dropped). Scores follow their marker directly (`=[4,1,8]`,
 * `supports[8,2,8]`). `&id` names the claim or link on the line; `= $id` references one
 * instead of declaring it, which is how an argument attaches to a *link's* implied claim.
 */
export function parseDoc(text: string): { doc: ArgDoc; errors: ParseError[] } {
  const claims: Claim[] = [];
  const links: Link[] = [];
  const notes: Note[] = [];
  const errors: ParseError[] = [];
  const usedIds = new Set<string>();
  const refUses: { refId: string; line: number }[] = [];
  const pendingLinks: PendingLink[] = [];
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
        claims.push({ id: nodeId, text: body, scores, line: lineNo });
      }

      if (parent?.kind === "link") {
        const pending = parent.pending;
        if (pending.endpointFound) {
          errors.push({
            line: lineNo,
            message: `This "${pending.childIsSource ? "<" : ">"}" line already has a claim nested under it`,
          });
        } else {
          pending.endpointFound = true;
          if (pending.valid) {
            links.push({
              id: pending.id,
              type: pending.type,
              sourceId: pending.childIsSource ? nodeId : pending.parentId,
              targetId: pending.childIsSource ? pending.parentId : nodeId,
              scores: pending.scores,
              line: pending.line,
            });
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

      if (!parent) {
        errors.push({ line: lineNo, message: 'A "~" note needs a line above it to attach to' });
        continue;
      }
      const id = takeId(explicitId, "t", lineNo);
      usedIds.add(id);
      notes.push({
        id,
        text: body,
        attachedTo: parent.kind === "claim" ? parent.id : parent.pending.id,
        line: lineNo,
      });
      // A note is a leaf, so it never becomes a frame: a sibling claim at the same indent
      // still counts as the enclosing link line's endpoint.
      continue;
    }

    // `<` or `>`: a link line.
    const childIsSource = kind === "link-from-child";
    let body = content.slice(1).trim();
    const idMatch = ID_SUFFIX.exec(body);
    const explicitId = idMatch?.[1];
    if (idMatch) body = body.slice(0, idMatch.index).trim();

    const word = LINK_TYPE_HEAD.exec(body)?.[1] ?? "";
    const linkType: LinkType | null = isLinkType(word) ? word : null;
    if (linkType === null) {
      errors.push({
        line: lineNo,
        message: `Unknown link type "${word}" (expected ${LINK_TYPES.join(" or ")})`,
      });
    }

    const { scores, rest, messages } = takeScores(body.slice(word.length));
    for (const message of messages) errors.push({ line: lineNo, message });
    if (rest.trim() !== "") {
      errors.push({ line: lineNo, message: `Unexpected text after "${word}": "${rest.trim()}"` });
    }

    let parentId: string | null = null;
    if (!parent) {
      errors.push({ line: lineNo, message: `A "${marker}" line needs a claim above it to link` });
    } else if (parent.kind === "link") {
      errors.push({
        line: lineNo,
        message: `A "${marker}" line can't nest under another link line — argue about a link with a "= $link-id" block`,
      });
    } else {
      parentId = parent.id;
    }

    const id = takeId(explicitId, "l", lineNo);
    usedIds.add(id);
    const pending: PendingLink = {
      id,
      type: linkType ?? "supports",
      scores,
      parentId: parentId ?? "",
      childIsSource,
      line: lineNo,
      endpointFound: false,
      valid: linkType !== null && parentId !== null,
    };
    pendingLinks.push(pending);
    stack.push({ kind: "link", indent, pending });
  }

  for (const pending of pendingLinks) {
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

  // Slot counts are checked here rather than inline so `%perspectives` can appear anywhere.
  if (perspectives.length > 0) {
    const checkSlots = (scores: Scores | null, line: number) => {
      if (scores !== null && scores.length !== perspectives.length) {
        errors.push({
          line,
          message: `Expected ${perspectives.length} scores to match %${PERSPECTIVES_KEY}, got ${scores.length}`,
        });
      }
    };
    for (const claim of claims) checkSlots(claim.scores, claim.line);
    for (const link of links) checkSlots(link.scores, link.line);
  }

  errors.sort((a, b) => a.line - b.line);

  return { doc: { description, perspectives, claims, links, notes }, errors };
}

/** The {@link Ontology} entry point: parse, then flatten into a drawable {@link Graph}. */
export function parse(text: string): ParseResult {
  const { doc, errors } = parseDoc(text);
  return { graph: toGraph(doc), errors };
}
