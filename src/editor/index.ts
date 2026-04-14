import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { editorSchema } from "./schema";
import { markdownParser } from "./parser";
import { markdownSerializer } from "./serializer";
import { buildPlugins } from "./plugins";
import { renderMermaidBlocks } from "./mermaid-view";

export interface Editor {
  readonly view: EditorView;
  setContent(markdown: string): void;
  getContent(): string;
  destroy(): void;
}

let suppressChange = false;

export function createEditor(
  container: HTMLElement,
  onChange?: () => void,
): Editor {
  const doc = editorSchema.nodes.doc.create(null, [
    editorSchema.nodes.paragraph.create(),
  ]);

  const state = EditorState.create({
    doc,
    plugins: [...buildPlugins()],
  });

  const view = new EditorView(container, {
    state,
    editable: () => false,
    dispatchTransaction(transaction) {
      const newState = view.state.apply(transaction);
      view.updateState(newState);
      if (transaction.docChanged && !suppressChange) {
        suppressChange = true;
        renderMermaidBlocks(container);
        suppressChange = false;
      }
    },
  });

  function setContent(markdown: string): void {
    const parsed = markdownParser.parse(markdown);
    if (!parsed) return;
    const newState = EditorState.create({
      doc: parsed,
      plugins: [...buildPlugins()],
    });
    view.updateState(newState);
    suppressChange = true;
    renderMermaidBlocks(container);
    suppressChange = false;
  }

  function getContent(): string {
    return markdownSerializer.serialize(view.state.doc);
  }

  function destroy(): void {
    view.destroy();
  }

  return { view, setContent, getContent, destroy };
}

export { editorSchema } from "./schema";
export { markdownParser } from "./parser";
export { markdownSerializer } from "./serializer";
