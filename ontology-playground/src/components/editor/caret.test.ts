import { describe, expect, it } from "vitest";
import { lineAt } from "./caret.ts";

describe("lineAt", () => {
  it("counts from 1, as a parse error does", () => {
    expect(lineAt("= One\n  + Two", 0)).toBe(1);
    expect(lineAt("= One\n  + Two", 5)).toBe(1);
  });

  // The newline belongs to the line it ends: a caret just past it is already on the next one,
  // which is where the textarea draws it.
  it("puts a caret just past a newline on the next line", () => {
    expect(lineAt("= One\n  + Two", 6)).toBe(2);
  });

  it("counts a blank line", () => {
    expect(lineAt("= One\n\n= Two", 7)).toBe(3);
  });

  // A source ending in a newline leaves a real empty line the caret can sit on, and the overlay
  // draws a row for it.
  it("counts the empty line a trailing newline leaves", () => {
    expect(lineAt("= One\n", 6)).toBe(2);
  });

  it("reads an offset past the end as the last line", () => {
    expect(lineAt("= One\n= Two", 99)).toBe(2);
  });
});
