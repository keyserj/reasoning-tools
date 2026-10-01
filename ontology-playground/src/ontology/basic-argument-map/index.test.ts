import { describe, expect, it } from "vitest";
import { type ShareState, decodeState, encodeState } from "../../share/url.ts";
import { basicArgumentMap } from "./index.ts";

describe("Basic argument map", () => {
  it("advertises exactly Claim, Support, Critique, and the shared Note type", () => {
    expect(basicArgumentMap.renderedNodeTypes.map((type) => type.label)).toEqual([
      "Claim",
      "Support",
      "Critique",
      "Note",
    ]);
    expect(basicArgumentMap.legend.map((entry) => entry.marker)).not.toContain("?");
    expect(basicArgumentMap.parse(basicArgumentMap.placeholder).errors).toEqual([]);
    expect(basicArgumentMap.features).toEqual([]);
  });

  it("round-trips its example and custom styling in a shared URL", () => {
    const example = basicArgumentMap.examples[0];
    const state: ShareState = {
      ontologyId: basicArgumentMap.id,
      exampleId: example.id,
      source: example.source,
      config: {
        direction: "LR",
        showIcons: false,
        typeColors: {
          claim: "#ab1234",
          support: "#1234ab",
          critique: "#789abc",
          note: "#bada55",
        },
      },
      features: {},
    };
    expect(decodeState(encodeState(state))).toEqual(state);
  });
});
