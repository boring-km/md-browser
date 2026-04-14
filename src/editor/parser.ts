import { MarkdownParser } from "prosemirror-markdown";
import markdownit from "markdown-it";
import { editorSchema } from "./schema";

const md = markdownit("commonmark", { html: false }).enable("strikethrough");

export const markdownParser = new MarkdownParser(editorSchema, md, {
  blockquote: { block: "blockquote" },
  paragraph: { block: "paragraph" },
  list_item: { block: "list_item" },
  bullet_list: { block: "bullet_list" },
  ordered_list: {
    block: "ordered_list",
    getAttrs: (tok) => ({ order: +(tok.attrGet("start") ?? 1) }),
  },
  heading: {
    block: "heading",
    getAttrs: (tok) => ({ level: +tok.tag.slice(1) }),
  },
  code_block: {
    block: "code_block",
    getAttrs: (tok) => ({ language: tok.info ?? "" }),
  },
  fence: {
    block: "code_block",
    getAttrs: (tok) => ({ language: tok.info ?? "" }),
  },
  hr: { node: "horizontal_rule" },
  image: {
    node: "image",
    getAttrs: (tok) => ({
      src: tok.attrGet("src"),
      title: tok.attrGet("title") ?? null,
      alt: tok.children?.[0]?.content ?? null,
    }),
  },
  hardbreak: { node: "hard_break" },
  em: { mark: "em" },
  strong: { mark: "strong" },
  link: {
    mark: "link",
    getAttrs: (tok) => ({
      href: tok.attrGet("href"),
      title: tok.attrGet("title") ?? null,
    }),
  },
  code_inline: { mark: "code" },
  s: { mark: "strikethrough" },
});
