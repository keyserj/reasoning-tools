import type { ParseError } from "../types.ts";
import type { Note } from "../notes.ts";
import type { Argument, Claim, KialoDoc, Question, Source, Thesis } from "./model.ts";
import {
  DESCRIPTION_KEY,
  EXPECTED_MARKERS,
  ID_SUFFIX,
  LEADING_WS,
  type LineKind,
  MARKER_TO_KIND,
  PERSPECTIVES_KEY,
  PROPERTY,
  REF_BODY,
  SOURCE_BODY,
  type Stance,
  isStance,
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

/**
 * What the lines nested under this one attach to. The two frames are the two things that can be
 * a parent, and they accept different children — a question takes theses, a claim takes
 * arguments, sources and notes — which is where most of this parser's errors come from.
 */
type Frame =
  | { kind: "question"; indent: number; questionId: string }
  | { kind: "claim"; indent: number; claimId: string };

export function parse(text: string): { doc: KialoDoc; errors: ParseError[] } {
  const questions: Question[] = [];
  const claims: Claim[] = [];
  const theses: Thesis[] = [];
  const argumentsList: Argument[] = [];
  const errors: ParseError[] = [];

  const usedIds = new Set<string>();
  const claimIds = new Set<string>();
  const refUses: { refId: string; line: number }[] = [];
  // Sources and notes name their claim by id, and a `$ref` may point further down the file, so
  // they are filed once every id is known.
  const pendingSources: { source: Source; claimId: string }[] = [];
  const pendingNotes: { note: Note; claimId: string }[] = [];
  const docNotes: Note[] = [];
  // `%perspectives` may appear anywhere, so slot counts can't be checked until the end. This is
  // the only reason a line number outlives the loop; nothing in the model carries one.
  const scored: { scores: Scores; line: number }[] = [];
  const stack: Frame[] = [];
  let lastNoteIndent: number | null = null;
  const autoCounters: Record<string, number> = {};

  let description: string | undefined;
  let perspectives: string[] = [];

  const nextAutoId = (prefix: string): string => {
    let id: string;
    do {
      autoCounters[prefix] = (autoCounters[prefix] ?? 0) + 1;
      id = `${prefix}${autoCounters[prefix]}`;
    } while (usedIds.has(id));
    usedIds.add(id);
    return id;
  };

  /** Claim the line's `&id`, falling back to an auto id when it's missing or taken. */
  const takeId = (explicit: string | undefined, prefix: string, line: number): string => {
    if (explicit === undefined) return nextAutoId(prefix);
    if (usedIds.has(explicit)) {
      errors.push({ line, message: `Duplicate id "&${explicit}"` });
      return nextAutoId(prefix);
    }
    usedIds.add(explicit);
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
    const kind: LineKind | undefined = MARKER_TO_KIND[marker];

    // A note is a leaf, so a `~` indented under one is annotating a note — which none of these
    // ontologies express. Cleared by any other line, so a later sibling note is still fine.
    const noteAbove = lastNoteIndent;
    lastNoteIndent = kind === "note" ? indent : null;

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
            message: `"%${PERSPECTIVES_KEY}" expects a list, e.g. [alice, bob]`,
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

    if (kind === "question") {
      let body = content.slice(1).trim();
      const idMatch = ID_SUFFIX.exec(body);
      const explicitId = idMatch?.[1];
      if (idMatch) body = body.slice(0, idMatch.index).trim();

      if (parent !== null) {
        errors.push({
          line: lineNo,
          message: 'A "?" question can only sit at the top level — Kialo has no sub-questions',
        });
      }
      if (body.startsWith("[")) {
        errors.push({
          line: lineNo,
          message: "A question isn't voted on, so it can't carry scores",
        });
      }
      if (body === "") {
        errors.push({ line: lineNo, message: "A question needs some text" });
        continue;
      }

      const id = takeId(explicitId, "q", lineNo);
      questions.push({ id, text: body });
      stack.push({ kind: "question", indent, questionId: id });
      continue;
    }

    if (kind === "source") {
      const match = SOURCE_BODY.exec(content.slice(1).trim());
      if (!match) {
        errors.push({ line: lineNo, message: 'A "@" source needs a URL' });
        continue;
      }
      if (parent?.kind !== "claim") {
        errors.push({
          line: lineNo,
          message: 'A "@" source needs a claim above it to attach to',
        });
        continue;
      }
      const [, url, label] = match;
      pendingSources.push({
        source: { url, ...(label ? { label } : {}) },
        claimId: parent.claimId,
      });
      // A source is a leaf, so it never becomes a frame.
      continue;
    }

    if (kind === "note") {
      let body = content.slice(1).trim();
      const idMatch = ID_SUFFIX.exec(body);
      const explicitId = idMatch?.[1];
      if (idMatch) body = body.slice(0, idMatch.index).trim();

      if (noteAbove !== null && indent > noteAbove) {
        errors.push({ line: lineNo, message: 'A "~" note can\'t hang off another note' });
        continue;
      }
      const id = takeId(explicitId, "n", lineNo);
      if (parent?.kind !== "claim") {
        // No claim above it: a note about the document rather than about any one claim.
        docNotes.push({ id, text: body });
        continue;
      }
      pendingNotes.push({ note: { id, text: body }, claimId: parent.claimId });
      // A note is a leaf too — it can't be argued about, and nothing nests under it.
      continue;
    }

    // A `=`, `+` or `-` line: a claim, plus the placement that puts it where it is.
    // Scores bind tightly to the marker (`=[3,1]`), so they're read before trimming.
    const { scores, rest, messages } = takeScores(content.slice(1));
    for (const message of messages) errors.push({ line: lineNo, message });

    let body = rest.trim();
    const idMatch = ID_SUFFIX.exec(body);
    const explicitId = idMatch?.[1];
    if (idMatch) body = body.slice(0, idMatch.index).trim();

    const refMatch = REF_BODY.exec(body);
    let claimId: string;
    if (refMatch) {
      claimId = refMatch[1];
      if (explicitId !== undefined) {
        errors.push({ line: lineNo, message: `"$${claimId}" can't also set an id with "&"` });
      }
      refUses.push({ refId: claimId, line: lineNo });
    } else {
      if (body === "") {
        errors.push({ line: lineNo, message: "A claim needs some text" });
        continue;
      }
      claimId = takeId(explicitId, "c", lineNo);
      claimIds.add(claimId);
      claims.push({ id: claimId, text: body, sources: [], notes: [] });
    }

    if (scores !== null) scored.push({ scores, line: lineNo });

    if (kind === "thesis") {
      if (parent?.kind === "claim") {
        // No placement: the line says "answer to a question" and there is no question here.
        // The claim still stands, so its own children have somewhere to attach.
        errors.push({
          line: lineNo,
          message: 'A "=" thesis can\'t nest under a claim — argue about it with "+" or "-"',
        });
      } else if (theses.some((thesis) => thesis.claimId === claimId)) {
        errors.push({
          line: lineNo,
          message: "A claim can only be a thesis once — it would have two veracity scores",
        });
      } else {
        theses.push({
          id: nextAutoId("t"),
          claimId,
          questionId: parent?.kind === "question" ? parent.questionId : null,
          veracity: scores,
        });
      }
    } else if (isStance(kind)) {
      const stance: Stance = kind;
      if (parent === null) {
        errors.push({
          line: lineNo,
          message: `A "${marker}" line needs a claim above it to attach to — a document starts with "?" or "="`,
        });
      } else if (parent.kind === "question") {
        errors.push({
          line: lineNo,
          message: `A "${marker}" line can't nest under a question — a question's answers are "=" theses`,
        });
      } else {
        argumentsList.push({
          id: nextAutoId("a"),
          claimId,
          parentClaimId: parent.claimId,
          stance,
          impact: scores,
        });
      }
    }

    stack.push({ kind: "claim", indent, claimId });
  }

  // Resolved last so a reference may point at something declared further down the file.
  for (const use of refUses) {
    if (!claimIds.has(use.refId)) {
      errors.push({ line: use.line, message: `Unknown reference "$${use.refId}"` });
    }
  }

  // A source or note whose claim never resolved is dropped rather than left ownerless: the
  // unknown reference is already reported, and keeping it would attach evidence to nothing.
  const claimsById = new Map(claims.map((claim) => [claim.id, claim]));
  for (const { source, claimId } of pendingSources) claimsById.get(claimId)?.sources.push(source);
  for (const { note, claimId } of pendingNotes) claimsById.get(claimId)?.notes.push(note);

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

  return {
    doc: {
      description,
      perspectives,
      questions,
      claims,
      theses,
      arguments: argumentsList,
      notes: docNotes,
    },
    errors,
  };
}
