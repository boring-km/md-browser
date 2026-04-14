---
name: styling
description: CSS 스타일, 레이아웃, 다크모드, 아이콘 수정 시 사용.
---

# Styling & Layout

## 파일 구조

| 파일 | 역할 |
|------|------|
| `src/styles/base.css` | 전체 스타일 (레이아웃, 컴포넌트, 에디터, 모달 등) |
| `src/themes/light.css` | 라이트 테마 CSS 변수 |
| `src/themes/dark.css` | 다크 테마 CSS 변수 |
| `src/icons/index.ts` | SVG 아이콘 정의 (Lucide/Feather 스타일) |
| `index.html` | 3패널 레이아웃 구조 |

## 레이아웃 구조

```
#app (flex row)
├── aside#sidebar (.sidebar)
│   ├── .sidebar-header (hamburger, title, close btn)
│   └── #file-tree (.file-tree)
├── main.main-area (flex column)
│   ├── .toolbar (sidebar-open, tab-bar, raw-toggle, toc-open)
│   ├── #search-bar
│   ├── #editor-container
│   └── #raw-editor (hidden)
└── aside#toc-panel (.toc-panel)
    ├── .toc-header (title, toggle btn)
    └── #toc-content
```

## CSS 변수 (다크/라이트)

| 변수 | 라이트 | 다크 |
|------|--------|------|
| --bg-primary | #ffffff | #1e1e1e |
| --bg-secondary | #f5f5f5 | #252526 |
| --bg-tertiary | #e8e8e8 | #2d2d2d |
| --text-primary | #1a1a1a | #d4d4d4 |
| --text-secondary | #6b6b6b | #808080 |
| --accent | #4a9eff | #569cd6 |
| --border | #e0e0e0 | #3e3e3e |

## 크기 변수

- `--sidebar-width`: 220px
- `--toc-width`: 200px
- `--toolbar-height`: 40px (sidebar-header, toolbar, toc-header 공통)

## 아이콘 버튼 (.icon-btn)

`display: flex; opacity: 0.6;` → hover 시 `opacity: 1; background: var(--bg-tertiary)`
SVG 크기: `18px x 18px`

## 주요 아이콘 (icons/index.ts)

hamburger, panelLeft, panelRight, codeView, editView, chevronRight/Down, folderClosed/Open, fileMarkdown, fileCode, fileJson, fileCss, fileHtml, fileImage, fileConfig, fileLock, fileGeneric
