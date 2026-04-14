import { initFileTree, renderTree, setActiveFile } from "./file-tree";

let sidebarEl: HTMLElement | null = null;

export function initSidebar(
  sidebar: HTMLElement,
  fileTreeContainer: HTMLElement,
  onFileSelect: (filePath: string, fileName: string) => void,
): void {
  sidebarEl = sidebar;
  initFileTree(fileTreeContainer, onFileSelect);
}

export function toggleSidebar(): void {
  sidebarEl?.classList.toggle("collapsed");
}

export function setSidebarVisible(visible: boolean): void {
  if (!sidebarEl) return;
  if (visible) {
    sidebarEl.classList.remove("collapsed");
  } else {
    sidebarEl.classList.add("collapsed");
  }
}

export function setSidebarTitle(title: string): void {
  const titleEl = sidebarEl?.querySelector(".sidebar-title");
  if (titleEl) titleEl.textContent = title;
}

export { renderTree, setActiveFile };
