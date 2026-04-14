import type { TocEntry } from "../types";
import type { EditorView } from "prosemirror-view";

let tocContentEl: HTMLElement | null = null;
let tocPanelEl: HTMLElement | null = null;
let editorViewRef: EditorView | null = null;

export function initToc(panel: HTMLElement, content: HTMLElement): void {
  tocPanelEl = panel;
  tocContentEl = content;
}

export function setEditorView(view: EditorView): void {
  editorViewRef = view;
}

export function toggleToc(): void {
  tocPanelEl?.classList.toggle("collapsed");
}

export function setTocVisible(visible: boolean): void {
  if (!tocPanelEl) return;
  if (visible) {
    tocPanelEl.classList.remove("collapsed");
  } else {
    tocPanelEl.classList.add("collapsed");
  }
}

export function updateToc(view: EditorView): void {
  const entries = extractHeadings(view);
  renderToc(entries);
}

function extractHeadings(view: EditorView): TocEntry[] {
  const entries: TocEntry[] = [];
  view.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      entries.push({
        level: node.attrs.level,
        text: node.textContent,
        pos,
      });
    }
  });
  return entries;
}

function renderToc(entries: readonly TocEntry[]): void {
  if (!tocContentEl) return;
  tocContentEl.innerHTML = "";

  for (const entry of entries) {
    const item = document.createElement("div");
    item.className = "toc-item";
    item.style.paddingLeft = `${12 + (entry.level - 1) * 16}px`;
    item.textContent = entry.text;
    item.addEventListener("click", () => {
      scrollToPos(entry.pos);
    });
    tocContentEl.appendChild(item);
  }
}

function scrollToPos(pos: number): void {
  if (!editorViewRef) return;
  const dom = editorViewRef.domAtPos(pos);
  if (dom.node instanceof HTMLElement) {
    dom.node.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (dom.node.parentElement) {
    dom.node.parentElement.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}
