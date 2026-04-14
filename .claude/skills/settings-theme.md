---
name: settings-theme
description: 설정(최근 파일/폴더, 테마, 폰트, lastOpenFolder) 수정 시 사용.
---

# Settings & Theme

사용자 설정 저장/로드 및 테마 관리.

## 파일 구조

| 파일 | 역할 |
|------|------|
| `src/settings/index.ts` | 설정 CRUD. `loadSettings`, `saveSettings`, `updateSettings`, `addRecentFolder/File` |
| `src/themes/loader.ts` | CSS 테마 로딩, 시스템 테마 감지, 폰트 오버라이드 |
| `src/themes/light.css` | 라이트 테마 CSS 변수 |
| `src/themes/dark.css` | 다크 테마 CSS 변수 |

## AppSettings 인터페이스 (types.ts)

```typescript
interface AppSettings {
  fontFamily: string | null;
  fontSize: number;           // 기본 16, 10~32 범위
  theme: string;              // "system" | "light" | "dark"
  sidebarVisible: boolean;
  tocVisible: boolean;
  recentFolders: RecentEntry[];  // 최대 10개
  recentFiles: RecentEntry[];    // 최대 10개
  lastOpenFolder: string | null; // 앱 시작 시 자동 열기
}
```

## 저장 경로

Rust `save_settings`/`load_settings` → `$APP_DATA/settings.json`

## 최근 항목

- `addRecentFolder/File(path, name)`: 중복 제거 후 맨 앞에 추가, 최대 10개 유지
- 앱 시작 시 `lastOpenFolder`가 있으면 자동으로 `openFolder()` 호출

## 테마 시스템

- CSS 변수: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--text-primary`, `--text-secondary`, `--accent`, `--border`
- 다크모드: `dark.css`에서 변수 오버라이드
- `watchSystemTheme()`: `prefers-color-scheme` 변경 감지
