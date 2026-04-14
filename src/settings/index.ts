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

export async function updateSettings(
  partial: Partial<AppSettings>,
): Promise<void> {
  const updated: AppSettings = { ...currentSettings, ...partial };
  await saveSettings(updated);
}
