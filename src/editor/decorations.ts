import {
  ViewPlugin,
  Decoration,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import type { Range } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";

// --- Heading styles ---
const headingStyles: Record<string, string> = {
  "1": "font-size: 2em; font-weight: bold; line-height: 1.3;",
  "2": "font-size: 1.5em; font-weight: bold; line-height: 1.3;",
  "3": "font-size: 1.17em; font-weight: bold; line-height: 1.4;",
  "4": "font-size: 1em; font-weight: bold;",
  "5": "font-size: 0.83em; font-weight: bold;",
  "6": "font-size: 0.67em; font-weight: bold;",
};

// --- Hidden marker ---
const hideMark = Decoration.mark({
  attributes: {
    style:
      "font-size: 0; width: 0; display: inline-block; overflow: hidden;",
  },
});

// --- HR widget ---
class HrWidget extends WidgetType {
  toDOM(): HTMLElement {
    const el = document.createElement("hr");
    el.style.border = "none";
    el.style.borderTop = "2px solid var(--border)";
    el.style.margin = "1em 0";
    return el;
  }
}

function cursorOnLine(view: EditorView, from: number, to: number): boolean {
  const sel = view.state.selection.main;
  const lineFrom = view.state.doc.lineAt(from).number;
  const lineTo = view.state.doc.lineAt(to).number;
  const cursorLine = view.state.doc.lineAt(sel.head).number;
  return cursorLine >= lineFrom && cursorLine <= lineTo;
}

function buildDecorations(view: EditorView): DecorationSet {
  const decos: Range<Decoration>[] = [];
  const tree = syntaxTree(view.state);

  tree.iterate({
    enter(node) {
      // --- ATX Headings ---
      const headingMatch = node.name.match(/^ATXHeading(\d)$/);
      if (headingMatch) {
        const level = headingMatch[1];
        const style = headingStyles[level];
        if (style) {
          decos.push(
            Decoration.line({ attributes: { style } }).range(node.from, node.from),
          );
        }

        if (!cursorOnLine(view, node.from, node.to)) {
          const nodeObj = node.node;
          const firstChild = nodeObj.firstChild;
          if (firstChild && firstChild.name === "HeaderMark") {
            const hideEnd = Math.min(firstChild.to + 1, node.to);
            decos.push(hideMark.range(firstChild.from, hideEnd));
          }
        }
        // Skip children — heading content doesn't need further inline processing
        return false;
      }

      // --- Bold ---
      if (node.name === "StrongEmphasis") {
        decos.push(
          Decoration.mark({ attributes: { style: "font-weight: bold;" } }).range(
            node.from,
            node.to,
          ),
        );
        if (!cursorOnLine(view, node.from, node.to)) {
          decos.push(hideMark.range(node.from, node.from + 2));
          decos.push(hideMark.range(node.to - 2, node.to));
        }
        return false;
      }

      // --- Italic ---
      if (node.name === "Emphasis") {
        decos.push(
          Decoration.mark({ attributes: { style: "font-style: italic;" } }).range(
            node.from,
            node.to,
          ),
        );
        if (!cursorOnLine(view, node.from, node.to)) {
          decos.push(hideMark.range(node.from, node.from + 1));
          decos.push(hideMark.range(node.to - 1, node.to));
        }
        return false;
      }

      // --- Strikethrough ---
      if (node.name === "Strikethrough") {
        decos.push(
          Decoration.mark({
            attributes: {
              style: "text-decoration: line-through; color: var(--text-secondary);",
            },
          }).range(node.from, node.to),
        );
        if (!cursorOnLine(view, node.from, node.to)) {
          decos.push(hideMark.range(node.from, node.from + 2));
          decos.push(hideMark.range(node.to - 2, node.to));
        }
        return false;
      }

      // --- Inline code ---
      if (node.name === "InlineCode") {
        decos.push(
          Decoration.mark({
            attributes: {
              style:
                "background: var(--bg-secondary); padding: 2px 6px; border-radius: 3px; font-family: var(--code-font-family); font-size: 0.9em;",
            },
          }).range(node.from, node.to),
        );
        if (!cursorOnLine(view, node.from, node.to)) {
          decos.push(hideMark.range(node.from, node.from + 1));
          decos.push(hideMark.range(node.to - 1, node.to));
        }
        return false;
      }

      // --- Fenced code blocks ---
      if (node.name === "FencedCode") {
        const startLine = view.state.doc.lineAt(node.from);
        const endLine = view.state.doc.lineAt(node.to);
        for (let i = startLine.number; i <= endLine.number; i++) {
          const line = view.state.doc.line(i);
          decos.push(
            Decoration.line({
              attributes: {
                style:
                  "background: var(--bg-secondary); font-family: var(--code-font-family); font-size: 0.9em;",
              },
            }).range(line.from, line.from),
          );
        }
        return false;
      }

      // --- Blockquote ---
      if (node.name === "Blockquote") {
        const startLine = view.state.doc.lineAt(node.from);
        const endLine = view.state.doc.lineAt(node.to);
        for (let i = startLine.number; i <= endLine.number; i++) {
          const line = view.state.doc.line(i);
          decos.push(
            Decoration.line({
              attributes: {
                style:
                  "border-left: 4px solid var(--border); padding-left: 16px; color: var(--text-secondary);",
              },
            }).range(line.from, line.from),
          );
        }
        // Don't skip children — inline formatting inside blockquote should be decorated
      }

      // --- Links ---
      if (node.name === "Link") {
        decos.push(
          Decoration.mark({
            attributes: {
              style: "color: var(--accent); text-decoration: underline; cursor: pointer;",
            },
          }).range(node.from, node.to),
        );
        if (!cursorOnLine(view, node.from, node.to)) {
          const text = view.state.sliceDoc(node.from, node.to);
          const bracketIdx = text.indexOf("](");
          if (bracketIdx !== -1) {
            decos.push(hideMark.range(node.from, node.from + 1));
            decos.push(hideMark.range(node.from + bracketIdx, node.to));
          }
        }
        return false;
      }

      // --- Images ---
      if (node.name === "Image") {
        decos.push(
          Decoration.mark({
            attributes: { style: "color: var(--accent); font-style: italic;" },
          }).range(node.from, node.to),
        );
        return false;
      }

      // --- Horizontal rule ---
      if (node.name === "HorizontalRule") {
        const lineEnd = view.state.doc.lineAt(node.from).to;
        if (!cursorOnLine(view, node.from, node.to)) {
          decos.push(
            Decoration.line({
              attributes: {
                style: "font-size: 0; line-height: 0; overflow: hidden;",
              },
            }).range(node.from, node.from),
          );
          decos.push(
            Decoration.widget({ widget: new HrWidget(), side: 1 }).range(lineEnd),
          );
        } else {
          decos.push(
            Decoration.line({
              attributes: { style: "border-bottom: 2px solid var(--border);" },
            }).range(node.from, node.from),
          );
        }
        return false;
      }
    },
  });

  // Use Decoration.set with sort=true to handle out-of-order decorations
  return Decoration.set(decos, true);
}

export function buildMarkdownDecorations(): ViewPlugin<{
  decorations: DecorationSet;
}> {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: ViewUpdate): void {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.selectionSet
        ) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );
}
