import type { TabData } from "../types";

export interface TabState {
  readonly tabs: readonly TabData[];
  readonly activeTabId: string | null;
}

const EMPTY_STATE: TabState = { tabs: [], activeTabId: null };

let currentState: TabState = EMPTY_STATE;
let listeners: Array<(state: TabState) => void> = [];

export function getTabState(): TabState {
  return currentState;
}

export function subscribe(listener: (state: TabState) => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notify(): void {
  const state = currentState;
  listeners.forEach((l) => l(state));
}

export function openTab(
  filePath: string,
  fileName: string,
  content: string,
): void {
  const id = filePath;
  const existing = currentState.tabs.find((t) => t.id === id);
  if (existing) {
    currentState = { ...currentState, activeTabId: id };
    notify();
    return;
  }
  const newTab: TabData = { id, filePath, fileName, content, isDirty: false };
  currentState = {
    tabs: [...currentState.tabs, newTab],
    activeTabId: id,
  };
  notify();
}

export function closeTab(id: string): TabData | null {
  const idx = currentState.tabs.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const closed = currentState.tabs[idx];
  const newTabs = currentState.tabs.filter((t) => t.id !== id);
  let newActive = currentState.activeTabId;
  if (newActive === id) {
    if (newTabs.length === 0) {
      newActive = null;
    } else if (idx < newTabs.length) {
      newActive = newTabs[idx].id;
    } else {
      newActive = newTabs[newTabs.length - 1].id;
    }
  }
  currentState = { tabs: newTabs, activeTabId: newActive };
  notify();
  return closed;
}

export function setActiveTab(id: string): void {
  if (currentState.tabs.some((t) => t.id === id)) {
    currentState = { ...currentState, activeTabId: id };
    notify();
  }
}

export function markDirty(id: string): void {
  currentState = {
    ...currentState,
    tabs: currentState.tabs.map((t) =>
      t.id === id ? { ...t, isDirty: true } : t,
    ),
  };
  notify();
}

export function markClean(id: string, content: string): void {
  currentState = {
    ...currentState,
    tabs: currentState.tabs.map((t) =>
      t.id === id ? { ...t, isDirty: false, content } : t,
    ),
  };
  notify();
}

export function updateTabContent(id: string, content: string): void {
  currentState = {
    ...currentState,
    tabs: currentState.tabs.map((t) =>
      t.id === id ? { ...t, content } : t,
    ),
  };
  notify();
}

export function getActiveTab(): TabData | null {
  if (!currentState.activeTabId) return null;
  return (
    currentState.tabs.find((t) => t.id === currentState.activeTabId) ?? null
  );
}

export function moveTab(fromIndex: number, toIndex: number): void {
  const tabs = [...currentState.tabs];
  const [moved] = tabs.splice(fromIndex, 1);
  tabs.splice(toIndex, 0, moved);
  currentState = { ...currentState, tabs };
  notify();
}
