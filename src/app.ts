function init(): void {
  const app = document.getElementById("app");
  if (!app) return;
  app.textContent = "md-browser — Tauri v2 + ProseMirror";
}

document.addEventListener("DOMContentLoaded", init);
