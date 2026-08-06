import { describe, expect, it } from "vitest";
import { defaultOntologyId, ontologies, ontologyList } from "./registry.ts";
import { EXAMPLE_LABELS } from "./examples.ts";
import { defaultFeatureState } from "./features.ts";

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

  it("ships at least one example, since examples[0] is what the app opens on", () => {
    expect(ontology.examples.length).toBeGreaterThan(0);
  });

  it("names its examples from the shared table, which is what makes them comparable", () => {
    for (const example of ontology.examples) {
      expect(Object.keys(EXAMPLE_LABELS)).toContain(example.id);
    }
    const ids = ontology.examples.map((e) => e.id);
    expect(ids).toEqual([...new Set(ids)]);
  });

  it("ships examples that parse without errors and render", () => {
    const features = defaultFeatureState(ontology);
    for (const example of ontology.examples) {
      const { doc, errors } = ontology.parse(example.source);
      expect({ id: example.id, errors }).toEqual({ id: example.id, errors: [] });
      expect(ontology.toMermaid(doc, ontology.defaultConfig, features)).toContain("flowchart");
    }
  });

  it("tokenizes every example line back into exactly that line", () => {
    // What EditorPane's overlay rests on: it lays tokens out in order over a transparent
    // textarea, so a tokenizer that drops or invents a character shifts every glyph after it
    // out from under the caret.
    for (const example of ontology.examples) {
      for (const line of example.source.split("\n")) {
        const tokens = ontology.highlightLine(line);
        expect({ id: example.id, line: tokens.map((t) => t.text).join("") }).toEqual({
          id: example.id,
          line,
        });
        expect(tokens.every((t) => t.text !== "")).toBe(true);
      }
    }
  });

  it("names a rendered node type on every `type` token, and only on those", () => {
    // The overlay colors a `type` token from `StyleConfig.types[typeId]`, which is keyed by
    // rendered node type, so a typo in a tokenizer would silently drop back to plain text.
    const typeIds = ontology.renderedNodeTypes.map((t) => t.id);
    for (const example of ontology.examples) {
      for (const line of example.source.split("\n")) {
        for (const token of ontology.highlightLine(line)) {
          if (token.kind === "type") expect(typeIds).toContain(token.typeId);
          else expect(token.typeId).toBeUndefined();
        }
      }
    }
  });

  it("gives every feature a default option that is one of its own", () => {
    for (const feature of ontology.features) {
      expect(feature.options.map((o) => o.id)).toContain(feature.defaultOption);
      for (const param of feature.params ?? []) {
        expect(param.options.map((o) => o.id)).toContain(param.defaultOption);
        for (const option of param.onlyForOptions ?? []) {
          expect(feature.options.map((o) => o.id)).toContain(option);
        }
      }
    }
  });
});

describe("registry", () => {
  it("has a default ontology that resolves", () => {
    expect(ontologies[defaultOntologyId]).toBeDefined();
  });
});
