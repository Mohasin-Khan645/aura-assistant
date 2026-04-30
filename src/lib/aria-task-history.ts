// Persistent local task/command history for the launcher and chat.
// Stored in localStorage; capped to keep size bounded.

import type { SafetyLevel } from "./aria-safety";

export type TaskHistorySource = "launcher" | "chat" | "voice" | "schedule";
export type TaskHistoryStatus = "completed" | "blocked" | "warned" | "error";

export type TaskHistoryEntry = {
  id: string;
  source: TaskHistorySource;
  prompt: string;
  status: TaskHistoryStatus;
  safety: SafetyLevel;
  language?: string;
  createdAt: number; // epoch ms
  durationMs?: number;
  notes?: string;
};

const KEY = "aria.taskHistory.v1";
const MAX = 500;

export function loadTaskHistory(): TaskHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TaskHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTaskHistory(entries: TaskHistoryEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX)));
  } catch { /* quota */ }
}

export function appendTaskHistory(entry: Omit<TaskHistoryEntry, "id" | "createdAt"> & Partial<Pick<TaskHistoryEntry, "id" | "createdAt">>): TaskHistoryEntry {
  const full: TaskHistoryEntry = {
    id: entry.id ?? crypto.randomUUID(),
    createdAt: entry.createdAt ?? Date.now(),
    ...entry,
  } as TaskHistoryEntry;
  const list = loadTaskHistory();
  list.push(full);
  saveTaskHistory(list);
  return full;
}

export function clearTaskHistory() {
  localStorage.removeItem(KEY);
}
