# Typora 스타일 경량 마크다운 에디터 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tauri v2 + ProseMirror 기반의 Typora 스타일 WYSIWYG 마크다운 에디터 데스크톱 앱을 구현한다.

**Architecture:** Tauri v2 Rust 백엔드가 파일 I/O, 이미지 복사, 폰트 조회, 내보내기를 담당하고, 프론트엔드는 Vanilla TypeScript + ProseMirror로 WYSIWYG 에디터를 구성한다. UI 프레임워크 없이 DOM을 직접 조작하여 최대한 가볍게 유지한다.

**Tech Stack:** Tauri v2, Rust, ProseMirror, TypeScript, Vite, CSS Variables

**Spec:** `docs/superpowers/specs/2026-04-14-markdown-editor-design.md`

---

## 파일 구조

```
markdown-editor/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs              # Tauri 진입점
│   │   ├── lib.rs               # 커맨드 등록
│   │   └── commands/
│   │       ├── mod.rs            # 커맨드 모듈 re-export
│   │       ├── fs.rs             # 파일/폴더 읽기·쓰기, 디렉토리 트리, 파일 감시, 새 파일 생성
│   │       ├── image.rs          # 이미지 assets/ 복사
│   │       ├── font.rs           # 시스템 폰트 목록 조회
│   │       └── export.rs         # HTML 내보내기
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── editor/
│   │   ├── schema.ts             # 마크다운 ProseMirror 스키마
│   │   ├── parser.ts             # 마크다운 → ProseMirror Doc 파서
│   │   ├── serializer.ts         # ProseMirror Doc → 마크다운 시리얼라이저
│   │   ├── plugins.ts            # 키맵, 입력 규칙, 히스토리 플러그인
│   │   ├── image-handler.ts      # 이미지 붙여넣기/드래그앤드롭 처리
│   │   └── index.ts              # 에디터 초기화 및 생성
│   ├── sidebar/
│   │   ├── file-tree.ts          # 파일 트리 렌더링
│   │   └── index.ts              # 사이드바 토글, 새 파일 버튼
│   ├── tabs/
│   │   ├── tab-bar.ts            # 탭 바 UI 렌더링
│   │   ├── tab-state.ts          # 탭 상태 관리 (열린 탭, 활성 탭, 수정 여부)
│   │   └── index.ts              # 탭 모듈 진입점
│   ├── toc/
│   │   └── index.ts              # 목차 패널 (헤딩 파싱, 스크롤 연동)
│   ├── search/
│   │   └── index.ts              # 검색/치환 바 UI 및 로직
│   ├── themes/
│   │   ├── light.css             # 라이트 테마
│   │   ├── dark.css              # 다크 테마
│   │   └── loader.ts             # 테마 로드/전환 로직
│   ├── settings/
│   │   └── index.ts              # 앱 설정 (폰트, 테마 선택 등) 로드/저장
│   ├── styles/
│   │   └── base.css              # 공통 레이아웃, 리셋 스타일
│   ├── types.ts                  # 공유 타입 정의
│   └── app.ts                    # 앱 진입점
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Task 1: 프로젝트 초기화 — Tauri v2 + Vite + TypeScript

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/app.ts`, `src/styles/base.css`
- Create: `src-tauri/` (Tauri CLI가 생성)

### Steps

- [ ] **Step 1: Tauri CLI 설치**

```bash
cargo install tauri-cli --version "^2"
```

- [ ] **Step 2: npm 프로젝트 초기화 및 의존성 설치**

```bash
cd /Users/kangmin/dev/markdown-editor
npm init -y
npm install -D typescript vite @tauri-apps/cli@^2
npm install @tauri-apps/api@^2
```

- [ ] **Step 3: Tauri 프로젝트 초기화**

```bash
cd /Users/kangmin/dev/markdown-editor
npx tauri init
```

프롬프트 응답:
- App name: `markdown-editor`
- Window title: `Markdown Editor`
- Frontend dev URL: `http://localhost:5173`
- Frontend dist: `../dist`
- Dev command: `npm run dev`
- Build command: `npm run build`

- [ ] **Step 4: vite.config.ts 작성**

```typescript
// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: "esnext",
    outDir: "dist",
  },
});
```

- [ ] **Step 5: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 6: index.html 작성**

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Markdown Editor</title>
    <link rel="stylesheet" href="/src/styles/base.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/app.ts"></script>
  </body>
</html>
```

- [ ] **Step 7: base.css 작성**

```css
/* src/styles/base.css */
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e8e8e8;
  --text-primary: #1a1a1a;
  --text-secondary: #6b6b6b;
  --accent: #4a9eff;
  --border: #e0e0e0;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-size: 16px;
  --code-font-family: "SF Mono", "Fira Code", "Consolas", monospace;
}

html,
body {
  height: 100%;
  font-family: var(--font-family);
  font-size: var(--font-size);
  color: var(--text-primary);
  background: var(--bg-primary);
  overflow: hidden;
}

#app {
  display: flex;
  height: 100vh;
  width: 100vw;
}
```

- [ ] **Step 8: app.ts 최소 진입점 작성**

```typescript
// src/app.ts
function init(): void {
  const app = document.getElementById("app");
  if (!app) return;
  app.textContent = "Markdown Editor — Tauri v2 + ProseMirror";
}

document.addEventListener("DOMContentLoaded", init);
```

- [ ] **Step 9: package.json에 스크립트 추가**

`package.json`의 `scripts`에 추가:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "tauri": "tauri"
  }
}
```

- [ ] **Step 10: 빌드 확인 — 앱이 뜨는지 확인**

```bash
cd /Users/kangmin/dev/markdown-editor
npm run tauri dev
```

Expected: Tauri 윈도우가 열리고 "Markdown Editor — Tauri v2 + ProseMirror" 텍스트가 보임.

- [ ] **Step 11: git 초기화 및 커밋**

```bash
cd /Users/kangmin/dev/markdown-editor
git init
```

`.gitignore` 작성:
```
node_modules/
dist/
src-tauri/target/
.superpowers/
```

```bash
git add .gitignore package.json package-lock.json vite.config.ts tsconfig.json index.html src/ src-tauri/ docs/
git commit -m "feat: Tauri v2 + Vite + TypeScript 프로젝트 초기화"
```

---

## Task 2: 공유 타입 정의

**Files:**
- Create: `src/types.ts`

### Steps

- [ ] **Step 1: 공유 타입 작성**

```typescript
// src/types.ts

export interface FileEntry {
  readonly name: string;
  readonly path: string;
  readonly isDirectory: boolean;
  readonly children?: readonly FileEntry[];
}

export interface TabData {
  readonly id: string;
  readonly filePath: string;
  readonly fileName: string;
  readonly content: string;
  readonly isDirty: boolean;
}

export interface AppSettings {
  readonly fontFamily: string | null;
  readonly fontSize: number;
  readonly theme: string;
  readonly sidebarVisible: boolean;
  readonly tocVisible: boolean;
}

export interface SearchState {
  readonly query: string;
  readonly replaceText: string;
  readonly caseSensitive: boolean;
  readonly useRegex: boolean;
  readonly replaceMode: boolean;
  readonly currentMatch: number;
  readonly totalMatches: number;
}

export interface TocEntry {
  readonly level: number;
  readonly text: string;
  readonly pos: number;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/types.ts
git commit -m "feat: 공유 타입 정의 (FileEntry, TabData, AppSettings 등)"
```

---

## Task 3: Rust 백엔드 — 파일 시스템 커맨드

**Files:**
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/fs.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

### Steps

- [ ] **Step 1: Cargo.toml에 의존성 추가**

`src-tauri/Cargo.toml`의 `[dependencies]`에 추가:

```toml
serde = { version = "1", features = ["derive"] }
serde_json = "1"
notify = "7"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-single-instance = "2"
```

- [ ] **Step 2: commands/mod.rs 작성**

```rust
// src-tauri/src/commands/mod.rs
pub mod fs;
pub mod image;
pub mod font;
pub mod export;
```

- [ ] **Step 3: commands/fs.rs 작성**

```rust
// src-tauri/src/commands/fs.rs
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub children: Option<Vec<FileEntry>>,
}

#[tauri::command]
pub fn read_directory(dir_path: String) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(&dir_path);
    if !path.is_dir() {
        return Err(format!("Not a directory: {}", dir_path));
    }
    read_dir_recursive(path)
}

fn read_dir_recursive(dir: &Path) -> Result<Vec<FileEntry>, String> {
    let mut entries: Vec<FileEntry> = Vec::new();
    let read_dir = fs::read_dir(dir).map_err(|e| e.to_string())?;

    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') {
            continue;
        }

        if path.is_dir() {
            let children = read_dir_recursive(&path)?;
            let has_md = children.iter().any(|c| {
                c.is_directory || c.name.ends_with(".md")
            });
            if has_md {
                entries.push(FileEntry {
                    name,
                    path: path.to_string_lossy().to_string(),
                    is_directory: true,
                    children: Some(children),
                });
            }
        } else if name.ends_with(".md") {
            entries.push(FileEntry {
                name,
                path: path.to_string_lossy().to_string(),
                is_directory: false,
                children: None,
            });
        }
    }

    entries.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

#[tauri::command]
pub fn read_file(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| format!("Failed to read {}: {}", file_path, e))
}

#[tauri::command]
pub fn write_file(file_path: String, content: String) -> Result<(), String> {
    fs::write(&file_path, &content).map_err(|e| format!("Failed to write {}: {}", file_path, e))
}

#[tauri::command]
pub fn create_md_file(dir_path: String, file_name: String) -> Result<String, String> {
    let name = if file_name.ends_with(".md") {
        file_name
    } else {
        format!("{}.md", file_name)
    };
    let full_path = PathBuf::from(&dir_path).join(&name);
    if full_path.exists() {
        return Err(format!("File already exists: {}", full_path.display()));
    }
    fs::write(&full_path, "").map_err(|e| e.to_string())?;
    Ok(full_path.to_string_lossy().to_string())
}
```

- [ ] **Step 4: lib.rs 수정 — 커맨드 등록**

```rust
// src-tauri/src/lib.rs
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::fs::read_directory,
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::create_md_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 5: 빌드 확인**

```bash
cd /Users/kangmin/dev/markdown-editor/src-tauri
cargo check
```

Expected: 컴파일 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add src-tauri/
git commit -m "feat: Rust 파일 시스템 커맨드 (read_directory, read_file, write_file, create_md_file)"
```

---

## Task 4: Rust 백엔드 — 이미지 복사 커맨드

**Files:**
- Create: `src-tauri/src/commands/image.rs`
- Modify: `src-tauri/src/lib.rs`

### Steps

- [ ] **Step 1: commands/image.rs 작성**

```rust
// src-tauri/src/commands/image.rs
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

fn timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[tauri::command]
pub fn save_image_to_assets(
    doc_dir: String,
    image_data: Vec<u8>,
    original_name: Option<String>,
) -> Result<String, String> {
    let assets_dir = PathBuf::from(&doc_dir).join("assets");
    if !assets_dir.exists() {
        fs::create_dir_all(&assets_dir).map_err(|e| e.to_string())?;
    }

    let ts = timestamp();
    let source_label = original_name.unwrap_or_else(|| "clipboard".to_string());
    let file_name = format!("{}-{}.png", ts, source_label);
    let dest = assets_dir.join(&file_name);

    fs::write(&dest, &image_data).map_err(|e| e.to_string())?;

    Ok(format!("assets/{}", file_name))
}

#[tauri::command]
pub fn copy_image_to_assets(
    doc_dir: String,
    source_path: String,
) -> Result<String, String> {
    let assets_dir = PathBuf::from(&doc_dir).join("assets");
    if !assets_dir.exists() {
        fs::create_dir_all(&assets_dir).map_err(|e| e.to_string())?;
    }

    let source = PathBuf::from(&source_path);
    let original_name = source
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "image.png".to_string());

    let ts = timestamp();
    let file_name = format!("{}-{}", ts, original_name);
    let dest = assets_dir.join(&file_name);

    fs::copy(&source, &dest).map_err(|e| e.to_string())?;

    Ok(format!("assets/{}", file_name))
}
```

- [ ] **Step 2: lib.rs에 이미지 커맨드 등록**

`invoke_handler`에 추가:

```rust
commands::image::save_image_to_assets,
commands::image::copy_image_to_assets,
```

- [ ] **Step 3: 빌드 확인**

```bash
cd /Users/kangmin/dev/markdown-editor/src-tauri
cargo check
```

- [ ] **Step 4: 커밋**

```bash
git add src-tauri/
git commit -m "feat: Rust 이미지 복사 커맨드 (save_image_to_assets, copy_image_to_assets)"
```

---

## Task 5: Rust 백엔드 — 시스템 폰트 조회 커맨드

**Files:**
- Create: `src-tauri/src/commands/font.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

### Steps

- [ ] **Step 1: Cargo.toml에 font-kit 의존성 추가**

```toml
font-kit = "0.14"
```

- [ ] **Step 2: commands/font.rs 작성**

```rust
// src-tauri/src/commands/font.rs
use font_kit::source::SystemSource;
use std::collections::BTreeSet;

#[tauri::command]
pub fn list_system_fonts() -> Result<Vec<String>, String> {
    let source = SystemSource::new();
    let fonts = source.all_families().map_err(|e| e.to_string())?;

    let unique: BTreeSet<String> = fonts
        .into_iter()
        .filter(|name| !name.starts_with('.'))
        .collect();

    Ok(unique.into_iter().collect())
}
```

- [ ] **Step 3: lib.rs에 폰트 커맨드 등록**

`invoke_handler`에 추가:

```rust
commands::font::list_system_fonts,
```

- [ ] **Step 4: 빌드 확인**

```bash
cd /Users/kangmin/dev/markdown-editor/src-tauri
cargo check
```

- [ ] **Step 5: 커밋**

```bash
git add src-tauri/
git commit -m "feat: Rust 시스템 폰트 목록 조회 커맨드 (list_system_fonts)"
```

---

## Task 6: Rust 백엔드 — HTML 내보내기 커맨드

**Files:**
- Create: `src-tauri/src/commands/export.rs`
- Modify: `src-tauri/src/lib.rs`

### Steps

- [ ] **Step 1: commands/export.rs 작성**

```rust
// src-tauri/src/commands/export.rs
use std::fs;

#[tauri::command]
pub fn export_html(file_path: String, html_content: String, css_content: String) -> Result<(), String> {
    let full_html = format!(
        r#"<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
{}
</style>
</head>
<body>
<article class="markdown-body">
{}
</article>
</body>
</html>"#,
        css_content, html_content
    );
    fs::write(&file_path, full_html).map_err(|e| format!("Failed to export HTML: {}", e))
}
```

- [ ] **Step 2: lib.rs에 내보내기 커맨드 등록**

`invoke_handler`에 추가:

```rust
commands::export::export_html,
```

- [ ] **Step 3: 빌드 확인**

```bash
cd /Users/kangmin/dev/markdown-editor/src-tauri
cargo check
```

- [ ] **Step 4: 커밋**

```bash
git add src-tauri/
git commit -m "feat: Rust HTML 내보내기 커맨드 (export_html)"
```

---

## Task 7: Rust 백엔드 — 앱 설정 저장/로드 및 단일 인스턴스

**Files:**
- Modify: `src-tauri/src/commands/fs.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json`

### Steps

- [ ] **Step 1: fs.rs에 설정 로드/저장 커맨드 추가**

`src-tauri/src/commands/fs.rs` 하단에 추가:

```rust
use tauri::Manager;

#[tauri::command]
pub fn load_settings(app_handle: tauri::AppHandle) -> Result<String, String> {
    let config_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;
    let settings_path = config_dir.join("settings.json");
    if settings_path.exists() {
        fs::read_to_string(&settings_path).map_err(|e| e.to_string())
    } else {
        Ok("{}".to_string())
    }
}

#[tauri::command]
pub fn save_settings(app_handle: tauri::AppHandle, settings_json: String) -> Result<(), String> {
    let config_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }
    let settings_path = config_dir.join("settings.json");
    fs::write(&settings_path, &settings_json).map_err(|e| e.to_string())
}
```

- [ ] **Step 2: lib.rs에 설정 커맨드 등록 및 단일 인스턴스 플러그인 추가**

```rust
// src-tauri/src/lib.rs
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // 이미 실행 중인 인스턴스에 파일 경로 전달
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let files: Vec<&str> = args.iter()
                    .skip(1)
                    .map(|s| s.as_str())
                    .filter(|s| s.ends_with(".md"))
                    .collect();
                if !files.is_empty() {
                    let _ = window.emit("open-files", files);
                }
            }
        }))
        .invoke_handler(tauri::generate_handler![
            commands::fs::read_directory,
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::create_md_file,
            commands::fs::load_settings,
            commands::fs::save_settings,
            commands::image::save_image_to_assets,
            commands::image::copy_image_to_assets,
            commands::font::list_system_fonts,
            commands::export::export_html,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: tauri.conf.json에 파일 연결 추가**

`tauri.conf.json`의 `bundle` 섹션에 추가:

```json
{
  "bundle": {
    "fileAssociations": [
      {
        "ext": ["md", "markdown"],
        "mimeType": "text/markdown",
        "role": "Editor"
      }
    ]
  }
}
```

- [ ] **Step 4: 빌드 확인**

```bash
cd /Users/kangmin/dev/markdown-editor/src-tauri
cargo check
```

- [ ] **Step 5: 커밋**

```bash
git add src-tauri/
git commit -m "feat: 앱 설정 저장/로드 + 단일 인스턴스 + .md 파일 연결"
```

---

## Task 8: ProseMirror 에디터 — 스키마 정의

**Files:**
- Create: `src/editor/schema.ts`

### Steps

- [ ] **Step 1: ProseMirror 의존성 설치**

```bash
cd /Users/kangmin/dev/markdown-editor
npm install prosemirror-model prosemirror-state prosemirror-view prosemirror-markdown prosemirror-keymap prosemirror-inputrules prosemirror-commands prosemirror-history prosemirror-schema-list prosemirror-tables
```

- [ ] **Step 2: schema.ts 작성**

```typescript
// src/editor/schema.ts
import { Schema, NodeSpec, MarkSpec } from "prosemirror-model";

const nodes: Record<string, NodeSpec> = {
  doc: { content: "block+" },

  paragraph: {
    content: "inline*",
    group: "block",
    parseDOM: [{ tag: "p" }],
    toDOM() { return ["p", 0]; },
  },

  heading: {
    attrs: { level: { default: 1 } },
    content: "inline*",
    group: "block",
    defining: true,
    parseDOM: [
      { tag: "h1", attrs: { level: 1 } },
      { tag: "h2", attrs: { level: 2 } },
      { tag: "h3", attrs: { level: 3 } },
      { tag: "h4", attrs: { level: 4 } },
      { tag: "h5", attrs: { level: 5 } },
      { tag: "h6", attrs: { level: 6 } },
    ],
    toDOM(node) { return [`h${node.attrs.level}`, 0]; },
  },

  blockquote: {
    content: "block+",
    group: "block",
    defining: true,
    parseDOM: [{ tag: "blockquote" }],
    toDOM() { return ["blockquote", 0]; },
  },

  code_block: {
    attrs: { language: { default: "" } },
    content: "text*",
    marks: "",
    group: "block",
    code: true,
    defining: true,
    parseDOM: [{
      tag: "pre",
      preserveWhitespace: "full",
      getAttrs(node) {
        const el = node as HTMLElement;
        const code = el.querySelector("code");
        return { language: code?.className?.replace("language-", "") ?? "" };
      },
    }],
    toDOM(node) {
      return ["pre", ["code", { class: node.attrs.language ? `language-${node.attrs.language}` : "" }, 0]];
    },
  },

  bullet_list: {
    content: "list_item+",
    group: "block",
    parseDOM: [{ tag: "ul" }],
    toDOM() { return ["ul", 0]; },
  },

  ordered_list: {
    attrs: { order: { default: 1 } },
    content: "list_item+",
    group: "block",
    parseDOM: [{
      tag: "ol",
      getAttrs(node) {
        return { order: (node as HTMLElement).getAttribute("start") ?? 1 };
      },
    }],
    toDOM(node) {
      return node.attrs.order === 1 ? ["ol", 0] : ["ol", { start: node.attrs.order }, 0];
    },
  },

  list_item: {
    content: "paragraph block*",
    parseDOM: [{ tag: "li" }],
    toDOM() { return ["li", 0]; },
    defining: true,
  },

  horizontal_rule: {
    group: "block",
    parseDOM: [{ tag: "hr" }],
    toDOM() { return ["hr"]; },
  },

  image: {
    inline: true,
    attrs: {
      src: {},
      alt: { default: null },
      title: { default: null },
    },
    group: "inline",
    draggable: true,
    parseDOM: [{
      tag: "img[src]",
      getAttrs(node) {
        const el = node as HTMLElement;
        return {
          src: el.getAttribute("src"),
          alt: el.getAttribute("alt"),
          title: el.getAttribute("title"),
        };
      },
    }],
    toDOM(node) {
      return ["img", { src: node.attrs.src, alt: node.attrs.alt, title: node.attrs.title }];
    },
  },

  hard_break: {
    inline: true,
    group: "inline",
    selectable: false,
    parseDOM: [{ tag: "br" }],
    toDOM() { return ["br"]; },
  },

  text: { group: "inline" },
};

const marks: Record<string, MarkSpec> = {
  strong: {
    parseDOM: [
      { tag: "strong" },
      { tag: "b", getAttrs: (node) => (node as HTMLElement).style.fontWeight !== "normal" && null },
      { style: "font-weight=bold" },
      { style: "font-weight=700" },
    ],
    toDOM() { return ["strong", 0]; },
  },

  em: {
    parseDOM: [{ tag: "i" }, { tag: "em" }, { style: "font-style=italic" }],
    toDOM() { return ["em", 0]; },
  },

  code: {
    parseDOM: [{ tag: "code" }],
    toDOM() { return ["code", 0]; },
  },

  link: {
    attrs: {
      href: {},
      title: { default: null },
    },
    inclusive: false,
    parseDOM: [{
      tag: "a[href]",
      getAttrs(node) {
        const el = node as HTMLElement;
        return { href: el.getAttribute("href"), title: el.getAttribute("title") };
      },
    }],
    toDOM(node) {
      return ["a", { href: node.attrs.href, title: node.attrs.title, rel: "noopener noreferrer" }, 0];
    },
  },

  strikethrough: {
    parseDOM: [{ tag: "del" }, { tag: "s" }, { style: "text-decoration=line-through" }],
    toDOM() { return ["del", 0]; },
  },
};

export const editorSchema = new Schema({ nodes, marks });
```

- [ ] **Step 3: 타입 체크**

```bash
cd /Users/kangmin/dev/markdown-editor
npx tsc --noEmit
```

Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/editor/schema.ts package.json package-lock.json
git commit -m "feat: ProseMirror 마크다운 스키마 정의"
```

---

## Task 9: ProseMirror 에디터 — 파서 & 시리얼라이저

**Files:**
- Create: `src/editor/parser.ts`
- Create: `src/editor/serializer.ts`

### Steps

- [ ] **Step 1: parser.ts 작성**

```typescript
// src/editor/parser.ts
import { MarkdownParser } from "prosemirror-markdown";
import markdownit from "markdown-it";
import { editorSchema } from "./schema";

const md = markdownit("commonmark", { html: false })
  .enable("strikethrough");

export const markdownParser = new MarkdownParser(
  editorSchema,
  md,
  {
    blockquote: { block: "blockquote" },
    paragraph: { block: "paragraph" },
    list_item: { block: "list_item" },
    bullet_list: { block: "bullet_list" },
    ordered_list: { block: "ordered_list", getAttrs: (tok) => ({ order: +(tok.attrGet("start") ?? 1) }) },
    heading: { block: "heading", getAttrs: (tok) => ({ level: +tok.tag.slice(1) }) },
    code_block: { block: "code_block", getAttrs: (tok) => ({ language: tok.info ?? "" }) },
    fence: { block: "code_block", getAttrs: (tok) => ({ language: tok.info ?? "" }) },
    hr: { node: "horizontal_rule" },
    image: { node: "image", getAttrs: (tok) => ({
      src: tok.attrGet("src"),
      title: tok.attrGet("title") ?? null,
      alt: tok.children?.[0]?.content ?? null,
    })},
    hardbreak: { node: "hard_break" },
    em: { mark: "em" },
    strong: { mark: "strong" },
    link: { mark: "link", getAttrs: (tok) => ({
      href: tok.attrGet("href"),
      title: tok.attrGet("title") ?? null,
    })},
    code_inline: { mark: "code" },
    s: { mark: "strikethrough" },
  }
);
```

- [ ] **Step 2: markdown-it 설치**

```bash
npm install markdown-it
npm install -D @types/markdown-it
```

- [ ] **Step 3: serializer.ts 작성**

```typescript
// src/editor/serializer.ts
import { MarkdownSerializer, MarkdownSerializerState } from "prosemirror-markdown";
import { Node, Mark } from "prosemirror-model";

export const markdownSerializer = new MarkdownSerializer(
  {
    blockquote(state: MarkdownSerializerState, node: Node) {
      state.wrapBlock("> ", null, node, () => state.renderContent(node));
    },
    code_block(state: MarkdownSerializerState, node: Node) {
      state.write(`\`\`\`${node.attrs.language ?? ""}\n`);
      state.text(node.textContent, false);
      state.ensureNewLine();
      state.write("```");
      state.closeBlock(node);
    },
    heading(state: MarkdownSerializerState, node: Node) {
      state.write(`${"#".repeat(node.attrs.level)} `);
      state.renderInline(node);
      state.closeBlock(node);
    },
    horizontal_rule(state: MarkdownSerializerState, node: Node) {
      state.write(node.attrs.markup ?? "---");
      state.closeBlock(node);
    },
    bullet_list(state: MarkdownSerializerState, node: Node) {
      state.renderList(node, "  ", () => "- ");
    },
    ordered_list(state: MarkdownSerializerState, node: Node) {
      const start: number = node.attrs.order ?? 1;
      state.renderList(node, "  ", (i: number) => `${start + i}. `);
    },
    list_item(state: MarkdownSerializerState, node: Node) {
      state.renderContent(node);
    },
    paragraph(state: MarkdownSerializerState, node: Node) {
      state.renderInline(node);
      state.closeBlock(node);
    },
    image(state: MarkdownSerializerState, node: Node) {
      state.write(
        `![${state.esc(node.attrs.alt ?? "")}](${state.esc(node.attrs.src)}${
          node.attrs.title ? ` "${state.esc(node.attrs.title)}"` : ""
        })`
      );
    },
    hard_break(state: MarkdownSerializerState) {
      state.write("  \n");
    },
    text(state: MarkdownSerializerState, node: Node) {
      state.text(node.text ?? "");
    },
  },
  {
    em: {
      open: "*",
      close: "*",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    strong: {
      open: "**",
      close: "**",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    link: {
      open(_state: MarkdownSerializerState, mark: Mark) {
        return "[";
      },
      close(_state: MarkdownSerializerState, mark: Mark) {
        return `](${mark.attrs.href}${mark.attrs.title ? ` "${mark.attrs.title}"` : ""})`;
      },
      mixable: false,
    },
    code: {
      open() { return "`"; },
      close() { return "`"; },
      escape: false,
    },
    strikethrough: {
      open: "~~",
      close: "~~",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
  }
);
```

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: 커밋**

```bash
git add src/editor/parser.ts src/editor/serializer.ts package.json package-lock.json
git commit -m "feat: 마크다운 파서 및 시리얼라이저"
```

---

## Task 10: ProseMirror 에디터 — 플러그인 (키맵, 입력 규칙, 히스토리)

**Files:**
- Create: `src/editor/plugins.ts`

### Steps

- [ ] **Step 1: plugins.ts 작성**

```typescript
// src/editor/plugins.ts
import { keymap } from "prosemirror-keymap";
import { history, undo, redo } from "prosemirror-history";
import { baseKeymap, toggleMark, setBlockType, wrapIn } from "prosemirror-commands";
import { inputRules, wrappingInputRule, textblockTypeInputRule, InputRule } from "prosemirror-inputrules";
import { Plugin } from "prosemirror-state";
import { editorSchema } from "./schema";
import { liftListItem, sinkListItem, splitListItem } from "prosemirror-schema-list";

function headingRule(level: number): InputRule {
  const pattern = new RegExp(`^(#{${level}})\\s$`);
  return textblockTypeInputRule(pattern, editorSchema.nodes.heading, { level });
}

function codeBlockRule(): InputRule {
  return textblockTypeInputRule(/^```([a-zA-Z]*)?\s$/, editorSchema.nodes.code_block, (match) => ({
    language: match[1] ?? "",
  }));
}

function horizontalRuleRule(): InputRule {
  return new InputRule(/^---\s$/, (state, _match, start, end) => {
    return state.tr
      .delete(start, end)
      .insert(start, editorSchema.nodes.horizontal_rule.create());
  });
}

function buildInputRules(): Plugin {
  return inputRules({
    rules: [
      headingRule(1),
      headingRule(2),
      headingRule(3),
      headingRule(4),
      headingRule(5),
      headingRule(6),
      wrappingInputRule(/^\s*>\s$/, editorSchema.nodes.blockquote),
      wrappingInputRule(/^\s*[-*]\s$/, editorSchema.nodes.bullet_list),
      wrappingInputRule(/^\s*(\d+)\.\s$/, editorSchema.nodes.ordered_list, (match) => ({
        order: +match[1],
      })),
      codeBlockRule(),
      horizontalRuleRule(),
    ],
  });
}

function buildKeymap(): Plugin {
  const keys: Record<string, any> = {
    "Mod-z": undo,
    "Mod-Shift-z": redo,
    "Mod-b": toggleMark(editorSchema.marks.strong),
    "Mod-i": toggleMark(editorSchema.marks.em),
    "Mod-`": toggleMark(editorSchema.marks.code),
    Enter: splitListItem(editorSchema.nodes.list_item),
    "Tab": sinkListItem(editorSchema.nodes.list_item),
    "Shift-Tab": liftListItem(editorSchema.nodes.list_item),
  };

  return keymap(keys);
}

export function buildPlugins(): readonly Plugin[] {
  return [
    buildInputRules(),
    buildKeymap(),
    keymap(baseKeymap),
    history(),
  ];
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/editor/plugins.ts
git commit -m "feat: ProseMirror 플러그인 (키맵, 입력 규칙, 히스토리)"
```

---

## Task 11: ProseMirror 에디터 — 에디터 초기화 및 마운트

**Files:**
- Create: `src/editor/index.ts`

### Steps

- [ ] **Step 1: index.ts 작성**

```typescript
// src/editor/index.ts
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Node as PmNode } from "prosemirror-model";
import { editorSchema } from "./schema";
import { markdownParser } from "./parser";
import { markdownSerializer } from "./serializer";
import { buildPlugins } from "./plugins";

export interface Editor {
  readonly view: EditorView;
  setContent(markdown: string): void;
  getContent(): string;
  destroy(): void;
}

export function createEditor(container: HTMLElement, onChange?: () => void): Editor {
  const doc = editorSchema.nodes.doc.create(null, [
    editorSchema.nodes.paragraph.create(),
  ]);

  const state = EditorState.create({
    doc,
    plugins: [...buildPlugins()],
  });

  const view = new EditorView(container, {
    state,
    dispatchTransaction(transaction) {
      const newState = view.state.apply(transaction);
      view.updateState(newState);
      if (transaction.docChanged && onChange) {
        onChange();
      }
    },
  });

  function setContent(markdown: string): void {
    const parsed = markdownParser.parse(markdown);
    if (!parsed) return;
    const newState = EditorState.create({
      doc: parsed,
      plugins: [...buildPlugins()],
    });
    view.updateState(newState);
  }

  function getContent(): string {
    return markdownSerializer.serialize(view.state.doc);
  }

  function destroy(): void {
    view.destroy();
  }

  return { view, setContent, getContent, destroy };
}

export { editorSchema } from "./schema";
export { markdownParser } from "./parser";
export { markdownSerializer } from "./serializer";
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/editor/index.ts
git commit -m "feat: ProseMirror 에디터 초기화 모듈"
```

---

## Task 12: 앱 레이아웃 — HTML 구조 + base.css 업데이트

**Files:**
- Modify: `index.html`
- Modify: `src/styles/base.css`

### Steps

- [ ] **Step 1: index.html 업데이트**

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Markdown Editor</title>
    <link rel="stylesheet" href="/src/styles/base.css" />
  </head>
  <body>
    <div id="app">
      <aside id="sidebar" class="sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title"></span>
          <button id="new-file-btn" class="icon-btn" title="새 파일">+</button>
          <button id="sidebar-close-btn" class="icon-btn" title="사이드바 닫기">◀</button>
        </div>
        <div id="file-tree" class="file-tree"></div>
      </aside>
      <main class="main-area">
        <div class="toolbar">
          <button id="sidebar-toggle-btn" class="icon-btn" title="사이드바 열기">☰</button>
          <div id="tab-bar" class="tab-bar"></div>
          <button id="toc-toggle-btn" class="icon-btn" title="목차">≡</button>
        </div>
        <div id="search-bar" class="search-bar hidden"></div>
        <div id="editor-container" class="editor-container"></div>
      </main>
      <aside id="toc-panel" class="toc-panel">
        <div class="toc-header">
          <span class="toc-title">목차</span>
          <button id="toc-close-btn" class="icon-btn" title="목차 닫기">▶</button>
        </div>
        <div id="toc-content" class="toc-content"></div>
      </aside>
    </div>
    <script type="module" src="/src/app.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: base.css 전체 업데이트**

```css
/* src/styles/base.css */
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e8e8e8;
  --text-primary: #1a1a1a;
  --text-secondary: #6b6b6b;
  --accent: #4a9eff;
  --border: #e0e0e0;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-size: 16px;
  --code-font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  --sidebar-width: 220px;
  --toc-width: 200px;
  --toolbar-height: 40px;
}

html,
body {
  height: 100%;
  font-family: var(--font-family);
  font-size: var(--font-size);
  color: var(--text-primary);
  background: var(--bg-primary);
  overflow: hidden;
}

#app {
  display: flex;
  height: 100vh;
  width: 100vw;
}

/* Sidebar */
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.2s ease;
}

.sidebar.collapsed {
  width: 0;
  border-right: none;
}

.sidebar-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 4px;
  border-bottom: 1px solid var(--border);
}

.sidebar-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
  font-size: 13px;
}

.file-tree-item {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  cursor: pointer;
  user-select: none;
}

.file-tree-item:hover {
  background: var(--bg-tertiary);
}

.file-tree-item.active {
  background: var(--accent);
  color: white;
}

.file-tree-item.directory {
  font-weight: 500;
}

.file-tree-indent {
  width: 16px;
  flex-shrink: 0;
}

/* Main area */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  height: var(--toolbar-height);
  padding: 0 8px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  gap: 4px;
}

/* Tab bar */
.tab-bar {
  display: flex;
  flex: 1;
  overflow-x: auto;
  gap: 2px;
  align-items: center;
}

.tab-bar::-webkit-scrollbar {
  height: 0;
}

.tab {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
  white-space: nowrap;
  gap: 6px;
  color: var(--text-secondary);
  user-select: none;
}

.tab:hover {
  background: var(--bg-tertiary);
}

.tab.active {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-weight: 500;
}

.tab-dirty {
  color: var(--accent);
  font-size: 10px;
}

.tab-close {
  font-size: 12px;
  opacity: 0.4;
  cursor: pointer;
  line-height: 1;
}

.tab-close:hover {
  opacity: 1;
}

/* Editor */
.editor-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px 40px;
}

.editor-container .ProseMirror {
  max-width: 720px;
  margin: 0 auto;
  outline: none;
  line-height: 1.8;
  min-height: 100%;
}

.editor-container .ProseMirror h1 { font-size: 2em; margin: 0.67em 0; }
.editor-container .ProseMirror h2 { font-size: 1.5em; margin: 0.75em 0; }
.editor-container .ProseMirror h3 { font-size: 1.17em; margin: 0.83em 0; }
.editor-container .ProseMirror h4 { font-size: 1em; margin: 1em 0; }
.editor-container .ProseMirror h5 { font-size: 0.83em; margin: 1.17em 0; }
.editor-container .ProseMirror h6 { font-size: 0.67em; margin: 1.33em 0; }

.editor-container .ProseMirror blockquote {
  border-left: 4px solid var(--border);
  padding-left: 16px;
  color: var(--text-secondary);
  margin: 1em 0;
}

.editor-container .ProseMirror pre {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px 16px;
  font-family: var(--code-font-family);
  font-size: 0.9em;
  overflow-x: auto;
  margin: 1em 0;
}

.editor-container .ProseMirror code {
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: var(--code-font-family);
  font-size: 0.9em;
}

.editor-container .ProseMirror pre code {
  background: none;
  padding: 0;
}

.editor-container .ProseMirror img {
  max-width: 100%;
  border-radius: 4px;
  margin: 8px 0;
}

.editor-container .ProseMirror hr {
  border: none;
  border-top: 2px solid var(--border);
  margin: 2em 0;
}

.editor-container .ProseMirror ul,
.editor-container .ProseMirror ol {
  padding-left: 24px;
  margin: 0.5em 0;
}

.editor-container .ProseMirror li {
  margin: 4px 0;
}

.editor-container .ProseMirror a {
  color: var(--accent);
  text-decoration: underline;
}

.editor-container .ProseMirror del {
  text-decoration: line-through;
  color: var(--text-secondary);
}

/* TOC panel */
.toc-panel {
  width: var(--toc-width);
  background: var(--bg-secondary);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.2s ease;
}

.toc-panel.collapsed {
  width: 0;
  border-left: none;
}

.toc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.toc-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.toc-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  font-size: 13px;
}

.toc-item {
  padding: 4px 12px;
  cursor: pointer;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toc-item:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.toc-item.active {
  color: var(--accent);
}

/* Search bar */
.search-bar {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  gap: 6px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  font-size: 13px;
}

.search-bar.hidden {
  display: none;
}

.search-input {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  width: 200px;
  outline: none;
}

.search-input:focus {
  border-color: var(--accent);
}

.search-btn {
  background: var(--bg-tertiary);
  border: none;
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.search-btn:hover {
  background: var(--border);
}

.search-btn.active {
  background: var(--accent);
  color: white;
}

.search-info {
  color: var(--text-secondary);
  font-size: 12px;
  min-width: 40px;
}

.search-replace-row {
  display: flex;
  align-items: center;
  padding: 4px 12px 6px;
  gap: 6px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
}

.search-replace-row.hidden {
  display: none;
}

/* Utility */
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 4px;
  color: var(--text-secondary);
  line-height: 1;
}

.icon-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.hidden {
  display: none !important;
}
```

- [ ] **Step 3: 타입 체크 및 빌드 확인**

```bash
npx tsc --noEmit
npm run tauri dev
```

Expected: 앱이 열리고 레이아웃(사이드바, 에디터 영역, 목차)이 보임.

- [ ] **Step 4: 커밋**

```bash
git add index.html src/styles/base.css
git commit -m "feat: 앱 레이아웃 HTML 구조 + CSS 스타일"
```

---

## Task 13: 탭 상태 관리

**Files:**
- Create: `src/tabs/tab-state.ts`

### Steps

- [ ] **Step 1: tab-state.ts 작성**

```typescript
// src/tabs/tab-state.ts
import type { TabData } from "../types";

export interface TabState {
  readonly tabs: readonly TabData[];
  readonly activeTabId: string | null;
}

const EMPTY_STATE: TabState = { tabs: [], activeTabId: null };

let currentState: TabState = EMPTY_STATE;
let listeners: Array<(state: TabState) => void> = [];

export function getTabState(): TabState {
  return currentState;
}

export function subscribe(listener: (state: TabState) => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notify(): void {
  const state = currentState;
  listeners.forEach((l) => l(state));
}

function tabId(filePath: string): string {
  return filePath;
}

export function openTab(filePath: string, fileName: string, content: string): void {
  const id = tabId(filePath);
  const existing = currentState.tabs.find((t) => t.id === id);
  if (existing) {
    currentState = { ...currentState, activeTabId: id };
    notify();
    return;
  }
  const newTab: TabData = { id, filePath, fileName, content, isDirty: false };
  currentState = {
    tabs: [...currentState.tabs, newTab],
    activeTabId: id,
  };
  notify();
}

export function closeTab(id: string): TabData | null {
  const idx = currentState.tabs.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const closed = currentState.tabs[idx];
  const newTabs = currentState.tabs.filter((t) => t.id !== id);
  let newActive = currentState.activeTabId;
  if (newActive === id) {
    if (newTabs.length === 0) {
      newActive = null;
    } else if (idx < newTabs.length) {
      newActive = newTabs[idx].id;
    } else {
      newActive = newTabs[newTabs.length - 1].id;
    }
  }
  currentState = { tabs: newTabs, activeTabId: newActive };
  notify();
  return closed;
}

export function setActiveTab(id: string): void {
  if (currentState.tabs.some((t) => t.id === id)) {
    currentState = { ...currentState, activeTabId: id };
    notify();
  }
}

export function markDirty(id: string): void {
  currentState = {
    ...currentState,
    tabs: currentState.tabs.map((t) =>
      t.id === id ? { ...t, isDirty: true } : t
    ),
  };
  notify();
}

export function markClean(id: string, content: string): void {
  currentState = {
    ...currentState,
    tabs: currentState.tabs.map((t) =>
      t.id === id ? { ...t, isDirty: false, content } : t
    ),
  };
  notify();
}

export function updateTabContent(id: string, content: string): void {
  currentState = {
    ...currentState,
    tabs: currentState.tabs.map((t) =>
      t.id === id ? { ...t, content } : t
    ),
  };
  notify();
}

export function getActiveTab(): TabData | null {
  if (!currentState.activeTabId) return null;
  return currentState.tabs.find((t) => t.id === currentState.activeTabId) ?? null;
}

export function moveTab(fromIndex: number, toIndex: number): void {
  const tabs = [...currentState.tabs];
  const [moved] = tabs.splice(fromIndex, 1);
  tabs.splice(toIndex, 0, moved);
  currentState = { ...currentState, tabs };
  notify();
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/tabs/tab-state.ts
git commit -m "feat: 탭 상태 관리 모듈 (불변 패턴)"
```

---

## Task 14: 탭 바 UI

**Files:**
- Create: `src/tabs/tab-bar.ts`
- Create: `src/tabs/index.ts`

### Steps

- [ ] **Step 1: tab-bar.ts 작성**

```typescript
// src/tabs/tab-bar.ts
import { getTabState, setActiveTab, closeTab, subscribe, type TabState } from "./tab-state";

let containerEl: HTMLElement | null = null;
let onTabSelect: ((filePath: string) => void) | null = null;
let onTabClose: ((id: string, isDirty: boolean) => void) | null = null;

export function initTabBar(
  container: HTMLElement,
  onSelect: (filePath: string) => void,
  onClose: (id: string, isDirty: boolean) => void,
): void {
  containerEl = container;
  onTabSelect = onSelect;
  onTabClose = onClose;
  subscribe(render);
  render(getTabState());
}

function render(state: TabState): void {
  if (!containerEl) return;
  containerEl.innerHTML = "";

  for (const tab of state.tabs) {
    const el = document.createElement("div");
    el.className = `tab${tab.id === state.activeTabId ? " active" : ""}`;
    el.draggable = true;

    const nameSpan = document.createElement("span");
    nameSpan.textContent = tab.fileName;
    el.appendChild(nameSpan);

    if (tab.isDirty) {
      const dirty = document.createElement("span");
      dirty.className = "tab-dirty";
      dirty.textContent = "●";
      el.appendChild(dirty);
    }

    const closeBtn = document.createElement("span");
    closeBtn.className = "tab-close";
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onTabClose?.(tab.id, tab.isDirty);
    });
    el.appendChild(closeBtn);

    el.addEventListener("click", () => {
      setActiveTab(tab.id);
      onTabSelect?.(tab.filePath);
    });

    containerEl.appendChild(el);
  }
}
```

- [ ] **Step 2: tabs/index.ts 작성**

```typescript
// src/tabs/index.ts
export { initTabBar } from "./tab-bar";
export {
  openTab,
  closeTab,
  setActiveTab,
  getActiveTab,
  markDirty,
  markClean,
  moveTab,
  updateTabContent,
  subscribe,
  getTabState,
} from "./tab-state";
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 커밋**

```bash
git add src/tabs/
git commit -m "feat: 탭 바 UI 렌더링"
```

---

## Task 15: 사이드바 — 파일 트리

**Files:**
- Create: `src/sidebar/file-tree.ts`
- Create: `src/sidebar/index.ts`

### Steps

- [ ] **Step 1: file-tree.ts 작성**

```typescript
// src/sidebar/file-tree.ts
import type { FileEntry } from "../types";

let treeContainer: HTMLElement | null = null;
let onFileClick: ((filePath: string, fileName: string) => void) | null = null;
let activeFilePath: string | null = null;

export function initFileTree(
  container: HTMLElement,
  onSelect: (filePath: string, fileName: string) => void,
): void {
  treeContainer = container;
  onFileClick = onSelect;
}

export function renderTree(entries: readonly FileEntry[]): void {
  if (!treeContainer) return;
  treeContainer.innerHTML = "";
  renderEntries(entries, treeContainer, 0);
}

export function setActiveFile(filePath: string | null): void {
  activeFilePath = filePath;
  if (!treeContainer) return;
  treeContainer.querySelectorAll(".file-tree-item").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-path") === filePath);
  });
}

function renderEntries(
  entries: readonly FileEntry[],
  parent: HTMLElement,
  depth: number,
): void {
  for (const entry of entries) {
    const item = document.createElement("div");
    item.className = `file-tree-item${entry.isDirectory ? " directory" : ""}`;
    item.setAttribute("data-path", entry.path);

    for (let i = 0; i < depth; i++) {
      const indent = document.createElement("span");
      indent.className = "file-tree-indent";
      item.appendChild(indent);
    }

    const label = document.createElement("span");
    if (entry.isDirectory) {
      label.textContent = `▸ ${entry.name}`;
    } else {
      label.textContent = entry.name;
    }
    item.appendChild(label);

    if (entry.path === activeFilePath) {
      item.classList.add("active");
    }

    if (entry.isDirectory) {
      let expanded = false;
      const childContainer = document.createElement("div");
      childContainer.style.display = "none";

      item.addEventListener("click", () => {
        expanded = !expanded;
        childContainer.style.display = expanded ? "block" : "none";
        label.textContent = `${expanded ? "▾" : "▸"} ${entry.name}`;
      });

      parent.appendChild(item);

      if (entry.children) {
        renderEntries(entry.children, childContainer, depth + 1);
      }
      parent.appendChild(childContainer);
    } else {
      item.addEventListener("click", () => {
        onFileClick?.(entry.path, entry.name);
      });
      parent.appendChild(item);
    }
  }
}
```

- [ ] **Step 2: sidebar/index.ts 작성**

```typescript
// src/sidebar/index.ts
import { initFileTree, renderTree, setActiveFile } from "./file-tree";

let sidebarEl: HTMLElement | null = null;

export function initSidebar(
  sidebar: HTMLElement,
  fileTreeContainer: HTMLElement,
  onFileSelect: (filePath: string, fileName: string) => void,
): void {
  sidebarEl = sidebar;
  initFileTree(fileTreeContainer, onFileSelect);
}

export function toggleSidebar(): void {
  sidebarEl?.classList.toggle("collapsed");
}

export function setSidebarVisible(visible: boolean): void {
  if (!sidebarEl) return;
  if (visible) {
    sidebarEl.classList.remove("collapsed");
  } else {
    sidebarEl.classList.add("collapsed");
  }
}

export function setSidebarTitle(title: string): void {
  const titleEl = sidebarEl?.querySelector(".sidebar-title");
  if (titleEl) titleEl.textContent = title;
}

export { renderTree, setActiveFile };
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 커밋**

```bash
git add src/sidebar/
git commit -m "feat: 파일 트리 사이드바"
```

---

## Task 16: 목차(TOC) 패널

**Files:**
- Create: `src/toc/index.ts`

### Steps

- [ ] **Step 1: toc/index.ts 작성**

```typescript
// src/toc/index.ts
import type { TocEntry } from "../types";
import type { EditorView } from "prosemirror-view";

let tocContentEl: HTMLElement | null = null;
let tocPanelEl: HTMLElement | null = null;
let editorView: EditorView | null = null;

export function initToc(
  panel: HTMLElement,
  content: HTMLElement,
): void {
  tocPanelEl = panel;
  tocContentEl = content;
}

export function setEditorView(view: EditorView): void {
  editorView = view;
}

export function toggleToc(): void {
  tocPanelEl?.classList.toggle("collapsed");
}

export function setTocVisible(visible: boolean): void {
  if (!tocPanelEl) return;
  if (visible) {
    tocPanelEl.classList.remove("collapsed");
  } else {
    tocPanelEl.classList.add("collapsed");
  }
}

export function updateToc(view: EditorView): void {
  const entries = extractHeadings(view);
  renderToc(entries);
}

function extractHeadings(view: EditorView): TocEntry[] {
  const entries: TocEntry[] = [];
  view.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      entries.push({
        level: node.attrs.level,
        text: node.textContent,
        pos,
      });
    }
  });
  return entries;
}

function renderToc(entries: readonly TocEntry[]): void {
  if (!tocContentEl) return;
  tocContentEl.innerHTML = "";

  for (const entry of entries) {
    const item = document.createElement("div");
    item.className = "toc-item";
    item.style.paddingLeft = `${12 + (entry.level - 1) * 16}px`;
    item.textContent = entry.text;
    item.addEventListener("click", () => {
      scrollToPos(entry.pos);
    });
    tocContentEl.appendChild(item);
  }
}

function scrollToPos(pos: number): void {
  if (!editorView) return;
  const dom = editorView.domAtPos(pos);
  if (dom.node instanceof HTMLElement) {
    dom.node.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (dom.node.parentElement) {
    dom.node.parentElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/toc/
git commit -m "feat: 목차(TOC) 패널"
```

---

## Task 17: 검색/치환

**Files:**
- Create: `src/search/index.ts`

### Steps

- [ ] **Step 1: search/index.ts 작성**

```typescript
// src/search/index.ts
import { EditorView } from "prosemirror-view";
import { TextSelection } from "prosemirror-state";

interface SearchMatch {
  readonly from: number;
  readonly to: number;
}

let searchBarEl: HTMLElement | null = null;
let replaceRowEl: HTMLElement | null = null;
let view: EditorView | null = null;
let matches: SearchMatch[] = [];
let currentMatchIndex = -1;
let caseSensitive = false;
let useRegex = false;
let replaceMode = false;

export function initSearch(
  searchBar: HTMLElement,
  editorView: EditorView,
): void {
  searchBarEl = searchBar;
  view = editorView;
  buildSearchUI();
}

export function updateEditorView(editorView: EditorView): void {
  view = editorView;
}

export function showSearch(): void {
  if (!searchBarEl) return;
  searchBarEl.classList.remove("hidden");
  replaceMode = false;
  replaceRowEl?.classList.add("hidden");
  const input = searchBarEl.querySelector<HTMLInputElement>(".search-query");
  input?.focus();
}

export function showReplace(): void {
  if (!searchBarEl) return;
  searchBarEl.classList.remove("hidden");
  replaceMode = true;
  replaceRowEl?.classList.remove("hidden");
  const input = searchBarEl.querySelector<HTMLInputElement>(".search-query");
  input?.focus();
}

export function hideSearch(): void {
  searchBarEl?.classList.add("hidden");
  replaceRowEl?.classList.add("hidden");
  matches = [];
  currentMatchIndex = -1;
}

function buildSearchUI(): void {
  if (!searchBarEl) return;

  searchBarEl.innerHTML = `
    <input class="search-input search-query" placeholder="검색..." />
    <button class="search-btn case-btn" title="대소문자 구분">Aa</button>
    <button class="search-btn regex-btn" title="정규식">.*</button>
    <span class="search-info match-info">0/0</span>
    <button class="search-btn prev-btn" title="이전">↑</button>
    <button class="search-btn next-btn" title="다음">↓</button>
    <button class="search-btn replace-toggle-btn" title="치환 모드">⇄</button>
    <button class="search-btn close-search-btn" style="margin-left:auto" title="닫기">✕</button>
  `;

  replaceRowEl = document.createElement("div");
  replaceRowEl.className = "search-replace-row hidden";
  replaceRowEl.innerHTML = `
    <input class="search-input replace-input" placeholder="치환..." />
    <button class="search-btn replace-one-btn" title="치환">치환</button>
    <button class="search-btn replace-all-btn" title="전체 치환">전체</button>
  `;
  searchBarEl.parentElement?.insertBefore(replaceRowEl, searchBarEl.nextSibling);

  const queryInput = searchBarEl.querySelector<HTMLInputElement>(".search-query")!;
  const caseBtn = searchBarEl.querySelector<HTMLButtonElement>(".case-btn")!;
  const regexBtn = searchBarEl.querySelector<HTMLButtonElement>(".regex-btn")!;
  const prevBtn = searchBarEl.querySelector<HTMLButtonElement>(".prev-btn")!;
  const nextBtn = searchBarEl.querySelector<HTMLButtonElement>(".next-btn")!;
  const replaceToggleBtn = searchBarEl.querySelector<HTMLButtonElement>(".replace-toggle-btn")!;
  const closeBtn = searchBarEl.querySelector<HTMLButtonElement>(".close-search-btn")!;
  const matchInfo = searchBarEl.querySelector<HTMLSpanElement>(".match-info")!;
  const replaceInput = replaceRowEl.querySelector<HTMLInputElement>(".replace-input")!;
  const replaceOneBtn = replaceRowEl.querySelector<HTMLButtonElement>(".replace-one-btn")!;
  const replaceAllBtn = replaceRowEl.querySelector<HTMLButtonElement>(".replace-all-btn")!;

  queryInput.addEventListener("input", () => {
    findMatches(queryInput.value);
    updateMatchInfo(matchInfo);
    highlightCurrent();
  });

  queryInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideSearch();
    if (e.key === "Enter") {
      if (e.shiftKey) goToPrev(); else goToNext();
      updateMatchInfo(matchInfo);
    }
  });

  caseBtn.addEventListener("click", () => {
    caseSensitive = !caseSensitive;
    caseBtn.classList.toggle("active", caseSensitive);
    findMatches(queryInput.value);
    updateMatchInfo(matchInfo);
  });

  regexBtn.addEventListener("click", () => {
    useRegex = !useRegex;
    regexBtn.classList.toggle("active", useRegex);
    findMatches(queryInput.value);
    updateMatchInfo(matchInfo);
  });

  prevBtn.addEventListener("click", () => { goToPrev(); updateMatchInfo(matchInfo); });
  nextBtn.addEventListener("click", () => { goToNext(); updateMatchInfo(matchInfo); });
  closeBtn.addEventListener("click", () => hideSearch());

  replaceToggleBtn.addEventListener("click", () => {
    replaceMode = !replaceMode;
    if (replaceMode) {
      replaceRowEl?.classList.remove("hidden");
    } else {
      replaceRowEl?.classList.add("hidden");
    }
  });

  replaceOneBtn.addEventListener("click", () => {
    replaceOne(replaceInput.value);
    findMatches(queryInput.value);
    updateMatchInfo(matchInfo);
  });

  replaceAllBtn.addEventListener("click", () => {
    replaceAll(queryInput.value, replaceInput.value);
    findMatches(queryInput.value);
    updateMatchInfo(matchInfo);
  });
}

function findMatches(query: string): void {
  matches = [];
  currentMatchIndex = -1;
  if (!view || !query) return;

  const doc = view.state.doc;
  const text = doc.textContent;

  try {
    let pattern: RegExp;
    if (useRegex) {
      pattern = new RegExp(query, caseSensitive ? "g" : "gi");
    } else {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      pattern = new RegExp(escaped, caseSensitive ? "g" : "gi");
    }

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({ from: match.index + 1, to: match.index + match[0].length + 1 });
      if (match[0].length === 0) break;
    }
  } catch {
    // invalid regex
  }

  if (matches.length > 0) currentMatchIndex = 0;
}

function updateMatchInfo(el: HTMLSpanElement): void {
  if (matches.length === 0) {
    el.textContent = "0/0";
  } else {
    el.textContent = `${currentMatchIndex + 1}/${matches.length}`;
  }
}

function goToNext(): void {
  if (matches.length === 0) return;
  currentMatchIndex = (currentMatchIndex + 1) % matches.length;
  highlightCurrent();
}

function goToPrev(): void {
  if (matches.length === 0) return;
  currentMatchIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
  highlightCurrent();
}

function highlightCurrent(): void {
  if (!view || currentMatchIndex < 0 || currentMatchIndex >= matches.length) return;
  const match = matches[currentMatchIndex];
  const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, match.from, match.to));
  view.dispatch(tr.scrollIntoView());
  view.focus();
}

function replaceOne(replaceText: string): void {
  if (!view || currentMatchIndex < 0 || currentMatchIndex >= matches.length) return;
  const match = matches[currentMatchIndex];
  const tr = view.state.tr.replaceWith(match.from, match.to, view.state.schema.text(replaceText));
  view.dispatch(tr);
}

function replaceAll(query: string, replaceText: string): void {
  if (!view || matches.length === 0) return;
  let tr = view.state.tr;
  let offset = 0;
  for (const match of matches) {
    const from = match.from + offset;
    const to = match.to + offset;
    tr = tr.replaceWith(from, to, view.state.schema.text(replaceText));
    offset += replaceText.length - (match.to - match.from);
  }
  view.dispatch(tr);
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/search/
git commit -m "feat: 검색/치환 기능"
```

---

## Task 18: 이미지 핸들러

**Files:**
- Create: `src/editor/image-handler.ts`

### Steps

- [ ] **Step 1: image-handler.ts 작성**

```typescript
// src/editor/image-handler.ts
import { EditorView } from "prosemirror-view";
import { invoke } from "@tauri-apps/api/core";
import { editorSchema } from "./schema";

export function setupImageHandler(view: EditorView, getDocDir: () => string | null): void {
  view.dom.addEventListener("paste", (event: Event) => {
    const e = event as ClipboardEvent;
    handlePaste(view, e, getDocDir);
  });

  view.dom.addEventListener("drop", (event: Event) => {
    const e = event as DragEvent;
    handleDrop(view, e, getDocDir);
  });
}

async function handlePaste(
  view: EditorView,
  event: ClipboardEvent,
  getDocDir: () => string | null,
): Promise<void> {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (const item of Array.from(items)) {
    if (item.type.startsWith("image/")) {
      event.preventDefault();
      const blob = item.getAsFile();
      if (!blob) continue;
      const buffer = await blob.arrayBuffer();
      const data = Array.from(new Uint8Array(buffer));
      const docDir = getDocDir();
      if (!docDir) return;

      const relativePath: string = await invoke("save_image_to_assets", {
        docDir,
        imageData: data,
        originalName: null,
      });

      insertImage(view, relativePath);
      return;
    }
  }
}

async function handleDrop(
  view: EditorView,
  event: DragEvent,
  getDocDir: () => string | null,
): Promise<void> {
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;

  for (const file of Array.from(files)) {
    if (!file.type.startsWith("image/")) continue;
    event.preventDefault();
    const buffer = await file.arrayBuffer();
    const data = Array.from(new Uint8Array(buffer));
    const docDir = getDocDir();
    if (!docDir) return;

    const relativePath: string = await invoke("save_image_to_assets", {
      docDir,
      imageData: data,
      originalName: file.name,
    });

    insertImage(view, relativePath);
  }
}

function insertImage(view: EditorView, src: string): void {
  const node = editorSchema.nodes.image.create({ src, alt: "", title: null });
  const tr = view.state.tr.replaceSelectionWith(node);
  view.dispatch(tr);
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/editor/image-handler.ts
git commit -m "feat: 이미지 붙여넣기/드래그앤드롭 핸들러"
```

---

## Task 19: 테마 시스템

**Files:**
- Create: `src/themes/light.css`
- Create: `src/themes/dark.css`
- Create: `src/themes/loader.ts`

### Steps

- [ ] **Step 1: light.css 작성**

```css
/* src/themes/light.css */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f7f7f7;
  --bg-tertiary: #ebebeb;
  --text-primary: #1a1a1a;
  --text-secondary: #6b6b6b;
  --accent: #4a9eff;
  --border: #e0e0e0;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-size: 16px;
  --code-font-family: "SF Mono", "Fira Code", "Consolas", monospace;
}
```

- [ ] **Step 2: dark.css 작성**

```css
/* src/themes/dark.css */
:root {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d2d;
  --text-primary: #d4d4d4;
  --text-secondary: #808080;
  --accent: #569cd6;
  --border: #3e3e3e;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-size: 16px;
  --code-font-family: "SF Mono", "Fira Code", "Consolas", monospace;
}
```

- [ ] **Step 3: loader.ts 작성**

```typescript
// src/themes/loader.ts

let currentThemeLink: HTMLLinkElement | null = null;

const BUILTIN_THEMES: Record<string, string> = {
  light: "/src/themes/light.css",
  dark: "/src/themes/dark.css",
};

export function loadTheme(themeName: string): void {
  if (currentThemeLink) {
    currentThemeLink.remove();
    currentThemeLink = null;
  }

  const href = BUILTIN_THEMES[themeName];
  if (!href) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  currentThemeLink = link;
}

export function loadCustomTheme(cssPath: string): void {
  if (currentThemeLink) {
    currentThemeLink.remove();
    currentThemeLink = null;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = cssPath;
  document.head.appendChild(link);
  currentThemeLink = link;
}

export function detectSystemTheme(): string {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function watchSystemTheme(onChange: (theme: string) => void): void {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    onChange(e.matches ? "dark" : "light");
  });
}

export function applyFontOverride(fontFamily: string | null, fontSize: number | null): void {
  const root = document.documentElement;
  if (fontFamily) {
    root.style.setProperty("--font-family", fontFamily);
  }
  if (fontSize) {
    root.style.setProperty("--font-size", `${fontSize}px`);
  }
}
```

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: 커밋**

```bash
git add src/themes/
git commit -m "feat: 라이트/다크 테마 + 테마 로더"
```

---

## Task 20: 앱 설정 모듈

**Files:**
- Create: `src/settings/index.ts`

### Steps

- [ ] **Step 1: settings/index.ts 작성**

```typescript
// src/settings/index.ts
import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "../types";

const DEFAULT_SETTINGS: AppSettings = {
  fontFamily: null,
  fontSize: 16,
  theme: "system",
  sidebarVisible: true,
  tocVisible: true,
};

let currentSettings: AppSettings = DEFAULT_SETTINGS;

export function getSettings(): AppSettings {
  return currentSettings;
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const json: string = await invoke("load_settings");
    const parsed = JSON.parse(json);
    currentSettings = {
      fontFamily: parsed.fontFamily ?? DEFAULT_SETTINGS.fontFamily,
      fontSize: parsed.fontSize ?? DEFAULT_SETTINGS.fontSize,
      theme: parsed.theme ?? DEFAULT_SETTINGS.theme,
      sidebarVisible: parsed.sidebarVisible ?? DEFAULT_SETTINGS.sidebarVisible,
      tocVisible: parsed.tocVisible ?? DEFAULT_SETTINGS.tocVisible,
    };
  } catch {
    currentSettings = DEFAULT_SETTINGS;
  }
  return currentSettings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  currentSettings = settings;
  const json = JSON.stringify(settings, null, 2);
  await invoke("save_settings", { settingsJson: json });
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<void> {
  const updated: AppSettings = { ...currentSettings, ...partial };
  await saveSettings(updated);
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/settings/
git commit -m "feat: 앱 설정 로드/저장 모듈"
```

---

## Task 21: app.ts — 전체 통합

**Files:**
- Modify: `src/app.ts`

### Steps

- [ ] **Step 1: app.ts 전체 통합 작성**

```typescript
// src/app.ts
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { createEditor, type Editor } from "./editor/index";
import { setupImageHandler } from "./editor/image-handler";
import { initSidebar, toggleSidebar, setSidebarVisible, setSidebarTitle, renderTree, setActiveFile } from "./sidebar/index";
import { initTabBar, openTab, closeTab, getActiveTab, markDirty, markClean, getTabState } from "./tabs/index";
import { initToc, setEditorView, updateToc, toggleToc, setTocVisible } from "./toc/index";
import { initSearch, updateEditorView, showSearch, showReplace, hideSearch } from "./search/index";
import { loadTheme, detectSystemTheme, watchSystemTheme, applyFontOverride } from "./themes/loader";
import { loadSettings, updateSettings, getSettings } from "./settings/index";
import type { FileEntry } from "./types";

let editor: Editor | null = null;
let currentDir: string | null = null;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

async function init(): Promise<void> {
  const settings = await loadSettings();

  // Theme
  const themeName = settings.theme === "system" ? detectSystemTheme() : settings.theme;
  loadTheme(themeName);
  watchSystemTheme((theme) => {
    if (getSettings().theme === "system") loadTheme(theme);
  });
  applyFontOverride(settings.fontFamily, settings.fontSize);

  // UI elements
  const sidebarEl = document.getElementById("sidebar")!;
  const fileTreeEl = document.getElementById("file-tree")!;
  const tabBarEl = document.getElementById("tab-bar")!;
  const editorContainer = document.getElementById("editor-container")!;
  const tocPanel = document.getElementById("toc-panel")!;
  const tocContent = document.getElementById("toc-content")!;
  const searchBar = document.getElementById("search-bar")!;
  const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn")!;
  const sidebarCloseBtn = document.getElementById("sidebar-close-btn")!;
  const tocToggleBtn = document.getElementById("toc-toggle-btn")!;
  const tocCloseBtn = document.getElementById("toc-close-btn")!;
  const newFileBtn = document.getElementById("new-file-btn")!;

  // Sidebar
  initSidebar(sidebarEl, fileTreeEl, handleFileSelect);
  setSidebarVisible(settings.sidebarVisible);

  // Tabs
  initTabBar(tabBarEl, handleTabSelect, handleTabClose);

  // TOC
  initToc(tocPanel, tocContent);
  setTocVisible(settings.tocVisible);

  // Editor
  editor = createEditor(editorContainer, handleEditorChange);
  initSearch(searchBar, editor.view);
  setupImageHandler(editor.view, () => {
    const tab = getActiveTab();
    if (!tab) return null;
    const parts = tab.filePath.split("/");
    parts.pop();
    return parts.join("/");
  });
  setEditorView(editor.view);

  // Toggle buttons
  sidebarToggleBtn.addEventListener("click", () => {
    toggleSidebar();
    updateSettings({ sidebarVisible: !getSettings().sidebarVisible });
  });
  sidebarCloseBtn.addEventListener("click", () => {
    toggleSidebar();
    updateSettings({ sidebarVisible: false });
  });
  tocToggleBtn.addEventListener("click", () => {
    toggleToc();
    updateSettings({ tocVisible: !getSettings().tocVisible });
  });
  tocCloseBtn.addEventListener("click", () => {
    toggleToc();
    updateSettings({ tocVisible: false });
  });

  // New file button
  newFileBtn.addEventListener("click", handleNewFile);

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "f") {
      e.preventDefault();
      showSearch();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "h") {
      e.preventDefault();
      showReplace();
    }
    if (e.key === "Escape") {
      hideSearch();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "o") {
      e.preventDefault();
      handleOpenFolder();
    }
  });
}

async function handleOpenFolder(): Promise<void> {
  const selected = await open({ directory: true, multiple: false });
  if (!selected) return;
  const dirPath = selected as string;
  currentDir = dirPath;
  const parts = dirPath.split("/");
  setSidebarTitle(parts[parts.length - 1] ?? dirPath);
  const entries: FileEntry[] = await invoke("read_directory", { dirPath });
  renderTree(entries);
}

async function handleFileSelect(filePath: string, fileName: string): Promise<void> {
  const existingState = getTabState();
  const existingTab = existingState.tabs.find((t) => t.filePath === filePath);
  if (existingTab) {
    openTab(filePath, fileName, existingTab.content);
    loadTabInEditor(existingTab.content);
    setActiveFile(filePath);
    return;
  }

  const content: string = await invoke("read_file", { filePath });
  openTab(filePath, fileName, content);
  loadTabInEditor(content);
  setActiveFile(filePath);
}

function handleTabSelect(filePath: string): void {
  const tab = getTabState().tabs.find((t) => t.filePath === filePath);
  if (tab) {
    loadTabInEditor(tab.content);
    setActiveFile(filePath);
  }
}

function handleTabClose(id: string, isDirty: boolean): void {
  if (isDirty) {
    const confirmed = window.confirm("저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?");
    if (!confirmed) return;
  }
  closeTab(id);
  const active = getActiveTab();
  if (active) {
    loadTabInEditor(active.content);
    setActiveFile(active.filePath);
  } else {
    editor?.setContent("");
    setActiveFile(null);
  }
}

function loadTabInEditor(content: string): void {
  if (!editor) return;
  editor.setContent(content);
  updateEditorView(editor.view);
  updateToc(editor.view);
}

function handleEditorChange(): void {
  const tab = getActiveTab();
  if (!tab || !editor) return;
  markDirty(tab.id);

  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => handleSave(), 1000);
}

async function handleSave(): Promise<void> {
  const tab = getActiveTab();
  if (!tab || !editor) return;
  const content = editor.getContent();
  await invoke("write_file", { filePath: tab.filePath, content });
  markClean(tab.id, content);
}

async function handleNewFile(): Promise<void> {
  if (!currentDir) return;
  const fileName = prompt("새 파일 이름:");
  if (!fileName) return;
  try {
    const filePath: string = await invoke("create_md_file", { dirPath: currentDir, fileName });
    const entries: FileEntry[] = await invoke("read_directory", { dirPath: currentDir });
    renderTree(entries);
    const name = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
    await handleFileSelect(filePath, name);
  } catch (err) {
    alert(`파일 생성 실패: ${err}`);
  }
}

document.addEventListener("DOMContentLoaded", init);
```

- [ ] **Step 2: dialog 플러그인 설치**

```bash
npm install @tauri-apps/plugin-dialog
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 앱 실행 확인**

```bash
npm run tauri dev
```

Expected: 앱이 열리고 Cmd+O로 폴더를 열면 사이드바에 파일 트리가 보이고, `.md` 파일을 클릭하면 에디터에 WYSIWYG로 렌더링됨.

- [ ] **Step 5: 커밋**

```bash
git add src/app.ts package.json package-lock.json
git commit -m "feat: 앱 전체 통합 — 사이드바, 탭, 에디터, TOC, 검색, 테마"
```

---

## Task 22: PDF 내보내기

**Files:**
- Modify: `src/app.ts`

### Steps

- [ ] **Step 1: app.ts에 PDF 내보내기 함수 추가**

`handleSave` 함수 아래에 추가:

```typescript
async function handleExportPdf(): Promise<void> {
  window.print();
}

async function handleExportHtml(): Promise<void> {
  const tab = getActiveTab();
  if (!tab || !editor) return;

  const { save } = await import("@tauri-apps/plugin-dialog");
  const filePath = await save({
    filters: [{ name: "HTML", extensions: ["html"] }],
  });
  if (!filePath) return;

  const container = document.getElementById("editor-container")!;
  const htmlContent = container.innerHTML;
  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((r) => r.cssText).join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");

  await invoke("export_html", { filePath, htmlContent: htmlContent, cssContent: styles });
}
```

- [ ] **Step 2: 키보드 단축키에 내보내기 추가**

`document.addEventListener("keydown"` 블록 내에 추가:

```typescript
if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "e") {
  e.preventDefault();
  handleExportHtml();
}
```

- [ ] **Step 3: 타입 체크 및 빌드 확인**

```bash
npx tsc --noEmit
npm run tauri dev
```

- [ ] **Step 4: 커밋**

```bash
git add src/app.ts
git commit -m "feat: PDF/HTML 내보내기"
```

---

## Task 23: Tauri 메뉴 (테마 전환, 폰트 설정, 내보내기)

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/app.ts`

### Steps

- [ ] **Step 1: lib.rs에 메뉴 구성 추가**

```rust
// src-tauri/src/lib.rs
mod commands;

use tauri::{
    menu::{MenuBuilder, SubmenuBuilder},
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let files: Vec<&str> = args.iter()
                    .skip(1)
                    .map(|s| s.as_str())
                    .filter(|s| s.ends_with(".md"))
                    .collect();
                if !files.is_empty() {
                    let _ = window.emit("open-files", files);
                }
            }
        }))
        .setup(|app| {
            let file_menu = SubmenuBuilder::new(app, "파일")
                .text("open-folder", "폴더 열기")
                .separator()
                .text("export-html", "HTML로 내보내기")
                .text("export-pdf", "PDF로 내보내기")
                .separator()
                .quit()
                .build()?;

            let theme_menu = SubmenuBuilder::new(app, "테마")
                .text("theme-system", "시스템 설정")
                .text("theme-light", "라이트")
                .text("theme-dark", "다크")
                .build()?;

            let font_menu = SubmenuBuilder::new(app, "폰트")
                .text("font-select", "폰트 선택...")
                .text("font-size-up", "크기 키우기")
                .text("font-size-down", "크기 줄이기")
                .text("font-size-reset", "크기 초기화")
                .build()?;

            let view_menu = SubmenuBuilder::new(app, "보기")
                .item(&theme_menu)
                .item(&font_menu)
                .separator()
                .text("toggle-sidebar", "사이드바 토글")
                .text("toggle-toc", "목차 토글")
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&file_menu)
                .item(&view_menu)
                .build()?;

            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.emit("menu-event", event.id().0.as_str());
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::fs::read_directory,
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::create_md_file,
            commands::fs::load_settings,
            commands::fs::save_settings,
            commands::image::save_image_to_assets,
            commands::image::copy_image_to_assets,
            commands::font::list_system_fonts,
            commands::export::export_html,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: app.ts에 메뉴 이벤트 리스너 추가**

`init()` 함수 내 하단에 추가:

```typescript
import { listen } from "@tauri-apps/api/event";

// Inside init(), after keyboard shortcuts:
listen<string>("menu-event", async (event) => {
  const menuId = event.payload;
  switch (menuId) {
    case "open-folder":
      await handleOpenFolder();
      break;
    case "export-html":
      await handleExportHtml();
      break;
    case "export-pdf":
      handleExportPdf();
      break;
    case "theme-system":
      loadTheme(detectSystemTheme());
      await updateSettings({ theme: "system" });
      break;
    case "theme-light":
      loadTheme("light");
      await updateSettings({ theme: "light" });
      break;
    case "theme-dark":
      loadTheme("dark");
      await updateSettings({ theme: "dark" });
      break;
    case "font-select":
      await handleFontSelect();
      break;
    case "font-size-up":
      await handleFontSizeChange(2);
      break;
    case "font-size-down":
      await handleFontSizeChange(-2);
      break;
    case "font-size-reset":
      await updateSettings({ fontSize: 16 });
      applyFontOverride(null, 16);
      break;
    case "toggle-sidebar":
      toggleSidebar();
      await updateSettings({ sidebarVisible: !getSettings().sidebarVisible });
      break;
    case "toggle-toc":
      toggleToc();
      await updateSettings({ tocVisible: !getSettings().tocVisible });
      break;
  }
});

// Add open-files event listener for single-instance
listen<string[]>("open-files", async (event) => {
  for (const filePath of event.payload) {
    const parts = filePath.split("/");
    const fileName = parts[parts.length - 1] ?? "untitled.md";
    await handleFileSelect(filePath, fileName);
  }
});
```

- [ ] **Step 3: 폰트 선택 및 크기 변경 함수 추가**

`app.ts`에 추가:

```typescript
async function handleFontSelect(): Promise<void> {
  const fonts: string[] = await invoke("list_system_fonts");
  const currentFont = getSettings().fontFamily ?? "시스템 기본";
  const selected = prompt(`폰트 선택 (현재: ${currentFont})\n\n사용 가능한 폰트:\n${fonts.slice(0, 30).join(", ")}...\n\n폰트 이름 입력:`);
  if (!selected) return;
  if (fonts.includes(selected)) {
    await updateSettings({ fontFamily: selected });
    applyFontOverride(selected, null);
  } else {
    alert("올바른 폰트 이름이 아닙니다.");
  }
}

async function handleFontSizeChange(delta: number): Promise<void> {
  const current = getSettings().fontSize;
  const newSize = Math.max(10, Math.min(32, current + delta));
  await updateSettings({ fontSize: newSize });
  applyFontOverride(null, newSize);
}
```

- [ ] **Step 4: 빌드 확인**

```bash
cd /Users/kangmin/dev/markdown-editor/src-tauri
cargo check
cd /Users/kangmin/dev/markdown-editor
npx tsc --noEmit
npm run tauri dev
```

Expected: 앱 메뉴에 파일/보기 메뉴가 보이고, 테마 전환/폰트 설정이 동작함.

- [ ] **Step 5: 커밋**

```bash
git add src-tauri/src/lib.rs src/app.ts
git commit -m "feat: 앱 메뉴 — 테마 전환, 폰트 설정, 내보내기"
```

---

## Task 24: 최종 통합 테스트

**Files:** 없음 (수동 테스트)

### Steps

- [ ] **Step 1: 앱 실행**

```bash
cd /Users/kangmin/dev/markdown-editor
npm run tauri dev
```

- [ ] **Step 2: 기능 검증 체크리스트**

아래를 순서대로 확인:

1. Cmd+O로 폴더 열기 → 사이드바에 `.md` 파일 트리 표시
2. 파일 클릭 → WYSIWYG 에디터에서 렌더링
3. 여러 파일 열기 → 탭이 생성되고 전환 가능
4. 에디터에서 `# ` 입력 → 헤딩으로 변환
5. Cmd+B, Cmd+I → 볼드, 이탤릭 토글
6. 편집 후 1초 → 자동 저장, 탭의 ● 표시 사라짐
7. Cmd+F → 검색 바, 검색어 입력 시 매치 하이라이트
8. 치환 버튼 클릭 → 치환 모드
9. 사이드바 토글 버튼 → 사이드바 열기/닫기
10. 목차 토글 → TOC 패널 열기/닫기, 헤딩 클릭 시 스크롤
11. 메뉴 > 보기 > 테마 > 다크 → 다크 테마 적용
12. 메뉴 > 보기 > 폰트 → 폰트 변경 가능
13. 새 파일 버튼(+) → 파일 생성 후 자동 열기
14. Cmd+Shift+E → HTML 내보내기

- [ ] **Step 3: 빌드 테스트**

```bash
npm run tauri build
```

Expected: `src-tauri/target/release/bundle/` 아래에 앱 번들 생성.

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "chore: 최종 통합 테스트 완료"
```

---

## 실행 순서 요약

| Task | 내용 | 의존성 |
|------|------|--------|
| 1 | 프로젝트 초기화 | 없음 |
| 2 | 공유 타입 정의 | Task 1 |
| 3 | Rust: 파일 시스템 커맨드 | Task 1 |
| 4 | Rust: 이미지 복사 커맨드 | Task 3 |
| 5 | Rust: 시스템 폰트 조회 | Task 3 |
| 6 | Rust: HTML 내보내기 | Task 3 |
| 7 | Rust: 앱 설정 + 단일 인스턴스 | Task 3 |
| 8 | ProseMirror: 스키마 | Task 1 |
| 9 | ProseMirror: 파서/시리얼라이저 | Task 8 |
| 10 | ProseMirror: 플러그인 | Task 8 |
| 11 | ProseMirror: 에디터 초기화 | Task 9, 10 |
| 12 | 앱 레이아웃 HTML/CSS | Task 1 |
| 13 | 탭 상태 관리 | Task 2 |
| 14 | 탭 바 UI | Task 13 |
| 15 | 사이드바 파일 트리 | Task 2 |
| 16 | 목차(TOC) 패널 | Task 2 |
| 17 | 검색/치환 | Task 11 |
| 18 | 이미지 핸들러 | Task 4, 11 |
| 19 | 테마 시스템 | Task 1 |
| 20 | 앱 설정 모듈 | Task 7 |
| 21 | app.ts 전체 통합 | Task 11-20 |
| 22 | PDF/HTML 내보내기 | Task 6, 21 |
| 23 | ��� 메뉴 | Task 21 |
| 24 | 최종 통합 테스트 | Task 23 |

병렬 실행 가능 그룹:
- **Group A (Rust):** Task 3 → Task 4, 5, 6, 7 (병렬)
- **Group B (에디터):** Task 8 → Task 9, 10 (병렬) → Task 11
- **Group C (UI):** Task 12, 13, 14, 15, 16, 19 (대부분 병렬)
- **통합:** Task 17, 18, 20, 21, 22, 23, 24 (순차)
