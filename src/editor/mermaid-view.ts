import mermaid from "mermaid";

let mermaidInitialized = false;
let renderCounter = 0;

function ensureMermaidInit(): void {
  if (mermaidInitialized) return;
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue("--bg-primary")
    .trim();
  const isDark = bg !== "#ffffff" && bg !== "#fff";
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? "dark" : "default",
    securityLevel: "loose",
  });
  mermaidInitialized = true;
}

/**
 * Scan the editor container for ```mermaid code blocks and render diagrams
 * below them. This is a post-render approach that doesn't interfere with
 * ProseMirror's NodeView system.
 */
export function renderMermaidBlocks(container: HTMLElement): void {
  const codeBlocks = container.querySelectorAll("pre > code.language-mermaid");

  for (const codeEl of codeBlocks) {
    const pre = codeEl.parentElement;
    if (!pre) continue;

    // Skip if already has a preview sibling
    if (pre.nextElementSibling?.classList.contains("mermaid-preview")) continue;

    const code = codeEl.textContent?.trim() ?? "";
    if (!code) continue;

    const preview = document.createElement("div");
    preview.className = "mermaid-preview";
    preview.setAttribute("contenteditable", "false");
    pre.insertAdjacentElement("afterend", preview);

    renderDiagram(code, preview);
  }
}

async function renderDiagram(
  code: string,
  target: HTMLElement,
): Promise<void> {
  ensureMermaidInit();
  try {
    renderCounter += 1;
    const id = `mermaid-svg-${renderCounter}`;
    const { svg } = await mermaid.render(id, code);
    target.innerHTML = svg;
  } catch {
    target.innerHTML = `<span class="mermaid-error">다이어그램 구문 오류</span>`;
  }
}
