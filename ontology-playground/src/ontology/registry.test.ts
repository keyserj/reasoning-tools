import { describe, expect, it } from "vitest";
import { defaultOntologyId, ontologies, ontologyList } from "./registry.ts";

// Invariants the UI shell and src/share/url.ts assume of *every* registered ontology, so a
// new one can't quietly break them.
describe.each(ontologyList.map((o) => [o.label, o] as const))("%s", (_label, ontology) => {
  it("is registered under its own id", () => {
    expect(ontologies[ontology.id]).toBe(ontology);
  });

  it("has unique legend markers, which Legend.tsx uses as React keys", () => {
    const markers = ontology.legend.map((e) => e.marker);
    expect(markers).toEqual([...new Set(markers)]);
  });

  it("styles exactly its own node types by default, which url.ts's schema is built from", () => {
    const typeIds = ontology.renderedNodeTypes.map((t) => t.id);
    expect(Object.keys(ontology.defaultConfig.types).sort()).toEqual([...typeIds].sort());
  });

  it("declares at least one node type, so a config schema can be built", () => {
    expect(ontology.renderedNodeTypes.length).toBeGreaterThan(0);
  });

  it("ships a sample that parses without errors", () => {
    expect(ontology.parse(ontology.sample).errors).toEqual([]);
  });
});

describe("registry", () => {
  it("has a default ontology that resolves", () => {
    expect(ontologies[defaultOntologyId]).toBeDefined();
  });
});
