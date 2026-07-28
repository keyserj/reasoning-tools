import { describe, expect, it } from "vitest";
import { ibis } from "../ontology/ibis/index.ts";
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
