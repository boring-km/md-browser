import { EditorView } from "prosemirror-view";
import { TextSelection } from "prosemirror-state";

interface SearchMatch {
  readonly from: number;
  readonly to: number;
}

let searchBarEl: HTMLElement | null = null;
let replaceRowEl: HTMLElement | null = null;
let view: EditorView | null = null;
let matches: SearchMatch[] = [];
let currentMatchIndex = -1;
let caseSensitive = false;
let useRegex = false;

let matchInfoEl: HTMLSpanElement | null = null;
let queryInputEl: HTMLInputElement | null = null;

export function initSearch(
  searchBar: HTMLElement,
  editorView: EditorView,
): void {
  searchBarEl = searchBar;
  view = editorView;
  buildSearchUI();
}

export function updateEditorView(editorView: EditorView): void {
  view = editorView;
}

export function showSearch(): void {
  if (!searchBarEl) return;
  searchBarEl.classList.remove("hidden");
  replaceRowEl?.classList.add("hidden");
  queryInputEl?.focus();
}

export function showReplace(): void {
  if (!searchBarEl) return;
  searchBarEl.classList.remove("hidden");
  replaceRowEl?.classList.remove("hidden");
  queryInputEl?.focus();
}

export function hideSearch(): void {
  searchBarEl?.classList.add("hidden");
  replaceRowEl?.classList.add("hidden");
  matches = [];
  currentMatchIndex = -1;
}

function createButton(
  className: string,
  text: string,
  title: string,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = `search-btn ${className}`;
  btn.textContent = text;
  btn.title = title;
  return btn;
}

function createInput(
  className: string,
  placeholder: string,
): HTMLInputElement {
  const input = document.createElement("input");
  input.className = `search-input ${className}`;
  input.placeholder = placeholder;
  return input;
}

function buildSearchUI(): void {
  if (!searchBarEl) return;
  searchBarEl.innerHTML = "";

  queryInputEl = createInput("search-query", "검색...");
  const caseBtn = createButton("case-btn", "Aa", "대소문자 구분");
  const regexBtn = createButton("regex-btn", ".*", "정규식");
  matchInfoEl = document.createElement("span");
  matchInfoEl.className = "search-info match-info";
  matchInfoEl.textContent = "0/0";
  const prevBtn = createButton("prev-btn", "\u2191", "이전");
  const nextBtn = createButton("next-btn", "\u2193", "다음");
  const replaceToggleBtn = createButton(
    "replace-toggle-btn",
    "\u21C4",
    "치환 모드",
  );
  const closeBtn = createButton("close-search-btn", "\u2715", "닫기");
  closeBtn.style.marginLeft = "auto";

  searchBarEl.appendChild(queryInputEl);
  searchBarEl.appendChild(caseBtn);
  searchBarEl.appendChild(regexBtn);
  searchBarEl.appendChild(matchInfoEl);
  searchBarEl.appendChild(prevBtn);
  searchBarEl.appendChild(nextBtn);
  searchBarEl.appendChild(replaceToggleBtn);
  searchBarEl.appendChild(closeBtn);

  // Replace row
  replaceRowEl = document.createElement("div");
  replaceRowEl.className = "search-replace-row hidden";
  const replaceInput = createInput("replace-input", "치환...");
  const replaceOneBtn = createButton("replace-one-btn", "치환", "치환");
  const replaceAllBtn = createButton(
    "replace-all-btn",
    "전체",
    "전체 치환",
  );
  replaceRowEl.appendChild(replaceInput);
  replaceRowEl.appendChild(replaceOneBtn);
  replaceRowEl.appendChild(replaceAllBtn);
  searchBarEl.parentElement?.insertBefore(
    replaceRowEl,
    searchBarEl.nextSibling,
  );

  // Events
  queryInputEl.addEventListener("input", () => {
    findMatches(queryInputEl!.value);
    updateMatchInfo();
    highlightCurrent();
  });

  queryInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideSearch();
    if (e.key === "Enter") {
      if (e.shiftKey) goToPrev();
      else goToNext();
      updateMatchInfo();
    }
  });

  caseBtn.addEventListener("click", () => {
    caseSensitive = !caseSensitive;
    caseBtn.classList.toggle("active", caseSensitive);
    findMatches(queryInputEl!.value);
    updateMatchInfo();
  });

  regexBtn.addEventListener("click", () => {
    useRegex = !useRegex;
    regexBtn.classList.toggle("active", useRegex);
    findMatches(queryInputEl!.value);
    updateMatchInfo();
  });

  prevBtn.addEventListener("click", () => {
    goToPrev();
    updateMatchInfo();
  });
  nextBtn.addEventListener("click", () => {
    goToNext();
    updateMatchInfo();
  });
  closeBtn.addEventListener("click", () => hideSearch());

  replaceToggleBtn.addEventListener("click", () => {
    replaceRowEl?.classList.toggle("hidden");
  });

  replaceOneBtn.addEventListener("click", () => {
    replaceOne(replaceInput.value);
    findMatches(queryInputEl!.value);
    updateMatchInfo();
  });

  replaceAllBtn.addEventListener("click", () => {
    replaceAll(replaceInput.value);
    findMatches(queryInputEl!.value);
    updateMatchInfo();
  });
}

interface TextChunk {
  readonly text: string;
  readonly pos: number;
}

function buildTextMap(): { text: string; chunks: TextChunk[] } {
  if (!view) return { text: "", chunks: [] };
  const chunks: TextChunk[] = [];
  let fullText = "";

  view.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      chunks.push({ text: node.text, pos });
      fullText += node.text;
    } else if (node.isBlock && fullText.length > 0) {
      chunks.push({ text: "\n", pos: -1 });
      fullText += "\n";
    }
  });

  return { text: fullText, chunks };
}

function textOffsetToDocPos(
  chunks: readonly TextChunk[],
  offset: number,
): number {
  let consumed = 0;
  for (const chunk of chunks) {
    if (chunk.pos === -1) {
      consumed += chunk.text.length;
      continue;
    }
    const chunkEnd = consumed + chunk.text.length;
    if (offset < chunkEnd) {
      return chunk.pos + (offset - consumed);
    }
    consumed = chunkEnd;
  }
  return view?.state.doc.content.size ?? 0;
}

function findMatches(query: string): void {
  matches = [];
  currentMatchIndex = -1;
  if (!view || !query) return;

  const { text, chunks } = buildTextMap();

  try {
    let pattern: RegExp;
    if (useRegex) {
      pattern = new RegExp(query, caseSensitive ? "g" : "gi");
    } else {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      pattern = new RegExp(escaped, caseSensitive ? "g" : "gi");
    }

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const from = textOffsetToDocPos(chunks, match.index);
      const to = textOffsetToDocPos(chunks, match.index + match[0].length);
      if (from < to) {
        matches.push({ from, to });
      }
      if (match[0].length === 0) break;
    }
  } catch {
    // invalid regex
  }

  if (matches.length > 0) currentMatchIndex = 0;
}

function updateMatchInfo(): void {
  if (!matchInfoEl) return;
  if (matches.length === 0) {
    matchInfoEl.textContent = "0/0";
  } else {
    matchInfoEl.textContent = `${currentMatchIndex + 1}/${matches.length}`;
  }
}

function goToNext(): void {
  if (matches.length === 0) return;
  currentMatchIndex = (currentMatchIndex + 1) % matches.length;
  highlightCurrent();
}

function goToPrev(): void {
  if (matches.length === 0) return;
  currentMatchIndex =
    (currentMatchIndex - 1 + matches.length) % matches.length;
  highlightCurrent();
}

function highlightCurrent(): void {
  if (!view || currentMatchIndex < 0 || currentMatchIndex >= matches.length)
    return;
  const match = matches[currentMatchIndex];
  const tr = view.state.tr.setSelection(
    TextSelection.create(view.state.doc, match.from, match.to),
  );
  view.dispatch(tr.scrollIntoView());
  view.focus();
}

function replaceOne(replaceText: string): void {
  if (!view || currentMatchIndex < 0 || currentMatchIndex >= matches.length)
    return;
  const match = matches[currentMatchIndex];
  let tr;
  if (replaceText === "") {
    tr = view.state.tr.delete(match.from, match.to);
  } else {
    tr = view.state.tr.replaceWith(
      match.from,
      match.to,
      view.state.schema.text(replaceText),
    );
  }
  view.dispatch(tr);
}

function replaceAll(replaceText: string): void {
  if (!view || matches.length === 0) return;
  let tr = view.state.tr;
  // Process in reverse order to avoid position invalidation
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    if (replaceText === "") {
      tr = tr.delete(match.from, match.to);
    } else {
      tr = tr.replaceWith(
        match.from,
        match.to,
        view.state.schema.text(replaceText),
      );
    }
  }
  view.dispatch(tr);
}
