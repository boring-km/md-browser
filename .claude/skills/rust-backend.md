---
name: rust-backend
description: Tauri Rust 백엔드(메뉴, 커맨드, 플러그인) 수정 시 사용.
---

# Rust Backend (Tauri v2)

## 파일 구조

| 파일 | 역할 |
|------|------|
| `src-tauri/src/lib.rs` | 앱 설정, 메뉴 구성, 이벤트 핸들러, invoke 핸들러 등록 |
| `src-tauri/src/main.rs` | 진입점 (lib::run 호출) |
| `src-tauri/src/commands/fs.rs` | read_directory, read_file, write_file, create_md_file, load/save_settings |
| `src-tauri/src/commands/git.rs` | get_git_diff_stats — `git diff --numstat` 실행 |
| `src-tauri/src/commands/open.rs` | open_with_default_app, open_url_in_browser |
| `src-tauri/src/commands/window.rs` | open_new_window — 멀티 윈도우 생성 |
| `src-tauri/src/commands/image.rs` | save_image_to_assets, copy_image_to_assets |
| `src-tauri/src/commands/export.rs` | export_html |
| `src-tauri/src/commands/font.rs` | list_system_fonts (font-kit) |

## 네이티브 메뉴 구성 (lib.rs)

- **파일**: 폴더 열기, 파일 열기, 최근 폴더..., 새 윈도우, HTML/PDF 내보내기, 종료
- **편집**: 실행 취소, 다시 실행, 잘라내기, 복사, 붙여넣기, 전체 선택
- **보기**: 테마(시스템/라이트/다크), 폰트(선택/크기), 사이드바 토글, 목차 토글

## 메뉴 이벤트 라우팅

`on_menu_event` → focused window 찾기 → `window.emit("menu-event", id)` → 프론트엔드 `listen("menu-event")` 처리

## 의존성 (Cargo.toml)

tauri 2, tauri-plugin-dialog 2, tauri-plugin-fs 2, tauri-plugin-single-instance 2, serde 1, serde_json 1, font-kit 0.14, urlencoding 2
