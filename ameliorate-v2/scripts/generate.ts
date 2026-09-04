// The JSON bundle a wireframe pastes in, and the command that writes it.
//
// Versions are immutable snapshots (see `wireframe/versions.js`), so a wireframe can't read this
// file at runtime - a rerun would rewrite history. It's committed instead, and a derivation change
// means cutting a new version with the new bundle pasted in.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Activity, SignalName, Signals } from "./highlights.ts";
import { SIGNALS, candidates, highlights } from "./highlights.ts";
import type { Doc, Node } from "./model.ts";
import { isGuiding, subtypesOf, topicNode } from "./model.ts";
import { DESCRIPTION_KEY } from "./markers.ts";
import { parse } from "./parse.ts";
import { guidingQuestions } from "./questions.ts";
import type { Scores } from "./scores.ts";

const EXAMPLE_PATH = join(import.meta.dirname, "../examples/build-a-wall.txt");
/** `{ id: 0..1 }` - hardcoded "Active" strengths, since nothing here models comments or history. */
const ACTIVITY_PATH = join(import.meta.dirname, "../examples/build-a-wall.activity.json");
const BUNDLE_PATH = join(import.meta.dirname, "../examples/build-a-wall.views.json");

/** Enough places to tell two items apart, few enough to read the bundle as a diff. */
const SCORE_PLACES = 3;

const ZERO_SIGNALS: Signals = Object.fromEntries(SIGNALS.map((signal) => [signal, 0])) as Signals;

/** A node's type, with questions split by the `#guiding` tag. */
export type NodeKind = "concept" | "guiding" | "clarifying" | "claim" | "source";

export interface ViewNode {
  label: string;
  kind: NodeKind;
  /** `#tag`s as written */
  tags: string[];
  /** what a relation implies: criterion, category, component */
  subtypes: string[];
  scores: Scores | null;
  signals: Signals;
  /** its strongest signal - what a view ranks by */
  hotness: number;
}

export interface ViewQuestion {
  id: string;
  text: string;
  guidingScore: number;
}

export interface ViewEdge {
  from: string;
  /** as written, so `reduces` doesn't read back as its canonical `causes` */
  relation: string;
  to: string;
  scores: Scores | null;
  signals: Signals;
  hotness: number;
}

/**
 * Names what it points at, the way `nodes` and `edges` are keyed. The numbers live on that node
 * or edge; a highlight adds only the order and which signals listed it.
 */
export interface ViewHighlight {
  kind: "node" | "edge";
  id: string;
  categories: SignalName[];
}

export interface Views {
  perspectives: string[];
  topic: { id: string; description: string };
  nodes: Record<string, ViewNode>;
  edges: Record<string, ViewEdge>;
  questions: ViewQuestion[];
  highlights: ViewHighlight[];
}

const round = (value: number): number => Number(value.toFixed(SCORE_PLACES));

const roundSignals = (signals: Signals): Signals =>
  Object.fromEntries(SIGNALS.map((signal) => [signal, round(signals[signal])])) as Signals;

const hotnessOf = (signals: Signals): number =>
  round(Math.max(...SIGNALS.map((signal) => signals[signal])));

/**
 * `JSON.stringify`'s 2-space indent, except a row of scores, tags or categories stays on one line. The
 * bundle is committed to be read as a diff, and an expanded `[\n -4,\n 0,\n -8\n]` turns one
 * changed score into a hunt through five lines.
 *
 * `undefined` follows `JSON.stringify`: dropped as an object's value, written as `null` in an
 * array. On its own it's `null` too, since this always has to return JSON text.
 */
export function toJson(value: unknown, indent = ""): string {
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items: unknown[] = value.map((item) => item ?? null);
    if (items.every((item) => item === null || typeof item !== "object")) {
      return `[${items.map((item) => JSON.stringify(item)).join(", ")}]`;
    }
    return `[\n${items.map((item) => inner + toJson(item, inner)).join(",\n")}\n${indent}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);
    if (entries.length === 0) return "{}";
    const lines = entries.map(
      ([key, item]) => `${inner}${JSON.stringify(key)}: ${toJson(item, inner)}`,
    );
    return `{\n${lines.join(",\n")}\n${indent}}`;
  }
  return value === undefined ? "null" : JSON.stringify(value);
}

function nodeKind(node: Node): NodeKind {
  if (node.type !== "question") return node.type;
  return isGuiding(node) ? "guiding" : "clarifying";
}

/**
 * Everything the wireframe reads off the document. A question node's score is absent rather than
 * zero: the syntax puts it on the `guides` or `clarifies` edge instead.
 */
export function buildViews(doc: Doc, activity: Activity = {}): Views {
  const topic = topicNode(doc);
  if (topic === undefined)
    throw new Error("No node is tagged #topic, so there are no views to build");

  // one map for both kinds: ./parse.ts allocates node and edge ids from a single set
  const signalsById = new Map(candidates(doc, activity).map((item) => [item.id, item.signals]));

  const nodes: Record<string, ViewNode> = {};
  for (const node of doc.nodes) {
    // An implied claim's wording is derived from what it stands behind rather than written, and
    // nothing in the bundle points at one.
    if (node.impliedForId !== undefined) continue;
    const signals = signalsById.get(node.id) ?? ZERO_SIGNALS;
    nodes[node.id] = {
      label: node.text,
      kind: nodeKind(node),
      tags: node.tags,
      subtypes: subtypesOf(node, doc),
      scores: node.scores,
      signals: roundSignals(signals),
      hotness: hotnessOf(signals),
    };
  }

  const edges: Record<string, ViewEdge> = {};
  for (const edge of doc.edges) {
    const signals = signalsById.get(edge.id) ?? ZERO_SIGNALS;
    edges[edge.id] = {
      from: edge.sourceId,
      relation: edge.type,
      to: edge.targetId,
      scores: edge.scores,
      signals: roundSignals(signals),
      hotness: hotnessOf(signals),
    };
  }

  const byId = new Map(doc.nodes.map((node) => [node.id, node]));

  return {
    perspectives: doc.perspectives,
    topic: { id: topic.id, description: topic.properties[DESCRIPTION_KEY] ?? "" },
    nodes,
    edges,
    questions: guidingQuestions(doc).map((question) => ({
      id: question.id,
      text: byId.get(question.id)?.text ?? "",
      guidingScore: round(question.score),
    })),
    highlights: highlights(doc, activity).map((item) => ({
      kind: item.kind,
      id: item.id,
      categories: item.categories,
    })),
  };
}

function main(): void {
  const { doc, errors, warnings } = parse(readFileSync(EXAMPLE_PATH, "utf8"));
  for (const warning of warnings) console.warn(`${warning.line}: ${warning.message}`);
  if (errors.length > 0) {
    for (const error of errors) console.error(`${error.line}: ${error.message}`);
    process.exit(1);
  }
  const activity: Activity = JSON.parse(readFileSync(ACTIVITY_PATH, "utf8"));
  writeFileSync(BUNDLE_PATH, `${toJson(buildViews(doc, activity))}\n`);
  console.log(`wrote ${BUNDLE_PATH}`);
}

if (process.argv[1] === import.meta.filename) main();
