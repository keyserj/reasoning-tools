// Rules that can only be checked once the whole document is assembled: how many perspectives
// there turned out to be, whether a claim ever got the `%opposite` that unlocks its negative
// half, and what each relation turned out to run between - a forward `$ref` isn't resolved until
// the end, so none of these can be decided while reading a line. ./parse.ts runs this at the end
// of itself, so there's no way to parse without it.

import type { ParseError } from "./diagnostics.ts";
import type { Doc, Node, NodeType } from "./model.ts";
import { OPPOSITE_KEY, edgeTypeDef, isBipolar } from "./markers.ts";
import type { Scores } from "./scores.ts";

const negatives = (scores: Scores): number[] =>
  scores.filter((s): s is number => s !== null && s < 0);

const listTypes = (types: readonly NodeType[]): string => {
  const each = types.map((type) => `a ${type}`);
  return each.length === 1 ? each[0] : `${each.slice(0, -1).join(", ")} or ${each.at(-1)}`;
};

/** Where a thing was declared, so a rule about the assembled model can still point at a line. */
export type DeclaredAt = Map<string, number>;

export interface ValidateResult {
  errors: ParseError[];
  warnings: ParseError[];
}

export function validate(doc: Doc, declaredAt: DeclaredAt): ValidateResult {
  const errors: ParseError[] = [];
  const warnings: ParseError[] = [];
  const at = (id: string): number => declaredAt.get(id) ?? 1;
  const byId = new Map(doc.nodes.map((node) => [node.id, node]));

  const checkSlots = (id: string, scores: Scores): void => {
    if (doc.perspectives.length === 0) return;
    if (scores.length !== doc.perspectives.length) {
      errors.push({
        line: at(id),
        message: `Expected ${doc.perspectives.length} scores to match %perspectives, got ${scores.length}`,
      });
    }
  };

  for (const node of doc.nodes) {
    if (node.scores === null) continue;
    checkSlots(node.id, node.scores);
    // A claim scores belief in what it says, and "the opposite of true" only exists once the
    // opposite has been worded - see `ontology.md`'s Claim truth score.
    if (node.type === "claim" && node.properties[OPPOSITE_KEY] === undefined) {
      const negative = negatives(node.scores);
      if (negative.length > 0) {
        errors.push({
          line: at(node.id),
          message: `A claim scores 0..8 unless it defines "%${OPPOSITE_KEY}", so ${negative.join(", ")} has no meaning here`,
        });
      }
    }
  }

  /** what a relation ran between, so two spellings of one relation read as one assertion */
  const asserted = new Map<string, number>();

  for (const edge of doc.edges) {
    const def = edgeTypeDef(edge.type);

    // A dangling endpoint is already an "Unknown reference" error; saying more about it would
    // just describe the damage.
    const endpoints: [Node | undefined, "from" | "to"][] = [
      [byId.get(edge.sourceId), "from"],
      [byId.get(edge.targetId), "to"],
    ];
    for (const [node, end] of endpoints) {
      if (node && !def[end].includes(node.type)) {
        errors.push({
          line: at(edge.id),
          message: `"${edge.type}" runs ${end} ${listTypes(def[end])}, not a ${node.type}`,
        });
      }
    }

    // Duplicates double-count wherever edge weights are multiplied, which is why `ontology.md`
    // asks authors not to write them. Keyed by canonical spelling, so `a reduces b` and
    // `a causes[-n] b` - the same assertion - collide.
    const assertion = `${edge.sourceId}|${def.canonical}|${edge.targetId}`;
    const first = asserted.get(assertion);
    if (first === undefined) asserted.set(assertion, at(edge.id));
    else {
      warnings.push({
        line: at(edge.id),
        message: `Line ${first} already relates these two by "${def.canonical}" - duplicates double-count wherever edge weights are multiplied`,
      });
    }

    if (edge.scores === null) continue;
    if (!def.scoreable) {
      errors.push({
        line: at(edge.id),
        message: `"${edge.type}" doesn't take a score`,
      });
      continue;
    }
    checkSlots(edge.id, edge.scores);
    if (!isBipolar(edge.type)) {
      const negative = negatives(edge.scores);
      if (negative.length > 0) {
        errors.push({
          line: at(edge.id),
          message: `"${edge.type}" scores 0..8 because it has no opposite, so ${negative.join(", ")} has no meaning here`,
        });
      }
    }
  }

  errors.sort((a, b) => a.line - b.line);
  warnings.sort((a, b) => a.line - b.line);
  return { errors, warnings };
}
