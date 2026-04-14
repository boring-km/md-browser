import {
  getTabState,
  setActiveTab,
  subscribe,
  type TabState,
} from "./tab-state";

let containerEl: HTMLElement | null = null;
let onTabSelect: ((filePath: string) => void) | null = null;
let onTabClose: ((id: string, isDirty: boolean) => void) | null = null;

export function initTabBar(
  container: HTMLElement,
  onSelect: (filePath: string) => void,
  onClose: (id: string, isDirty: boolean) => void,
): void {
  containerEl = container;
  onTabSelect = onSelect;
  onTabClose = onClose;
  subscribe(render);
  render(getTabState());
}

function render(state: TabState): void {
  if (!containerEl) return;
  containerEl.innerHTML = "";

  for (const tab of state.tabs) {
    const el = document.createElement("div");
    el.className = `tab${tab.id === state.activeTabId ? " active" : ""}`;
    el.draggable = true;

    const nameSpan = document.createElement("span");
    nameSpan.textContent = tab.fileName;
    el.appendChild(nameSpan);

    if (tab.isUnsaved) {
      const unsaved = document.createElement("span");
      unsaved.className = "tab-unsaved";
      unsaved.textContent = "\u25CF";
      unsaved.title = "저장되지 않은 파일";
      el.appendChild(unsaved);
    } else if (tab.isDirty) {
      const dirty = document.createElement("span");
      dirty.className = "tab-dirty";
      dirty.textContent = "\u25CF";
      el.appendChild(dirty);
    }

    const closeBtn = document.createElement("span");
    closeBtn.className = "tab-close";
    closeBtn.textContent = "\u2715";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onTabClose?.(tab.id, tab.isDirty);
    });
    el.appendChild(closeBtn);

    el.addEventListener("click", () => {
      setActiveTab(tab.id);
      onTabSelect?.(tab.filePath);
    });

    containerEl.appendChild(el);
  }
}
