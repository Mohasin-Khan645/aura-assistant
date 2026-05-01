// Theme management with auto-detect support.
// Modes: "dark" | "light" | "system" (follows OS prefers-color-scheme).

export type ThemeMode = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

const STORAGE_KEY = "aria.theme.mode";

export const loadThemeMode = (): ThemeMode => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "dark" || v === "light" || v === "system") return v;
  } catch { /* ignore */ }
  return "system";
};

export const saveThemeMode = (mode: ThemeMode) => {
  try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }
};

export const systemPrefersDark = (): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

export const resolveTheme = (mode: ThemeMode): ResolvedTheme =>
  mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;

export const applyTheme = (resolved: ResolvedTheme) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  root.style.colorScheme = resolved;
};

/** Subscribe to OS theme changes; only fires when mode is "system". */
export const subscribeToSystemTheme = (cb: (resolved: ResolvedTheme) => void): (() => void) => {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => cb(e.matches ? "dark" : "light");
  mql.addEventListener?.("change", handler);
  return () => mql.removeEventListener?.("change", handler);
};
