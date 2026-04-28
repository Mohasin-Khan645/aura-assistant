// UI to create / manage recurring automations.
import { useEffect, useState } from "react";
import { Calendar, Plus, Trash2, Power, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  loadSchedules, saveSchedules, computeNextRun, newScheduleId,
  type AriaSchedule, type ScheduleFreq,
} from "@/lib/aria-schedules";
import type { AriaAction } from "@/lib/aria-actions";

const ACTION_TEMPLATES: { label: string; build: (arg: string) => AriaAction }[] = [
  { label: "Daily briefing", build: () => ({ type: "briefing", label: "Daily briefing" }) },
  { label: "List my tasks", build: () => ({ type: "list_tasks", label: "Show my tasks" }) },
  { label: "Open URL", build: (u) => ({
      type: "open_url",
      url: /^https?:\/\//.test(u) ? u : `https://${u}`,
      label: `Open ${u}`,
  }) },
  { label: "Show time", build: () => ({ type: "time", label: "Show current time" }) },
  { label: "Weather check", build: (city) => ({ type: "weather", location: city || "Delhi", label: `Weather: ${city}` }) },
];

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRunNow?: (a: AriaAction) => void;
}

export function ScheduleAutomationDialog({ open, onOpenChange, onRunNow }: Props) {
  const [schedules, setSchedules] = useState<AriaSchedule[]>([]);
  const [name, setName] = useState("");
  const [tplIdx, setTplIdx] = useState("0");
  const [tplArg, setTplArg] = useState("");
  const [freq, setFreq] = useState<ScheduleFreq>("daily");
  const [time, setTime] = useState("09:00");
  const [intervalMin, setIntervalMin] = useState("30");
  const [dow, setDow] = useState("1");

  useEffect(() => { if (open) setSchedules(loadSchedules()); }, [open]);

  const persist = (next: AriaSchedule[]) => { setSchedules(next); saveSchedules(next); };

  const create = () => {
    const tpl = ACTION_TEMPLATES[parseInt(tplIdx, 10)];
    if (!tpl) return;
    const action = tpl.build(tplArg);
    const base: AriaSchedule = {
      id: newScheduleId(),
      name: name.trim() || tpl.label,
      freq,
      intervalMin: freq === "minutes" ? Math.max(1, parseInt(intervalMin, 10) || 5) : undefined,
      timeOfDay: ["daily", "weekly"].includes(freq) ? time : undefined,
      dayOfWeek: freq === "weekly" ? parseInt(dow, 10) : undefined,
      enabled: true,
      lastRun: null,
      nextRun: null,
      action,
      createdAt: new Date().toISOString(),
    };
    base.nextRun = computeNextRun(base);
    persist([base, ...schedules]);
    setName(""); setTplArg("");
    toast.success(`Scheduled "${base.name}"`, { description: base.nextRun ? `Next: ${new Date(base.nextRun).toLocaleString()}` : "" });
  };

  const toggle = (id: string) => {
    persist(schedules.map((s) => s.id === id
      ? { ...s, enabled: !s.enabled, nextRun: !s.enabled ? computeNextRun(s) : s.nextRun }
      : s));
  };

  const remove = (id: string) => persist(schedules.filter((s) => s.id !== id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Schedule Automation</DialogTitle>
          <DialogDescription>Recurring actions ARIA will run for you automatically.</DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-primary/15 bg-secondary/20 p-3 space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary/70">Create new</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={tplIdx} onValueChange={setTplIdx}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTION_TEMPLATES.map((t, i) => <SelectItem key={i} value={String(i)}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {[2, 4].includes(parseInt(tplIdx, 10)) && (
            <Input placeholder={parseInt(tplIdx, 10) === 2 ? "https://..." : "City"} value={tplArg} onChange={(e) => setTplArg(e.target.value)} />
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Select value={freq} onValueChange={(v) => setFreq(v as ScheduleFreq)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">Every N minutes</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
            {freq === "minutes" && (
              <Input type="number" min={1} value={intervalMin} onChange={(e) => setIntervalMin(e.target.value)} />
            )}
            {(freq === "daily" || freq === "weekly") && (
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            )}
            {freq === "weekly" && (
              <Select value={dow} onValueChange={setDow}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Button onClick={create} className="md:col-start-4"><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>
        </div>

        <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Active ({schedules.length})</p>
          {schedules.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No automations yet</p>
          ) : schedules.map((s) => (
            <div key={s.id} className="rounded-lg border border-primary/15 bg-secondary/20 px-3 py-2 flex items-center gap-3">
              <Power className={`w-4 h-4 shrink-0 ${s.enabled ? "text-primary" : "text-muted-foreground/50"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <Badge variant="outline" className="h-5 text-[9px]">{s.freq}</Badge>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {s.action.label} · next: {s.nextRun ? new Date(s.nextRun).toLocaleString() : "—"}
                </p>
              </div>
              {onRunNow && (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRunNow(s.action)} title="Run now">
                  <Play className="w-3.5 h-3.5" />
                </Button>
              )}
              <Switch checked={s.enabled} onCheckedChange={() => toggle(s.id)} />
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => remove(s.id)} aria-label="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
