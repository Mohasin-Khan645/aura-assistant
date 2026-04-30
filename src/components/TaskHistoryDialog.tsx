import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, FileJson, FileSpreadsheet, Trash2, Replay, Search } from "lucide-react";
import {
  loadTaskHistory, clearTaskHistory, type TaskHistoryEntry,
} from "@/lib/aria-task-history";
import {
  downloadHistoryCsv, downloadHistoryJson, downloadActivityPdf,
} from "@/lib/aria-reports";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onReplay: (prompt: string) => void;
  profileName: string;
  conversationStats?: { total: number; user: number; assistant: number };
};

export function TaskHistoryDialog({ open, onOpenChange, onReplay, profileName, conversationStats }: Props) {
  const [entries, setEntries] = useState<TaskHistoryEntry[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (open) setEntries(loadTaskHistory().slice().reverse());
  }, [open]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) => e.prompt.toLowerCase().includes(q) || e.source.includes(q) || e.status.includes(q),
    );
  }, [entries, filter]);

  const clear = () => {
    if (!confirm("Clear all task history? This cannot be undone.")) return;
    clearTaskHistory();
    setEntries([]);
    toast.success("History cleared");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Task history & reports</DialogTitle>
          <DialogDescription>
            Every command you run through the launcher, voice, or chat is recorded here. Export as CSV, JSON, or PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 mb-3">
          <Button size="sm" variant="outline" onClick={() => downloadHistoryCsv(entries)} disabled={!entries.length}>
            <FileSpreadsheet className="w-4 h-4 mr-1.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadHistoryJson(entries)} disabled={!entries.length}>
            <FileJson className="w-4 h-4 mr-1.5" /> JSON
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadActivityPdf({ profileName, history: entries, conversationStats })}
            disabled={!entries.length}
          >
            <FileText className="w-4 h-4 mr-1.5" /> PDF report
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-7 h-8 w-[180px]"
              />
            </div>
            <Button size="sm" variant="ghost" onClick={clear} disabled={!entries.length}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[55vh] border rounded-md">
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground italic">
              {entries.length === 0 ? "No tasks yet — run a command from ⌘K to get started." : "No matches."}
            </p>
          ) : (
            <ul className="divide-y">
              {filtered.map((e) => (
                <li key={e.id} className="p-3 flex items-start gap-3 hover:bg-muted/40">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="text-[10px] capitalize">{e.source}</Badge>
                      <Badge
                        variant={
                          e.status === "completed" ? "default"
                          : e.status === "warned" ? "secondary"
                          : "destructive"
                        }
                        className="text-[10px] capitalize"
                      >
                        {e.status}
                      </Badge>
                      {e.language && <Badge variant="outline" className="text-[10px] uppercase">{e.language}</Badge>}
                      <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                        {new Date(e.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm break-words">{e.prompt}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => { onReplay(e.prompt); onOpenChange(false); }} title="Replay">
                    <Replay className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
