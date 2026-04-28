// Wake-word trainer — capture custom phrases via mic or text.
import { useEffect, useRef, useState } from "react";
import { Mic, Plus, Trash2, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { loadWakePhrases, saveWakePhrases, isDefaultPhrase } from "@/lib/aria-wake-training";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPhrasesChanged: (phrases: string[]) => void;
  lang: string;
}

export function WakeTrainerDialog({ open, onOpenChange, onPhrasesChanged, lang }: Props) {
  const [phrases, setPhrases] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => { if (open) setPhrases(loadWakePhrases()); }, [open]);

  const persist = (next: string[]) => {
    setPhrases(next);
    saveWakePhrases(next);
    onPhrasesChanged(next);
  };

  const addPhrase = (raw: string) => {
    const p = raw.trim().toLowerCase();
    if (p.length < 3) return toast.error("Phrase too short (min 3 chars)");
    if (p.length > 40) return toast.error("Phrase too long (max 40 chars)");
    if (phrases.includes(p)) return toast.info("Phrase already saved");
    persist([...phrases, p]);
    setInput("");
    toast.success(`Added: "${p}"`);
  };

  const removePhrase = (p: string) => {
    if (isDefaultPhrase(p)) return toast.error("Default phrases can't be removed");
    persist(phrases.filter((x) => x !== p));
  };

  const startRec = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return toast.error("Speech recognition not supported");
    const r = new SR();
    r.lang = lang; r.continuous = false; r.interimResults = false;
    r.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setInput(t);
      setRecording(false);
      toast.success(`Heard: "${t}"`);
    };
    r.onerror = () => { setRecording(false); toast.error("Couldn't capture"); };
    r.onend = () => setRecording(false);
    try { r.start(); recRef.current = r; setRecording(true); } catch { setRecording(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mic className="w-4 h-4 text-primary" /> Wake-Word Training</DialogTitle>
          <DialogDescription>Teach ARIA new phrases that'll wake her. Speak or type.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. yo aria, jarvis listen"
            onKeyDown={(e) => e.key === "Enter" && addPhrase(input)}
          />
          <Button type="button" variant="outline" size="icon" onClick={startRec} disabled={recording}
            className={recording ? "bg-accent/20 text-accent" : ""} title="Record phrase">
            <Mic className="w-4 h-4" />
          </Button>
          <Button onClick={() => addPhrase(input)} disabled={!input.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Active phrases ({phrases.length})</p>
          {phrases.map((p) => (
            <div key={p} className="flex items-center justify-between rounded-lg border border-primary/15 bg-secondary/30 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-foreground truncate">"{p}"</span>
                {isDefaultPhrase(p) && <Badge variant="outline" className="h-5 text-[9px] gap-1"><Lock className="w-2.5 h-2.5" />default</Badge>}
              </div>
              {!isDefaultPhrase(p) && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removePhrase(p)} aria-label="Remove">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
