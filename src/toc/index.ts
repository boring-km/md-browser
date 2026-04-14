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

// --- Scroll Spy: highlight current heading in TOC ---

function setupScrollSpy(): void {
  if (scrollCleanup) scrollCleanup();

  const editorContainer = document.getElementById("editor-container");
  const rawEditor = document.getElementById("raw-editor");

  const onEditorScroll = (): void => highlightFromEditor();
  const onRawScroll = (): void => highlightFromRaw();

  editorContainer?.addEventListener("scroll", onEditorScroll, { passive: true });
  rawEditor?.addEventListener("scroll", onRawScroll, { passive: true });

  scrollCleanup = () => {
    editorContainer?.removeEventListener("scroll", onEditorScroll);
    rawEditor?.removeEventListener("scroll", onRawScroll);
  };

  // Initial highlight
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

function highlightFromRaw(): void {
  const rawEditor = document.getElementById("raw-editor") as HTMLTextAreaElement | null;
  if (!rawEditor || !tocContentEl) return;

  const text = rawEditor.value;
  const scrollRatio = rawEditor.scrollTop / (rawEditor.scrollHeight - rawEditor.clientHeight || 1);

  // Find heading lines in raw text
  const lines = text.split("\n");
  const headingLineIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i])) {
      headingLineIndices.push(i);
    }
  }

  if (headingLineIndices.length === 0) return;

  // Approximate which heading is at current scroll position
  const totalLines = lines.length;
  const currentLine = Math.floor(scrollRatio * totalLines);
  let activeIndex = 0;
  for (let i = 0; i < headingLineIndices.length; i++) {
    if (headingLineIndices[i] <= currentLine) {
      activeIndex = i;
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

// --- Scroll to heading ---

function scrollToHeadingByIndex(tocIndex: number): void {
  // Try editor container first
  const editorContainer = document.getElementById("editor-container");
  const rawEditor = document.getElementById("raw-editor") as HTMLTextAreaElement | null;

  const isRawVisible = rawEditor && !rawEditor.classList.contains("hidden");

  if (isRawVisible && rawEditor) {
    scrollToHeadingInRaw(rawEditor, tocIndex);
    return;
  }

  if (editorContainer) {
    scrollToHeadingInEditor(editorContainer, tocIndex);
  }
}

function scrollToHeadingInEditor(container: HTMLElement, tocIndex: number): void {
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

function scrollToHeadingInRaw(rawEditor: HTMLTextAreaElement, tocIndex: number): void {
  const text = rawEditor.value;
  const lines = text.split("\n");

  // Find heading lines
  let headingCount = 0;
  let targetLineStart = 0;
  let charCount = 0;

  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i])) {
      if (headingCount === tocIndex) {
        targetLineStart = charCount;
        break;
      }
      headingCount++;
    }
    charCount += lines[i].length + 1; // +1 for newline
  }

  // Estimate scroll position based on character offset ratio
  const ratio = targetLineStart / (text.length || 1);
  const scrollTarget = ratio * (rawEditor.scrollHeight - rawEditor.clientHeight);

  rawEditor.scrollTo({
    top: scrollTarget,
    behavior: "smooth",
  });

  setActiveTocItem(tocIndex);
}
