---
name: multi-window
description: 멀티 윈도우 기능 수정 시 사용.
---

# Multi-Window Support

새 윈도우에서 파일/폴더를 열 수 있는 멀티 윈도우 기능.

## Rust 백엔드

| 파일 | 역할 |
|------|------|
| `src-tauri/src/commands/window.rs` | `open_new_window` — 고유 label(`editor-N`)로 WebviewWindow 생성, URL 파라미터로 init data 전달 |
| `src-tauri/src/lib.rs` | 메뉴 이벤트를 focused window로 전달, "새 윈도우" 메뉴 항목 |

## Capabilities

`src-tauri/capabilities/default.json`:
```json
"windows": ["main", "editor-*"]
```
새 윈도우에도 동일한 권한 부여.

## 프론트엔드 init data 처리 (app.ts)

```typescript
const urlParams = new URLSearchParams(window.location.search);
const initParam = urlParams.get("init");
// { type: "open-files", files: [...] } 또는 { type: "open-folder", path: "..." }
```

## 호출 방법

- 햄버거 메뉴 > "새 윈도우"
- 네이티브 메뉴 > 파일 > "새 윈도우"
- `invoke("open_new_window", { initData: null })` 또는 JSON 문자열

## Single Instance

`tauri-plugin-single-instance` 유지. 두 번째 인스턴스에서 .md 파일 열기 시 새 윈도우 생성.
