import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus } from "lucide-react";
import {
  loadLauncherSettings, saveLauncherSettings, DEFAULT_LAUNCHER_SETTINGS,
  type LauncherSettings,
} from "@/lib/aria-launcher-settings";
import {
  loadCustomTemplates, saveCustomTemplates, type CommandTemplate,
} from "@/lib/aria-templates";
import {
  loadVoiceShortcuts, saveVoiceShortcuts, type VoiceShortcut,
} from "@/lib/aria-voice-shortcuts";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (o: boolean) => void };

export function LauncherSettingsDialog({ open, onOpenChange }: Props) {
  const [settings, setSettings] = useState<LauncherSettings>(DEFAULT_LAUNCHER_SETTINGS);
  const [templates, setTemplates] = useState<CommandTemplate[]>([]);
  const [shortcuts, setShortcuts] = useState<VoiceShortcut[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newPhrase, setNewPhrase] = useState("");
  const [newShortcutPrompt, setNewShortcutPrompt] = useState("");

  useEffect(() => {
    if (open) {
      setSettings(loadLauncherSettings());
      setTemplates(loadCustomTemplates());
      setShortcuts(loadVoiceShortcuts());
    }
  }, [open]);

  const update = <K extends keyof LauncherSettings>(key: K, value: LauncherSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveLauncherSettings(next);
  };

  const addTemplate = () => {
    const label = newLabel.trim();
    const prompt = newPrompt.trim();
    if (!label || !prompt) {
      toast.error("Label and prompt are required");
      return;
    }
    const next: CommandTemplate[] = [
      ...templates,
      { id: crypto.randomUUID(), label, prompt, category: "Custom" },
    ];
    setTemplates(next);
    saveCustomTemplates(next);
    setNewLabel("");
    setNewPrompt("");
    toast.success("Template added");
  };

  const removeTemplate = (id: string) => {
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next);
    saveCustomTemplates(next);
  };

  const addShortcut = () => {
    const phrase = newPhrase.trim();
    const prompt = newShortcutPrompt.trim();
    if (!phrase || !prompt) {
      toast.error("Phrase and prompt are required");
      return;
    }
    const next: VoiceShortcut[] = [
      ...shortcuts,
      { id: crypto.randomUUID(), phrase, prompt, enabled: true },
    ];
    setShortcuts(next);
    saveVoiceShortcuts(next);
    setNewPhrase("");
    setNewShortcutPrompt("");
    toast.success("Voice shortcut added");
  };

  const toggleShortcut = (id: string, enabled: boolean) => {
    const next = shortcuts.map((s) => s.id === id ? { ...s, enabled } : s);
    setShortcuts(next);
    saveVoiceShortcuts(next);
  };

  const removeShortcut = (id: string) => {
    const next = shortcuts.filter((s) => s.id !== id);
    setShortcuts(next);
    saveVoiceShortcuts(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Launcher settings</DialogTitle>
          <DialogDescription>
            Customize the ⌘K command palette and add your own prompt templates.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Row label="Enable launcher" hint="Disables the ⌘K shortcut">
                <Switch checked={settings.enabled} onCheckedChange={(v) => update("enabled", v)} />
              </Row>
              <Row label="Voice input" hint="Show mic button in palette">
                <Switch checked={settings.voiceInput} onCheckedChange={(v) => update("voiceInput", v)} />
              </Row>
              <Row label="Auto-execute" hint="Send commands immediately">
                <Switch checked={settings.autoExecute} onCheckedChange={(v) => update("autoExecute", v)} />
              </Row>
              <Row label="Show recent" hint="Show last 6 commands at top">
                <Switch checked={settings.showHistory} onCheckedChange={(v) => update("showHistory", v)} />
              </Row>
              <Row label="Strict safety" hint="Confirm before warnings, not just dangers">
                <Switch checked={settings.blockOnWarn} onCheckedChange={(v) => update("blockOnWarn", v)} />
              </Row>
              <Row label="Hotkey">
                <Select value={settings.hotkey} onValueChange={(v) => update("hotkey", v as LauncherSettings["hotkey"])}>
                  <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mod+k">⌘ / Ctrl + K</SelectItem>
                    <SelectItem value="mod+/">⌘ / Ctrl + /</SelectItem>
                    <SelectItem value="mod+j">⌘ / Ctrl + J</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-1">Custom templates</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Use <code className="bg-muted px-1 rounded">{`{{name}}`}</code> placeholders — the launcher will prompt you for values.
              </p>

              <div className="grid grid-cols-[1fr_2fr_auto] gap-2 mb-3">
                <Input placeholder="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
                <Input placeholder="Prompt (e.g. Translate {{text}} to {{lang}})" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} />
                <Button size="icon" onClick={addTemplate}><Plus className="w-4 h-4" /></Button>
              </div>

              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No custom templates yet.</p>
              ) : (
                <ul className="space-y-2">
                  {templates.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-sm border rounded-md p-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{t.label}</div>
                        <div className="text-xs text-muted-foreground truncate">{t.prompt}</div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeTemplate(t.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <div>
        <Label className="text-sm">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}
