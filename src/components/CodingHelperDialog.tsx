// Coding helper dialog — paste code, choose mode, get an answer streamed from ARIA.
import { useState } from "react";
import { Code2, Loader2, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { streamAria } from "@/lib/aria-chat";
import { toast } from "sonner";

const MODES = {
  explain: "Explain what this code does, line by line where helpful.",
  debug: "Find bugs, edge cases, and suggest fixes. Show the corrected code.",
  refactor: "Refactor for clarity and idiomatic style. Show the improved version with brief notes.",
  optimize: "Improve performance/complexity. Explain the trade-offs.",
  test: "Write thorough unit tests for this code.",
  review: "Code review with severity-tagged findings (nit/warn/blocker).",
} as const;
type Mode = keyof typeof MODES;

export function CodingHelperDialog({ open, onOpenChange, userName }: {
  open: boolean; onOpenChange: (v: boolean) => void; userName: string;
}) {
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<Mode>("explain");
  const [language, setLanguage] = useState("auto-detect");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    if (!code.trim() || busy) return;
    setOut("");
    setBusy(true);
    let acc = "";
    const prompt = `${MODES[mode]}\n\nLanguage: ${language}\n\n\`\`\`\n${code}\n\`\`\``;
    await streamAria({
      messages: [{ role: "user", content: prompt }],
      userName,
      addressStyle: "first_name",
      onDelta: (c) => { acc += c; setOut(acc); },
      onDone: () => setBusy(false),
      onError: (e) => { toast.error(e); setBusy(false); },
    });
  };

  const copyOut = async () => {
    await navigator.clipboard.writeText(out);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-primary" /> Coding Helper
          </DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-4 flex-1 overflow-hidden">
          <div className="flex flex-col gap-2 min-h-0">
            <div className="flex gap-2">
              <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="explain">Explain</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="refactor">Refactor</SelectItem>
                  <SelectItem value="optimize">Optimize</SelectItem>
                  <SelectItem value="test">Write tests</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                </SelectContent>
              </Select>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["auto-detect", "TypeScript", "JavaScript", "Python", "Go", "Rust", "Java", "C++", "C#", "SQL", "Bash", "HTML/CSS"].map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here…"
              className="font-mono text-xs flex-1 min-h-[300px] resize-none"
              spellCheck={false}
            />
            <Button onClick={run} disabled={busy || !code.trim()} className="self-end">
              {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Working…</> : "Analyze"}
            </Button>
          </div>
          <div className="flex flex-col gap-2 min-h-0 aria-panel rounded-xl p-3 relative">
            {out && (
              <button onClick={copyOut} className="absolute top-2 right-2 p-1.5 rounded-full bg-background border border-primary/30 hover:bg-primary/10 z-10">
                {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
              </button>
            )}
            <ScrollArea className="flex-1 max-h-[60vh] pr-2">
              {out ? (
                <div className="prose prose-sm prose-invert max-w-none prose-pre:bg-background/60 prose-pre:border prose-pre:border-primary/20 prose-code:text-primary">
                  <ReactMarkdown>{out}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/60 text-center py-12">
                  Paste code on the left, choose a mode, and hit <strong>Analyze</strong>.
                </p>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
