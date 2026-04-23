# ProseMirror WYSIWYG 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ProseMirror 에디터를 `editable: true` WYSIWYG으로 전환하고, Raw 모드/patch 시스템/baseline을 제거하며, HTML 블록/인라인 노드를 스키마에 추가해 HTML 소스 편집을 지원한다.

**Architecture:** 기존 ProseMirror 인프라를 재활용하는 **최소 침습 전환**. 단일 editable ProseMirror 뷰를 편집 인터페이스로 사용, 저장은 `serializer.serialize(doc)` 출력을 그대로 write. HTML 토큰은 `html_block`(text 컨테이너) / `html_inline`(atom)으로 스키마에 추가.

**Tech Stack:** TypeScript, ProseMirror (prosemirror-model/state/view/markdown/inputrules/keymap/history), markdown-it, vitest + jsdom, Tauri v2.

**Related spec:** `docs/superpowers/specs/2026-04-23-prosemirror-wysiwyg-design.md`

---

## File Responsibility Map

| 파일 | 책임 |
|------|------|
| `src/editor/schema.ts` | ProseMirror 노드/마크 정의. `html_block`, `html_inline` 추가. |
| `src/editor/parser.ts` | markdown-it → ProseMirror doc. `html: true` 활성화 + html 토큰 핸들러. |
| `src/editor/serializer.ts` | ProseMirror doc → 마크다운 문자열. html 노드 시리얼라이저. |
| `src/editor/index.ts` | 에디터 팩토리. `editable: () => true`. |
| `src/editor/plugins.ts` | 입력 규칙/키맵. 변경 없음 (검증만). |
| `src/editor/patch.ts` | **삭제**. |
| `src/app.ts` | Raw 토글/`rawFileContents`/`serializerBaselines`/`isRawMode` 전부 제거. Cmd+S는 `getContent()` 직접 save. |
| `index.html` | `#raw-toggle-btn`, `#raw-editor` DOM 제거. |
| `src/styles/base.css` | `.raw-editor` CSS 제거, `.html-block`/`.html-inline` 스타일 추가. |
| `src/editor/__tests__/` | 신규. vitest 기반 parser/serializer/round-trip 테스트. |
| `package.json` | `vitest`, `jsdom` 추가. `test` 스크립트. `diff-match-patch`/`@types/diff-match-patch` 제거. |
| `vitest.config.ts` | 신규. jsdom 환경 설정. |
| `.claude/skills/raw-mode.md` | **삭제**. |
| `.claude/skills/editor-core.md` | patch/baseline 서술 제거, html 노드 추가 서술. |
| `.claude/skills/app-orchestration.md` | Raw 토글 경로 제거. |
| `CLAUDE.md` | "원본 보존"/"round-trip 보호" 문구 갱신. |

---

## Task 1: 테스트 인프라 도입 (vitest + jsdom)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/editor/__tests__/smoke.test.ts`

- [ ] **Step 1: Install vitest + jsdom**

Run: `npm install -D vitest jsdom @types/jsdom`
Expected: package.json `devDependencies`에 세 패키지 추가됨.

- [ ] **Step 2: Add test scripts to package.json**

Modify `package.json` `scripts`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "tauri": "tauri",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create smoke test to verify setup**

Create `src/editor/__tests__/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { editorSchema } from "../schema";

describe("editor schema smoke", () => {
  it("exposes core nodes", () => {
    expect(editorSchema.nodes.doc).toBeDefined();
    expect(editorSchema.nodes.paragraph).toBeDefined();
    expect(editorSchema.nodes.heading).toBeDefined();
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/editor/__tests__/smoke.test.ts
git commit -m "chore: vitest + jsdom 테스트 인프라 추가"
```

---

## Task 2: html_block / html_inline 스키마 추가 (TDD)

**Files:**
- Modify: `src/editor/schema.ts`
- Create: `src/editor/__tests__/schema.test.ts`

- [ ] **Step 1: Write failing test for html nodes**

Create `src/editor/__tests__/schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { editorSchema } from "../schema";

describe("html nodes in schema", () => {
  it("defines html_block as block group with text content", () => {
    const node = editorSchema.nodes.html_block;
    expect(node).toBeDefined();
    expect(node.spec.group).toBe("block");
    expect(node.spec.code).toBe(true);
    expect(node.spec.marks).toBe("");
  });

  it("defines html_inline as inline atom with html attr", () => {
    const node = editorSchema.nodes.html_inline;
    expect(node).toBeDefined();
    expect(node.spec.inline).toBe(true);
    expect(node.spec.atom).toBe(true);
    expect(node.spec.group).toBe("inline");
    const created = node.create({ html: "<sub>x</sub>" });
    expect(created.attrs.html).toBe("<sub>x</sub>");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- schema.test`
Expected: FAIL (`html_block is undefined`).

- [ ] **Step 3: Add html_block and html_inline to schema.ts**

In `src/editor/schema.ts`, add to `nodes` object (before `text: { group: "inline" }`):

```ts
  html_block: {
    content: "text*",
    group: "block",
    code: true,
    defining: true,
    marks: "",
    parseDOM: [
      {
        tag: "pre.html-block",
        preserveWhitespace: "full" as const,
      },
    ],
    toDOM() {
      return ["pre", { class: "html-block" }, ["code", 0]];
    },
  },

  html_inline: {
    inline: true,
    group: "inline",
    atom: true,
    attrs: { html: { default: "" } },
    parseDOM: [
      {
        tag: "span.html-inline",
        getAttrs(node) {
          return { html: (node as HTMLElement).textContent ?? "" };
        },
      },
    ],
    toDOM(node) {
      return ["span", { class: "html-inline" }, node.attrs.html];
    },
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- schema.test`
Expected: PASS.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/editor/schema.ts src/editor/__tests__/schema.test.ts
git commit -m "feat: html_block/html_inline 노드 스키마 추가"
```

---

## Task 3: Parser — markdown-it html 토큰 → 노드 매핑 (TDD)

**Files:**
- Modify: `src/editor/parser.ts`
- Create: `src/editor/__tests__/parser.test.ts`

- [ ] **Step 1: Write failing parser tests**

Create `src/editor/__tests__/parser.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { markdownParser } from "../parser";

function parse(md: string) {
  const doc = markdownParser.parse(md);
  if (!doc) throw new Error("parse returned null");
  return doc;
}

describe("parser basic nodes", () => {
  it("parses heading", () => {
    const doc = parse("# Title");
    const h = doc.firstChild!;
    expect(h.type.name).toBe("heading");
    expect(h.attrs.level).toBe(1);
    expect(h.textContent).toBe("Title");
  });

  it("parses paragraph with emphasis", () => {
    const doc = parse("Hello **bold** world");
    const p = doc.firstChild!;
    expect(p.type.name).toBe("paragraph");
    expect(p.textContent).toBe("Hello bold world");
  });

  it("parses fenced code block", () => {
    const doc = parse("```js\nconst x = 1;\n```");
    const cb = doc.firstChild!;
    expect(cb.type.name).toBe("code_block");
    expect(cb.attrs.language).toBe("js");
    expect(cb.textContent).toBe("const x = 1;");
  });
});

describe("parser html nodes", () => {
  it("parses html block as html_block node", () => {
    const doc = parse("<div class=\"note\">hello</div>");
    const first = doc.firstChild!;
    expect(first.type.name).toBe("html_block");
    expect(first.textContent).toContain("<div");
    expect(first.textContent).toContain("hello");
  });

  it("parses inline html as html_inline atom inside paragraph", () => {
    const doc = parse("text <sub>x</sub> more");
    const p = doc.firstChild!;
    expect(p.type.name).toBe("paragraph");
    const types = [];
    p.forEach((c) => types.push(c.type.name));
    expect(types).toContain("html_inline");
    let found = null;
    p.forEach((c) => {
      if (c.type.name === "html_inline") found = c.attrs.html;
    });
    expect(found).toBe("<sub>");
  });
});
```

- [ ] **Step 2: Run tests to verify html tests fail**

Run: `npm test -- parser.test`
Expected: basic tests PASS, html tests FAIL (html not enabled / no handler).

- [ ] **Step 3: Update parser.ts — enable html + add handlers**

In `src/editor/parser.ts`:

Change the `md` initialization:

```ts
const md = markdownit("commonmark", { html: true })
  .enable("strikethrough")
  .enable("table");
```

Add to the `MarkdownParser` token map (before the closing `})`):

```ts
  html_block: {
    block: "html_block",
    noCloseToken: true,
    getAttrs: () => ({}),
  },
```

After the existing `h.td_close = ...` line, append custom handlers:

```ts
const htmlBlockType = editorSchema.nodes.html_block;
const htmlInlineType = editorSchema.nodes.html_inline;

h.html_block = (state: any, tok: any) => {
  state.openNode(htmlBlockType);
  const content = (tok.content ?? "").replace(/\n$/, "");
  if (content) state.addText(content);
  state.closeNode();
};

h.html_inline = (state: any, tok: any) => {
  state.addNode(htmlInlineType, { html: tok.content ?? "" });
};
```

Note: `MarkdownParser`가 `html_block`을 `block`으로 선언했더라도 내부 tokenHandlers를 직접 override함으로써 token의 `content`가 그대로 전달된다. 만약 block 매핑이 충돌한다면 map entry는 제거하고 커스텀 핸들러만 유지해도 됨. 실행해 보고 결정.

- [ ] **Step 4: Run tests to verify all pass**

Run: `npm test -- parser.test`
Expected: all PASS.

- [ ] **Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/editor/parser.ts src/editor/__tests__/parser.test.ts
git commit -m "feat: markdown-it HTML 토큰을 html_block/html_inline 노드로 파싱"
```

---

## Task 4: Serializer — html 노드 직렬화 (TDD)

**Files:**
- Modify: `src/editor/serializer.ts`
- Create: `src/editor/__tests__/serializer.test.ts`

- [ ] **Step 1: Write failing serializer tests**

Create `src/editor/__tests__/serializer.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { editorSchema } from "../schema";
import { markdownSerializer } from "../serializer";

const { nodes, marks } = editorSchema;

describe("serializer basic nodes", () => {
  it("serializes heading", () => {
    const doc = nodes.doc.create(null, [
      nodes.heading.create({ level: 2 }, editorSchema.text("Sub")),
    ]);
    expect(markdownSerializer.serialize(doc)).toBe("## Sub");
  });

  it("serializes paragraph with strong", () => {
    const strong = marks.strong.create();
    const doc = nodes.doc.create(null, [
      nodes.paragraph.create(null, [
        editorSchema.text("Hello "),
        editorSchema.text("bold", [strong]),
      ]),
    ]);
    expect(markdownSerializer.serialize(doc)).toBe("Hello **bold**");
  });
});

describe("serializer html nodes", () => {
  it("serializes html_block by writing its text content", () => {
    const doc = nodes.doc.create(null, [
      nodes.html_block.create(
        null,
        editorSchema.text("<div class=\"note\">hi</div>"),
      ),
    ]);
    expect(markdownSerializer.serialize(doc)).toBe(
      "<div class=\"note\">hi</div>",
    );
  });

  it("serializes html_inline by writing its html attr", () => {
    const doc = nodes.doc.create(null, [
      nodes.paragraph.create(null, [
        editorSchema.text("text "),
        nodes.html_inline.create({ html: "<sub>" }),
        editorSchema.text("x"),
        nodes.html_inline.create({ html: "</sub>" }),
        editorSchema.text(" more"),
      ]),
    ]);
    expect(markdownSerializer.serialize(doc)).toBe("text <sub>x</sub> more");
  });
});
```

- [ ] **Step 2: Run tests to verify html tests fail**

Run: `npm test -- serializer.test`
Expected: basic PASS, html FAIL (no handler for html_block/html_inline).

- [ ] **Step 3: Add html handlers to serializer.ts**

In `src/editor/serializer.ts`, inside the node handlers object of `new MarkdownSerializer(...)`, add before `text(state, node) {...}`:

```ts
    html_block(state: MarkdownSerializerState, node: Node) {
      state.write(node.textContent);
      state.closeBlock(node);
    },
    html_inline(state: MarkdownSerializerState, node: Node) {
      state.write(node.attrs.html);
    },
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npm test -- serializer.test`
Expected: all PASS.

- [ ] **Step 5: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/editor/serializer.ts src/editor/__tests__/serializer.test.ts
git commit -m "feat: html_block/html_inline serializer 추가"
```

---

## Task 5: Round-trip 테스트 — fixed point 보장

**Files:**
- Create: `src/editor/__tests__/roundtrip.test.ts`
- Create: `src/editor/__tests__/fixtures/basic.md`
- Create: `src/editor/__tests__/fixtures/html-block.md`
- Create: `src/editor/__tests__/fixtures/html-inline.md`
- Create: `src/editor/__tests__/fixtures/tables.md`
- Create: `src/editor/__tests__/fixtures/nested-lists.md`
- Create: `src/editor/__tests__/fixtures/code-blocks.md`
- Create: `src/editor/__tests__/fixtures/mixed.md`

- [ ] **Step 1: Create fixtures**

Create `src/editor/__tests__/fixtures/basic.md`:

```markdown
# Title

Hello **bold** and *em* and `code`.

- one
- two
- three
```

Create `src/editor/__tests__/fixtures/html-block.md`:

```markdown
# With HTML

<div class="note">
some text
</div>

After.
```

Create `src/editor/__tests__/fixtures/html-inline.md`:

```markdown
Body with <sub>sub</sub> and <kbd>K</kbd>.
```

Create `src/editor/__tests__/fixtures/tables.md`:

```markdown
| a | b | c |
| - | :-: | --: |
| 1 | 2 | 3 |
| 4 | 5 | 6 |
```

Create `src/editor/__tests__/fixtures/nested-lists.md`:

```markdown
- outer
  - inner a
  - inner b
- next
  1. num one
  2. num two
```

Create `src/editor/__tests__/fixtures/code-blocks.md`:

````markdown
Prose.

```ts
const x: number = 1;
```

More prose.
````

Create `src/editor/__tests__/fixtures/mixed.md`:

```markdown
# Mixed

Para with <sub>x</sub>.

<div>block html</div>

| a | b |
| - | - |
| 1 | 2 |

```js
code
```

> quote with **bold**
```

- [ ] **Step 2: Write round-trip test**

Create `src/editor/__tests__/roundtrip.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { markdownParser } from "../parser";
import { markdownSerializer } from "../serializer";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
);
const files = readdirSync(fixturesDir).filter((f) => f.endsWith(".md"));

function cycle(md: string): string {
  const doc = markdownParser.parse(md);
  if (!doc) throw new Error("parse returned null");
  return markdownSerializer.serialize(doc);
}

describe("round-trip is a fixed point after first pass", () => {
  for (const file of files) {
    it(`${file}: serialize(parse(serialize(parse(input)))) === serialize(parse(input))`, () => {
      const input = readFileSync(join(fixturesDir, file), "utf8");
      const once = cycle(input);
      const twice = cycle(once);
      expect(twice).toBe(once);
    });
  }
});
```

- [ ] **Step 3: Run round-trip tests**

Run: `npm test -- roundtrip.test`
Expected: all PASS. If any fixture fails, investigate whether it's a schema gap (e.g. a construct not supported) and either (a) simplify that fixture to only cover what's in scope, or (b) fix the parser/serializer if the breakage indicates a real bug.

- [ ] **Step 4: Commit**

```bash
git add src/editor/__tests__/roundtrip.test.ts src/editor/__tests__/fixtures/
git commit -m "test: 파서↔시리얼라이저 round-trip fixed point 테스트 추가"
```

---

## Task 6: 에디터 편집 모드 활성화 + onChange 배선

**Files:**
- Modify: `src/editor/index.ts`

**배경**: 현재 `createEditor(container, onChange, ...)`의 `onChange`가 선언만 되어 있고 `dispatchTransaction`에서 호출되지 않는다 (Raw textarea input으로만 dirty를 마크하던 구조). WYSIWYG 편집을 트리거로 dirty를 마크하려면 `dispatchTransaction`에서 `docChanged` 시 `onChange()`를 호출해야 한다.

- [ ] **Step 1: Flip editable flag and wire onChange**

In `src/editor/index.ts`, replace the `new EditorView(container, {...})` block:

```ts
  const view = new EditorView(container, {
    state,
    editable: () => true,
    handleClick(v, _pos, event) {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return false;
      event.preventDefault();
      const href = anchor.getAttribute("href");
      if (href && onLinkClick) onLinkClick(href);
      return true;
    },
    dispatchTransaction(transaction) {
      const newState = view.state.apply(transaction);
      view.updateState(newState);
      if (transaction.docChanged && !suppressChange) {
        suppressChange = true;
        renderMermaidBlocks(container);
        suppressChange = false;
        if (onChange) onChange();
      }
    },
  });
```

Note: `setContent`는 `view.updateState(newState)`를 `dispatchTransaction` 밖에서 직접 호출하므로 파일 로드 시 `onChange`가 트리거되지 않음 → 파일 열기 후 false dirty 없음.

- [ ] **Step 2: Harden setContent against parse failures**

스펙의 "파싱 실패 시 상단 배너" 요구사항은 앱에 배너/토스트 인프라가 없으므로 축소 적용: `console.error` + 빈 문서 fallback. `src/editor/index.ts`의 `setContent` 교체:

```ts
  function setContent(markdown: string): void {
    let parsed;
    try {
      parsed = markdownParser.parse(markdown);
    } catch (err) {
      console.error("markdown parse failed:", err);
      parsed = null;
    }
    if (!parsed) {
      parsed = editorSchema.nodes.doc.create(null, [
        editorSchema.nodes.paragraph.create(),
      ]);
    }
    const newState = EditorState.create({
      doc: parsed,
      plugins: [...buildPlugins()],
    });
    view.updateState(newState);
    suppressChange = true;
    renderMermaidBlocks(container);
    suppressChange = false;
  }
```

`editorSchema`는 이미 파일 상단에서 import 되어 있음 (확인 완료).

- [ ] **Step 3: Verify TypeScript still compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: all previous tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add src/editor/index.ts
git commit -m "feat: ProseMirror 뷰 editable 활성화, onChange 배선, 파싱 실패 fallback"
```

---

## Task 7: Raw 모드 DOM / CSS 제거

**Files:**
- Modify: `index.html`
- Modify: `src/styles/base.css`

- [ ] **Step 1: Remove raw DOM from index.html**

Delete line 29 (raw-toggle-btn):

```html
          <button id="raw-toggle-btn" class="icon-btn" title="Raw 마크다운 보기"></button>
```

Delete line 34 (raw-editor textarea):

```html
        <textarea id="raw-editor" class="raw-editor hidden" spellcheck="false"></textarea>
```

- [ ] **Step 2: Remove .raw-editor CSS**

In `src/styles/base.css`, delete the `.raw-editor { ... }` block (lines 298–312).

- [ ] **Step 3: Verify app boots with dev server**

Run: `npm run dev` (in background), open the app in a browser, confirm no console errors and no missing DOM. Stop dev server after.

Since app.ts still references `raw-toggle-btn` / `raw-editor`, TypeScript will compile but runtime will throw `null` on `.innerHTML = ...`. **This is expected** — fixed in next task. Do not run `npm run dev` past initial verification.

- [ ] **Step 4: Commit**

```bash
git add index.html src/styles/base.css
git commit -m "refactor: Raw 모드 DOM과 CSS 제거"
```

---

## Task 8: app.ts에서 Raw/baseline/patch 로직 제거

**Files:**
- Modify: `src/app.ts`

- [ ] **Step 1: Remove raw-related imports and module-level state**

In `src/app.ts`:

- Remove `codeView, editView` from the icons import (line 59–61). Keep `hamburger, panelLeft, panelRight`:

```ts
import {
  hamburger,
  panelLeft,
  panelRight,
} from "./icons/index";
```

- Remove `let isRawMode = false;` (line 67).

- Remove both Map declarations (lines 85–88):

```ts
// Stores the raw file content as read from disk (before ProseMirror round-trip)
const rawFileContents = new Map<string, string>();
// Stores the serializer baseline (ProseMirror round-trip of original) to detect real edits
const serializerBaselines = new Map<string, string>();
```

- [ ] **Step 2: Remove raw button references in init()**

Delete lines referencing `rawToggleBtn` and `rawEditor` in `init()` (around lines 115–116 and 125):

```ts
  const rawToggleBtn = document.getElementById("raw-toggle-btn")!;
  const rawEditor = document.getElementById("raw-editor") as HTMLTextAreaElement;
```

Delete:

```ts
  rawToggleBtn.innerHTML = codeView;
```

Delete the entire raw toggle handler block (lines 178–212, starting with `// Raw markdown toggle`).

Delete the raw editor input listener (lines 214–221, starting with `// Sync raw editor changes`).

- [ ] **Step 3: Simplify handleFileSelect**

Replace the current `handleFileSelect` body (lines 617–643) with:

```ts
async function handleFileSelect(
  filePath: string,
  fileName: string,
): Promise<void> {
  const existingState = getTabState();
  const existingTab = existingState.tabs.find((t) => t.filePath === filePath);
  if (existingTab) {
    openTab(filePath, fileName, existingTab.content);
    loadTabInEditor(existingTab.content);
    setActiveFile(filePath);
    return;
  }

  const content: string = await invoke("read_file", { filePath });
  openTab(filePath, fileName, content);
  loadTabInEditor(content);
  setActiveFile(filePath);
  if (getSettings().tocVisible) setTocVisible(true);
  updatePanelButtons();
  await addRecentFile(filePath, fileName);
  refreshDiffStats(filePath, filePath);
}
```

- [ ] **Step 4: Simplify handleTabClose**

In `handleTabClose` (around line 653), remove the Map cleanup block:

```ts
  if (filePath) {
    rawFileContents.delete(filePath);
    serializerBaselines.delete(filePath);
  }
```

Resulting shape:

```ts
function handleTabClose(id: string, isDirty: boolean): void {
  const tab = getTabState().tabs.find((t) => t.id === id);
  const needsConfirm = isDirty || (tab?.isUnsaved && tab.content.length > 0);
  if (needsConfirm) {
    const confirmed = window.confirm(
      "저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?",
    );
    if (!confirmed) return;
  }
  closeTab(id);
  const active = getActiveTab();
  if (active) {
    loadTabInEditor(active.content);
    setActiveFile(active.filePath);
  } else {
    editor?.setContent("");
    setActiveFile(null);
    setTocVisible(false);
  }
  updatePanelButtons();
}
```

- [ ] **Step 5: Simplify loadTabInEditor**

Replace `loadTabInEditor` (around line 680) with:

```ts
function loadTabInEditor(content: string): void {
  if (!editor) return;
  editor.setContent(content);
  updateEditorView(editor.view);
  updateToc(editor.view);
}
```

- [ ] **Step 6: Simplify handleEditorChange**

Replace `handleEditorChange` (around line 692) with:

```ts
function handleEditorChange(): void {
  const tab = getActiveTab();
  if (!tab || !editor) return;
  const content = editor.getContent();
  updateTabContent(tab.id, content);
  markDirty(tab.id);
}
```

이유: `onChange`는 `dispatchTransaction`에서 `docChanged`일 때만 호출되고, `setContent`는 `view.updateState(newState)`를 직접 호출해서 `dispatchTransaction`을 거치지 않는다. 따라서 파일 로드 시 false dirty가 발생하지 않는다.

- [ ] **Step 7: Simplify handleSave**

Replace `handleSave` (around line 705) with:

```ts
async function handleSave(): Promise<void> {
  const tab = getActiveTab();
  if (!tab || !editor) return;

  const content = editor.getContent();

  if (tab.isUnsaved) {
    const filePath = await save({
      filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
      defaultPath: tab.fileName,
    });
    if (!filePath) return;
    await invoke("write_file", { filePath, content });
    markSaved(tab.id, filePath);
    markClean(filePath, content);
    return;
  }

  await invoke("write_file", { filePath: tab.filePath, content });
  markClean(tab.id, content);
  refreshDiffStats(tab.id, tab.filePath);
}
```

- [ ] **Step 8: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors. If `codeView`/`editView` imports still exist in the file, remove them. If other unused references remain, remove them.

- [ ] **Step 9: Smoke test in dev**

Run: `npm run dev` in the background. Open a `.md` file, edit, Cmd+S. Verify:
- No console errors.
- Editor is now editable (can type).
- Cmd+S writes the serializer output to disk (open the saved file externally to confirm it is a valid markdown).

Stop dev server.

- [ ] **Step 10: Commit**

```bash
git add src/app.ts
git commit -m "refactor: Raw 모드/baseline/patch 경로 제거, WYSIWYG 단일 편집"
```

---

## Task 9: 불필요한 의존성/파일 제거

**Files:**
- Delete: `src/editor/patch.ts`
- Modify: `package.json`

- [ ] **Step 1: Delete patch.ts**

Run: `rm src/editor/patch.ts`

- [ ] **Step 2: Confirm no imports of patch.ts remain**

Run: `grep -rn "from.*editor/patch\|editor/patch\"" src/`
Expected: no output.

- [ ] **Step 3: Uninstall diff-match-patch**

Run: `npm uninstall diff-match-patch @types/diff-match-patch`
Expected: removed from `dependencies` and `devDependencies`.

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add -u src/editor/patch.ts package.json package-lock.json
git commit -m "chore: patch.ts와 diff-match-patch 의존성 제거"
```

---

## Task 10: HTML 노드 CSS 스타일

**Files:**
- Modify: `src/styles/base.css`

- [ ] **Step 1: Add html_block / html_inline styles**

At the end of `src/styles/base.css`, append:

```css
/* HTML nodes (preserved as source) */
.editor-container .ProseMirror pre.html-block {
  background: var(--bg-secondary);
  border-left: 3px solid var(--border);
  padding: 12px 16px;
  margin: 12px 0;
  font-family: var(--code-font-family);
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  border-radius: 4px;
  position: relative;
}

.editor-container .ProseMirror pre.html-block::before {
  content: "HTML";
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 10px;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

.editor-container .ProseMirror span.html-inline {
  font-family: var(--code-font-family);
  font-size: 0.95em;
  padding: 0 2px;
  border-radius: 2px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.editor-container .ProseMirror span.html-inline:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
```

Note: 변수 이름(`--bg-secondary`, `--bg-tertiary`, `--text-secondary`, `--border`, `--code-font-family`)이 프로젝트에서 실제로 정의돼 있는지 확인 후 필요하면 기존 테마 파일의 정의된 이름으로 맞춘다.

- [ ] **Step 2: Verify variables exist**

Run: `grep -n "bg-secondary\|bg-tertiary\|text-secondary\|--border\|code-font-family" src/themes/*.css src/styles/base.css 2>/dev/null | head -20`
Fix any variable names that don't resolve in the existing theme files.

- [ ] **Step 3: Visual check in dev**

Run: `npm run dev`. Open a markdown file that contains `<div>...</div>` and inline `<sub>x</sub>`. Verify:
- Block HTML renders as a bordered monospace block with "HTML" label.
- Inline HTML renders as a small code-styled inline token.

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/styles/base.css
git commit -m "style: html_block/html_inline 노드 시각 스타일"
```

---

## Task 11: 스킬/CLAUDE.md 문서 갱신

**Files:**
- Delete: `.claude/skills/raw-mode.md`
- Modify: `.claude/skills/editor-core.md`
- Modify: `.claude/skills/app-orchestration.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Delete raw-mode skill doc**

Run: `rm .claude/skills/raw-mode.md`

- [ ] **Step 2: Update editor-core.md**

Replace the whole content of `.claude/skills/editor-core.md` with:

````markdown
---
name: editor-core
description: ProseMirror 기반 마크다운 에디터 코어 수정 시 사용. 스키마, 파서, 시리얼라이저, 플러그인.
---

# Editor Core

ProseMirror 기반 WYSIWYG 마크다운 에디터. 단일 editable 뷰로 모든 편집이 진행된다.

## 파일 구조

| 파일 | 역할 |
|------|------|
| `src/editor/index.ts` | 에디터 팩토리. `createEditor()` → `editable: () => true` EditorView 생성, `setContent`/`getContent` |
| `src/editor/schema.ts` | ProseMirror 스키마 정의 (paragraph/heading/code_block/list/table/image/html_block/html_inline 등 + strong/em/link/code/strikethrough) |
| `src/editor/parser.ts` | markdown-it → ProseMirror 토큰 파싱. table/html_block/html_inline은 `tokenHandlers`에 커스텀 핸들러 직접 주입 |
| `src/editor/serializer.ts` | ProseMirror → 마크다운 직렬화. table, html_block (텍스트 내용), html_inline (attr html) 핸들러 포함 |
| `src/editor/plugins.ts` | 입력 규칙 (heading `#`, blockquote `>`, list `-`/`1.`, code block, hr), 키맵 (Cmd+B/I/`, undo/redo, Tab/Shift-Tab) |
| `src/editor/__tests__/` | vitest 기반 parser/serializer/round-trip 단위 테스트 |

## 핵심 데이터 흐름

```
파일 열기: read_file → markdownParser.parse() → EditorState → EditorView
편집:      EditorView → dispatchTransaction → onChange → markDirty
저장:      editor.getContent() → write_file
```

## 주의사항

- **파서**: markdown-it `html: true`. table/html_block/html_inline은 `tokenHandlers`에 수동 주입
- **저장 포맷**: `serializer.serialize(doc)` 결과를 그대로 write. 원본 포맷 보존 안 함 (첫 저장에서 정규화, 이후는 fixed point)
- **html_block**: code 컨테이너 (text-only, 마크 없음). 소스 자유 편집
- **html_inline**: atom 노드. 통째로 선택/삭제만 가능, 내부 편집은 지우고 다시 입력
- **mermaid**: NodeView 아닌 post-render 방식 (`renderMermaidBlocks`). `suppressChange` 플래그로 DOM 변경 시 false dirty 방지
- **schema 변경 시**: `parseDOM`과 `toDOM` 모두 정의 필요. 파서 토큰 매핑도 함께 추가. parser/serializer 테스트에 케이스 추가
````

- [ ] **Step 3: Update app-orchestration.md**

Read current `.claude/skills/app-orchestration.md` and remove any references to `rawToggleBtn`, `rawEditor`, `isRawMode`, `rawFileContents`, `serializerBaselines`, `patchOriginal`. Keep everything else.

Run: `grep -n "raw\|Raw\|baseline\|patch" .claude/skills/app-orchestration.md`
Edit to remove those lines/sections, keeping surrounding structure coherent.

- [ ] **Step 4: Update CLAUDE.md**

In `/Users/kangmin/dev/markdown-editor/CLAUDE.md`, replace the "핵심 설계 원칙" section with:

```markdown
## 핵심 설계 원칙

- **WYSIWYG 단일 편집**: ProseMirror editable 뷰가 유일한 편집 인터페이스
- **수동 저장**: Cmd+S로만 저장 (자동 저장 없음)
- **불변 데이터**: TabState 등 상태 객체는 항상 새로 생성
- **저장 포맷**: `serializer.serialize(doc)` 출력을 그대로 write. 첫 저장은 정규화 허용, 이후는 fixed point 보장 (round-trip 테스트로 검증)
- **HTML 보존**: 블록/인라인 HTML은 소스 텍스트로 보존 (html_block/html_inline 스키마 노드)
```

Remove the `raw-mode` row from the 스킬 문서 table.

- [ ] **Step 5: Commit**

```bash
git add -A .claude/skills/ CLAUDE.md
git commit -m "docs: Raw 모드 제거 반영, 설계 원칙 갱신"
```

---

## Task 12: 최종 검증

**Files:** none

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 3: Frontend build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Rust check**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: no errors.

- [ ] **Step 5: Manual smoke test**

Run: `npm run tauri dev`

Test flows:
1. Open a markdown file (e.g., `CLAUDE.md` of this repo).
2. Type some text — confirm WYSIWYG editing works.
3. Cmd+S — confirm saved without errors.
4. Close and reopen the same file — confirm content matches.
5. Save again without edits — confirm no spurious change in disk file (fixed point).
6. Open a file with `<div>...</div>` HTML block — confirm it renders as html_block.
7. Open a file with inline `<sub>` — confirm it renders as html_inline atom.

Stop the app.

- [ ] **Step 6: Final commit if any doc touch-ups needed**

If any last-mile fixups:

```bash
git add -A
git commit -m "chore: 최종 정리"
```

Otherwise skip.
