---
name: toc
description: 목차(TOC) 패널, 스크롤 스파이, 앵커 링크 이동 수정 시 사용.
---

# Table of Contents (TOC)

우측 패널에 heading 목록 표시. 스크롤 위치 추적 및 클릭 이동.

## 파일 구조

| 파일 | 역할 |
|------|------|
| `src/toc/index.ts` | TOC 추출, 렌더링, 스크롤 스파이, 클릭 이동 |

## 핵심 함수

- `updateToc(view)`: EditorView에서 heading 추출 → 렌더링 → 스크롤 스파이 설정
- `scrollToHeadingByIndex(tocIndex)`: 에디터/Raw 모드에 따라 해당 heading으로 스크롤
- `setupScrollSpy()`: editor-container 스크롤 이벤트 리스닝 → 현재 heading 하이라이트

## 스크롤 스파이 동작

1. editor-container의 `scroll` 이벤트 감지 (passive)
2. `querySelectorAll("h1, h2, h3, h4, h5, h6")`로 heading DOM 직접 검색
3. `getBoundingClientRect().top`으로 현재 보이는 heading 판별
4. TOC 항목에 `.active` 클래스 토글

## Raw 모드 대응

- `scrollToHeadingInRaw()`: `#`으로 시작하는 줄을 찾아 textarea 스크롤 위치 계산
- `highlightFromRaw()`: 스크롤 비율로 현재 heading 추정

## 앵커 링크 (app.ts 내)

`handleLinkClick(href)`:
- `#`으로 시작 → `scrollToAnchor()` → `normalizeAnchor()`로 slug 생성 후 heading 매칭
- `normalizeAnchor()`: 유니코드 지원 (`\p{L}\p{N}`), URL 디코딩, 소문자 변환
- 매칭 성공 → `container.scrollTo()` (editor-container 기준)

## TOC 자동 숨김 (app.ts)

- 앱 시작: `setTocVisible(false)` — 파일 없을 때 안 보임
- 파일 열기: `setTocVisible(true)`
- 모든 탭 닫기: `setTocVisible(false)`

## CSS 클래스

- `.toc-panel`, `.toc-panel.collapsed`, `.toc-header`, `.toc-title`, `.toc-content`
- `.toc-item`, `.toc-item.active` (accent 색상 + bg-tertiary + bold)
