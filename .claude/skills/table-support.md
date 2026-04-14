---
name: table-support
description: 마크다운 표(table) 파싱, 렌더링, 직렬화 수정 시 사용.
---

# Table Support

마크다운 표를 ProseMirror에서 편집 가능하게 지원.

## 스키마 노드 (schema.ts)

- `table`: content `table_row+`, group `block`, parseDOM `<table>`
- `table_row`: content `(table_cell | table_header)*`, parseDOM `<tr>`
- `table_header`: content `inline*`, attrs `{alignment}`, parseDOM `<th>`
- `table_cell`: content `inline*`, attrs `{alignment}`, parseDOM `<td>`

## 파서 (parser.ts)

markdown-it `table` 활성화 후 `tokenHandlers`에 직접 주입:
- `table_open/close` → `openNode(table)` / `closeNode()`
- `thead_open/close`, `tbody_open/close` → **빈 함수** (투명 통과, `ignore` 아님!)
- `tr_open/close` → `openNode(table_row)` / `closeNode()`
- `th_open/close`, `td_open/close` → alignment 추출 후 `openNode` / `closeNode()`

### 주의: `ignore: true`를 쓰면 안 되는 이유

`ignore: true`는 해당 토큰과 **내용 전체**를 버립니다. thead/tbody에 ignore를 쓰면 그 안의 tr/th/td도 전부 사라지고, 이후 내용까지 잘릴 수 있습니다.

## 시리얼라이저 (serializer.ts)

`serializeTable()` 함수:
1. 모든 row 수집, 컬럼별 최대 너비 계산 (최소 3)
2. header 행 출력 (`| col1 | col2 |`)
3. 구분선 출력 (alignment 반영: `:---:`, `---:`, `---`)
4. body 행 출력 (padEnd로 컬럼 정렬)

## CSS

```css
.editor-container .ProseMirror table { border-collapse: collapse; width: 100%; }
.editor-container .ProseMirror th, td { border: 1px solid var(--border); padding: 6px 12px; }
.editor-container .ProseMirror th { background: var(--bg-secondary); font-weight: 600; }
```
