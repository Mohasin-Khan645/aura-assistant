// Daily briefing — generates a one-line morning summary using time, weather, and pending tasks.
import { listTasks, listReminders, type CloudSettings } from "./aria-cloud";

export async function buildBriefing(opts: {
  userName: string;
  city: string | null;
}): Promise<string> {
  const hour = new Date().getHours();
  const tod = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const namePart = opts.userName ? `, ${opts.userName.split(" ")[0]}` : "";

  let weather = "";
  if (opts.city) {
    try {
      const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(opts.city)}&count=1`).then((r) => r.json());
      const place = geo?.results?.[0];
      if (place) {
        const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&temperature_unit=celsius`).then((r) => r.json());
        const t = w?.current?.temperature_2m;
        if (typeof t === "number") weather = ` It's about ${Math.round(t)}°C in ${place.name}.`;
      }
    } catch {
      /* ignore network errors */
    }
  }

  let tasksLine = "";
  let remLine = "";
  try {
    const tasks = await listTasks();
    const open = tasks.filter((t) => !t.done);
    if (open.length) tasksLine = ` You have ${open.length} task${open.length === 1 ? "" : "s"} pending.`;
  } catch { /* not signed in or empty */ }
  try {
    const reminders = await listReminders();
    const upcoming = reminders.filter((r) => !r.notified && new Date(r.remind_at).getTime() > Date.now());
    if (upcoming.length) remLine = ` ${upcoming.length} reminder${upcoming.length === 1 ? "" : "s"} on the way.`;
  } catch { /* ignore */ }

  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${tod}${namePart}. It's ${time}.${weather}${tasksLine}${remLine}`;
}

export function shouldGiveBriefingToday(settings: CloudSettings | null): boolean {
  if (!settings?.briefing_enabled) return false;
  const key = "aria:lastBriefing";
  const today = new Date().toISOString().slice(0, 10);
  if (typeof window === "undefined") return false;
  const last = localStorage.getItem(key);
  if (last === today) return false;
  localStorage.setItem(key, today);
  return true;
}
