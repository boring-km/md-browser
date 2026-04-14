import { EditorView } from "prosemirror-view";
import { invoke } from "@tauri-apps/api/core";
import { editorSchema } from "./schema";

export function setupImageHandler(
  view: EditorView,
  getDocDir: () => string | null,
): () => void {
  const controller = new AbortController();
  const { signal } = controller;

  view.dom.addEventListener(
    "paste",
    (event: Event) => {
      handlePaste(view, event as ClipboardEvent, getDocDir);
    },
    { signal },
  );

  view.dom.addEventListener(
    "drop",
    (event: Event) => {
      handleDrop(view, event as DragEvent, getDocDir);
    },
    { signal },
  );

  return () => controller.abort();
}

async function handlePaste(
  view: EditorView,
  event: ClipboardEvent,
  getDocDir: () => string | null,
): Promise<void> {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (const item of Array.from(items)) {
    if (item.type.startsWith("image/")) {
      event.preventDefault();
      const blob = item.getAsFile();
      if (!blob) continue;
      const buffer = await blob.arrayBuffer();
      const data = Array.from(new Uint8Array(buffer));
      const docDir = getDocDir();
      if (!docDir) return;

      const relativePath: string = await invoke("save_image_to_assets", {
        docDir,
        imageData: data,
        originalName: null,
      });

      insertImage(view, relativePath);
      return;
    }
  }
}

async function handleDrop(
  view: EditorView,
  event: DragEvent,
  getDocDir: () => string | null,
): Promise<void> {
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;

  for (const file of Array.from(files)) {
    if (!file.type.startsWith("image/")) continue;
    event.preventDefault();
    const buffer = await file.arrayBuffer();
    const data = Array.from(new Uint8Array(buffer));
    const docDir = getDocDir();
    if (!docDir) return;

    const relativePath: string = await invoke("save_image_to_assets", {
      docDir,
      imageData: data,
      originalName: file.name,
    });

    insertImage(view, relativePath);
  }
}

function insertImage(view: EditorView, src: string): void {
  const node = editorSchema.nodes.image.create({ src, alt: "", title: null });
  const tr = view.state.tr.replaceSelectionWith(node);
  view.dispatch(tr);
}
