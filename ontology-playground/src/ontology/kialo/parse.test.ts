import { describe, expect, it } from "vitest";
import { TOPIC_ID } from "../topic.ts";
import { parse } from "./parse.ts";
import example from "./examples/session-storage.txt?raw";

const messages = (source: string) => parse(source).errors.map((e) => e.message);

describe("parse", () => {
  it("uses a claim under a question as a thesis, scored on veracity", () => {
    const { doc, errors } = parse("? Q &q\n  =[3] Thesis &t");
    expect(errors).toEqual([]);
    expect(doc.questions).toEqual([{ id: "q", text: "Q" }]);
    expect(doc.theses).toEqual([
      { id: "t1", claimId: "t", viaRef: false, questionId: "q", veracity: [3] },
    ]);
    expect(doc.arguments).toEqual([]);
  });

  it("treats a top-level claim as a thesis of no question", () => {
    const { doc, errors } = parse("=[4] Thesis &t");
    expect(errors).toEqual([]);
    expect(doc.theses[0]).toMatchObject({ claimId: "t", questionId: null, veracity: [4] });
  });

  it("uses a claim under a claim as an argument, scored on impact", () => {
    const { doc, errors } = parse("= Thesis &t\n  +[3] Pro &p\n  -[1] Con &c");
    expect(errors).toEqual([]);
    expect(doc.arguments).toMatchObject([
      { claimId: "p", parentClaimId: "t", stance: "pro", impact: [3] },
      { claimId: "c", parentClaimId: "t", stance: "con", impact: [1] },
    ]);
  });

  it("gives a `$ref` its own usage and its own score, one claim in two spots", () => {
    const { doc, errors } = parse("= A &a\n  -[1] Cost &cost\n= B &b\n  +[4] $cost");
    expect(errors).toEqual([]);
    expect(doc.claims.filter((c) => c.id === "cost")).toHaveLength(1);
    // `viaRef` is which usage was written as `$cost` rather than at the line declaring it, which
    // is the one thing telling the two apart — ./toGraph.ts draws that one as a copy.
    expect(doc.arguments.filter((a) => a.claimId === "cost")).toMatchObject([
      { parentClaimId: "a", stance: "con", impact: [1], viaRef: false },
      { parentClaimId: "b", stance: "pro", impact: [4], viaRef: true },
    ]);
  });

  it("attaches sources and notes to the claim, splitting a source's url from its label", () => {
    const { doc, errors } = parse(
      "= T &t\n  +[2] Claim &c\n    @ https://e.example/a A study\n    @ https://e.example/b\n    ~ an aside",
    );
    expect(errors).toEqual([]);
    const claim = doc.claims.find((c) => c.id === "c");
    expect(claim?.sources).toEqual([
      { url: "https://e.example/a", label: "A study" },
      { url: "https://e.example/b" },
    ]);
    expect(claim?.notes).toMatchObject([{ text: "an aside" }]);
  });

  it("files a source written under a `$ref` against the claim it references", () => {
    const { doc } = parse("= A &a\n  +[1] Shared &s\n= B &b\n  +[2] $s\n    @ https://e.example x");
    expect(doc.claims.find((c) => c.id === "s")?.sources).toEqual([
      { url: "https://e.example", label: "x" },
    ]);
  });

  it("keeps the claim but drops the usage when a line is nested somewhere impossible", () => {
    // The claim still stands so its own children have somewhere to attach, and the error strip
    // is what says the line is wrong.
    const nested = parse("= T &t\n  = Nope &n");
    expect(nested.errors.map((e) => e.message)).toEqual([
      'A "=" thesis can\'t nest under a claim — argue about it with "+" or "-"',
    ]);
    expect(nested.doc.claims.map((c) => c.id)).toEqual(["t", "n"]);
    expect(nested.doc.theses).toHaveLength(1);

    expect(messages("? Q\n  + Pro")).toEqual([
      'A "+" line can\'t nest under a question — a question\'s answers are "=" theses',
    ]);
    expect(messages("+ Pro")).toContain(
      'A "+" line needs a claim above it to attach to — a document starts with "?" or "="',
    );
  });

  it("rejects a nested question, since Kialo has no sub-questions", () => {
    expect(messages("= T &t\n  ? Which broker?")).toEqual([
      'A "?" question can only sit at the top level — Kialo has no sub-questions',
    ]);
  });

  it("rejects a second thesis usage, which would mean two veracities for one claim", () => {
    expect(messages("? A &qa\n  =[1] T &t\n? B &qb\n  =[4] $t")).toEqual([
      "A claim can only be a thesis once — it would have two veracity scores",
    ]);
  });

  it("rejects a source with nothing to attach to", () => {
    expect(messages("@ https://e.example")).toEqual([
      'A "@" source needs a claim above it to attach to',
    ]);
  });

  it("rejects a `~` nested under another `~`, but not a sibling one", () => {
    expect(messages("= T\n  ~ first\n    ~ second")).toEqual([
      'A "~" note can\'t hang off another note',
    ]);
    expect(messages("= T\n  ~ first\n  ~ second")).toEqual([]);
  });

  it("takes a `~` with no claim above it as a note on the document", () => {
    const { doc, errors } = parse("~ about the map itself\n? Q &q1");
    expect(errors).toEqual([]);
    expect(doc.notes.map((n) => n.text)).toEqual(["about the map itself"]);
    expect(doc.claims.flatMap((c) => c.notes)).toEqual([]);
  });

  it("holds scores to 0-4 and to the perspective count", () => {
    expect(messages("%perspectives: [a, b]\n=[5,1] T")).toEqual(['Score "5" is out of range 0-4']);
    expect(messages("%perspectives: [a, b]\n=[1] T")).toEqual([
      "Expected 2 scores to match %perspectives, got 1",
    ]);
  });

  it("refuses an id in the renderer's `_` namespace, keeping the line", () => {
    const { doc, errors } = parse("%description: Topic\n= Thesis &_topic");
    expect(errors.map((e) => e.message)).toEqual([
      'An id can\'t start with "_" — the diagram reserves that prefix',
    ]);
    // The header box keeps `_topic` to itself, so the thesis is somewhere else entirely.
    expect(doc.claims).toMatchObject([{ id: "c1", text: "Thesis" }]);
    expect(doc.sourceLines[TOPIC_ID]).toEqual([1]);
  });

  it("reports duplicate ids, unknown references and unrecognized markers", () => {
    expect(messages("= A &x\n= B &x")).toContain('Duplicate id "&x"');
    expect(messages("= A &a\n  + $missing")).toContain('Unknown reference "$missing"');
    expect(messages("! nope")).toEqual(['Unrecognized marker "!" (expected ? = + - @ ~ % /)']);
  });

  it("says a question isn't voted on rather than folding the bracket into its text", () => {
    expect(messages("?[3] Q")).toEqual(["A question isn't voted on, so it can't carry scores"]);
  });

  it("parses the session-storage example cleanly, reusing one claim in three spots", () => {
    const { doc, errors } = parse(example);
    expect(errors).toEqual([]);
    expect(doc.arguments.filter((a) => a.claimId === "ops-cost")).toHaveLength(3);
  });

  it("matches the parsed-model snapshot for the session-storage example", () => {
    expect(parse(example).doc).toMatchSnapshot();
  });
});
