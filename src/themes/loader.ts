let currentThemeLink: HTMLLinkElement | null = null;

const BUILTIN_THEMES: Record<string, string> = {
  light: "/src/themes/light.css",
  dark: "/src/themes/dark.css",
};

export function loadTheme(themeName: string): void {
  if (currentThemeLink) {
    currentThemeLink.remove();
    currentThemeLink = null;
  }

  const href = BUILTIN_THEMES[themeName];
  if (!href) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  currentThemeLink = link;
}

export function loadCustomTheme(cssPath: string): void {
  if (currentThemeLink) {
    currentThemeLink.remove();
    currentThemeLink = null;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = cssPath;
  document.head.appendChild(link);
  currentThemeLink = link;
}

export function detectSystemTheme(): string {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function watchSystemTheme(onChange: (theme: string) => void): void {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      onChange(e.matches ? "dark" : "light");
    });
}

export function applyFontOverride(
  fontFamily: string | null,
  fontSize: number | null,
): void {
  const root = document.documentElement;
  if (fontFamily) {
    root.style.setProperty("--font-family", fontFamily);
  }
  if (fontSize) {
    root.style.setProperty("--font-size", `${fontSize}px`);
  }
}
