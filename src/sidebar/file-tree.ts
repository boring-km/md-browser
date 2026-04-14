import type { FileEntry } from "../types";
import {
  chevronRight,
  chevronDown,
  folderClosed,
  folderOpen,
  getFileIcon,
} from "../icons/index";

let treeContainer: HTMLElement | null = null;
let onFileClick: ((filePath: string, fileName: string) => void) | null = null;
let activeFilePath: string | null = null;

export function initFileTree(
  container: HTMLElement,
  onSelect: (filePath: string, fileName: string) => void,
): void {
  treeContainer = container;
  onFileClick = onSelect;
}

export function renderTree(entries: readonly FileEntry[]): void {
  if (!treeContainer) return;
  treeContainer.innerHTML = "";
  renderEntries(entries, treeContainer, 0);
}

export function setActiveFile(filePath: string | null): void {
  activeFilePath = filePath;
  if (!treeContainer) return;
  treeContainer.querySelectorAll(".file-tree-item").forEach((el) => {
    el.classList.toggle(
      "active",
      el.getAttribute("data-path") === filePath,
    );
  });
}

function renderEntries(
  entries: readonly FileEntry[],
  parent: HTMLElement,
  depth: number,
): void {
  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of sorted) {
    const item = document.createElement("div");
    const isMd = !entry.isDirectory && /\.(md|markdown)$/i.test(entry.name);
    const classes = ["file-tree-item"];
    if (entry.isDirectory) classes.push("directory");
    if (isMd) classes.push("markdown");
    item.className = classes.join(" ");
    item.setAttribute("data-path", entry.path);
    item.style.paddingLeft = `${8 + depth * 16}px`;

    const icon = document.createElement("span");
    icon.className = "file-tree-icon";

    const label = document.createElement("span");
    label.className = "file-tree-label";
    label.textContent = entry.name;

    if (entry.path === activeFilePath) {
      item.classList.add("active");
    }

    if (entry.isDirectory) {
      const chevron = document.createElement("span");
      chevron.className = "file-tree-chevron";
      chevron.innerHTML = chevronRight;

      icon.innerHTML = folderClosed;

      item.appendChild(chevron);
      item.appendChild(icon);
      item.appendChild(label);

      let expanded = false;
      const childContainer = document.createElement("div");
      childContainer.className = "file-tree-children";
      childContainer.style.display = "none";

      item.addEventListener("click", () => {
        expanded = !expanded;
        childContainer.style.display = expanded ? "block" : "none";
        chevron.innerHTML = expanded ? chevronDown : chevronRight;
        icon.innerHTML = expanded ? folderOpen : folderClosed;
        item.classList.toggle("expanded", expanded);
      });

      parent.appendChild(item);

      if (entry.children) {
        renderEntries(entry.children, childContainer, depth + 1);
      }
      parent.appendChild(childContainer);
    } else {
      const spacer = document.createElement("span");
      spacer.className = "file-tree-chevron-spacer";
      item.appendChild(spacer);

      icon.innerHTML = getFileIcon(entry.name);
      item.appendChild(icon);
      item.appendChild(label);

      item.addEventListener("click", () => {
        onFileClick?.(entry.path, entry.name);
      });
      parent.appendChild(item);
    }
  }
}
