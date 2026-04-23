import { describe, it, expect } from "vitest";
import { editorSchema } from "../schema";

describe("editor schema smoke", () => {
  it("exposes core nodes", () => {
    expect(editorSchema.nodes.doc).toBeDefined();
    expect(editorSchema.nodes.paragraph).toBeDefined();
    expect(editorSchema.nodes.heading).toBeDefined();
  });
});
