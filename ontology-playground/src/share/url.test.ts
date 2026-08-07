import { describe, expect, it } from "vitest";
import { ibis } from "../ontology/ibis/index.ts";
import { argMapTruthAndRelevance } from "../ontology/arg-map-truth-and-relevance/index.ts";
import { defaultExample, findExample } from "../ontology/examples.ts";
import { defaultFeatureState } from "../ontology/features.ts";
import { defaultOntologyId, getOntology } from "../ontology/registry.ts";
import { type ShareState, decodeState, encodeState } from "./url.ts";

const ibisExample = defaultExample(ibis);
const argMapExample = defaultExample(argMapTruthAndRelevance);

// Read from the registry so which ontology is the default stays that file's business.
const defaultOntology = getOntology(defaultOntologyId);
const defaultOntologyExample = defaultExample(defaultOntology);

const shared: ShareState = {
  ontologyId: ibis.id,
  exampleId: ibisExample.id,
  source: ibisExample.source,
  config: structuredClone(ibis.defaultConfig),
  features: defaultFeatureState(ibis),
};

describe("share/url", () => {
  it("round-trips a document", () => {
    expect(decodeState(encodeState(shared))).toEqual(shared);
  });

  it("round-trips a document in the other ontology, keeping its own node types", () => {
    const other: ShareState = {
      ontologyId: argMapTruthAndRelevance.id,
      exampleId: argMapExample.id,
      source: argMapExample.source,
      config: structuredClone(argMapTruthAndRelevance.defaultConfig),
      features: defaultFeatureState(argMapTruthAndRelevance),
    };
    expect(decodeState(encodeState(other))).toEqual(other);
  });

  it("round-trips a non-default feature option and param", () => {
    const other: ShareState = {
      ontologyId: argMapTruthAndRelevance.id,
      exampleId: argMapExample.id,
      source: argMapExample.source,
      config: structuredClone(argMapTruthAndRelevance.defaultConfig),
      features: {
        "edge-claims": { option: "implicit-on-edge", params: { "edge-display": "all-edges-same" } },
      },
    };
    expect(decodeState(encodeState(other))?.features).toEqual(other.features);
  });

  it("falls back to the default ontology's own first example for an unknown ontology id", () => {
    const decoded = decodeState(encodeState({ ...shared, ontologyId: "no-such-ontology" }));
    // Reinterpreting a foreign syntax would just be a wall of parse errors, so the source
    // is replaced rather than carried over.
    expect(decoded?.ontologyId).toBe(defaultOntology.id);
    expect(decoded?.source).toBe(defaultOntologyExample.source);
    expect(decoded?.exampleId).toBe(defaultOntologyExample.id);
  });

  it("returns null for a hash it cannot decode", () => {
    expect(decodeState("#not-a-real-hash")).toBeNull();
    expect(decodeState("")).toBeNull();
  });

  it("falls back to defaults for an invalid direction or color", () => {
    const bad = {
      ...shared,
      config: {
        ...shared.config,
        direction: "sideways",
        typeColors: { ...shared.config.typeColors, con: "red" },
      },
    };
    const decoded = decodeState(encodeState(bad as unknown as ShareState));
    expect(decoded?.config.direction).toBe(ibis.defaultConfig.direction);
    expect(decoded?.config.typeColors.con).toEqual(ibis.defaultConfig.typeColors.con);
  });

  it("falls back to feature defaults for an unknown feature, option or param", () => {
    const bad = {
      ...shared,
      ontologyId: argMapTruthAndRelevance.id,
      features: {
        // `edge-label` is a param the ontology used to declare and dropped, which is the
        // realest version of this case: a link someone saved before the rename.
        "edge-claims": { option: "no-such-option", params: { "edge-label": "no-such-value" } },
        "no-such-feature": { option: "whatever" },
      },
    };
    expect(decodeState(encodeState(bad as unknown as ShareState))?.features).toEqual(
      defaultFeatureState(argMapTruthAndRelevance),
    );
  });

  it("reads an example this ontology doesn't ship as Custom, keeping the source", () => {
    // Shared ids outlive any one ontology's writing of them, so "in the shared table" isn't
    // enough: claiming an example the ontology doesn't ship would select a pill the picker
    // renders as unavailable, and leave the document permanently un-dirty (no Reset, no draft
    // stashed). Normalising to null instead is what makes it read honestly as "Custom".
    const unshipped = "build-a-wall";
    expect(findExample(argMapTruthAndRelevance, unshipped)).toBeDefined();
    expect(findExample(ibis, unshipped)).toBeUndefined();

    const decoded = decodeState(encodeState({ ...shared, exampleId: unshipped }));
    expect(decoded?.exampleId).toBeNull();
    expect(decoded?.source).toBe(shared.source);
  });

  it("opens a link written before examples and features existed", () => {
    // The whole point of the catch-everything schema: an old hash has neither field.
    const old = { ontologyId: ibis.id, source: "? Old &q", config: ibis.defaultConfig };
    const decoded = decodeState(encodeState(old as unknown as ShareState));
    expect(decoded?.source).toBe("? Old &q");
    expect(decoded?.exampleId).toBeNull();
    expect(decoded?.features).toEqual(defaultFeatureState(ibis));
  });
});
