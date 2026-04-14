import { invoke } from "@tauri-apps/api/core";
import type { AppSettings, RecentEntry } from "../types";

const MAX_RECENT = 10;

const DEFAULT_SETTINGS: AppSettings = {
  fontFamily: null,
  fontSize: 16,
  theme: "system",
  sidebarVisible: true,
  tocVisible: true,
  recentFolders: [],
  recentFiles: [],
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
      recentFolders: parsed.recentFolders ?? DEFAULT_SETTINGS.recentFolders,
      recentFiles: parsed.recentFiles ?? DEFAULT_SETTINGS.recentFiles,
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

export async function updateSettings(
  partial: Partial<AppSettings>,
): Promise<void> {
  const updated: AppSettings = { ...currentSettings, ...partial };
  await saveSettings(updated);
}

function addRecent(
  list: readonly RecentEntry[],
  entry: RecentEntry,
): RecentEntry[] {
  const filtered = list.filter((e) => e.path !== entry.path);
  return [entry, ...filtered].slice(0, MAX_RECENT);
}

export async function addRecentFolder(
  path: string,
  name: string,
): Promise<void> {
  const entry: RecentEntry = { path, name, timestamp: Date.now() };
  const recentFolders = addRecent(currentSettings.recentFolders, entry);
  await updateSettings({ recentFolders });
}

export async function addRecentFile(
  path: string,
  name: string,
): Promise<void> {
  const entry: RecentEntry = { path, name, timestamp: Date.now() };
  const recentFiles = addRecent(currentSettings.recentFiles, entry);
  await updateSettings({ recentFiles });
}
