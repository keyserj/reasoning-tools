import { describe, expect, it } from "vitest";
import { nodeKeyOf } from "./diagramTargets.ts";

// Only the id parsing: the rest of the module walks an SVG, which needs a DOM the vitest setup
// here doesn't have (see AGENTS.md).
describe("nodeKeyOf", () => {
  it("takes the key out from between mermaid's prefix and its render counter", () => {
    expect(nodeKeyOf("mmd-7-flowchart-redis-3", "mmd-7")).toBe("redis");
  });

  it("keeps an underscore, which a sanitized id may hold", () => {
    expect(nodeKeyOf("mmd-7-flowchart-ops_cost-12", "mmd-7")).toBe("ops_cost");
  });

  it("keeps the leading underscore of a rendered-only id", () => {
    expect(nodeKeyOf("mmd-7-flowchart-_topic-0", "mmd-7")).toBe("_topic");
  });

  it("reads nothing off an id from another diagram, or off other chrome", () => {
    expect(nodeKeyOf("mmd-8-flowchart-redis-3", "mmd-7")).toBeNull();
    expect(nodeKeyOf("mmd-7-L_a_b_0", "mmd-7")).toBeNull();
  });
});
