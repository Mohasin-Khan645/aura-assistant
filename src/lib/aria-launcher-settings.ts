// User preferences for the Task Launcher (Cmd/Ctrl+K palette).

export type LauncherSettings = {
  enabled: boolean;
  hotkey: "mod+k" | "mod+/" | "mod+j";
  voiceInput: boolean;        // show mic button
  autoExecute: boolean;       // run command immediately, vs. just paste into input
  showHistory: boolean;       // show recent commands at top
  blockOnWarn: boolean;       // require confirmation on safety "warn" level too
  requireConfirm: boolean;    // ask for confirmation before running ANY launcher command
  voiceShortcuts: boolean;    // recognize spoken shortcut phrases inside the launcher
};

const KEY = "aria.launcherSettings.v1";

export const DEFAULT_LAUNCHER_SETTINGS: LauncherSettings = {
  enabled: true,
  hotkey: "mod+k",
  voiceInput: true,
  autoExecute: true,
  showHistory: true,
  blockOnWarn: false,
  requireConfirm: false,
  voiceShortcuts: true,
};

export function loadLauncherSettings(): LauncherSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_LAUNCHER_SETTINGS;
    return { ...DEFAULT_LAUNCHER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LAUNCHER_SETTINGS;
  }
}

export function saveLauncherSettings(s: LauncherSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ }
}

export function matchesHotkey(e: KeyboardEvent, hotkey: LauncherSettings["hotkey"]): boolean {
  if (!(e.metaKey || e.ctrlKey)) return false;
  const k = e.key.toLowerCase();
  if (hotkey === "mod+k") return k === "k";
  if (hotkey === "mod+/") return k === "/";
  if (hotkey === "mod+j") return k === "j";
  return false;
}
