import { describe, it, expect } from "vitest";
import { markdownParser } from "../parser";

function parse(md: string) {
  const doc = markdownParser.parse(md);
  if (!doc) throw new Error("parse returned null");
  return doc;
}

describe("parser basic nodes", () => {
  it("parses heading", () => {
    const doc = parse("# Title");
    const h = doc.firstChild!;
    expect(h.type.name).toBe("heading");
    expect(h.attrs.level).toBe(1);
    expect(h.textContent).toBe("Title");
  });

  it("parses paragraph with emphasis", () => {
    const doc = parse("Hello **bold** world");
    const p = doc.firstChild!;
    expect(p.type.name).toBe("paragraph");
    expect(p.textContent).toBe("Hello bold world");
  });

  it("parses fenced code block", () => {
    const doc = parse("```js\nconst x = 1;\n```");
    const cb = doc.firstChild!;
    expect(cb.type.name).toBe("code_block");
    expect(cb.attrs.language).toBe("js");
    expect(cb.textContent).toBe("const x = 1;");
  });
});

describe("parser html nodes", () => {
  it("parses html block as html_block node", () => {
    const doc = parse("<div class=\"note\">hello</div>");
    const first = doc.firstChild!;
    expect(first.type.name).toBe("html_block");
    expect(first.textContent).toContain("<div");
    expect(first.textContent).toContain("hello");
  });

  it("parses inline html as html_inline atom inside paragraph", () => {
    const doc = parse("text <sub>x</sub> more");
    const p = doc.firstChild!;
    expect(p.type.name).toBe("paragraph");
    const types: string[] = [];
    p.forEach((c) => types.push(c.type.name));
    expect(types).toContain("html_inline");
    const htmlTags: string[] = [];
    p.forEach((c) => {
      if (c.type.name === "html_inline") htmlTags.push(c.attrs.html);
    });
    expect(htmlTags).toEqual(["<sub>", "</sub>"]);
  });
});
