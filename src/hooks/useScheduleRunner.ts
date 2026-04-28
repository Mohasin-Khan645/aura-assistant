// Polls schedules every 30s and fires actions whose nextRun is due.
import { useEffect, useRef } from "react";
import { computeNextRun, loadSchedules, saveSchedules, type AriaSchedule } from "@/lib/aria-schedules";
import type { AriaAction } from "@/lib/aria-actions";

export function useScheduleRunner(opts: {
  enabled: boolean;
  onFire: (action: AriaAction, schedule: AriaSchedule) => void;
}) {
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!opts.enabled) return;
    const tick = () => {
      const all = loadSchedules();
      const now = Date.now();
      let mutated = false;
      const next: AriaSchedule[] = all.map((s) => {
        if (!s.enabled || !s.nextRun) return s;
        if (new Date(s.nextRun).getTime() > now) return s;
        try { opts.onFire(s.action, s); } catch { /* ignore */ }
        mutated = true;
        const newNext = s.freq === "once" ? null : computeNextRun(s);
        return {
          ...s,
          lastRun: new Date().toISOString(),
          nextRun: newNext,
          enabled: s.freq === "once" ? false : s.enabled,
        };
      });
      if (mutated) saveSchedules(next);
    };
    tick();
    tickRef.current = window.setInterval(tick, 30_000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [opts.enabled, opts.onFire]);
}
