// CS Daily Briefing card — shows time, weather, pending tasks & a CS tip-of-the-day.
import { useEffect, useState } from "react";
import { Coffee, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listTasks, listReminders } from "@/lib/aria-cloud";
import { cn } from "@/lib/utils";

const CS_TIPS = [
  "Premature optimization is the root of all evil. — Knuth",
  "First, solve the problem. Then, write the code.",
  "Big-O hides constants — measure before you optimize.",
  "Immutability prevents a thousand bugs.",
  "A good name is worth a hundred comments.",
  "Cache invalidation is one of the two hard things in CS.",
  "Read more code than you write.",
  "DRY, but not at the cost of clarity.",
  "Tests are documentation that never lies.",
  "Composition > inheritance.",
];

interface Props {
  userName: string;
  city: string | null;
  lang: string;
  onSpeak?: (text: string) => void;
}

export function DailyBriefingCard({ userName, city, lang, onSpeak }: Props) {
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState<string | null>(null);
  const [tasksOpen, setTasksOpen] = useState<number | null>(null);
  const [remindersDue, setRemindersDue] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [tip] = useState(() => CS_TIPS[Math.floor(Math.random() * CS_TIPS.length)]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const [tasks, rem] = await Promise.all([
        listTasks().catch(() => []),
        listReminders().catch(() => []),
      ]);
      setTasksOpen(tasks.filter((t) => !t.done).length);
      setRemindersDue(
        rem.filter((r) => !r.notified && new Date(r.remind_at).getTime() > Date.now()).length,
      );
      if (city) {
        try {
          const geo = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
          ).then((r) => r.json());
          const place = geo?.results?.[0];
          if (place) {
            const w = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code`,
            ).then((r) => r.json());
            const t = w?.current?.temperature_2m;
            if (typeof t === "number") setWeather(`${Math.round(t)}°C · ${place.name}`);
          }
        } catch { /* ignore */ }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [city]);

  const hour = now.getHours();
  const isHindi = lang.startsWith("hi");
  const tod = isHindi
    ? (hour < 12 ? "सुप्रभात" : hour < 18 ? "नमस्कार" : "शुभ संध्या")
    : (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  const first = userName?.split(" ")[0] || "";
  const greeting = isHindi
    ? `${tod}${first ? `, ${first}` : ""}`
    : `${tod}${first ? `, ${first}` : ""}`;
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  const speakIt = () => {
    const parts: string[] = [`${greeting}.`, isHindi ? `अभी समय है ${time}.` : `It's ${time}.`];
    if (weather) parts.push(isHindi ? `मौसम ${weather}.` : `Weather ${weather}.`);
    if (tasksOpen) parts.push(isHindi ? `${tasksOpen} काम बाकी हैं.` : `${tasksOpen} pending tasks.`);
    onSpeak?.(parts.join(" "));
  };

  return (
    <div className="aria-panel rounded-2xl p-4 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.25em] text-primary/80">
            <Coffee className="w-3 h-3" /> Daily Briefing
          </div>
          <h3 className="mt-1 text-lg font-display font-semibold text-foreground truncate">
            {greeting}
          </h3>
          <p className="text-xs text-muted-foreground font-mono">{date} · {time}</p>
        </div>
        <Button
          size="icon" variant="ghost" onClick={() => void refresh()}
          className={cn("text-primary hover:bg-primary/10 h-8 w-8 shrink-0", loading && "animate-spin")}
          aria-label="Refresh briefing"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 relative">
        <Stat label={isHindi ? "मौसम" : "Weather"} value={weather ?? "—"} />
        <Stat label={isHindi ? "कार्य" : "Tasks"} value={tasksOpen?.toString() ?? "—"} />
        <Stat label={isHindi ? "रिमाइंडर" : "Reminders"} value={remindersDue?.toString() ?? "—"} />
      </div>

      <div className="mt-3 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 relative">
        <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.25em] text-primary/70">
          <Sparkles className="w-3 h-3" /> CS Tip
        </div>
        <p className="text-xs text-foreground/90 mt-1 leading-snug">{tip}</p>
      </div>

      {onSpeak && (
        <button
          onClick={speakIt}
          className="mt-3 w-full text-[10px] font-mono uppercase tracking-widest text-primary/80 hover:text-primary transition-smooth"
        >
          ▶ {isHindi ? "ब्रीफिंग सुनें" : "Speak briefing"}
        </button>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-primary/10 bg-secondary/30 px-2 py-1.5 text-center">
      <div className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm font-display font-semibold text-foreground truncate">{value}</div>
    </div>
  );
}
