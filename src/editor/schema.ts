import { Schema, type NodeSpec, type MarkSpec } from "prosemirror-model";

const nodes: Record<string, NodeSpec> = {
  doc: { content: "block+" },

  paragraph: {
    content: "inline*",
    group: "block",
    parseDOM: [{ tag: "p" }],
    toDOM() {
      return ["p", 0];
    },
  },

  heading: {
    attrs: { level: { default: 1 } },
    content: "inline*",
    group: "block",
    defining: true,
    parseDOM: [
      { tag: "h1", attrs: { level: 1 } },
      { tag: "h2", attrs: { level: 2 } },
      { tag: "h3", attrs: { level: 3 } },
      { tag: "h4", attrs: { level: 4 } },
      { tag: "h5", attrs: { level: 5 } },
      { tag: "h6", attrs: { level: 6 } },
    ],
    toDOM(node) {
      return [`h${node.attrs.level}`, 0];
    },
  },

  blockquote: {
    content: "block+",
    group: "block",
    defining: true,
    parseDOM: [{ tag: "blockquote" }],
    toDOM() {
      return ["blockquote", 0];
    },
  },

  code_block: {
    attrs: { language: { default: "" } },
    content: "text*",
    marks: "",
    group: "block",
    code: true,
    defining: true,
    parseDOM: [
      {
        tag: "pre",
        preserveWhitespace: "full" as const,
        getAttrs(node) {
          const el = node as HTMLElement;
          const code = el.querySelector("code");
          return {
            language: code?.className?.replace("language-", "") ?? "",
          };
        },
      },
    ],
    toDOM(node) {
      return [
        "pre",
        [
          "code",
          {
            class: node.attrs.language
              ? `language-${node.attrs.language}`
              : "",
          },
          0,
        ],
      ];
    },
  },

  bullet_list: {
    attrs: { tight: { default: false } },
    content: "list_item+",
    group: "block",
    parseDOM: [{ tag: "ul" }],
    toDOM() {
      return ["ul", 0];
    },
  },

  ordered_list: {
    attrs: { order: { default: 1 }, tight: { default: false } },
    content: "list_item+",
    group: "block",
    parseDOM: [
      {
        tag: "ol",
        getAttrs(node) {
          return {
            order: (node as HTMLElement).getAttribute("start") ?? 1,
          };
        },
      },
    ],
    toDOM(node) {
      return node.attrs.order === 1
        ? ["ol", 0]
        : ["ol", { start: node.attrs.order }, 0];
    },
  },

  list_item: {
    content: "paragraph block*",
    parseDOM: [{ tag: "li" }],
    toDOM() {
      return ["li", 0];
    },
    defining: true,
  },

  horizontal_rule: {
    group: "block",
    parseDOM: [{ tag: "hr" }],
    toDOM() {
      return ["hr"];
    },
  },

  image: {
    inline: true,
    attrs: {
      src: {},
      alt: { default: null },
      title: { default: null },
    },
    group: "inline",
    draggable: true,
    parseDOM: [
      {
        tag: "img[src]",
        getAttrs(node) {
          const el = node as HTMLElement;
          return {
            src: el.getAttribute("src"),
            alt: el.getAttribute("alt"),
            title: el.getAttribute("title"),
          };
        },
      },
    ],
    toDOM(node) {
      return [
        "img",
        {
          src: node.attrs.src,
          alt: node.attrs.alt,
          title: node.attrs.title,
        },
      ];
    },
  },

  table: {
    content: "table_row+",
    group: "block",
    tableRole: "table",
    isolating: true,
    parseDOM: [{ tag: "table" }],
    toDOM() {
      return ["table", ["tbody", 0]];
    },
  },

  table_row: {
    content: "(table_cell | table_header)*",
    tableRole: "row",
    parseDOM: [{ tag: "tr" }],
    toDOM() {
      return ["tr", 0];
    },
  },

  table_header: {
    content: "inline*",
    attrs: { alignment: { default: null } },
    tableRole: "header_cell",
    isolating: true,
    parseDOM: [
      {
        tag: "th",
        getAttrs(node) {
          const el = node as HTMLElement;
          return { alignment: el.style.textAlign || null };
        },
      },
    ],
    toDOM(node) {
      const attrs: Record<string, string> = {};
      if (node.attrs.alignment) {
        attrs.style = `text-align: ${node.attrs.alignment}`;
      }
      return ["th", attrs, 0];
    },
  },

  table_cell: {
    content: "inline*",
    attrs: { alignment: { default: null } },
    tableRole: "cell",
    isolating: true,
    parseDOM: [
      {
        tag: "td",
        getAttrs(node) {
          const el = node as HTMLElement;
          return { alignment: el.style.textAlign || null };
        },
      },
    ],
    toDOM(node) {
      const attrs: Record<string, string> = {};
      if (node.attrs.alignment) {
        attrs.style = `text-align: ${node.attrs.alignment}`;
      }
      return ["td", attrs, 0];
    },
  },

  hard_break: {
    inline: true,
    group: "inline",
    selectable: false,
    parseDOM: [{ tag: "br" }],
    toDOM() {
      return ["br"];
    },
  },

  html_block: {
    content: "text*",
    group: "block",
    code: true,
    defining: true,
    marks: "",
    parseDOM: [
      {
        tag: "pre.html-block",
        preserveWhitespace: "full" as const,
      },
    ],
    toDOM() {
      return ["pre", { class: "html-block" }, ["code", 0]];
    },
  },

  html_inline: {
    inline: true,
    group: "inline",
    atom: true,
    attrs: { html: { default: "" } },
    parseDOM: [
      {
        tag: "span.html-inline",
        getAttrs(node) {
          return { html: (node as HTMLElement).textContent ?? "" };
        },
      },
    ],
    toDOM(node) {
      return ["span", { class: "html-inline" }, node.attrs.html];
    },
  },

  text: { group: "inline" },
};

const marks: Record<string, MarkSpec> = {
  strong: {
    parseDOM: [
      { tag: "strong" },
      {
        tag: "b",
        getAttrs: (node) =>
          (node as HTMLElement).style.fontWeight !== "normal" && null,
      },
      { style: "font-weight=bold" },
      { style: "font-weight=700" },
    ],
    toDOM() {
      return ["strong", 0];
    },
  },

  em: {
    parseDOM: [{ tag: "i" }, { tag: "em" }, { style: "font-style=italic" }],
    toDOM() {
      return ["em", 0];
    },
  },

  code: {
    parseDOM: [{ tag: "code" }],
    toDOM() {
      return ["code", 0];
    },
  },

  link: {
    attrs: {
      href: {},
      title: { default: null },
    },
    inclusive: false,
    parseDOM: [
      {
        tag: "a[href]",
        getAttrs(node) {
          const el = node as HTMLElement;
          return {
            href: el.getAttribute("href"),
            title: el.getAttribute("title"),
          };
        },
      },
    ],
    toDOM(node) {
      return [
        "a",
        {
          href: node.attrs.href,
          title: node.attrs.title,
          rel: "noopener noreferrer",
        },
        0,
      ];
    },
  },

  strikethrough: {
    parseDOM: [
      { tag: "del" },
      { tag: "s" },
      { style: "text-decoration=line-through" },
    ],
    toDOM() {
      return ["del", 0];
    },
  },
};

export const editorSchema = new Schema({ nodes, marks });
