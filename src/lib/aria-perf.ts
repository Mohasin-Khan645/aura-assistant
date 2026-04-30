// Lightweight performance checker. Logs Web Vitals + slow long-tasks.
// No external deps — uses native PerformanceObserver.
import { log } from "./aria-logger";

type Metric = { name: string; value: number; rating: "good" | "needs-improvement" | "poor" };

const RATINGS: Record<string, [number, number]> = {
  // [good, needs-improvement] thresholds (poor is anything beyond)
  LCP: [2500, 4000],
  FID: [100, 300],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  TTFB: [800, 1800],
};

function rate(name: string, value: number): Metric["rating"] {
  const t = RATINGS[name];
  if (!t) return "good";
  if (value <= t[0]) return "good";
  if (value <= t[1]) return "needs-improvement";
  return "poor";
}

function emit(name: string, value: number) {
  const m: Metric = { name, value: Math.round(value * 100) / 100, rating: rate(name, value) };
  log.info("[perf]", m);
}

export function startPerformanceCheck() {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;

  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      if (last) emit("LCP", last.startTime);
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}

  try {
    let cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as any[]) {
        if (!e.hadRecentInput) cls += e.value;
      }
      emit("CLS", cls);
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}

  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as any[]) {
        if (e.duration > 200) {
          log.warn("[perf] long task", { duration: Math.round(e.duration), name: e.name });
        }
      }
    }).observe({ type: "longtask", buffered: true });
  } catch {}

  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) emit("TTFB", nav.responseStart);
  } catch {}
}
