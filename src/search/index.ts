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
  const input = searchBarEl.querySelector<HTMLInputElement>(".search-query");
  input?.focus();
}

export function showReplace(): void {
  if (!searchBarEl) return;
  searchBarEl.classList.remove("hidden");
  replaceRowEl?.classList.remove("hidden");
  const input = searchBarEl.querySelector<HTMLInputElement>(".search-query");
  input?.focus();
}

export function hideSearch(): void {
  searchBarEl?.classList.add("hidden");
  replaceRowEl?.classList.add("hidden");
  matches = [];
  currentMatchIndex = -1;
}

function buildSearchUI(): void {
  if (!searchBarEl) return;

  searchBarEl.innerHTML = `
    <input class="search-input search-query" placeholder="검색..." />
    <button class="search-btn case-btn" title="대소문자 구분">Aa</button>
    <button class="search-btn regex-btn" title="정규식">.*</button>
    <span class="search-info match-info">0/0</span>
    <button class="search-btn prev-btn" title="이전">\u2191</button>
    <button class="search-btn next-btn" title="다음">\u2193</button>
    <button class="search-btn replace-toggle-btn" title="치환 모드">\u21C4</button>
    <button class="search-btn close-search-btn" style="margin-left:auto" title="닫기">\u2715</button>
  `;

  replaceRowEl = document.createElement("div");
  replaceRowEl.className = "search-replace-row hidden";
  replaceRowEl.innerHTML = `
    <input class="search-input replace-input" placeholder="치환..." />
    <button class="search-btn replace-one-btn" title="치환">치환</button>
    <button class="search-btn replace-all-btn" title="전체 치환">전체</button>
  `;
  searchBarEl.parentElement?.insertBefore(
    replaceRowEl,
    searchBarEl.nextSibling,
  );

  const queryInput =
    searchBarEl.querySelector<HTMLInputElement>(".search-query")!;
  const caseBtn =
    searchBarEl.querySelector<HTMLButtonElement>(".case-btn")!;
  const regexBtn =
    searchBarEl.querySelector<HTMLButtonElement>(".regex-btn")!;
  const prevBtn =
    searchBarEl.querySelector<HTMLButtonElement>(".prev-btn")!;
  const nextBtn =
    searchBarEl.querySelector<HTMLButtonElement>(".next-btn")!;
  const replaceToggleBtn =
    searchBarEl.querySelector<HTMLButtonElement>(".replace-toggle-btn")!;
  const closeBtn =
    searchBarEl.querySelector<HTMLButtonElement>(".close-search-btn")!;
  const matchInfo =
    searchBarEl.querySelector<HTMLSpanElement>(".match-info")!;
  const replaceInput =
    replaceRowEl.querySelector<HTMLInputElement>(".replace-input")!;
  const replaceOneBtn =
    replaceRowEl.querySelector<HTMLButtonElement>(".replace-one-btn")!;
  const replaceAllBtn =
    replaceRowEl.querySelector<HTMLButtonElement>(".replace-all-btn")!;

  queryInput.addEventListener("input", () => {
    findMatches(queryInput.value);
    updateMatchInfo(matchInfo);
    highlightCurrent();
  });

  queryInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideSearch();
    if (e.key === "Enter") {
      if (e.shiftKey) goToPrev();
      else goToNext();
      updateMatchInfo(matchInfo);
    }
  });

  caseBtn.addEventListener("click", () => {
    caseSensitive = !caseSensitive;
    caseBtn.classList.toggle("active", caseSensitive);
    findMatches(queryInput.value);
    updateMatchInfo(matchInfo);
  });

  regexBtn.addEventListener("click", () => {
    useRegex = !useRegex;
    regexBtn.classList.toggle("active", useRegex);
    findMatches(queryInput.value);
    updateMatchInfo(matchInfo);
  });

  prevBtn.addEventListener("click", () => {
    goToPrev();
    updateMatchInfo(matchInfo);
  });
  nextBtn.addEventListener("click", () => {
    goToNext();
    updateMatchInfo(matchInfo);
  });
  closeBtn.addEventListener("click", () => hideSearch());

  replaceToggleBtn.addEventListener("click", () => {
    replaceRowEl?.classList.toggle("hidden");
  });

  replaceOneBtn.addEventListener("click", () => {
    replaceOne(replaceInput.value);
    findMatches(queryInput.value);
    updateMatchInfo(matchInfo);
  });

  replaceAllBtn.addEventListener("click", () => {
    replaceAll(queryInput.value, replaceInput.value);
    findMatches(queryInput.value);
    updateMatchInfo(matchInfo);
  });
}

function findMatches(query: string): void {
  matches = [];
  currentMatchIndex = -1;
  if (!view || !query) return;

  const text = view.state.doc.textContent;

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
      matches.push({
        from: match.index + 1,
        to: match.index + match[0].length + 1,
      });
      if (match[0].length === 0) break;
    }
  } catch {
    // invalid regex — ignore
  }

  if (matches.length > 0) currentMatchIndex = 0;
}

function updateMatchInfo(el: HTMLSpanElement): void {
  if (matches.length === 0) {
    el.textContent = "0/0";
  } else {
    el.textContent = `${currentMatchIndex + 1}/${matches.length}`;
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
  const tr = view.state.tr.replaceWith(
    match.from,
    match.to,
    view.state.schema.text(replaceText),
  );
  view.dispatch(tr);
}

function replaceAll(query: string, replaceText: string): void {
  if (!view || matches.length === 0) return;
  let tr = view.state.tr;
  let offset = 0;
  for (const match of matches) {
    const from = match.from + offset;
    const to = match.to + offset;
    tr = tr.replaceWith(from, to, view.state.schema.text(replaceText));
    offset += replaceText.length - (match.to - match.from);
  }
  view.dispatch(tr);
}
