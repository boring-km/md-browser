---
name: tabs
description: 탭 시스템(열기, 닫기, 전환, dirty 상태, git diff 표시) 수정 시 사용.
---

# Tab Management

멀티 파일 편집을 위한 탭 인터페이스.

## 파일 구조

| 파일 | 역할 |
|------|------|
| `src/tabs/tab-state.ts` | 불변 탭 상태 관리. openTab, closeTab, markDirty, markClean, markSaved, updateDiffStats, updateTabContent |
| `src/tabs/tab-bar.ts` | 탭 바 UI 렌더링. 파일명, diff 통계, unsaved/dirty 표시, 닫기 버튼 |
| `src/tabs/index.ts` | 모듈 재export |

## TabData 인터페이스 (types.ts)

```typescript
interface TabData {
  id: string;          // filePath 또는 __unsaved__N
  filePath: string;
  fileName: string;
  content: string;
  isDirty: boolean;    // 수정됨 (파란 점 ●)
  isUnsaved: boolean;  // 저장 위치 미지정 (노란 점 ●)
  diffStats: DiffStats | null;  // git +N/-M
}
```

## 탭 표시 순서 (tab-bar.ts render)

`파일명` → `+N/-M` (diffStats) → `●` (unsaved 노란색 또는 dirty 파란색) → `✕` (닫기)

## 임시 파일 흐름

1. 햄버거 메뉴 > 새 파일 → `handleNewUnsavedFile()` → `openTab(tempId, name, "", true)`
2. 편집 시 자동 저장 안 됨 (`isUnsaved` 체크)
3. Cmd+S → `handleSave()` → `save()` 다이얼로그 → 위치 선택 → `markSaved()`로 정상 파일 전환

## Git diff 통계

- `refreshDiffStats(tabId, filePath)`: `invoke("get_git_diff_stats")` 호출
- 파일 열기, 저장 시 자동 갱신
- git repo 아니거나 변경 없으면 null → 표시 안 됨

## CSS 클래스

- `.tab`, `.tab.active`, `.tab-dirty`, `.tab-unsaved`, `.tab-diff`, `.tab-close`
