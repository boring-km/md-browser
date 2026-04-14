---
name: editor-core
description: ProseMirror 기반 마크다운 에디터 코어 수정 시 사용. 스키마, 파서, 시리얼라이저, 플러그인, 패치 시스템.
---

# Editor Core

ProseMirror 기반 WYSIWYG 마크다운 에디터.

## 파일 구조

| 파일 | 역할 |
|------|------|
| `src/editor/index.ts` | 에디터 팩토리. `createEditor()` → EditorView 생성, `setContent`/`getContent` |
| `src/editor/schema.ts` | ProseMirror 스키마 정의 (노드: paragraph, heading, code_block, list, table 등 / 마크: strong, em, link, code, strikethrough) |
| `src/editor/parser.ts` | markdown-it → ProseMirror 토큰 파싱. table은 `tokenHandlers`에 커스텀 핸들러 직접 주입 |
| `src/editor/serializer.ts` | ProseMirror → 마크다운 직렬화. table serializer, tight list, list_item 내 sub-list 빈 줄 제거 포함 |
| `src/editor/plugins.ts` | 입력 규칙 (heading `#`, blockquote `>`, list `-`/`1.`, code block, hr), 키맵 (Cmd+B/I/`, undo/redo, Tab/Shift-Tab) |
| `src/editor/patch.ts` | diff-match-patch 기반. 저장 시 serializer round-trip 대신 원본에 사용자 변경분만 패치 |

## 핵심 데이터 흐름

```
파일 열기: read_file → markdownParser.parse() → EditorState → EditorView
편집 중:   EditorView → dispatchTransaction → onChange → markDirty
저장:      editor.getContent() → patchOriginal(original, baseline, current) → write_file
```

## 주의사항

- **파서**: `prosemirror-markdown`의 `MarkdownParser` 사용. table 토큰은 `ignore`가 아닌 커스텀 핸들러로 처리 (ignore는 내용까지 버림)
- **round-trip 보호**: `serializerBaselines` Map으로 baseline 비교. baseline과 같으면 dirty 마크 안 함, 저장 스킵
- **패치 저장**: `patchOriginal(original, baseline, current)`로 원본 포맷 보존
- **mermaid**: NodeView 아닌 post-render 방식 (`renderMermaidBlocks`). `suppressChange` 플래그로 DOM 변경 시 false dirty 방지
- **schema 변경 시**: `parseDOM`과 `toDOM` 모두 정의 필요. 파서 토큰 매핑도 함께 추가
