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
  markSaved,
  updateTabContent,
  updateDiffStats,
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
import type { DiffStats, FileEntry, RecentEntry } from "./types";
import {
  hamburger,
  panelLeft,
  panelRight,
  codeView,
  editView,
} from "./icons/index";

let editor: Editor | null = null;
let cleanupImageHandler: (() => void) | null = null;
let currentDir: string | null = null;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let unsavedFileCounter = 0;
let isRawMode = false;

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
  const sidebarCloseBtn = document.getElementById("sidebar-close-btn")!;
  const sidebarOpenBtn = document.getElementById("sidebar-open-btn")!;
  const tocToggleBtn = document.getElementById("toc-toggle-btn")!;
  const tocOpenBtn = document.getElementById("toc-open-btn")!;
  const hamburgerMenuBtn = document.getElementById("hamburger-menu-btn")!;
  const rawToggleBtn = document.getElementById("raw-toggle-btn")!;
  const rawEditor = document.getElementById("raw-editor") as HTMLTextAreaElement;
  const openFolderEmptyBtn = document.getElementById("open-folder-empty-btn")!;

  // Set button icons
  hamburgerMenuBtn.innerHTML = hamburger;
  sidebarCloseBtn.innerHTML = panelLeft;
  sidebarOpenBtn.innerHTML = panelLeft;
  tocToggleBtn.innerHTML = panelRight;
  tocOpenBtn.innerHTML = panelRight;
  rawToggleBtn.innerHTML = codeView;

  // Sidebar
  initSidebar(sidebarEl, fileTreeEl, handleFileSelect);
  setSidebarVisible(settings.sidebarVisible);

  // Tabs
  initTabBar(tabBarEl, handleTabSelect, handleTabClose);

  // TOC — initially hidden, shown when a file is opened
  initToc(tocPanel, tocContent);
  setTocVisible(false);

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
  const updatePanelButtons = (): void => {
    const sidebarVisible = !sidebarEl.classList.contains("collapsed");
    sidebarOpenBtn.classList.toggle("hidden", sidebarVisible);

    const tocVisible = !tocPanel.classList.contains("collapsed");
    tocOpenBtn.classList.toggle("hidden", tocVisible);
  };

  sidebarCloseBtn.addEventListener("click", () => {
    setSidebarVisible(false);
    updateSettings({ sidebarVisible: false });
    updatePanelButtons();
  });
  sidebarOpenBtn.addEventListener("click", () => {
    setSidebarVisible(true);
    updateSettings({ sidebarVisible: true });
    updatePanelButtons();
  });
  tocToggleBtn.addEventListener("click", () => {
    setTocVisible(false);
    updateSettings({ tocVisible: false });
    updatePanelButtons();
  });
  tocOpenBtn.addEventListener("click", () => {
    setTocVisible(true);
    updateSettings({ tocVisible: true });
    updatePanelButtons();
  });

  // Set initial button visibility
  updatePanelButtons();

  // Raw markdown toggle
  rawToggleBtn.addEventListener("click", () => {
    isRawMode = !isRawMode;
    if (isRawMode) {
      // Switch to raw mode
      const content = editor?.getContent() ?? "";
      rawEditor.value = content;
      editorContainer.classList.add("hidden");
      rawEditor.classList.remove("hidden");
      rawToggleBtn.innerHTML = editView;
      rawToggleBtn.title = "편집기 보기";
    } else {
      // Switch back to editor mode
      const rawContent = rawEditor.value;
      rawEditor.classList.add("hidden");
      editorContainer.classList.remove("hidden");
      rawToggleBtn.innerHTML = codeView;
      rawToggleBtn.title = "Raw 마크다운 보기";
      // Apply raw content back to editor
      const tab = getActiveTab();
      if (tab && editor) {
        editor.setContent(rawContent);
        updateTabContent(tab.id, rawContent);
        markDirty(tab.id);
        updateToc(editor.view);
      }
    }
  });

  // Sync raw editor changes
  rawEditor.addEventListener("input", () => {
    const tab = getActiveTab();
    if (tab) {
      updateTabContent(tab.id, rawEditor.value);
      markDirty(tab.id);
    }
  });

  // Hamburger menu
  hamburgerMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showHamburgerMenu(hamburgerMenuBtn);
  });

  // Open folder (empty state)
  openFolderEmptyBtn.addEventListener("click", handleOpenFolder);

  // Handle init data from URL params (new window with specific content)
  const urlParams = new URLSearchParams(window.location.search);
  const initParam = urlParams.get("init");
  if (initParam) {
    try {
      const initData = JSON.parse(decodeURIComponent(initParam));
      if (initData.type === "open-files" && Array.isArray(initData.files)) {
        for (const filePath of initData.files) {
          const fileName = filePath.split("/").pop() ?? "untitled.md";
          await handleFileSelect(filePath, fileName);
        }
      } else if (initData.type === "open-folder" && initData.path) {
        await openFolder(initData.path);
      }
    } catch {
      // Invalid init data — ignore
    }
  } else if (settings.lastOpenFolder) {
    // Auto-open last folder
    try {
      await openFolder(settings.lastOpenFolder);
    } catch {
      // Folder may have been deleted — ignore
    }
  }

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
      case "open-file":
        await handleOpenFile();
        break;
      case "recent-folders":
        await handleRecentFolders();
        break;
      case "new-window":
        await invoke("open_new_window", { initData: null });
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
        updatePanelButtons();
        break;
      case "toggle-toc":
        toggleToc();
        await updateSettings({ tocVisible: !getSettings().tocVisible });
        updatePanelButtons();
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

function closeHamburgerMenu(): void {
  const existing = document.getElementById("hamburger-dropdown");
  if (existing) existing.remove();
}

function showHamburgerMenu(anchorBtn: HTMLElement): void {
  closeHamburgerMenu();

  const dropdown = document.createElement("div");
  dropdown.id = "hamburger-dropdown";
  dropdown.className = "dropdown-menu";

  // 폴더 열기
  const openFolderItem = document.createElement("div");
  openFolderItem.className = "dropdown-item";
  openFolderItem.textContent = "폴더 열기";
  openFolderItem.addEventListener("click", () => {
    closeHamburgerMenu();
    handleOpenFolder();
  });
  dropdown.appendChild(openFolderItem);

  // 파일 열기
  const openFileItem = document.createElement("div");
  openFileItem.className = "dropdown-item";
  openFileItem.textContent = "파일 열기";
  openFileItem.addEventListener("click", () => {
    closeHamburgerMenu();
    handleOpenFile();
  });
  dropdown.appendChild(openFileItem);

  // 새 파일
  const newFileItem = document.createElement("div");
  newFileItem.className = "dropdown-item";
  newFileItem.textContent = "새 파일";
  newFileItem.addEventListener("click", () => {
    closeHamburgerMenu();
    handleNewUnsavedFile();
  });
  dropdown.appendChild(newFileItem);

  // 새 윈도우
  const newWindowItem = document.createElement("div");
  newWindowItem.className = "dropdown-item";
  newWindowItem.textContent = "새 윈도우";
  newWindowItem.addEventListener("click", () => {
    closeHamburgerMenu();
    invoke("open_new_window", { initData: null });
  });
  dropdown.appendChild(newWindowItem);

  // 구분선
  const sep = document.createElement("div");
  sep.className = "dropdown-separator";
  dropdown.appendChild(sep);

  // 최근 폴더 (서브메뉴)
  const recentItem = document.createElement("div");
  recentItem.className = "dropdown-item dropdown-item-parent";

  const recentLabel = document.createElement("span");
  recentLabel.textContent = "최근 폴더";
  recentItem.appendChild(recentLabel);

  const arrow = document.createElement("span");
  arrow.className = "dropdown-arrow";
  arrow.textContent = "▶";
  recentItem.appendChild(arrow);

  const subMenu = document.createElement("div");
  subMenu.className = "dropdown-submenu";

  const { recentFolders } = getSettings();
  if (recentFolders.length === 0) {
    const emptyItem = document.createElement("div");
    emptyItem.className = "dropdown-item dropdown-item-disabled";
    emptyItem.textContent = "없음";
    subMenu.appendChild(emptyItem);
  } else {
    for (const folder of recentFolders) {
      const folderItem = document.createElement("div");
      folderItem.className = "dropdown-item";
      folderItem.title = folder.path;
      folderItem.textContent = folder.name;
      folderItem.addEventListener("click", () => {
        closeHamburgerMenu();
        openFolder(folder.path);
      });
      subMenu.appendChild(folderItem);
    }
  }

  recentItem.appendChild(subMenu);
  dropdown.appendChild(recentItem);

  // Position dropdown below the anchor button
  const rect = anchorBtn.getBoundingClientRect();
  dropdown.style.top = `${rect.bottom + 2}px`;
  dropdown.style.left = `${rect.left}px`;

  document.body.appendChild(dropdown);

  // Close on outside click
  const onClickOutside = (e: MouseEvent): void => {
    if (!dropdown.contains(e.target as Node) && e.target !== anchorBtn) {
      closeHamburgerMenu();
      document.removeEventListener("click", onClickOutside);
    }
  };
  requestAnimationFrame(() => {
    document.addEventListener("click", onClickOutside);
  });
}

async function handleOpenFolder(): Promise<void> {
  const selected = await open({ directory: true, multiple: false });
  if (!selected) return;
  await openFolder(selected as string);
}

async function handleRecentFolders(): Promise<void> {
  const settings = getSettings();
  const { recentFolders } = settings;
  if (recentFolders.length === 0) {
    alert("최근 열었던 폴더가 없습니다.");
    return;
  }
  showRecentFolderModal(recentFolders);
}

function showRecentFolderModal(folders: readonly RecentEntry[]): void {
  const existing = document.getElementById("recent-folder-modal");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "recent-folder-modal";
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal-content";

  const title = document.createElement("div");
  title.className = "modal-title";
  title.textContent = "최근 폴더";
  modal.appendChild(title);

  const list = document.createElement("div");
  list.className = "modal-list";

  for (const folder of folders) {
    const item = document.createElement("div");
    item.className = "modal-list-item";

    const name = document.createElement("span");
    name.className = "modal-item-name";
    name.textContent = folder.name;

    const path = document.createElement("span");
    path.className = "modal-item-path";
    path.textContent = folder.path;

    item.appendChild(name);
    item.appendChild(path);
    item.addEventListener("click", () => {
      overlay.remove();
      openFolder(folder.path);
    });
    list.appendChild(item);
  }
  modal.appendChild(list);

  const closeBtn = document.createElement("button");
  closeBtn.className = "modal-close-btn";
  closeBtn.textContent = "닫기";
  closeBtn.addEventListener("click", () => overlay.remove());
  modal.appendChild(closeBtn);

  overlay.appendChild(modal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

async function handleOpenFile(): Promise<void> {
  const selected = await open({
    directory: false,
    multiple: false,
    filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
  });
  if (!selected) return;
  const filePath = selected as string;
  const fileName = filePath.split("/").pop() ?? "untitled.md";
  await handleFileSelect(filePath, fileName);
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
  await updateSettings({ lastOpenFolder: dirPath });
}

async function refreshDiffStats(tabId: string, filePath: string): Promise<void> {
  try {
    const stats: DiffStats | null = await invoke("get_git_diff_stats", {
      filePath,
    });
    updateDiffStats(tabId, stats);
  } catch {
    updateDiffStats(tabId, null);
  }
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
  if (getSettings().tocVisible) setTocVisible(true);
  await addRecentFile(filePath, fileName);
  refreshDiffStats(filePath, filePath);
}

function handleTabSelect(filePath: string): void {
  const tab = getTabState().tabs.find((t) => t.filePath === filePath);
  if (tab) {
    loadTabInEditor(tab.content);
    setActiveFile(filePath);
  }
}

function handleTabClose(id: string, isDirty: boolean): void {
  const tab = getTabState().tabs.find((t) => t.id === id);
  const needsConfirm = isDirty || (tab?.isUnsaved && tab.content.length > 0);
  if (needsConfirm) {
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
    setTocVisible(false);
  }
}

function loadTabInEditor(content: string): void {
  if (!editor) return;
  editor.setContent(content);
  updateEditorView(editor.view);
  updateToc(editor.view);
  // Sync raw editor if in raw mode
  if (isRawMode) {
    const rawEditor = document.getElementById("raw-editor") as HTMLTextAreaElement;
    rawEditor.value = content;
  }
}

function handleEditorChange(): void {
  const tab = getActiveTab();
  if (!tab || !editor) return;
  const content = editor.getContent();
  updateTabContent(tab.id, content);
  markDirty(tab.id);

  // 임시 파일은 자동 저장 안 함
  if (tab.isUnsaved) return;

  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => handleSave(), 1000);
}

async function handleSave(): Promise<void> {
  const tab = getActiveTab();
  if (!tab || !editor) return;
  const content = editor.getContent();

  if (tab.isUnsaved) {
    const filePath = await save({
      filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
      defaultPath: tab.fileName,
    });
    if (!filePath) return;
    await invoke("write_file", { filePath, content });
    markSaved(tab.id, filePath);
    markClean(filePath, content);
    return;
  }

  await invoke("write_file", { filePath: tab.filePath, content });
  markClean(tab.id, content);
  refreshDiffStats(tab.id, tab.filePath);
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

function normalizeAnchor(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function scrollToAnchor(anchor: string): boolean {
  if (!editor) return false;
  const raw = anchor.startsWith("#") ? anchor.slice(1) : anchor;
  if (!raw) return false;
  const decoded = decodeURIComponent(raw);
  const target = normalizeAnchor(decoded);

  const view = editor.view;
  const container = document.getElementById("editor-container");
  let found = false;

  view.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === "heading") {
      const headingNorm = normalizeAnchor(node.textContent);
      if (headingNorm === target) {
        const dom = view.nodeDOM(pos);
        if (dom instanceof HTMLElement && container) {
          const containerRect = container.getBoundingClientRect();
          const headingRect = dom.getBoundingClientRect();
          container.scrollTo({
            top: container.scrollTop + headingRect.top - containerRect.top,
            behavior: "smooth",
          });
        }
        found = true;
        return false;
      }
    }
  });
  return found;
}

async function handleLinkClick(href: string): Promise<void> {
  // Internal anchor link → scroll to heading
  if (href.startsWith("#")) {
    scrollToAnchor(href);
    return;
  }

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

function handleNewUnsavedFile(): void {
  unsavedFileCounter += 1;
  const fileName = `제목 없음-${unsavedFileCounter}.md`;
  const tempId = `__unsaved__${unsavedFileCounter}`;
  openTab(tempId, fileName, "", true);
  loadTabInEditor("");
}

document.addEventListener("DOMContentLoaded", init);
