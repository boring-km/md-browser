import { MarkdownParser } from "prosemirror-markdown";
import markdownit from "markdown-it";
import { editorSchema } from "./schema";

const md = markdownit("commonmark", { html: true })
  .enable("strikethrough")
  .enable("table");

function listIsTight(tokens: readonly any[], i: number): boolean {
  while (++i < tokens.length) {
    if (tokens[i].type !== "list_item_open") return tokens[i].hidden;
  }
  return false;
}

export const markdownParser = new MarkdownParser(editorSchema, md, {
  blockquote: { block: "blockquote" },
  paragraph: { block: "paragraph" },
  list_item: { block: "list_item" },
  bullet_list: {
    block: "bullet_list",
    getAttrs: (_tok, tokens, i) => ({ tight: listIsTight(tokens, i) }),
  },
  ordered_list: {
    block: "ordered_list",
    getAttrs: (tok, tokens, i) => ({
      order: +(tok.attrGet("start") ?? 1),
      tight: listIsTight(tokens, i),
    }),
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

// Inject table token handlers directly into the parser.
// MarkdownParser's built-in token spec doesn't support the table structure
// (thead/tbody are wrappers that need to be transparent, not ignored),
// so we register handlers manually on the tokenHandlers object.
const h = (markdownParser as any).tokenHandlers as Record<
  string,
  (...args: any[]) => void
>;
const tableType = editorSchema.nodes.table;
const rowType = editorSchema.nodes.table_row;
const headerType = editorSchema.nodes.table_header;
const cellType = editorSchema.nodes.table_cell;

h.table_open = (state: any) => state.openNode(tableType, null);
h.table_close = (state: any) => state.closeNode();

// thead/tbody are transparent wrappers — just pass through
h.thead_open = () => {};
h.thead_close = () => {};
h.tbody_open = () => {};
h.tbody_close = () => {};

h.tr_open = (state: any) => state.openNode(rowType, null);
h.tr_close = (state: any) => state.closeNode();

h.th_open = (state: any, tok: any) => {
  const alignment =
    tok.attrGet("style")?.match(/text-align:\s*(\w+)/)?.[1] ?? null;
  state.openNode(headerType, { alignment });
};
h.th_close = (state: any) => state.closeNode();

h.td_open = (state: any, tok: any) => {
  const alignment =
    tok.attrGet("style")?.match(/text-align:\s*(\w+)/)?.[1] ?? null;
  state.openNode(cellType, { alignment });
};
h.td_close = (state: any) => state.closeNode();

const htmlBlockType = editorSchema.nodes.html_block;
const htmlInlineType = editorSchema.nodes.html_inline;

h.html_block = (state: any, tok: any) => {
  state.openNode(htmlBlockType);
  const content = (tok.content ?? "").replace(/\n$/, "");
  if (content) state.addText(content);
  state.closeNode();
};

h.html_inline = (state: any, tok: any) => {
  state.addNode(htmlInlineType, { html: tok.content ?? "" });
};
