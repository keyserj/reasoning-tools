import { describe, expect, it } from "vitest";
import { ibis } from "../ontology/ibis/index.ts";
import { argMapTruthAndRelevance } from "../ontology/arg-map-truth-and-relevance/index.ts";
import { type DocState, decodeState, encodeState } from "./url.ts";

const doc: DocState = {
  ontologyId: ibis.id,
  source: ibis.sample,
  config: structuredClone(ibis.defaultConfig),
};

describe("share/url", () => {
  it("round-trips a document", () => {
    expect(decodeState(encodeState(doc))).toEqual(doc);
  });

  it("round-trips a document in a non-default ontology, keeping its own node types", () => {
    const other: DocState = {
      ontologyId: argMapTruthAndRelevance.id,
      source: argMapTruthAndRelevance.sample,
      config: structuredClone(argMapTruthAndRelevance.defaultConfig),
    };
    expect(decodeState(encodeState(other))).toEqual(other);
  });

  it("falls back to the default ontology's own sample for an unknown ontology id", () => {
    const decoded = decodeState(encodeState({ ...doc, ontologyId: "no-such-ontology" }));
    // Reinterpreting a foreign syntax would just be a wall of parse errors, so the source
    // is replaced rather than carried over.
    expect(decoded?.ontologyId).toBe(ibis.id);
    expect(decoded?.source).toBe(ibis.sample);
  });

  it("returns null for a hash it cannot decode", () => {
    expect(decodeState("#not-a-real-hash")).toBeNull();
    expect(decodeState("")).toBeNull();
  });

  it("falls back to defaults for an invalid direction or color", () => {
    const bad = {
      ...doc,
      config: {
        ...doc.config,
        direction: "sideways",
        types: { ...doc.config.types, con: { fill: "red", stroke: "red", color: "red" } },
      },
    };
    const decoded = decodeState(encodeState(bad as unknown as DocState));
    expect(decoded?.config.direction).toBe(ibis.defaultConfig.direction);
    expect(decoded?.config.types.con).toEqual(ibis.defaultConfig.types.con);
  });
});
