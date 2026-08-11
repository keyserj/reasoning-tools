import { describe, expect, it } from "vitest";
import { highlightLine } from "../../ontology/arg-map-truth-and-relevance/highlight.ts";
import { indexRefs, refTargetAt } from "./refJump.ts";

// Tokenized through a real ontology, the way EditorPane feeds the overlay: the offsets this
// computes are only worth anything if they match what a tokenizer actually emits.
const source = [
  "= We should use Redis &redis",
  "  < supports[8,4] &fast-supports-redis",
  "    = Redis is fast for hot reads",
  "= We should use Postgres",
  "  < critiques",
  "    = $redis",
  "= $fast-supports-redis",
  "= $nowhere",
  "= $tail",
  "= A tail claim &tail",
].join("\n");

const index = indexRefs(source.split("\n").map(highlightLine));

/** A caret one character into `token`, i.e. where a click inside it would land. */
const inside = (token: string) => source.indexOf(token) + 1;

const spanOf = (token: string, line: number) => ({
  start: source.indexOf(token),
  end: source.indexOf(token) + token.length,
  line,
});

describe("indexRefs", () => {
  it("finds every reference in source order", () => {
    expect(index.refs.map((r) => r.name)).toEqual([
      "redis",
      "fast-supports-redis",
      "nowhere",
      "tail",
    ]);
  });

  it("spans a reference exactly, sigil included", () => {
    expect(index.refs[0]).toEqual({ ...spanOf("$redis", 5), name: "redis" });
  });

  it("keeps the first of a duplicated declaration, as the parser does", () => {
    const dup = ["= One &same", "= Two &same", "= $same"].join("\n");
    const dupIndex = indexRefs(dup.split("\n").map(highlightLine));
    expect(refTargetAt(dupIndex, dup.indexOf("$same") + 1)?.line).toBe(0);
  });
});

describe("refTargetAt", () => {
  it("resolves a reference to the declaration above it", () => {
    expect(refTargetAt(index, inside("$redis"))).toEqual(spanOf("&redis", 0));
  });

  it("resolves a reference to a declaration further down the file", () => {
    expect(refTargetAt(index, inside("$tail"))).toEqual(spanOf("&tail", 9));
  });

  it("resolves an id declared on an edge line", () => {
    expect(refTargetAt(index, inside("$fast-supports-redis"))).toEqual(
      spanOf("&fast-supports-redis", 1),
    );
  });

  it("counts both edges of a reference as inside it", () => {
    const { start, end } = spanOf("$redis", 5);
    expect(refTargetAt(index, start)).toBeDefined();
    expect(refTargetAt(index, end)).toBeDefined();
    expect(refTargetAt(index, start - 1)).toBeUndefined();
    expect(refTargetAt(index, end + 1)).toBeUndefined();
  });

  it("leaves a reference that declares nothing alone", () => {
    expect(refTargetAt(index, inside("$nowhere"))).toBeUndefined();
  });

  it("leaves a caret in ordinary prose alone", () => {
    expect(refTargetAt(index, inside("We should use Postgres"))).toBeUndefined();
  });
});
