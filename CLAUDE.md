# md-browser

Tauri v2 (Rust) + TypeScript + ProseMirror 기반 마크다운 에디터.

## 기술 스택

- **프론트엔드**: TypeScript, ProseMirror, markdown-it, mermaid, diff-match-patch
- **백엔드**: Rust, Tauri v2, font-kit
- **빌드**: Vite, cargo

## 개발 명령어

```bash
npm run dev          # Vite dev server
npm run tauri dev    # Tauri + Vite 개발 모드
npm run build        # 프론트엔드 빌드
cargo check --manifest-path src-tauri/Cargo.toml  # Rust 타입 체크
npx tsc --noEmit     # TypeScript 타입 체크
```

## Git

- 개인 계정 사용 (boring-km / kms0644804@naver.com)
- remote: `git@github-personal:boring-km/md-browser.git`
- 커밋 메시지: `feat:`, `fix:`, `refactor:`, `chore:` 등 conventional commits (한국어)

## 스킬 문서

기능별 수정 시 `.claude/skills/` 아래 해당 스킬 문서를 참조:

| 스킬 | 설명 |
|------|------|
| `editor-core` | ProseMirror 에디터 코어 (스키마, 파서, 시리얼라이저, 패치) |
| `sidebar-filetree` | 사이드바, 파일 트리, 햄버거 메뉴 |
| `tabs` | 탭 시스템 (dirty/unsaved 상태, git diff) |
| `toc` | 목차 패널, 스크롤 스파이, 앵커 링크 |
| `table-support` | 마크다운 표 파싱/렌더링/직렬화 |
| `mermaid` | Mermaid 다이어그램 렌더링 |
| `settings-theme` | 설정, 테마, 폰트, 최근 파일 |
| `search` | 검색/바꾸기 |
| `raw-mode` | Raw 마크다운 토글 |
| `multi-window` | 멀티 윈도우 |
| `rust-backend` | Tauri Rust 백엔드 (메뉴, 커맨드) |
| `styling` | CSS, 레이아웃, 아이콘 |
| `app-orchestration` | app.ts 메인 흐름, 단축키, 초기화 |

## 핵심 설계 원칙

- **원본 보존**: 파일 저장 시 diff-match-patch로 원본 포맷에 변경분만 패치
- **수동 저장**: Cmd+S로만 저장 (자동 저장 없음)
- **불변 데이터**: TabState 등 상태 객체는 항상 새로 생성
- **round-trip 보호**: serializerBaselines로 ProseMirror round-trip 차이 감지, 실제 편집 없으면 저장 스킵
