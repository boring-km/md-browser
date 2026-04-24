---
name: app-orchestration
description: app.ts 메인 흐름, 키보드 단축키, 이벤트 핸들러, 초기화 로직 수정 시 사용.
---

# App Orchestration (app.ts)

메인 진입점. 모든 모듈 초기화 및 이벤트 조율.

## init() 흐름

1. 설정 로드 → 테마 적용 → 폰트 오버라이드
2. DOM 요소 참조 확보
3. 버튼에 SVG 아이콘 설정
4. 사이드바, 탭바, TOC, 에디터, 검색 초기화
5. 토글 버튼 이벤트 바인딩 + `updatePanelButtons()`
6. 햄버거 메뉴 이벤트 바인딩
7. URL init data 처리 또는 lastOpenFolder 자동 열기
8. 키보드 단축키 등록
9. 네이티브 메뉴 이벤트 리스닝
10. single-instance open-files 이벤트 리스닝

## 키보드 단축키

| 단축키 | 동작 |
|--------|------|
| Cmd+S | 저장 |
| Cmd+F | 검색 |
| Cmd+H | 바꾸기 |
| Cmd+O | 폴더 열기 |
| Cmd+Shift+E | HTML 내보내기 |
| Esc | 검색 닫기 |

## 저장 흐름 (handleSave)

1. 활성 탭 확인
2. isUnsaved → save 다이얼로그 → 위치 선택 → markSaved
3. `editor.getContent()` → 마크다운 직렬화
4. write_file → markClean → diffStats 갱신

## 전역 상태

| 변수 | 용도 |
|------|------|
| `editor` | Editor 인스턴스 |
| `currentDir` | 현재 열린 폴더 경로 |
| `unsavedFileCounter` | 임시 파일 번호 |

## 링크 클릭 (handleLinkClick)

1. `#` → `scrollToAnchor()` (내부 앵커)
2. `http(s)://` → `open_url_in_browser` (외부 브라우저)
3. `.md/.markdown` → `handleFileSelect()` (에디터 내 열기)
4. 기타 → `open_with_default_app` (OS 기본 앱)
