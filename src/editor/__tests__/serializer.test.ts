import { describe, it, expect } from "vitest";
import { editorSchema } from "../schema";
import { markdownSerializer } from "../serializer";

const { nodes, marks } = editorSchema;

describe("serializer basic nodes", () => {
  it("serializes heading", () => {
    const doc = nodes.doc.create(null, [
      nodes.heading.create({ level: 2 }, editorSchema.text("Sub")),
    ]);
    expect(markdownSerializer.serialize(doc)).toBe("## Sub");
  });

  it("serializes paragraph with strong", () => {
    const strong = marks.strong.create();
    const doc = nodes.doc.create(null, [
      nodes.paragraph.create(null, [
        editorSchema.text("Hello "),
        editorSchema.text("bold", [strong]),
      ]),
    ]);
    expect(markdownSerializer.serialize(doc)).toBe("Hello **bold**");
  });
});

describe("serializer html nodes", () => {
  it("serializes html_block by writing its text content", () => {
    const doc = nodes.doc.create(null, [
      nodes.html_block.create(
        null,
        editorSchema.text("<div class=\"note\">hi</div>"),
      ),
    ]);
    expect(markdownSerializer.serialize(doc)).toBe(
      "<div class=\"note\">hi</div>",
    );
  });

  it("serializes html_inline by writing its html attr", () => {
    const doc = nodes.doc.create(null, [
      nodes.paragraph.create(null, [
        editorSchema.text("text "),
        nodes.html_inline.create({ html: "<sub>" }),
        editorSchema.text("x"),
        nodes.html_inline.create({ html: "</sub>" }),
        editorSchema.text(" more"),
      ]),
    ]);
    expect(markdownSerializer.serialize(doc)).toBe("text <sub>x</sub> more");
  });
});
