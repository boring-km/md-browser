import {
  MarkdownSerializer,
  type MarkdownSerializerState,
} from "prosemirror-markdown";
import type { Node, Mark } from "prosemirror-model";

export const markdownSerializer = new MarkdownSerializer(
  {
    blockquote(state: MarkdownSerializerState, node: Node) {
      state.wrapBlock("> ", null, node, () => state.renderContent(node));
    },
    code_block(state: MarkdownSerializerState, node: Node) {
      state.write(`\`\`\`${node.attrs.language ?? ""}\n`);
      state.text(node.textContent, false);
      state.ensureNewLine();
      state.write("```");
      state.closeBlock(node);
    },
    heading(state: MarkdownSerializerState, node: Node) {
      state.write(`${"#".repeat(node.attrs.level)} `);
      state.renderInline(node);
      state.closeBlock(node);
    },
    horizontal_rule(state: MarkdownSerializerState, node: Node) {
      state.write(node.attrs.markup ?? "---");
      state.closeBlock(node);
    },
    bullet_list(state: MarkdownSerializerState, node: Node) {
      state.renderList(node, "  ", () => "- ");
    },
    ordered_list(state: MarkdownSerializerState, node: Node) {
      const start: number = node.attrs.order ?? 1;
      state.renderList(node, "  ", (i: number) => `${start + i}. `);
    },
    list_item(state: MarkdownSerializerState, node: Node) {
      state.renderContent(node);
    },
    paragraph(state: MarkdownSerializerState, node: Node) {
      state.renderInline(node);
      state.closeBlock(node);
    },
    image(state: MarkdownSerializerState, node: Node) {
      state.write(
        `![${state.esc(node.attrs.alt ?? "")}](${state.esc(node.attrs.src)}${
          node.attrs.title ? ` "${state.esc(node.attrs.title)}"` : ""
        })`,
      );
    },
    hard_break(state: MarkdownSerializerState) {
      state.write("  \n");
    },
    text(state: MarkdownSerializerState, node: Node) {
      state.text(node.text ?? "");
    },
  },
  {
    em: {
      open: "*",
      close: "*",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    strong: {
      open: "**",
      close: "**",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    link: {
      open(_state: MarkdownSerializerState, _mark: Mark) {
        return "[";
      },
      close(_state: MarkdownSerializerState, mark: Mark) {
        return `](${mark.attrs.href}${mark.attrs.title ? ` "${mark.attrs.title}"` : ""})`;
      },
      mixable: false,
    },
    code: {
      open() {
        return "`";
      },
      close() {
        return "`";
      },
      escape: false,
    },
    strikethrough: {
      open: "~~",
      close: "~~",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
  },
);
