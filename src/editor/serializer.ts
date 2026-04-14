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
    table(state: MarkdownSerializerState, node: Node) {
      serializeTable(state, node);
    },
    table_row() {
      // handled by table serializer
    },
    table_header(state: MarkdownSerializerState, node: Node) {
      state.renderInline(node);
    },
    table_cell(state: MarkdownSerializerState, node: Node) {
      state.renderInline(node);
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

function getCellText(cell: Node): string {
  return cell.textContent.trim();
}

function serializeTable(state: MarkdownSerializerState, node: Node): void {
  const rows: Node[] = [];
  node.forEach((row) => rows.push(row));
  if (rows.length === 0) return;

  const headerRow = rows[0];
  const colCount = headerRow.childCount;

  // Compute column widths
  const widths: number[] = [];
  for (let c = 0; c < colCount; c++) {
    let maxW = 3; // minimum "---"
    for (const row of rows) {
      if (c < row.childCount) {
        maxW = Math.max(maxW, getCellText(row.child(c)).length);
      }
    }
    widths.push(maxW);
  }

  // Collect alignments from header cells
  const alignments: (string | null)[] = [];
  for (let c = 0; c < colCount; c++) {
    alignments.push(headerRow.child(c).attrs.alignment ?? null);
  }

  // Render header
  const headerCells: string[] = [];
  for (let c = 0; c < colCount; c++) {
    headerCells.push(` ${getCellText(headerRow.child(c)).padEnd(widths[c])} `);
  }
  state.write(`|${headerCells.join("|")}|`);
  state.ensureNewLine();

  // Render separator
  const sepCells: string[] = [];
  for (let c = 0; c < colCount; c++) {
    const w = widths[c];
    const align = alignments[c];
    if (align === "center") {
      sepCells.push(`:${"-".repeat(w)}:`);
    } else if (align === "right") {
      sepCells.push(` ${"-".repeat(w)}:`);
    } else {
      sepCells.push(` ${"-".repeat(w)} `);
    }
  }
  state.write(`|${sepCells.join("|")}|`);
  state.ensureNewLine();

  // Render body rows
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const cells: string[] = [];
    for (let c = 0; c < colCount; c++) {
      const text = c < row.childCount ? getCellText(row.child(c)) : "";
      cells.push(` ${text.padEnd(widths[c])} `);
    }
    state.write(`|${cells.join("|")}|`);
    state.ensureNewLine();
  }

  state.closeBlock(node);
}
