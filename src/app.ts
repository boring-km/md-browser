import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { createEditor, type Editor } from "./editor/index";
import { setupImageHandler } from "./editor/image-handler";
import {
  initSidebar,
  toggleSidebar,
  setSidebarVisible,
  setSidebarTitle,
  renderTree,
  setActiveFile,
} from "./sidebar/index";
import {
  initTabBar,
  openTab,
  closeTab,
  getActiveTab,
  markDirty,
  markClean,
  updateTabContent,
  getTabState,
} from "./tabs/index";
import {
  initToc,
  setEditorView,
  updateToc,
  toggleToc,
  setTocVisible,
} from "./toc/index";
import {
  initSearch,
  updateEditorView,
  showSearch,
  showReplace,
  hideSearch,
} from "./search/index";
import {
  loadTheme,
  detectSystemTheme,
  watchSystemTheme,
  applyFontOverride,
} from "./themes/loader";
import {
  loadSettings,
  updateSettings,
  getSettings,
  addRecentFolder,
  addRecentFile,
} from "./settings/index";
import type { AppSettings, FileEntry } from "./types";

let editor: Editor | null = null;
let cleanupImageHandler: (() => void) | null = null;
let currentDir: string | null = null;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

async function init(): Promise<void> {
  const settings = await loadSettings();

  // Theme
  const themeName =
    settings.theme === "system" ? detectSystemTheme() : settings.theme;
  loadTheme(themeName);
  watchSystemTheme((theme) => {
    if (getSettings().theme === "system") loadTheme(theme);
  });
  applyFontOverride(settings.fontFamily, settings.fontSize);

  // UI elements
  const sidebarEl = document.getElementById("sidebar")!;
  const fileTreeEl = document.getElementById("file-tree")!;
  const tabBarEl = document.getElementById("tab-bar")!;
  const editorContainer = document.getElementById("editor-container")!;
  const tocPanel = document.getElementById("toc-panel")!;
  const tocContent = document.getElementById("toc-content")!;
  const searchBar = document.getElementById("search-bar")!;
  const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn")!;
  const sidebarCloseBtn = document.getElementById("sidebar-close-btn")!;
  const tocToggleBtn = document.getElementById("toc-toggle-btn")!;
  const tocCloseBtn = document.getElementById("toc-close-btn")!;
  const newFileBtn = document.getElementById("new-file-btn")!;
  const openFolderBtn = document.getElementById("open-folder-btn")!;
  const openFolderEmptyBtn = document.getElementById("open-folder-empty-btn")!;

  // Sidebar
  initSidebar(sidebarEl, fileTreeEl, handleFileSelect);
  setSidebarVisible(settings.sidebarVisible);

  // Tabs
  initTabBar(tabBarEl, handleTabSelect, handleTabClose);

  // TOC
  initToc(tocPanel, tocContent);
  setTocVisible(settings.tocVisible);

  // Editor
  editor = createEditor(editorContainer, handleEditorChange);
  initSearch(searchBar, editor.view);
  cleanupImageHandler = setupImageHandler(editor.view, () => {
    const tab = getActiveTab();
    if (!tab) return null;
    const parts = tab.filePath.split("/");
    parts.pop();
    return parts.join("/");
  });
  setEditorView(editor.view);

  // Link click handler
  editorContainer.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (!anchor) return;
    e.preventDefault();
    const href = anchor.getAttribute("href");
    if (!href) return;
    handleLinkClick(href);
  });

  // Toggle buttons
  sidebarToggleBtn.addEventListener("click", () => {
    toggleSidebar();
    updateSettings({ sidebarVisible: !getSettings().sidebarVisible });
  });
  sidebarCloseBtn.addEventListener("click", () => {
    toggleSidebar();
    updateSettings({ sidebarVisible: false });
  });
  tocToggleBtn.addEventListener("click", () => {
    toggleToc();
    updateSettings({ tocVisible: !getSettings().tocVisible });
  });
  tocCloseBtn.addEventListener("click", () => {
    toggleToc();
    updateSettings({ tocVisible: false });
  });

  // New file button
  newFileBtn.addEventListener("click", handleNewFile);

  // Open folder buttons
  openFolderBtn.addEventListener("click", handleOpenFolder);
  openFolderEmptyBtn.addEventListener("click", handleOpenFolder);

  // Render recent history in empty state
  renderRecentHistory(settings);

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "f") {
      e.preventDefault();
      showSearch();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "h") {
      e.preventDefault();
      showReplace();
    }
    if (e.key === "Escape") {
      hideSearch();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "o") {
      e.preventDefault();
      handleOpenFolder();
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "e") {
      e.preventDefault();
      handleExportHtml();
    }
  });

  // Menu events
  listen<string>("menu-event", async (event) => {
    const menuId = event.payload;
    switch (menuId) {
      case "open-folder":
        await handleOpenFolder();
        break;
      case "export-html":
        await handleExportHtml();
        break;
      case "export-pdf":
        handleExportPdf();
        break;
      case "theme-system":
        loadTheme(detectSystemTheme());
        await updateSettings({ theme: "system" });
        break;
      case "theme-light":
        loadTheme("light");
        await updateSettings({ theme: "light" });
        break;
      case "theme-dark":
        loadTheme("dark");
        await updateSettings({ theme: "dark" });
        break;
      case "font-select":
        await handleFontSelect();
        break;
      case "font-size-up":
        await handleFontSizeChange(2);
        break;
      case "font-size-down":
        await handleFontSizeChange(-2);
        break;
      case "font-size-reset":
        await updateSettings({ fontSize: 16 });
        applyFontOverride(null, 16);
        break;
      case "toggle-sidebar":
        toggleSidebar();
        await updateSettings({
          sidebarVisible: !getSettings().sidebarVisible,
        });
        break;
      case "toggle-toc":
        toggleToc();
        await updateSettings({ tocVisible: !getSettings().tocVisible });
        break;
    }
  });

  // Single-instance: open files from Finder double-click
  listen<string[]>("open-files", async (event) => {
    for (const filePath of event.payload) {
      const parts = filePath.split("/");
      const fileName = parts[parts.length - 1] ?? "untitled.md";
      await handleFileSelect(filePath, fileName);
    }
  });
}

async function handleOpenFolder(): Promise<void> {
  const selected = await open({ directory: true, multiple: false });
  if (!selected) return;
  await openFolder(selected as string);
}

async function openFolder(dirPath: string): Promise<void> {
  currentDir = dirPath;
  const parts = dirPath.split("/");
  const folderName = parts[parts.length - 1] ?? dirPath;
  setSidebarTitle(folderName);
  const emptyEl = document.getElementById("file-tree-empty");
  if (emptyEl) emptyEl.style.display = "none";
  const entries: FileEntry[] = await invoke("read_directory", { dirPath });
  renderTree(entries);
  await addRecentFolder(dirPath, folderName);
}

async function handleFileSelect(
  filePath: string,
  fileName: string,
): Promise<void> {
  const existingState = getTabState();
  const existingTab = existingState.tabs.find((t) => t.filePath === filePath);
  if (existingTab) {
    openTab(filePath, fileName, existingTab.content);
    loadTabInEditor(existingTab.content);
    setActiveFile(filePath);
    return;
  }

  const content: string = await invoke("read_file", { filePath });
  openTab(filePath, fileName, content);
  loadTabInEditor(content);
  setActiveFile(filePath);
  await addRecentFile(filePath, fileName);
}

function handleTabSelect(filePath: string): void {
  const tab = getTabState().tabs.find((t) => t.filePath === filePath);
  if (tab) {
    loadTabInEditor(tab.content);
    setActiveFile(filePath);
  }
}

function handleTabClose(id: string, isDirty: boolean): void {
  if (isDirty) {
    const confirmed = window.confirm(
      "저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?",
    );
    if (!confirmed) return;
  }
  closeTab(id);
  const active = getActiveTab();
  if (active) {
    loadTabInEditor(active.content);
    setActiveFile(active.filePath);
  } else {
    editor?.setContent("");
    setActiveFile(null);
  }
}

function loadTabInEditor(content: string): void {
  if (!editor) return;
  editor.setContent(content);
  updateEditorView(editor.view);
  updateToc(editor.view);
}

function handleEditorChange(): void {
  const tab = getActiveTab();
  if (!tab || !editor) return;
  const content = editor.getContent();
  updateTabContent(tab.id, content);
  markDirty(tab.id);

  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => handleSave(), 1000);
}

async function handleSave(): Promise<void> {
  const tab = getActiveTab();
  if (!tab || !editor) return;
  const content = editor.getContent();
  await invoke("write_file", { filePath: tab.filePath, content });
  markClean(tab.id, content);
}

function handleExportPdf(): void {
  window.print();
}

async function handleExportHtml(): Promise<void> {
  const tab = getActiveTab();
  if (!tab || !editor) return;

  const filePath = await save({
    filters: [{ name: "HTML", extensions: ["html"] }],
  });
  if (!filePath) return;

  const container = document.getElementById("editor-container")!;
  const htmlContent = container.innerHTML;
  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((r) => r.cssText)
          .join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");

  await invoke("export_html", {
    filePath,
    htmlContent,
    cssContent: styles,
  });
}

async function handleFontSelect(): Promise<void> {
  const fonts: string[] = await invoke("list_system_fonts");
  const currentFont = getSettings().fontFamily ?? "시스템 기본";
  const selected = prompt(
    `폰트 선택 (현재: ${currentFont})\n\n사용 가능한 폰트:\n${fonts.slice(0, 30).join(", ")}...\n\n폰트 이름 입력:`,
  );
  if (!selected) return;
  if (fonts.includes(selected)) {
    await updateSettings({ fontFamily: selected });
    applyFontOverride(selected, null);
  } else {
    alert("올바른 폰트 이름이 아닙니다.");
  }
}

async function handleFontSizeChange(delta: number): Promise<void> {
  const current = getSettings().fontSize;
  const newSize = Math.max(10, Math.min(32, current + delta));
  await updateSettings({ fontSize: newSize });
  applyFontOverride(null, newSize);
}

async function handleLinkClick(href: string): Promise<void> {
  // Web URL → open in default browser
  if (href.startsWith("http://") || href.startsWith("https://")) {
    await invoke("open_url_in_browser", { url: href });
    return;
  }

  // Resolve relative path based on current file's directory
  const tab = getActiveTab();
  let resolvedPath = href;
  if (tab && !href.startsWith("/")) {
    const dirParts = tab.filePath.split("/");
    dirParts.pop();
    resolvedPath = dirParts.join("/") + "/" + href;
  }

  // Local .md file → open in editor as new tab
  if (resolvedPath.endsWith(".md") || resolvedPath.endsWith(".markdown")) {
    const fileName = resolvedPath.split("/").pop() ?? "untitled.md";
    try {
      await handleFileSelect(resolvedPath, fileName);
    } catch {
      alert(`파일을 열 수 없습니다: ${resolvedPath}`);
    }
    return;
  }

  // Other files → open with OS default app
  await invoke("open_with_default_app", { path: resolvedPath });
}

function renderRecentHistory(settings: AppSettings): void {
  const emptyEl = document.getElementById("file-tree-empty");
  if (!emptyEl) return;

  const { recentFolders, recentFiles } = settings;
  if (recentFolders.length === 0 && recentFiles.length === 0) return;

  if (recentFolders.length > 0) {
    const section = document.createElement("div");
    section.className = "recent-section";

    const title = document.createElement("div");
    title.className = "recent-title";
    title.textContent = "최근 폴더";
    section.appendChild(title);

    for (const entry of recentFolders) {
      const item = document.createElement("div");
      item.className = "recent-item";
      item.title = entry.path;
      item.textContent = entry.name;
      item.addEventListener("click", () => openFolder(entry.path));
      section.appendChild(item);
    }
    emptyEl.appendChild(section);
  }

  if (recentFiles.length > 0) {
    const section = document.createElement("div");
    section.className = "recent-section";

    const title = document.createElement("div");
    title.className = "recent-title";
    title.textContent = "최근 파일";
    section.appendChild(title);

    for (const entry of recentFiles) {
      const item = document.createElement("div");
      item.className = "recent-item";
      item.title = entry.path;
      item.textContent = entry.name;
      item.addEventListener("click", () =>
        handleFileSelect(entry.path, entry.name),
      );
      section.appendChild(item);
    }
    emptyEl.appendChild(section);
  }
}

async function handleNewFile(): Promise<void> {
  if (!currentDir) return;
  const fileName = prompt("새 파일 이름:");
  if (!fileName) return;
  try {
    const filePath: string = await invoke("create_md_file", {
      dirPath: currentDir,
      fileName,
    });
    const entries: FileEntry[] = await invoke("read_directory", {
      dirPath: currentDir,
    });
    renderTree(entries);
    const name = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
    await handleFileSelect(filePath, name);
  } catch (err) {
    alert(`파일 생성 실패: ${err}`);
  }
}

document.addEventListener("DOMContentLoaded", init);
