import type { FileEntry } from "../types";

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
  for (const entry of entries) {
    const item = document.createElement("div");
    item.className = `file-tree-item${entry.isDirectory ? " directory" : ""}`;
    item.setAttribute("data-path", entry.path);

    for (let i = 0; i < depth; i++) {
      const indent = document.createElement("span");
      indent.className = "file-tree-indent";
      item.appendChild(indent);
    }

    const label = document.createElement("span");
    if (entry.isDirectory) {
      label.textContent = `\u25B8 ${entry.name}`;
    } else {
      label.textContent = entry.name;
    }
    item.appendChild(label);

    if (entry.path === activeFilePath) {
      item.classList.add("active");
    }

    if (entry.isDirectory) {
      let expanded = false;
      const childContainer = document.createElement("div");
      childContainer.style.display = "none";

      item.addEventListener("click", () => {
        expanded = !expanded;
        childContainer.style.display = expanded ? "block" : "none";
        label.textContent = `${expanded ? "\u25BE" : "\u25B8"} ${entry.name}`;
      });

      parent.appendChild(item);

      if (entry.children) {
        renderEntries(entry.children, childContainer, depth + 1);
      }
      parent.appendChild(childContainer);
    } else {
      item.addEventListener("click", () => {
        onFileClick?.(entry.path, entry.name);
      });
      parent.appendChild(item);
    }
  }
}
