export function initResizeHandles(): void {
  setupHandle(
    "sidebar-resize",
    "sidebar",
    "left",
    220,
  );
  setupHandle(
    "toc-resize",
    "toc-panel",
    "right",
    200,
  );
}

function setupHandle(
  handleId: string,
  panelId: string,
  side: "left" | "right",
  minWidth: number,
): void {
  const handle = document.getElementById(handleId);
  const panel = document.getElementById(panelId);
  if (!handle || !panel) return;

  let startX = 0;
  let startWidth = 0;

  const onMouseMove = (e: MouseEvent): void => {
    e.preventDefault();
    const delta = e.clientX - startX;
    const newWidth = side === "left"
      ? startWidth + delta
      : startWidth - delta;
    panel.style.width = `${Math.max(minWidth, newWidth)}px`;
  };

  const onMouseUp = (): void => {
    handle.classList.remove("dragging");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  handle.addEventListener("mousedown", (e) => {
    if (panel.classList.contains("collapsed")) return;
    e.preventDefault();
    startX = e.clientX;
    startWidth = panel.getBoundingClientRect().width;
    handle.classList.add("dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}
