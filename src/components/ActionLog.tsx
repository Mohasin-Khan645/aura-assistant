import { CheckCircle2, XCircle, Loader2, Activity } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ActionLogEntry } from "@/lib/aria-executor";
import { cn } from "@/lib/utils";

export const ActionLog = ({ entries }: { entries: ActionLogEntry[] }) => {
  return (
    <div className="aria-panel rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/15">
        <Activity className="w-4 h-4 text-primary" />
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Action Log
        </h2>
        <span className="ml-auto text-[10px] font-mono text-primary/70">{entries.length}</span>
      </div>
      <ScrollArea className="flex-1 max-h-[260px] lg:max-h-none">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 px-4 py-6 text-center">
            No actions yet. Try "open YouTube".
          </p>
        ) : (
          <ul className="px-2 py-2 space-y-1">
            {entries.slice().reverse().map((e) => (
              <li
                key={e.id}
                className={cn(
                  "flex items-start gap-2 px-3 py-2 rounded-lg text-xs transition-smooth",
                  e.status === "success" && "bg-primary/5 hover:bg-primary/10",
                  e.status === "error" && "bg-destructive/10 hover:bg-destructive/15",
                  e.status === "pending" && "bg-secondary/40",
                )}
              >
                <span className="mt-0.5 shrink-0">
                  {e.status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  {e.status === "error" && <XCircle className="w-3.5 h-3.5 text-destructive" />}
                  {e.status === "pending" && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{e.action.label}</p>
                  {e.message && (
                    <p className={cn(
                      "text-[10px] truncate font-mono mt-0.5",
                      e.status === "error" ? "text-destructive/80" : "text-muted-foreground",
                    )}>
                      {e.message}
                    </p>
                  )}
                </div>
                <span className="text-[9px] font-mono text-muted-foreground/60 shrink-0">
                  {new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
};
