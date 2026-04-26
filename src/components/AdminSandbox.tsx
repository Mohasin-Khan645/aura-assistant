import { useState } from "react";
import { ShieldCheck, Play, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { safeCalculate } from "@/lib/aria-actions";
import { scanInput } from "@/lib/aria-safety";
import { cn } from "@/lib/utils";

type AdminCmd = "calculate" | "fetch_get" | "open_url" | "set_theme" | "clipboard_write";

const CMD_INFO: Record<AdminCmd, { label: string; placeholder: string; needsConfirm: boolean }> = {
  calculate: { label: "Calculate (sandboxed)", placeholder: "(12*8)+45", needsConfirm: false },
  fetch_get: { label: "HTTP GET (no headers)", placeholder: "https://api.github.com/zen", needsConfirm: true },
  open_url: { label: "Open URL in new tab", placeholder: "https://example.com", needsConfirm: true },
  set_theme: { label: "Set theme (dark/light)", placeholder: "dark", needsConfirm: false },
  clipboard_write: { label: "Write to clipboard", placeholder: "text…", needsConfirm: true },
};

export const AdminSandbox = ({
  open,
  onOpenChange,
  onSetTheme,
  onLog,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSetTheme: (m: "dark" | "light") => void;
  onLog?: (line: string) => void;
}) => {
  const [cmd, setCmd] = useState<AdminCmd>("calculate");
  const [arg, setArg] = useState("");
  const [output, setOutput] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const info = CMD_INFO[cmd];
  const alerts = scanInput(arg);
  const danger = alerts.some((a) => a.level === "danger");

  const run = async () => {
    if (!arg.trim()) return toast.error("Provide an argument");
    if (danger) return toast.error("Blocked: dangerous content detected");
    if (info.needsConfirm && !confirmed) {
      toast.warning("Tick the confirm box first");
      return;
    }
    setBusy(true);
    setOutput("");
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
      setOutput(result);
      onLog?.(`[admin] ${cmd}: ${result.slice(0, 120)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setOutput(`⚠️ ${msg}`);
      onLog?.(`[admin] ${cmd} failed: ${msg}`);
    } finally {
      setBusy(false);
      setConfirmed(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Admin Action Sandbox
          </DialogTitle>
          <DialogDescription>
            Run guarded actions manually. All inputs are scanned, destructive ops require confirmation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Select value={cmd} onValueChange={(v) => { setCmd(v as AdminCmd); setOutput(""); setConfirmed(false); }}>
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

          {output && (
            <pre className="bg-background/60 border border-primary/20 rounded-lg p-3 text-[11px] font-mono whitespace-pre-wrap max-h-[200px] overflow-auto">
              {output}
            </pre>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button
            onClick={run}
            disabled={busy || danger}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Play className="w-4 h-4 mr-1.5" /> {busy ? "Running…" : "Run"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
