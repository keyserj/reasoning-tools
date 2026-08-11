import { describe, expect, it } from "vitest";
import { shiftBlock } from "./indent.ts";

// Only the block transform: what it does to the textarea's selection needs a DOM, which the
// vitest setup here doesn't have (see AGENTS.md).
describe("shiftBlock", () => {
  it("indents every line it's given", () => {
    expect(shiftBlock("= One\n  < supports\n= Two", false)).toEqual({
      next: "  = One\n    < supports\n  = Two",
      firstDelta: 2,
    });
  });

  it("outdents by a whole indent", () => {
    expect(shiftBlock("  = One\n    < supports", true)).toEqual({
      next: "= One\n  < supports",
      firstDelta: -2,
    });
  });

  it("outdents a half indent by the one space it has", () => {
    expect(shiftBlock(" = One", true)).toEqual({ next: "= One", firstDelta: -1 });
  });

  // These two are about `next` alone: an unmoved block is how the caller knows to leave the
  // textarea alone, and `firstDelta` has nothing to say when nothing moved.
  it("hands back a block with nothing to give unchanged", () => {
    expect(shiftBlock("= One", true).next).toBe("= One");
  });

  it("moves each line by what that line can give, not by the first line's delta", () => {
    expect(shiftBlock("= One\n  = Two", true).next).toBe("= One\n= Two");
  });
});
