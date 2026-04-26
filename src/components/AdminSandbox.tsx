import { useEffect, useState } from "react";
import { ShieldCheck, Play, AlertTriangle, Trash2, Terminal } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { safeCalculate } from "@/lib/aria-actions";
import { scanInput } from "@/lib/aria-safety";
import { cn } from "@/lib/utils";

type AdminCmd = "calculate" | "fetch_get" | "open_url" | "set_theme" | "clipboard_write";
type LogLevel = "info" | "success" | "error";

type SandboxLog = {
  id: string;
  ts: number;
  level: LogLevel;
  cmd: AdminCmd;
  arg: string;
  output: string;
  durationMs: number;
};

const LOG_KEY = "aria.admin.logs.v1";
const MAX_LOGS = 50;

const CMD_INFO: Record<AdminCmd, { label: string; placeholder: string; needsConfirm: boolean }> = {
  calculate: { label: "Calculate (sandboxed)", placeholder: "(12*8)+45", needsConfirm: false },
  fetch_get: { label: "HTTP GET (no headers)", placeholder: "https://api.github.com/zen", needsConfirm: true },
  open_url: { label: "Open URL in new tab", placeholder: "https://example.com", needsConfirm: true },
  set_theme: { label: "Set theme (dark/light)", placeholder: "dark", needsConfirm: false },
  clipboard_write: { label: "Write to clipboard", placeholder: "text…", needsConfirm: true },
};

const loadLogs = (): SandboxLog[] => {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch { return []; }
};
const saveLogs = (logs: SandboxLog[]) => {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(-MAX_LOGS))); } catch { /* quota */ }
};

export const AdminSandbox = ({
  open,
  onOpenChange,
  onSetTheme,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSetTheme: (m: "dark" | "light") => void;
}) => {
  const [cmd, setCmd] = useState<AdminCmd>("calculate");
  const [arg, setArg] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [logs, setLogs] = useState<SandboxLog[]>(() => loadLogs());

  useEffect(() => { saveLogs(logs); }, [logs]);

  const info = CMD_INFO[cmd];
  const alerts = scanInput(arg);
  const danger = alerts.some((a) => a.level === "danger");

  const pushLog = (level: LogLevel, output: string, durationMs: number) => {
    const entry: SandboxLog = {
      id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(), level, cmd, arg: arg.slice(0, 200), output: output.slice(0, 800), durationMs,
    };
    setLogs((prev) => [...prev, entry].slice(-MAX_LOGS));
    console.log(`[admin][${level}] ${cmd}:`, output);
  };

  const run = async () => {
    if (!arg.trim()) return toast.error("Provide an argument");
    if (danger) return toast.error("Blocked: dangerous content detected");
    if (info.needsConfirm && !confirmed) return toast.warning("Tick the confirm box first");

    setBusy(true);
    const t0 = performance.now();
    try {
      let result = "";
      switch (cmd) {
        case "calculate":
          result = `= ${safeCalculate(arg.trim())}`;
          break;
        case "fetch_get": {
          const u = new URL(arg.trim());
          if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only http(s) allowed");
          const resp = await fetch(u.toString(), { method: "GET" });
          const text = (await resp.text()).slice(0, 2000);
          result = `HTTP ${resp.status}\n\n${text}`;
          break;
        }
        case "open_url": {
          const u = new URL(arg.trim());
          if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only http(s) allowed");
          window.open(u.toString(), "_blank", "noopener,noreferrer");
          result = `Opened ${u.toString()}`;
          break;
        }
        case "set_theme": {
          const mode = arg.toLowerCase().includes("light") ? "light" : "dark";
          onSetTheme(mode);
          result = `Theme → ${mode}`;
          break;
        }
        case "clipboard_write":
          await navigator.clipboard.writeText(arg);
          result = `Copied ${arg.length} chars to clipboard`;
          break;
      }
      pushLog("success", result, Math.round(performance.now() - t0));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      pushLog("error", `⚠️ ${msg}`, Math.round(performance.now() - t0));
    } finally {
      setBusy(false);
      setConfirmed(false);
    }
  };

  const clearLogs = () => { setLogs([]); toast.success("Logs cleared"); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Admin Action Sandbox
          </DialogTitle>
          <DialogDescription>
            Run guarded actions manually. All inputs are scanned, destructive ops require confirmation. Logs persist locally.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: command form */}
          <div className="space-y-3">
            <Select value={cmd} onValueChange={(v) => { setCmd(v as AdminCmd); setConfirmed(false); }}>
              <SelectTrigger className="bg-secondary/40 border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CMD_INFO) as AdminCmd[]).map((k) => (
                  <SelectItem key={k} value={k}>{CMD_INFO[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Textarea
              value={arg}
              onChange={(e) => setArg(e.target.value)}
              placeholder={info.placeholder}
              className="bg-secondary/40 border-primary/20 font-mono text-xs min-h-[80px]"
            />

            {alerts.length > 0 && (
              <div className={cn(
                "rounded-lg border px-2.5 py-2 text-[11px] flex gap-2 items-start",
                danger ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-accent/30 bg-accent/10",
              )}>
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div>
                  {alerts.map((a, i) => (
                    <div key={i}><strong>{a.category}:</strong> {a.message}</div>
                  ))}
                </div>
              </div>
            )}

            {info.needsConfirm && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                I understand this command leaves the sandbox.
              </label>
            )}

            <Button onClick={run} disabled={busy || danger}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Play className="w-4 h-4 mr-1.5" /> {busy ? "Running…" : "Run"}
            </Button>
          </div>

          {/* Right: persistent logs */}
          <div className="border border-primary/15 rounded-xl bg-secondary/20 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/15">
              <Terminal className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Sandbox logs
              </span>
              <span className="ml-auto text-[10px] font-mono text-primary/70">{logs.length}</span>
              <button onClick={clearLogs} disabled={!logs.length}
                className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                aria-label="Clear logs">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <ScrollArea className="flex-1 max-h-[280px]">
              {logs.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/60 px-3 py-6 text-center">
                  No runs yet.
                </p>
              ) : (
                <ul className="px-2 py-2 space-y-1">
                  {logs.slice().reverse().map((l) => (
                    <li key={l.id} className={cn(
                      "rounded-md px-2 py-1.5 text-[10px] font-mono border",
                      l.level === "success" && "border-primary/20 bg-primary/5",
                      l.level === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
                      l.level === "info" && "border-primary/10 bg-secondary/40",
                    )}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold uppercase tracking-wider">{l.cmd}</span>
                        <span className="text-muted-foreground/70">
                          {new Date(l.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · {l.durationMs}ms
                        </span>
                      </div>
                      <div className="text-muted-foreground truncate" title={l.arg}>↳ {l.arg}</div>
                      <pre className="whitespace-pre-wrap break-words mt-0.5 max-h-20 overflow-hidden">{l.output}</pre>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
