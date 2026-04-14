import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { oneDark } from "@codemirror/theme-one-dark";
import { buildMarkdownDecorations } from "./decorations";

export interface Editor {
  readonly view: EditorView;
  setContent(markdownText: string): void;
  getContent(): string;
  destroy(): void;
}

function detectDarkMode(): boolean {
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue("--bg-primary")
    .trim();
  return bg !== "#ffffff" && bg !== "#fff" && bg !== "";
}

export function createEditor(
  container: HTMLElement,
  onChange?: () => void,
): Editor {
  const isDark = detectDarkMode();

  const baseTheme = EditorView.theme({
    "&": {
      height: "100%",
      fontSize: "var(--font-size)",
      fontFamily: "var(--font-family)",
    },
    ".cm-scroller": {
      overflow: "auto",
      padding: "24px 40px",
    },
    ".cm-content": {
      maxWidth: "720px",
      margin: "0 auto",
      lineHeight: "1.8",
      caretColor: "var(--text-primary)",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--text-primary)",
    },
    ".cm-gutters": {
      display: "none",
    },
    ".cm-activeLine": {
      backgroundColor: "transparent",
    },
    ".cm-selectionBackground, .cm-focused .cm-selectionBackground": {
      backgroundColor: "var(--accent) !important",
      opacity: "0.3",
    },
    "&.cm-focused": {
      outline: "none",
    },
  });

  const extensions = [
    baseTheme,
    ...(isDark ? [oneDark] : []),
    markdown(),
    syntaxHighlighting(defaultHighlightStyle),
    history(),
    highlightSelectionMatches(),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
    buildMarkdownDecorations(),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && onChange) {
        onChange();
      }
    }),
  ];

  const state = EditorState.create({
    doc: "",
    extensions,
  });

  const view = new EditorView({
    state,
    parent: container,
  });

  function setContent(markdownText: string): void {
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: markdownText,
      },
    });
  }

  function getContent(): string {
    return view.state.doc.toString();
  }

  function destroy(): void {
    view.destroy();
  }

  return { view, setContent, getContent, destroy };
}
