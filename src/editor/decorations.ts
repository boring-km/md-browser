import {
  ViewPlugin,
  Decoration,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";

const headingStyles: Record<string, string> = {
  "1": "font-size: 2em; font-weight: bold; margin: 0.67em 0;",
  "2": "font-size: 1.5em; font-weight: bold; margin: 0.75em 0;",
  "3": "font-size: 1.17em; font-weight: bold; margin: 0.83em 0;",
  "4": "font-size: 1em; font-weight: bold; margin: 1em 0;",
  "5": "font-size: 0.83em; font-weight: bold; margin: 1.17em 0;",
  "6": "font-size: 0.67em; font-weight: bold; margin: 1.33em 0;",
};

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const tree = syntaxTree(view.state);

  tree.iterate({
    enter(node) {
      // ATXHeading1 ~ ATXHeading6
      const match = node.name.match(/^ATXHeading(\d)$/);
      if (match) {
        const level = match[1];
        const style = headingStyles[level];
        if (style) {
          builder.add(
            node.from,
            node.to,
            Decoration.line({ attributes: { style } }),
          );
        }
        return;
      }

      // Bold: StrongEmphasis
      if (node.name === "StrongEmphasis") {
        builder.add(
          node.from,
          node.to,
          Decoration.mark({ attributes: { style: "font-weight: bold;" } }),
        );
        return;
      }

      // Italic: Emphasis
      if (node.name === "Emphasis") {
        builder.add(
          node.from,
          node.to,
          Decoration.mark({ attributes: { style: "font-style: italic;" } }),
        );
        return;
      }

      // Strikethrough
      if (node.name === "Strikethrough") {
        builder.add(
          node.from,
          node.to,
          Decoration.mark({
            attributes: { style: "text-decoration: line-through;" },
          }),
        );
        return;
      }

      // Inline code
      if (node.name === "InlineCode") {
        builder.add(
          node.from,
          node.to,
          Decoration.mark({
            attributes: {
              style:
                "background: var(--bg-secondary); padding: 2px 6px; border-radius: 3px; font-family: var(--code-font-family); font-size: 0.9em;",
            },
          }),
        );
        return;
      }

      // Code blocks (FencedCode)
      if (node.name === "FencedCode") {
        builder.add(
          node.from,
          node.to,
          Decoration.mark({
            attributes: {
              style:
                "background: var(--bg-secondary); font-family: var(--code-font-family); font-size: 0.9em;",
            },
          }),
        );
        return;
      }

      // Blockquote
      if (node.name === "Blockquote") {
        builder.add(
          node.from,
          node.to,
          Decoration.mark({
            attributes: {
              style:
                "border-left: 4px solid var(--border); padding-left: 16px; color: var(--text-secondary);",
            },
          }),
        );
        return;
      }

      // Links
      if (node.name === "Link" || node.name === "URL") {
        builder.add(
          node.from,
          node.to,
          Decoration.mark({
            attributes: {
              style: "color: var(--accent); text-decoration: underline; cursor: pointer;",
            },
          }),
        );
        return;
      }

      // Horizontal rule
      if (node.name === "HorizontalRule") {
        builder.add(
          node.from,
          node.to,
          Decoration.line({
            attributes: {
              style: "border-bottom: 2px solid var(--border); margin: 1em 0;",
            },
          }),
        );
        return;
      }
    },
  });

  return builder.finish();
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
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );
}
