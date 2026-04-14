---
name: search
description: 검색/바꾸기 기능 수정 시 사용.
---

# Search & Replace

에디터 내 텍스트 검색 및 바꾸기.

## 파일

`src/search/index.ts` (321줄)

## 기능

- **검색**: 대소문자 구분 토글, 정규식 토글
- **네비게이션**: 이전/다음 매치 이동 (Ctrl+G / Ctrl+Shift+G)
- **매치 카운터**: "3/15" 형태 표시
- **바꾸기**: 단건 바꾸기, 전체 바꾸기

## 키보드 단축키 (app.ts)

- `Cmd+F`: 검색 바 표시
- `Cmd+H`: 바꾸기 모드 표시
- `Esc`: 검색 바 닫기

## CSS 클래스

- `.search-bar`, `.search-bar.hidden`
- `.search-input`, `.search-btn`, `.search-btn.active`
- `.search-info`, `.search-replace-row`
