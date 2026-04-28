// Build & download desktop shortcut files for any URL.
import { useState } from "react";
import { Rocket, Download, Apple, Monitor } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  downloadWindowsShortcut, downloadMacShortcut, downloadLinuxShortcut, downloadAllPlatforms,
} from "@/lib/aria-shortcuts";

const PRESETS = [
  { name: "ARIA Assistant", url: typeof window !== "undefined" ? window.location.origin : "" },
  { name: "ChatGPT", url: "https://chat.openai.com" },
  { name: "GitHub", url: "https://github.com" },
  { name: "YouTube", url: "https://www.youtube.com" },
  { name: "Gmail", url: "https://mail.google.com" },
  { name: "Stack Overflow", url: "https://stackoverflow.com" },
];

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function ShortcutLauncherDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState("ARIA Assistant");
  const [url, setUrl] = useState(typeof window !== "undefined" ? window.location.origin : "");

  const handle = (kind: "win" | "mac" | "linux" | "all") => {
    if (!url.trim()) return toast.error("URL required");
    const t = { name: name.trim() || "Shortcut", url: url.trim() };
    if (kind === "win") downloadWindowsShortcut(t);
    if (kind === "mac") downloadMacShortcut(t);
    if (kind === "linux") downloadLinuxShortcut(t);
    if (kind === "all") downloadAllPlatforms(t);
    toast.success(`Shortcut downloaded`, { description: `Drag the file to your desktop.` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Rocket className="w-4 h-4 text-primary" /> Desktop Shortcut Launcher</DialogTitle>
          <DialogDescription>Generate a one-click desktop shortcut for any URL.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Input placeholder="Shortcut name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <p className="text-[10px] w-full font-mono uppercase tracking-widest text-muted-foreground">Quick presets</p>
          {PRESETS.map((p) => (
            <Button key={p.name} variant="outline" size="sm" className="h-7 text-xs"
              onClick={() => { setName(p.name); setUrl(p.url); }}>
              {p.name}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => handle("win")}><Monitor className="w-4 h-4 mr-1.5" />Windows .url</Button>
          <Button variant="outline" onClick={() => handle("mac")}><Apple className="w-4 h-4 mr-1.5" />macOS .webloc</Button>
          <Button variant="outline" onClick={() => handle("linux")}><Monitor className="w-4 h-4 mr-1.5" />Linux .desktop</Button>
          <Button onClick={() => handle("all")}><Download className="w-4 h-4 mr-1.5" />All three</Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Drop the downloaded file onto your desktop. Double-click opens the URL in your default browser.
        </p>
      </DialogContent>
    </Dialog>
  );
}
