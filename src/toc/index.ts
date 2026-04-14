import type { TocEntry } from "../types";
import type { EditorView } from "prosemirror-view";

let tocContentEl: HTMLElement | null = null;
let tocPanelEl: HTMLElement | null = null;
let editorViewRef: EditorView | null = null;
let cachedEntries: readonly TocEntry[] = [];
let scrollCleanup: (() => void) | null = null;

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
  cachedEntries = extractHeadings(view);
  renderToc(cachedEntries);
  setupScrollSpy();
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

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const item = document.createElement("div");
    item.className = "toc-item";
    item.setAttribute("data-toc-index", String(i));
    item.style.paddingLeft = `${12 + (entry.level - 1) * 16}px`;
    item.textContent = entry.text;
    item.addEventListener("click", () => {
      scrollToHeadingByIndex(i);
    });
    tocContentEl.appendChild(item);
  }
}

function setupScrollSpy(): void {
  if (scrollCleanup) scrollCleanup();

  const editorContainer = document.getElementById("editor-container");

  const onScroll = (): void => highlightFromEditor();
  editorContainer?.addEventListener("scroll", onScroll, { passive: true });

  scrollCleanup = () => {
    editorContainer?.removeEventListener("scroll", onScroll);
  };

  highlightFromEditor();
}

function highlightFromEditor(): void {
  const container = document.getElementById("editor-container");
  if (!container || !tocContentEl) return;

  const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
  if (headings.length === 0) return;

  const containerTop = container.getBoundingClientRect().top;
  let activeIndex = 0;

  for (let i = 0; i < headings.length; i++) {
    const rect = headings[i].getBoundingClientRect();
    if (rect.top - containerTop <= 8) {
      activeIndex = i;
    } else {
      break;
    }
  }

  setActiveTocItem(activeIndex);
}

function setActiveTocItem(index: number): void {
  if (!tocContentEl) return;
  const items = tocContentEl.querySelectorAll(".toc-item");
  items.forEach((el, i) => {
    el.classList.toggle("active", i === index);
  });
}

function scrollToHeadingByIndex(tocIndex: number): void {
  const container = document.getElementById("editor-container");
  if (!container) return;

  const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
  if (tocIndex < headings.length) {
    const el = headings[tocIndex] as HTMLElement;
    container.scrollTo({
      top: container.scrollTop + el.getBoundingClientRect().top - container.getBoundingClientRect().top,
      behavior: "smooth",
    });
    setActiveTocItem(tocIndex);
  }
}
