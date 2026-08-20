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
    expect(Object.keys(ontology.defaultConfig.typeColors).sort()).toEqual([...typeIds].sort());
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
      expect(ontology.toMermaid(doc, ontology.defaultConfig, features, "light").text).toContain(
        "flowchart",
      );
    }
  });

  // The linking contract, which no one ontology can keep on its own: an ontology that forgets to
  // put `lines` on what it draws loses editor↔diagram linking silently, with nothing else failing.
  it("maps every example's drawn elements back to lines that exist", () => {
    const features = defaultFeatureState(ontology);
    for (const example of ontology.examples) {
      const { doc } = ontology.parse(example.source);
      const { text, sourceMap } = ontology.toMermaid(
        doc,
        ontology.defaultConfig,
        features,
        "light",
      );
      const lineCount = example.source.split("\n").length;
      const entries = [...Object.entries(sourceMap.nodes), ...Object.entries(sourceMap.edges)];

      for (const [key, lines] of entries) {
        const outOfRange = lines.filter((line) => line < 1 || line > lineCount);
        expect({ id: example.id, key, outOfRange }).toEqual({
          id: example.id,
          key,
          outOfRange: [],
        });
      }

      // Both directions: a key nothing answers to, and a box nothing maps. Nodes are `  <id><shape opener>`.
      const drawn = [...text.matchAll(/^ {2}([A-Za-z0-9_]+)[[({]/gm)].map((m) => m[1]);
      expect({ id: example.id, mapped: Object.keys(sourceMap.nodes).sort() }).toEqual({
        id: example.id,
        mapped: drawn.sort(),
      });
      for (const id of Object.keys(sourceMap.edges)) {
        expect({ id: example.id, drawn: text.includes(`${id}@`) }).toEqual({
          id: example.id,
          drawn: true,
        });
      }
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
    // The overlay colors a `type` token from `StyleConfig.typeColors[typeId]`, which is keyed by
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
