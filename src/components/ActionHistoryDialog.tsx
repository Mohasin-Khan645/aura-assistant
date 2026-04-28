// Action history search — full-text search across executed actions.
import { useMemo, useState } from "react";
import { Search, CheckCircle2, XCircle, Clock, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ActionLogEntry } from "@/lib/aria-executor";
import { cn } from "@/lib/utils";

type Filter = "all" | "success" | "error" | "pending";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entries: ActionLogEntry[];
  onReplay?: (entry: ActionLogEntry) => void;
}

export function ActionHistoryDialog({ open, onOpenChange, entries, onReplay }: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries
      .slice()
      .reverse()
      .filter((e) => filter === "all" || e.status === filter)
      .filter((e) => {
        if (!needle) return true;
        return (
          e.action.label.toLowerCase().includes(needle) ||
          e.action.type.toLowerCase().includes(needle) ||
          (e.message ?? "").toLowerCase().includes(needle)
        );
      });
  }, [entries, q, filter]);

  const counts = useMemo(() => ({
    all: entries.length,
    success: entries.filter((e) => e.status === "success").length,
    error: entries.filter((e) => e.status === "error").length,
    pending: entries.filter((e) => e.status === "pending").length,
  }), [entries]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Search className="w-4 h-4 text-primary" /> Action History</DialogTitle>
          <DialogDescription>Search and replay anything ARIA has executed.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, type, or message…" autoFocus />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground self-center" />
          {(["all", "success", "error", "pending"] as Filter[]).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)} className="h-7 text-xs capitalize">
              {f} <span className="ml-1 opacity-60">({counts[f]})</span>
            </Button>
          ))}
        </div>

        <div className="max-h-[420px] overflow-y-auto space-y-1.5">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No matching actions</p>
          ) : filtered.map((e) => (
            <div key={e.id} className={cn(
              "rounded-lg border px-3 py-2.5 flex items-start gap-3",
              e.status === "success" && "border-primary/20 bg-primary/5",
              e.status === "error" && "border-destructive/30 bg-destructive/5",
              e.status === "pending" && "border-muted bg-secondary/40",
            )}>
              <div className="mt-0.5 shrink-0">
                {e.status === "success" && <CheckCircle2 className="w-4 h-4 text-primary" />}
                {e.status === "error" && <XCircle className="w-4 h-4 text-destructive" />}
                {e.status === "pending" && <Clock className="w-4 h-4 text-muted-foreground animate-pulse" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{e.action.label}</p>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-primary/60">{e.action.type}</span>
                </div>
                {e.message && <p className="text-xs text-muted-foreground mt-0.5 break-words">{e.message}</p>}
                <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                  {new Date(e.timestamp).toLocaleString()}
                </p>
              </div>
              {onReplay && (
                <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0" onClick={() => onReplay(e)}>
                  Replay
                </Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
