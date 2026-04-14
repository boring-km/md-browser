import type { TocEntry } from "../types";

let tocContentEl: HTMLElement | null = null;
let tocPanelEl: HTMLElement | null = null;
let scrollCleanup: (() => void) | null = null;
let currentEntries: TocEntry[] = [];

export function initToc(panel: HTMLElement, content: HTMLElement): void {
  tocPanelEl = panel;
  tocContentEl = content;
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

export function updateTocFromSource(source: string): void {
  currentEntries = extractHeadingsFromSource(source);
  renderToc(currentEntries);
  setupScrollSpy();
}

function extractHeadingsFromSource(source: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const lines = source.split("\n");
  let pos = 0;
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      entries.push({
        level: match[1].length,
        text: match[2].trim(),
        pos,
      });
    }
    pos += line.length + 1;
  }
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

  const container = document.getElementById("editor-container");
  if (!container) return;

  // CodeMirror creates .cm-scroller inside the container
  const scroller =
    container.querySelector(".cm-scroller") ?? container;

  const onScroll = (): void => highlightCurrentHeading(scroller as HTMLElement);
  scroller.addEventListener("scroll", onScroll, { passive: true });

  scrollCleanup = () => {
    scroller.removeEventListener("scroll", onScroll);
  };

  highlightCurrentHeading(scroller as HTMLElement);
}

function highlightCurrentHeading(scroller: HTMLElement): void {
  if (!tocContentEl) return;

  // Find .cm-line elements that start with # (headings)
  const lines = scroller.querySelectorAll(".cm-line");
  const scrollerTop = scroller.getBoundingClientRect().top;
  let activeIndex = 0;
  let headingIdx = 0;

  for (const line of lines) {
    const text = line.textContent ?? "";
    if (/^#{1,6}\s/.test(text)) {
      const rect = line.getBoundingClientRect();
      if (rect.top - scrollerTop <= 8) {
        activeIndex = headingIdx;
      }
      headingIdx++;
    }
  }

  const items = tocContentEl.querySelectorAll(".toc-item");
  items.forEach((el, i) => {
    el.classList.toggle("active", i === activeIndex);
  });
}

function scrollToHeadingByIndex(tocIndex: number): void {
  const container = document.getElementById("editor-container");
  if (!container) return;

  const scroller =
    container.querySelector(".cm-scroller") ?? container;
  const lines = scroller.querySelectorAll(".cm-line");
  let headingIdx = 0;

  for (const line of lines) {
    const text = line.textContent ?? "";
    if (/^#{1,6}\s/.test(text)) {
      if (headingIdx === tocIndex) {
        const el = line as HTMLElement;
        const scrollerEl = scroller as HTMLElement;
        scrollerEl.scrollTo({
          top:
            scrollerEl.scrollTop +
            el.getBoundingClientRect().top -
            scrollerEl.getBoundingClientRect().top,
          behavior: "smooth",
        });

        const items = tocContentEl?.querySelectorAll(".toc-item");
        items?.forEach((item, i) => {
          item.classList.toggle("active", i === tocIndex);
        });
        return;
      }
      headingIdx++;
    }
  }
}
