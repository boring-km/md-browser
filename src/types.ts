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
  readonly isUnsaved: boolean;
}

export interface RecentEntry {
  readonly path: string;
  readonly name: string;
  readonly timestamp: number;
}

export interface AppSettings {
  readonly fontFamily: string | null;
  readonly fontSize: number;
  readonly theme: string;
  readonly sidebarVisible: boolean;
  readonly tocVisible: boolean;
  readonly recentFolders: readonly RecentEntry[];
  readonly recentFiles: readonly RecentEntry[];
  readonly lastOpenFolder: string | null;
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
