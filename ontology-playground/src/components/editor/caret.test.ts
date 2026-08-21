import { describe, expect, it } from "vitest";
import { lineAt, offsetOfLine } from "./caret.ts";

describe("lineAt", () => {
  it("counts from 1, as a parse error does", () => {
    expect(lineAt("= One\n  + Two", 0)).toBe(1);
    expect(lineAt("= One\n  + Two", 5)).toBe(1);
  });

  it("puts a caret just past a newline on the next line", () => {
    expect(lineAt("= One\n  + Two", 6)).toBe(2);
  });

  it("counts a blank line", () => {
    expect(lineAt("= One\n\n= Two", 7)).toBe(3);
  });

  it("counts the empty line a trailing newline leaves", () => {
    expect(lineAt("= One\n", 6)).toBe(2);
  });

  it("reads an offset past the end as the last line", () => {
    expect(lineAt("= One\n= Two", 99)).toBe(2);
  });
});

describe("offsetOfLine", () => {
  it("finds where each line starts", () => {
    expect(offsetOfLine("= One\n  + Two", 1)).toBe(0);
    expect(offsetOfLine("= One\n  + Two", 2)).toBe(6);
  });

  it("lands on a blank line rather than skipping it", () => {
    expect(offsetOfLine("= One\n\n= Two", 2)).toBe(6);
  });

  it("clamps a line past the end to the end of the text", () => {
    expect(offsetOfLine("= One", 9)).toBe(5);
  });

  it("round-trips with lineAt", () => {
    const text = "%description: D\n\n? Q &q\n  = T &t\n";
    for (let line = 1; line <= text.split("\n").length; line++) {
      expect(lineAt(text, offsetOfLine(text, line))).toBe(line);
    }
  });
});
