---
name: mermaid
description: Mermaid 다이어그램 렌더링 수정 시 사용.
---

# Mermaid Diagram Rendering

코드블럭 언어가 `mermaid`인 경우 SVG 다이어그램으로 렌더링.

## 파일

| 파일 | 역할 |
|------|------|
| `src/editor/mermaid-view.ts` | `renderMermaidBlocks(container)` — post-render 방식으로 mermaid 코드블럭 스캔 후 다이어그램 삽입 |

## 렌더링 방식: Post-render (NodeView 아님!)

NodeView 방식은 큰 문서에서 불안정했으므로 post-render 방식 사용:

1. `container.querySelectorAll("pre > code.language-mermaid")`로 코드블럭 검색
2. 이미 preview가 있으면 스킵 (`nextElementSibling.classList.contains("mermaid-preview")`)
3. `<div class="mermaid-preview" contenteditable="false">` 생성 후 `pre` 뒤에 삽입
4. `mermaid.render(id, code)` 비동기 호출 → SVG 삽입

## 호출 시점 (editor/index.ts)

- `setContent()` 후
- `dispatchTransaction`에서 `docChanged` 시

## suppressChange 플래그

mermaid 렌더링이 ProseMirror DOM 안에 요소를 추가하면 DOMObserver가 감지 → false dirty 발생.
`suppressChange = true` 상태에서 렌더링하여 `onChange` 호출 차단.

## 다크모드

`ensureMermaidInit()`에서 `--bg-primary` CSS 변수 값으로 다크모드 감지 → mermaid theme 설정.

## CSS

```css
.mermaid-preview { padding: 16px; background: var(--bg-primary); display: flex; justify-content: center; }
.mermaid-error { color: #e06c75; font-size: 12px; font-style: italic; }
```
