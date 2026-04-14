# Typora 스타일 경량 마크다운 에디터 설계

## 개요

Typora 스타일의 WYSIWYG 마크다운 에디터 데스크톱 앱. 주요 용도는 기존 `.md` 파일을 열어서 보고 가볍게 편집하는 것. 개인 노트/메모와 기술 문서 작성에 최적화. 이미지 지원 포함. macOS와 Windows 크로스 플랫폼.

## 기술 스택

| 영역 | 기술 | 선택 이유 |
|------|------|-----------|
| 앱 프레임워크 | Tauri v2 (Rust) | 경량 (~8MB), 크로스 플랫폼, 네이티브 웹뷰 |
| 에디터 엔진 | ProseMirror (직접 구성) | 래퍼 없이 최소 오버헤드, 마크다운 ↔ WYSIWYG 정교한 변환 |
| 프론트엔드 | TypeScript (Vanilla) | UI 프레임워크 없이 최대한 가볍게 |
| 빌드 도구 | Vite | 빠른 개발 서버, 효율적 번들링 |
| 테마 시스템 | CSS Variables | 런타임 테마 전환, 커스텀 테마 지원 |

### ProseMirror 패키지

- `prosemirror-model` — 문서 스키마 정의
- `prosemirror-state` — 에디터 상태 관리
- `prosemirror-view` — DOM 렌더링
- `prosemirror-markdown` — 마크다운 파싱/직렬화
- `prosemirror-keymap` — 키보드 단축키
- `prosemirror-inputrules` — 입력 자동 변환 규칙
- `prosemirror-commands` — 기본 편집 커맨드
- `prosemirror-history` — 실행 취소/다시 실행

## 아키텍처

### 데이터 흐름

```
파일 열기:
  사이드바 파일 클릭 → Tauri fs API로 .md 읽기 → prosemirror-markdown 파서 → ProseMirror Doc → WYSIWYG 렌더링

파일 저장:
  ProseMirror Doc → prosemirror-markdown 시리얼라이저 → .md 텍스트 → Tauri fs API로 파일 쓰기
```

### 프론트엔드 ↔ Rust 통신

Tauri의 `invoke` API를 통해 프론트엔드에서 Rust 커맨드를 호출한다. Rust 백엔드가 담당하는 영역:

- 파일/폴더 읽기·쓰기
- 디렉토리 트리 조회
- 파일 변경 감시 (watch)
- 이미지 파일 복사 (assets/ 폴더)
- 시스템 폰트 목록 조회
- PDF 내보내기 (webview print)
- 파일 연결 등록 및 단일 인스턴스 처리

## UI 구성

### 레이아웃

```
[사이드바 토글] [          탭 바          ] [TOC 토글]
[             ] [      검색/치환 바       ] [        ]
[  파일 트리   ] [    에디터 (WYSIWYG)     ] [  목차   ]
[             ] [                        ] [        ]
```

### 사이드바 (파일 트리)

- 왼쪽 패널, 토글 버튼으로 열기/닫기
- 네이티브 디렉토리 선택 다이얼로그로 폴더 열기
- `.md` 파일만 필터링하여 트리 구조로 표시
- 폴더 접기/펼치기 지원
- 파일 클릭 시 에디터에서 열기 (새 탭)
- 새 파일 만들기: 사이드바 상단에 새 파일 버튼, 클릭 시 파일명 입력 → 해당 폴더에 빈 `.md` 파일 생성 + 자동으로 새 탭에서 열기

### 탭 바

- 상단에 열린 파일 탭 표시
- 수정된 파일은 닫기 버튼 옆에 점(●) 표시
- 드래그로 탭 순서 변경
- 탭 닫기 시 수정 사항이 있으면 저장 여부 확인

### 에디터 영역

- 중앙 WYSIWYG 편집 영역
- `max-width`와 적절한 여백으로 가독성 확보
- Typora 스타일: 마크다운 입력 시 즉시 렌더링

### 목차(TOC) 패널

- 오른쪽 패널, 토글 버튼으로 열기/닫기
- 문서 내 헤딩을 파싱하여 트리 구조로 표시
- 헤딩 레벨에 따른 들여쓰기
- 클릭 시 해당 위치로 스크롤

### 검색/치환 바

- `Ctrl/Cmd+F`로 에디터 상단에 슬라이드
- 검색 바 내에 치환 모드 토글 버튼
- `Ctrl/Cmd+H` 단축키로도 치환 모드 전환 가능
- 대소문자 구분 토글
- 정규식 토글
- 매치 하이라이트 및 매치 간 이동 (위/아래 화살표)
- 단일 치환 / 전체 치환
- `ESC`로 검색 바 닫기

## 에디터 코어

### 마크다운 스키마

지원하는 노드 타입:
- 헤딩 (h1~h6)
- 단락
- 불릿 리스트 / 순서 리스트
- 코드 블록 (언어 지정)
- 인용 (blockquote)
- 수평선
- 이미지
- 테이블

지원하는 마크 타입:
- 볼드 (`**text**`)
- 이탤릭 (`*text*`)
- 인라인 코드 (`` `code` ``)
- 링크 (`[text](url)`)
- 취소선 (`~~text~~`)

### 입력 규칙 (Typora 스타일)

마크다운 문법 입력 시 자동으로 WYSIWYG 요소로 변환:
- `# ` → h1, `## ` → h2, ... `###### ` → h6
- `- ` 또는 `* ` → 불릿 리스트
- `1. ` → 순서 리스트
- `> ` → 인용
- `` ``` `` → 코드 블록
- `---` → 수평선

### 키보드 단축키

- `Cmd/Ctrl+B` — 볼드
- `Cmd/Ctrl+I` — 이탤릭
- `Cmd/Ctrl+S` — 저장
- `Cmd/Ctrl+F` — 검색
- `Cmd/Ctrl+H` — 치환
- `Cmd/Ctrl+Z` — 실행 취소
- `Cmd/Ctrl+Shift+Z` — 다시 실행

## 파일 시스템

### 파일 읽기/쓰기

- Tauri v2 fs API 사용
- 파일 열기: 네이티브 파일/디렉토리 다이얼로그
- `.md` 파일 필터링

### 자동 저장

- 편집 후 1초 디바운스로 자동 저장
- `Cmd/Ctrl+S`로 수동 저장
- 저장 시 ProseMirror Doc → markdown serializer → 파일 쓰기

### 파일 감시 (Watch)

- 열린 파일을 외부에서 수정하면 에디터에 반영
- 에디터에서 편집 중인 경우 충돌 알림

### 파일 연결 및 단일 인스턴스

- `tauri.conf.json`의 `fileAssociations`로 `.md` 파일을 앱에 등록
- macOS: Finder에서 `.md` 더블클릭 시 이 앱으로 열기
- Windows: 탐색기에서 `.md` 더블클릭 시 이 앱으로 열기
- `tauri-plugin-single-instance` 사용
- 앱이 이미 실행 중이면 기존 인스턴스에 새 탭으로 파일 열기
- 여러 파일 선택 후 열기 시 각각 탭으로 열기

## 이미지 처리

### 이미지 삽입

붙여넣기(paste) 이벤트 처리 우선순위:
1. 클립보드에 이미지 바이너리가 있으면 → `assets/` 폴더에 저장 + 상대경로 삽입
2. 이미지 바이너리 없고 이미지 URL 텍스트만 있으면 → `![](url)` 삽입

지원 소스:
- 로컬 파일 드래그앤드롭
- 클립보드 이미지 (스크린샷)
- 웹 브라우저에서 복사한 이미지

### 이미지 저장

- 저장 위치: 문서와 같은 경로의 `assets/` 폴더
- `assets/` 폴더가 없으면 자동 생성
- 마크다운에 상대경로로 삽입: `![](assets/filename.png)`

### 파일 이름 규칙

- 파일 드래그앤드롭: `{timestamp}-{원본파일명}.{확장자}`
- 클립보드 이미지: `{timestamp}-clipboard.png`
- 예시: `1713072000-screenshot.png`, `1713072000-clipboard.png`

### 이미지 렌더링

- 에디터 내에서 인라인으로 이미지 표시
- 상대경로 및 절대경로 모두 지원

## 테마 시스템

### CSS Variables 기반

테마 파일은 CSS Variables로 색상, 폰트, 간격 등을 정의한다:
- `--bg-primary`, `--bg-secondary` — 배경색
- `--text-primary`, `--text-secondary` — 텍스트 색상
- `--accent` — 강조색
- `--font-family`, `--font-size` — 기본 폰트 (사용자 오버라이드 가능)
- `--code-font-family` — 코드 블록 폰트
- 기타 간격, 테두리 등

### 기본 테마

- `light.css` — 라이트 테마
- `dark.css` — 다크 테마
- 시스템 `prefers-color-scheme` 감지하여 자동 선택

### 커스텀 테마

- 앱 설정 디렉토리 내 `themes/` 폴더에 CSS 파일 배치
  - macOS: `~/Library/Application Support/markdown-editor/themes/`
  - Windows: `%APPDATA%/markdown-editor/themes/`
- 앱 메뉴에서 테마 선택 (재시작 없이 즉시 적용)

### 폰트 설정

- 테마에 기본 폰트가 정의됨
- 사용자가 메뉴에서 시스템 폰트 목록 드롭다운으로 폰트 선택 가능
- 폰트 크기도 메뉴에서 설정 가능
- 사용자 설정이 테마 기본값을 오버라이드
- 폰트 목록 조회:
  - macOS: CoreText API
  - Windows: DirectWrite API
- 설정은 앱 설정 파일에 영구 저장

## 내보내기

### PDF 내보내기

- Tauri webview의 print 기능 활용
- 현재 에디터 렌더링(테마 포함)을 그대로 PDF로 변환

### HTML 내보내기

- ProseMirror Doc → HTML 직렬화
- 현재 적용된 테마 CSS를 인라인으로 포함
- 단일 `.html` 파일로 저장 (외부 의존성 없이 열 수 있도록)

## 프로젝트 구조

```
markdown-editor/
├── src-tauri/                  # Rust 백엔드
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   └── commands/           # Tauri 커맨드
│   │       ├── fs.rs           # 파일/폴더 읽기·쓰기·감시
│   │       ├── image.rs        # 이미지 복사 (assets/)
│   │       ├── font.rs         # 시스템 폰트 목록 조회
│   │       └── export.rs       # PDF/HTML 내보내기
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                        # TypeScript 프론트엔드
│   ├── editor/                 # ProseMirror 에디터 모듈
│   │   ├── schema.ts           # 마크다운 스키마 정의
│   │   ├── plugins.ts          # 키맵, 입력 규칙
│   │   ├── search.ts           # 검색/치환 플러그인
│   │   └── index.ts            # 에디터 초기화
│   ├── sidebar/                # 파일 트리 사이드바
│   │   ├── file-tree.ts        # 트리 렌더링
│   │   └── index.ts
│   ├── tabs/                   # 탭 관리
│   │   ├── tab-bar.ts          # 탭 바 UI
│   │   ├── tab-state.ts        # 탭 상태 관리
│   │   └── index.ts
│   ├── toc/                    # 목차 패널
│   │   └── index.ts
│   ├── search/                 # 검색/치환 UI
│   │   └── index.ts
│   ├── themes/                 # 테마 CSS 파일
│   │   ├── light.css
│   │   ├── dark.css
│   │   └── loader.ts           # 테마 로더
│   ├── settings/               # 앱 설정 (폰트 등)
│   │   └── index.ts
│   ├── app.ts                  # 앱 진입점
│   └── styles/                 # 공통 스타일
│       └── base.css
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 예상 크기

- Tauri 앱 바이너리: ~8 MB
- 프론트엔드 번들 (gzipped): ~200 KB
- UI 프레임워크 의존성: 0 (Vanilla TypeScript)

## 비기능 요구사항

- macOS, Windows 크로스 플랫폼 지원
- 앱 시작 시간: 1초 이내
- 파일 열기/렌더링: 체감 지연 없음 (일반적인 .md 파일 기준)
- 편집 반응 속도: 키 입력 즉시 반영
