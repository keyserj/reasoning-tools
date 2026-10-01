import { describe, expect, it } from "vitest";
import { type ShareState, decodeState, encodeState } from "../../share/url.ts";
import { argMapBasic } from "./index.ts";

describe("Arg map: basic", () => {
  it("advertises exactly Claim, Support, Critique, and the shared Note type", () => {
    expect(argMapBasic.renderedNodeTypes.map((type) => type.label)).toEqual([
      "Claim",
      "Support",
      "Critique",
      "Note",
    ]);
    expect(argMapBasic.legend.map((entry) => entry.marker)).not.toContain("?");
    expect(argMapBasic.parse(argMapBasic.placeholder).errors).toEqual([]);
    expect(argMapBasic.features).toEqual([]);
  });

  it("round-trips its example and custom styling in a shared URL", () => {
    const example = argMapBasic.examples[0];
    const state: ShareState = {
      ontologyId: argMapBasic.id,
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
