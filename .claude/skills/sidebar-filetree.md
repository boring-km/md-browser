---
name: sidebar-filetree
description: 좌측 사이드바 파일 트리, 폴더 열기, 햄버거 메뉴 수정 시 사용.
---

# Sidebar & File Tree

좌측 사이드바에서 폴더 탐색, 파일 선택, 햄버거 메뉴 제공.

## 파일 구조

| 파일 | 역할 |
|------|------|
| `src/sidebar/index.ts` | 사이드바 초기화, 토글, 타이틀 설정 |
| `src/sidebar/file-tree.ts` | 파일 트리 렌더링. SVG 아이콘, 폴더/파일 정렬, 셰브론, depth별 들여쓰기 |
| `src/icons/index.ts` | 전체 SVG 아이콘 정의. `getFileIcon(fileName)` 확장자별 아이콘 매핑 |
| `src-tauri/src/commands/fs.rs` | `read_directory` — 재귀 디렉토리 읽기 (depth 제한, 숨김 파일 필터링) |

## 햄버거 메뉴 (app.ts 내)

`showHamburgerMenu()` 함수가 드롭다운 메뉴 생성:
- 폴더 열기 → `handleOpenFolder()`
- 파일 열기 → `handleOpenFile()`
- 새 파일 → `handleNewUnsavedFile()` (임시 파일, 저장 시 위치 지정)
- 새 윈도우 → `invoke("open_new_window")`
- 최근 폴더 → 서브메뉴 (hover로 펼침)

## 사이드바 토글

- 사이드바 헤더 우측: `sidebar-close-btn` (◀ panelLeft 아이콘) → 닫기
- toolbar 좌측: `sidebar-open-btn` (숨김/보임) → 열기
- `updatePanelButtons()`가 사이드바/TOC 패널 상태에 따라 열기 버튼 표시/숨김

## 파일 트리 아이콘 매핑

`getFileIcon()`: .md→fileMarkdown, .ts/.js/.rs→fileCode, .json→fileJson, .css→fileCss, .html→fileHtml, 이미지→fileImage, 설정→fileConfig, .lock→fileLock, 기타→fileGeneric

## CSS 클래스

- `.sidebar`, `.sidebar.collapsed`, `.sidebar-header`, `.sidebar-title`
- `.file-tree`, `.file-tree-item`, `.file-tree-item.active`, `.file-tree-item.directory`, `.file-tree-item.markdown`
- `.file-tree-chevron`, `.file-tree-icon`, `.file-tree-label`
- `.dropdown-menu`, `.dropdown-item`, `.dropdown-submenu`, `.dropdown-separator`
