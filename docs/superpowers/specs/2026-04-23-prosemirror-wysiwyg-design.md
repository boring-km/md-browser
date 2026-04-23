# ProseMirror WYSIWYG 편집 전환 설계

- **작성일**: 2026-04-23
- **상태**: 승인 대기
- **관련 커밋**: `1b1c185` (CM6 → ProseMirror readonly+Raw 복원), `bf72908` (패치 시스템 제거 이력)

## 배경

현재 에디터는 ProseMirror 뷰가 `editable: () => false`인 **읽기 전용 프리뷰**이고, 실제 편집은 Raw 마크다운 `<textarea>`를 토글해서 진행한다. 저장은 `diff-match-patch` 기반 `patchOriginal()`로 원본 포맷에 변경분만 패치하여 원본 포맷 (따옴표 스타일, 빈 줄, 들여쓰기 등)을 보존한다.

이번 전환의 목표는 **ProseMirror WYSIWYG을 유일한 편집 인터페이스로 복귀**시키는 것이다. 사용자는 "저장 시 원본 포맷이 깨져도 상관없다"는 전제에 동의했다.

## 목표

1. ProseMirror 뷰를 편집 가능 (`editable: () => true`) 으로 전환.
2. Raw 모드와 관련 UI/상태/저장 경로를 **완전히 제거**.
3. 저장은 `serializer.serialize(doc)` 출력을 그대로 `write_file`. `patchOriginal` 및 `diff-match-patch` 의존성 제거.
4. 인라인/블록 HTML을 **소스 텍스트로 보존 + 편집 가능** 하도록 스키마/파서/시리얼라이저 확장.
5. 파서↔시리얼라이저 round-trip 단위 테스트 도입 (vitest).

## 범위 밖

- 스키마 재설계 (기존 스키마 재활용).
- Frontmatter (YAML `---`) 전용 처리 — 사용자가 쓰지 않음.
- Tauri e2e 테스트 / UI 인터랙션 통합 테스트.
- HTML 블록 "렌더 + 토글 소스 편집" 하이브리드 UX (향후 확장 여지로만 남김).

## 아키텍처

### Before

```
[ProseMirror readonly view] ⇄ [Raw textarea]  ← 토글
                                   ↓
                       [patch.ts: diff-match-patch]
                                   ↓
                         [write_file (원본 포맷 보존)]
```

### After

```
[ProseMirror editable view] ─── 유일한 편집 인터페이스
                 ↓
      [serializer.serialize(doc)]
                 ↓
          [write_file]
```

### 제거되는 것

- `src/editor/patch.ts`
- Raw 에디터 DOM (`#raw-editor`), CSS, 토글 버튼, 토글 핸들러.
- `serializerBaselines` Map (round-trip 보호용).
- `patchOriginal()` 호출 경로 전체.
- `diff-match-patch`, `@types/diff-match-patch` 의존성.

### 추가/변경되는 것

- `editable: () => true`.
- 스키마에 `html_block` (블록, text-only) + `html_inline` (인라인, atom).
- markdown-it 설정에 `html: true`, 관련 토큰 핸들러.
- 시리얼라이저에 html 노드 핸들러.
- `vitest` 개발 의존성 + 파서/시리얼라이저/round-trip 테스트.

## 컴포넌트

### Schema (`src/editor/schema.ts`)

```ts
html_block: {
  content: "text*",
  group: "block",
  code: true,
  defining: true,
  marks: "",
  parseDOM: [{ tag: "pre.html-block", preserveWhitespace: "full" }],
  toDOM() { return ["pre", { class: "html-block" }, ["code", 0]]; },
}

html_inline: {
  inline: true,
  group: "inline",
  atom: true,
  attrs: { html: { default: "" } },
  parseDOM: [{
    tag: "span.html-inline",
    getAttrs: (el) => ({ html: (el as HTMLElement).textContent ?? "" })
  }],
  toDOM(node) { return ["span", { class: "html-inline" }, node.attrs.html]; },
}
```

**결정 포인트**:

- `html_block`: code_block과 유사한 **편집 가능한 text 컨테이너**. 사용자가 `<div>` 내부 텍스트를 자유롭게 고칠 수 있음. 마크다운 입력 규칙은 `code: true` / `marks: ""`이므로 동작하지 않음 — 의도된 동작.
- `html_inline`: **atom 노드**. 인라인 HTML 토큰은 "열림 + 내용 + 닫힘"이 하나의 토큰에 오지 않고 분리되어 들어오기 때문에 text 컨테이너로 만들면 WYSIWYG에서 쪼개져 UX가 나빠짐. atom이면 통째로 선택/삭제만 가능 — 편집하려면 지우고 다시 입력.

### Parser (`src/editor/parser.ts`)

```ts
const md = markdownit("commonmark", { html: true })
  .enable("strikethrough")
  .enable("table");

// 토큰 매핑 추가
html_block: {
  block: "html_block",
  noCloseToken: true,
},

// 커스텀 핸들러 주입
h.html_block = (state, tok) => {
  state.openNode(editorSchema.nodes.html_block);
  state.addText(tok.content.replace(/\n$/, ""));
  state.closeNode();
};
h.html_inline = (state, tok) => {
  state.addNode(editorSchema.nodes.html_inline, { html: tok.content });
};
```

### Serializer (`src/editor/serializer.ts`)

```ts
html_block(state, node) {
  state.write(node.textContent);
  state.closeBlock(node);
},
html_inline(state, node) {
  state.write(node.attrs.html);
},
```

### Editor (`src/editor/index.ts`)

- `editable: () => false` → `() => true`.
- 그 외 변경 없음. `setContent`/`getContent`/`destroy` 인터페이스 유지.

### App orchestration (`src/app.ts`)

- Raw 토글 핸들러/단축키/버튼 참조 제거.
- `serializerBaselines` Map과 관련 비교 로직 제거.
- Cmd+S 경로: `editor.getContent()` → `writeFile(path, content)` 로 직행. `patchOriginal` 호출 제거.
- 파일 로드 시점의 `content`를 `originalContent`로 잡아 **dirty 판정은 `current !== originalContent`** 로 유지 (baseline Map 대신).

### Styles / HTML

- `#raw-editor`, `.raw-toggle-btn` 관련 DOM/CSS 제거.
- `.html-block`: 옅은 배경 + `"HTML"` 라벨 (`::before`).
- `.html-inline`: 원문 폰트 + hover 시 배경 강조 (atom 힌트).

### Rust backend

- Raw 모드 토글 메뉴 항목이 있으면 제거. (확인 후 확정)

## 데이터 흐름

### 파일 열기 (변경 없음)

```
read_file → markdown string
         → markdownParser.parse()     // html_block/html_inline 포함
         → EditorState.create()
         → view.updateState()
         → mermaid post-render
```

### 편집 (변경 없음)

```
user input → ProseMirror transaction
          → dispatchTransaction
          → view.updateState()
          → docChanged ? → markDirty() + updateToc()
                          → mermaid post-render (suppressChange 가드)
```

### 저장 (단순화)

```
Cmd+S → editor.getContent()
      → write_file(content)
      → markClean()
```

### 탭 전환 (단순화)

- `TabState`에서 `rawMode`, `baseline`, `original` 등 관련 필드 제거 (정확한 필드명은 구현 시 확인).
- 로드 시 `editor.setContent(tab.content)`.

## 파일 변경 맵

| 파일 | 변경 |
|------|------|
| `src/editor/index.ts` | `editable: () => true` |
| `src/editor/schema.ts` | `html_block`, `html_inline` 추가 |
| `src/editor/parser.ts` | `html: true`. 토큰 매핑 + 커스텀 핸들러 |
| `src/editor/serializer.ts` | html 노드 시리얼라이저 |
| `src/editor/patch.ts` | **삭제** |
| `src/app.ts` | Raw 관련, baseline, patchOriginal 전부 제거 |
| `src/tabs/*` | TabState에서 raw/baseline/original 필드 제거 |
| `src/styles/*` | raw-editor CSS 삭제. html 노드 CSS 추가 |
| `index.html` | `#raw-editor`, raw 토글 버튼 DOM 제거 |
| `src-tauri/...` | Raw 관련 메뉴/커맨드가 있으면 제거 |
| `.claude/skills/raw-mode.md` | **삭제** |
| `.claude/skills/editor-core.md` | patch/baseline 서술 제거, html 노드 추가 |
| `.claude/skills/tabs.md` | baseline/rawMode 언급 제거 |
| `.claude/skills/app-orchestration.md` | raw 토글/patch 경로 제거 |
| `CLAUDE.md` | "원본 보존", "round-trip 보호" 문구 업데이트 |
| `package.json` | `vitest` 추가, `test` 스크립트. `diff-match-patch` 의존성 제거 |

## 에러 처리 & 엣지 케이스

### 파일 로드

- 파싱 실패 시: `try/catch`로 감싸고 **빈 문서로 fallback + 상단 배너 알림** (`"파일을 파싱할 수 없습니다: <파일명>"`). `console.error(err)`로 원인 기록.
- 깨진 HTML: markdown-it이 원문 그대로 `html_block.content`로 넘김 → 저장 시 동일 텍스트 복원. 데이터 손실 없음.

### 편집

- `html_inline` 삭제: atom이므로 backspace 한 번으로 통째로 삭제 — 의도된 동작.
- `html_inline` 복붙: ProseMirror 기본 직렬화로 `html` attr 보존.
- `html_block` 안의 `#`, `-` 등: plain text로 입력됨 (code 컨테이너).
- 대용량 HTML 블록: code_block과 동일 취급.

### 저장

- `write_file` 에러: 기존 토스트 경로 유지. dirty 상태 유지 → 재시도 가능.
- 빈 문서 저장: `getContent()` 빈 문자열 그대로 write.

### 마이그레이션 (일회성)

- 기존 열린 파일: 이번 전환은 "저장 포맷이 바뀌어도 됨"이 전제. 첫 Cmd+S에서 serializer 출력으로 덮어씀. 별도 확인 다이얼로그 없음.
- 전환 직후 dirty 판정: `originalContent` 기준 diff로 유지. 전역 리셋 없음.

### Mermaid / 이미지

- mermaid: 기존 `suppressChange` 플래그 유지. WYSIWYG 편집 중 mermaid DOM 변경이 false dirty를 유발하지 않도록.
- 이미지: `image-handler.ts` 기존 동작 유지.

## 테스트 전략

### 도구

- **vitest** (dev dep). `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

### 디렉토리

```
src/editor/__tests__/
  parser.test.ts
  serializer.test.ts
  roundtrip.test.ts
  fixtures/
    basic.md
    html-block.md
    html-inline.md
    tables.md
    nested-lists.md
    code-blocks.md
    mixed.md
```

### 케이스

**`roundtrip.test.ts`** — 핵심 안전장치:

- `parse(serialize(parse(input)))` → 두 번째 serialize 결과가 첫 번째와 동일. "첫 저장은 정규화 허용, 이후는 fixed point" 보장.

**`parser.test.ts`**:

- 각 노드 (heading/paragraph/list/blockquote/code_block/table/image/link) 입력 → doc 구조.
- `html_block`: `<div>...</div>` → html_block 노드 + 원문 텍스트.
- `html_inline`: `text <sub>x</sub> text` → paragraph(text, html_inline, text).

**`serializer.test.ts`**:

- 수동 생성 doc → 예상 마크다운 출력.
- table alignment 포함.
- html_block/html_inline 시리얼라이즈.

### 수용 기준

- 모든 round-trip 테스트 통과.
- 파서/시리얼라이저 테스트가 모든 노드 타입 커버.
- 프로젝트 내 대표 `.md` 파일 (CLAUDE.md, README 등) 열어서:
  - 첫 저장: 포맷 변경 허용.
  - 둘째 저장부터: diff 없음.

### 범위 제한

- 80%+ 전역 커버리지 규칙은 `src/editor/` 모듈에 한정 적용.
- `src/app.ts`, `src/tabs/`, `src/sidebar/` 등은 수동 확인 (테스트 인프라 확장은 스코프 밖).

## 위험 요소

1. **Raw 모드 잔여물**: `app.ts`가 942줄이라 Raw 관련 참조가 여러 곳에 흩어져 있을 가능성. 제거 시 grep으로 `raw`, `baseline`, `patch`, `diff-match-patch` 키워드를 전부 훑어야 함.
2. **TabState 필드 이름**: 설계 시점에 `src/tabs/` 전체를 읽지 않음. 실제 제거 대상 필드는 구현 시 확정.
3. **ProseMirror 편집 모드 첫 전환 회귀**: `editable: true`로 돌린 직후, 과거에 읽기 전용 가정으로 짜인 플러그인/데코레이션이 있을 수 있음 (예: `plugins.ts`의 입력 규칙이 WYSIWYG 편집 중 정상 동작하는지 확인 필요).
4. **HTML 토큰 경계**: markdown-it의 `html_inline`이 실제로 원자적 토큰 하나로 들어오는지, 아니면 열림/닫힘이 분리되는지 실제 샘플로 검증 필요. atom 노드 채택 근거가 흔들리면 재설계.
5. **상단 배너/토스트 인프라**: "파싱 실패 시 상단 배너" 설계가 기존 앱에 토스트/배너 컴포넌트 존재를 전제함. 없으면 `console.error` + 빈 문서 fallback으로 축소하거나 최소 배너 컴포넌트 추가.

## 후속 작업 (이번 스코프 아님)

- HTML 블록 "렌더된 프리뷰 + 더블클릭 시 소스 편집" 하이브리드.
- Tauri webdriver 기반 e2e 테스트.
- 파일 로드 시 깨진 마크다운에 대한 정교한 복구 UI.
