---
name: raw-mode
description: Raw 마크다운 보기/편집 토글 기능 수정 시 사용.
---

# Raw Markdown Mode

WYSIWYG 에디터 ↔ Raw 텍스트 에디터 토글.

## UI 위치

toolbar 우측, tab-bar와 toc-open-btn 사이에 `raw-toggle-btn` 버튼.

## 토글 동작 (app.ts)

### WYSIWYG → Raw

1. `editor.getContent()` → `rawEditor.value`에 설정
2. `editorContainer.classList.add("hidden")`
3. `rawEditor.classList.remove("hidden")`
4. 아이콘: `codeView` → `editView` (펜 아이콘)

### Raw → WYSIWYG

1. `rawEditor.value` → `editor.setContent(rawContent)`
2. `rawEditor` 숨기고 `editorContainer` 표시
3. `updateTabContent`, `markDirty`, `updateToc` 호출
4. 아이콘: `editView` → `codeView`

## Raw 에디터 동기화

- `rawEditor.addEventListener("input")` → `updateTabContent`, `markDirty`
- `loadTabInEditor`에서 raw 모드이면 `rawEditor.value`도 동기화

## CSS

```css
.raw-editor {
  flex: 1; padding: 24px 40px; background: var(--bg-primary);
  font-family: var(--code-font-family); font-size: 14px; line-height: 1.8;
}
```
