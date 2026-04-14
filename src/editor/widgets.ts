import { WidgetType, Decoration, type EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type { Range } from "@codemirror/state";

// --- Mermaid diagram widget ---
let mermaidModule: typeof import("mermaid") | null = null;
let mermaidCounter = 0;

async function getMermaid() {
  if (!mermaidModule) {
    mermaidModule = await import("mermaid");
    const bg = getComputedStyle(document.documentElement)
      .getPropertyValue("--bg-primary").trim();
    const isDark = bg !== "#ffffff" && bg !== "#fff" && bg !== "";
    mermaidModule.default.initialize({
      startOnLoad: false,
      theme: isDark ? "dark" : "default",
      securityLevel: "strict",
    });
  }
  return mermaidModule.default;
}

class MermaidWidget extends WidgetType {
  private cancelled = false;

  constructor(private readonly code: string) {
    super();
  }

  eq(other: MermaidWidget): boolean {
    return this.code === other.code;
  }

  toDOM(): HTMLElement {
    const container = document.createElement("div");
    container.style.cssText =
      "padding: 16px; display: flex; justify-content: center; overflow-x: auto; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 0 0 6px 6px; margin-bottom: 8px;";
    container.textContent = "Loading diagram...";
    container.style.color = "var(--text-secondary)";
    container.style.fontSize = "12px";

    this.cancelled = false;
    const self = this;

    getMermaid().then(async (mermaid) => {
      if (self.cancelled) return;
      try {
        const id = `mermaid-w-${crypto.randomUUID()}`;
        const { svg } = await mermaid.render(id, self.code);
        if (self.cancelled) return;
        // Sanitize: parse as SVG and re-serialize to strip scripts
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svg, "image/svg+xml");
        svgDoc.querySelectorAll("script, foreignObject").forEach((el) => el.remove());
        container.innerHTML = "";
        const svgEl = svgDoc.documentElement;
        container.appendChild(document.importNode(svgEl, true));
        container.style.color = "";
        container.style.fontSize = "";
      } catch {
        if (!self.cancelled) {
          container.textContent = "다이어그램 구문 오류";
          container.style.color = "#e06c75";
          container.style.fontStyle = "italic";
        }
      }
    });

    return container;
  }

  destroy(): void {
    this.cancelled = true;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

// --- Image preview widget ---
class ImageWidget extends WidgetType {
  constructor(
    private readonly src: string,
    private readonly alt: string,
  ) {
    super();
  }

  eq(other: ImageWidget): boolean {
    return this.src === other.src;
  }

  toDOM(): HTMLElement {
    const SAFE_SRC = /^(https?:\/\/|data:image\/|\.\/|\.\.\/|\/)/i;
    if (!SAFE_SRC.test(this.src)) {
      const span = document.createElement("span");
      span.textContent = `[이미지: ${this.alt}]`;
      span.style.color = "var(--text-secondary)";
      return span;
    }
    const img = document.createElement("img");
    img.src = this.src;
    img.alt = this.alt;
    img.style.cssText =
      "max-width: 100%; border-radius: 4px; margin: 8px 0; display: block;";
    img.onerror = () => {
      img.style.display = "none";
    };
    return img;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

// --- Table render widget ---
class TableWidget extends WidgetType {
  constructor(private readonly markdown: string) {
    super();
  }

  eq(other: TableWidget): boolean {
    return this.markdown === other.markdown;
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "overflow-x: auto; margin: 8px 0;";

    const table = document.createElement("table");
    table.style.cssText =
      "border-collapse: collapse; width: 100%; font-size: 13px;";

    const lines = this.markdown.trim().split("\n");
    if (lines.length < 2) return wrapper;

    // Parse header
    const headerCells = parseTableRow(lines[0]);
    // Parse alignment from separator (line 1)
    const alignments = parseAlignments(lines[1]);
    // Parse body rows
    const bodyRows = lines.slice(2).map(parseTableRow);

    // Build thead
    const thead = document.createElement("thead");
    const headerTr = document.createElement("tr");
    for (let i = 0; i < headerCells.length; i++) {
      const th = document.createElement("th");
      th.textContent = headerCells[i];
      th.style.cssText =
        "border: 1px solid var(--border); padding: 6px 12px; background: var(--bg-secondary); font-weight: 600;";
      if (alignments[i]) th.style.textAlign = alignments[i]!;
      headerTr.appendChild(th);
    }
    thead.appendChild(headerTr);
    table.appendChild(thead);

    // Build tbody
    const tbody = document.createElement("tbody");
    for (const row of bodyRows) {
      const tr = document.createElement("tr");
      for (let i = 0; i < headerCells.length; i++) {
        const td = document.createElement("td");
        td.textContent = row[i] ?? "";
        td.style.cssText = "border: 1px solid var(--border); padding: 6px 12px;";
        if (alignments[i]) td.style.textAlign = alignments[i]!;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function parseTableRow(line: string): string[] {
  return line
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
}

function parseAlignments(line: string): (string | null)[] {
  return parseTableRow(line).map((cell) => {
    const trimmed = cell.trim();
    if (trimmed.startsWith(":") && trimmed.endsWith(":")) return "center";
    if (trimmed.endsWith(":")) return "right";
    return null;
  });
}

// --- Build widgets ---

function buildWidgets(view: EditorView): DecorationSet {
  const decos: Range<Decoration>[] = [];
  const tree = syntaxTree(view.state);
  const doc = view.state.doc;

  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter(node) {
      // Mermaid code blocks
      if (node.name === "FencedCode") {
        const firstLine = doc.lineAt(node.from);
        const info = firstLine.text.replace(/^```\s*/, "").trim();
        if (info === "mermaid") {
          // Extract code content (skip first and last lines)
          const startLine = doc.lineAt(node.from);
          const endLine = doc.lineAt(node.to);
          if (endLine.number > startLine.number + 1) {
            const codeStart = doc.line(startLine.number + 1).from;
            const codeEnd = doc.line(endLine.number - 1).to;
            const code = doc.sliceString(codeStart, codeEnd);
            if (code.trim()) {
              decos.push(
                Decoration.widget({
                  widget: new MermaidWidget(code.trim()),
                  side: 1,
                  block: true,
                }).range(node.to),
              );
            }
          }
        }
        return false;
      }

      // Images: ![alt](src)
      if (node.name === "Image") {
        const text = doc.sliceString(node.from, node.to);
        const match = text.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
        if (match) {
          decos.push(
            Decoration.widget({
              widget: new ImageWidget(match[2], match[1]),
              side: 1,
              block: true,
            }).range(node.to),
          );
        }
        return false;
      }

      // Tables
      if (node.name === "Table") {
        const tableText = doc.sliceString(node.from, node.to);
        if (!view.hasFocus || !cursorInRange(view, node.from, node.to)) {
          decos.push(
            Decoration.widget({
              widget: new TableWidget(tableText),
              side: 1,
              block: true,
            }).range(node.to),
          );
        }
        return false;
      }
    },
    });
  }

  return Decoration.set(decos, true);
}

function cursorInRange(view: EditorView, from: number, to: number): boolean {
  const sel = view.state.selection.main;
  return sel.head >= from && sel.head <= to;
}

export function buildWidgetDecorations(): ViewPlugin<{
  decorations: DecorationSet;
}> {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildWidgets(view);
      }

      update(update: ViewUpdate): void {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.selectionSet
        ) {
          this.decorations = buildWidgets(update.view);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );
}
