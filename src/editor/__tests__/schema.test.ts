import { describe, it, expect } from "vitest";
import { editorSchema } from "../schema";

describe("html nodes in schema", () => {
  it("defines html_block as block group with text content", () => {
    const node = editorSchema.nodes.html_block;
    expect(node).toBeDefined();
    expect(node.spec.group).toBe("block");
    expect(node.spec.code).toBe(true);
    expect(node.spec.marks).toBe("");
  });

  it("defines html_inline as inline atom with html attr", () => {
    const node = editorSchema.nodes.html_inline;
    expect(node).toBeDefined();
    expect(node.spec.inline).toBe(true);
    expect(node.spec.atom).toBe(true);
    expect(node.spec.group).toBe("inline");
    const created = node.create({ html: "<sub>x</sub>" });
    expect(created.attrs.html).toBe("<sub>x</sub>");
  });
});
