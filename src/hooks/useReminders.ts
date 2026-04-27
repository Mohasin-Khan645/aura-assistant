// Reminders polling — checks every 30s for due reminders, fires toast + voice + browser notification.
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { listReminders, markReminderNotified } from "@/lib/aria-cloud";
import { speak } from "@/lib/aria-speech";

export function useReminders(opts: { enabled: boolean; voice: boolean; lang: string; userName: string }) {
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!opts.enabled) return;
    if ("Notification" in window && Notification.permission === "default") {
      // Ask once
      void Notification.requestPermission().catch(() => {});
    }

    let cancelled = false;
    const tick = async () => {
      try {
        const all = await listReminders();
        const now = Date.now();
        for (const r of all) {
          if (r.notified || seen.current.has(r.id)) continue;
          if (new Date(r.remind_at).getTime() <= now) {
            seen.current.add(r.id);
            toast.message(`⏰ Reminder: ${r.title}`, {
              description: `Set for ${new Date(r.remind_at).toLocaleString()}`,
              duration: 10000,
            });
            if (opts.voice) {
              const greet = opts.userName ? `${opts.userName}, ` : "";
              void speak(`Reminder. ${greet}${r.title}`, opts.lang);
            }
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("ARIA Reminder", { body: r.title });
            }
            void markReminderNotified(r.id).catch(() => {});
          }
        }
      } catch {
        /* swallow */
      }
      if (!cancelled) setTimeout(tick, 30000);
    };
    tick();
    return () => { cancelled = true; };
  }, [opts.enabled, opts.voice, opts.lang, opts.userName]);
}
