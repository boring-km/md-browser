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
