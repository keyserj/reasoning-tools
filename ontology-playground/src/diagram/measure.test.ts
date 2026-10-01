import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Vitest runs without a DOM, so the document is a stand-in that sizes text at 8px a character.

let created = 0;

function element() {
  created++;
  return {
    className: "",
    textContent: "",
    style: { cssText: "" },
    setAttribute() {},
    append() {},
    replaceChildren() {},
    getBoundingClientRect() {
      return { width: this.textContent.length * 8, height: 24 };
    },
  };
}

beforeEach(() => {
  created = 0;
  vi.resetModules();
  vi.stubGlobal("document", { createElement: element, body: { append() {} } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("measureLabels", () => {
  it("measures each new text once, in the order asked", async () => {
    const { measureLabels } = await import("./measure.ts");
    expect(measureLabels(["ab", "abcd", "ab"])).toEqual([
      { width: 16, height: 24 },
      { width: 32, height: 24 },
      { width: 16, height: 24 },
    ]);
    const before = created;
    measureLabels(["abcd", "ab"]);
    expect(created).toBe(before);
  });

  it("still answers for cached texts in the call that fills the cache", async () => {
    const { measureLabels } = await import("./measure.ts");
    measureLabels(Array.from({ length: 4999 }, (_, i) => `typed ${i}`));
    expect(measureLabels(["typed 0", "new a", "new b"])).toEqual([
      { width: 56, height: 24 },
      { width: 40, height: 24 },
      { width: 40, height: 24 },
    ]);
  });
});
