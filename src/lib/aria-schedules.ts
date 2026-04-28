// Lightweight schedule automation — recurring jobs stored in localStorage.
// Each schedule fires an AriaAction-like payload at intervals.
import type { AriaAction } from "./aria-actions";

const KEY = "aria:schedules";

export type ScheduleFreq = "once" | "minutes" | "hourly" | "daily" | "weekly";

export interface AriaSchedule {
  id: string;
  name: string;
  freq: ScheduleFreq;
  /** Minutes interval for "minutes". */
  intervalMin?: number;
  /** "HH:MM" 24h for daily/weekly. */
  timeOfDay?: string;
  /** 0..6 for weekly (0=Sun). */
  dayOfWeek?: number;
  /** When to fire for "once" — ISO. */
  fireAt?: string;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  action: AriaAction;
  createdAt: string;
}

export function loadSchedules(): AriaSchedule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AriaSchedule[];
  } catch { return []; }
}

export function saveSchedules(s: AriaSchedule[]) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function computeNextRun(s: AriaSchedule, from: Date = new Date()): string | null {
  const d = new Date(from);
  switch (s.freq) {
    case "once":
      return s.fireAt && new Date(s.fireAt).getTime() > d.getTime() ? s.fireAt : null;
    case "minutes": {
      const n = Math.max(1, s.intervalMin ?? 5);
      return new Date(d.getTime() + n * 60_000).toISOString();
    }
    case "hourly": {
      const next = new Date(d);
      next.setMinutes(0, 0, 0);
      next.setHours(next.getHours() + 1);
      return next.toISOString();
    }
    case "daily": {
      const [h, m] = (s.timeOfDay ?? "09:00").split(":").map(Number);
      const next = new Date(d);
      next.setHours(h, m, 0, 0);
      if (next.getTime() <= d.getTime()) next.setDate(next.getDate() + 1);
      return next.toISOString();
    }
    case "weekly": {
      const [h, m] = (s.timeOfDay ?? "09:00").split(":").map(Number);
      const target = s.dayOfWeek ?? 1;
      const next = new Date(d);
      next.setHours(h, m, 0, 0);
      let delta = (target - next.getDay() + 7) % 7;
      if (delta === 0 && next.getTime() <= d.getTime()) delta = 7;
      next.setDate(next.getDate() + delta);
      return next.toISOString();
    }
  }
}

export function newScheduleId() {
  return Math.random().toString(36).slice(2, 10);
}
