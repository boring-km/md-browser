function svg(inner: string, size = 16, viewBox = "0 0 24 24"): string {
  return `<svg width="${size}" height="${size}" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

// --- Chevron ---
export const chevronRight = svg(
  `<polyline points="9 18 15 12 9 6"/>`,
);

export const chevronDown = svg(
  `<polyline points="6 9 12 15 18 9"/>`,
);

// --- Folders ---
export const folderClosed = svg(
  `<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>`,
);

export const folderOpen = svg(
  `<path d="M6 14l1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/>`,
);

// --- Files ---
export const fileText = svg(
  `<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>`,
);

export const fileCode = svg(
  `<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/>`,
);

export const fileJson = svg(
  `<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12a1 1 0 0 0-1 1v1a2 2 0 0 1-2 2 2 2 0 0 1 2 2v1a1 1 0 0 0 1 1"/><path d="M14 12a1 1 0 0 1 1 1v1a2 2 0 0 0 2 2 2 2 0 0 0-2 2v1a1 1 0 0 1-1 1"/>`,
);

export const fileImage = svg(
  `<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/><path d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22"/>`,
);

export const fileCss = svg(
  `<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h3"/><path d="M8 17h3"/>`,
);

export const fileHtml = svg(
  `<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 13-2 2 2 2"/><path d="m15 13 2 2-2 2"/>`,
);

export const fileConfig = svg(
  `<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="12" cy="15" r="2"/><path d="M12 11v2"/><path d="M12 17v2"/>`,
);

export const fileLock = svg(
  `<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><rect x="8" y="13" width="8" height="6" rx="1"/><path d="M10 13v-2a2 2 0 0 1 4 0v2"/>`,
);

export const fileGeneric = svg(
  `<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>`,
);

// --- Markdown (file shape + M↓ drawn as paths) ---
export const fileMarkdown = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
  <polyline points="14 2 14 8 20 8"/>
  <path d="M7 13v5l2.5-3 2.5 3v-5" stroke-width="1.8"/>
  <path d="M15 13v5m0 0l2-2m-2 2l-2-2" stroke-width="1.8"/>
</svg>`;

// --- UI ---
export const hamburger = svg(
  `<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>`,
);

export const panelLeft = svg(
  `<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>`,
);

export const panelRight = svg(
  `<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/>`,
);

export const arrowLeft = svg(
  `<polyline points="15 18 9 12 15 6"/>`,
);

export const arrowRight = svg(
  `<polyline points="9 18 15 12 9 6"/>`,
);

export const codeView = svg(
  `<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>`,
);

export const editView = svg(
  `<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.855z"/>`,
);

export function getFileIcon(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return fileMarkdown;
  if (lower.endsWith(".json")) return fileJson;
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return fileCode;
  if (lower.endsWith(".js") || lower.endsWith(".jsx")) return fileCode;
  if (lower.endsWith(".css") || lower.endsWith(".scss") || lower.endsWith(".less")) return fileCss;
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return fileHtml;
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".gif") || lower.endsWith(".svg") || lower.endsWith(".webp")) return fileImage;
  if (lower.endsWith(".toml") || lower.endsWith(".yaml") || lower.endsWith(".yml") || lower.endsWith(".ini") || lower.endsWith(".env")) return fileConfig;
  if (lower.endsWith(".rs")) return fileCode;
  if (lower.endsWith(".lock")) return fileLock;
  return fileGeneric;
}
