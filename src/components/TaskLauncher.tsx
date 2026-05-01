import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import * as Icons from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import { ShieldAlert, Mic, MicOff, History as HistoryIcon, Settings as SettingsIcon, LogOut } from "lucide-react";
import { scanInput, highestLevel, type SafetyAlert } from "@/lib/aria-safety";
import { toast } from "sonner";
import { log } from "@/lib/aria-logger";
import { appendTaskHistory, loadTaskHistory } from "@/lib/aria-task-history";
import { detectLanguage } from "@/lib/aria-languages";
import { getAllTemplates, fillTemplate, type CommandTemplate } from "@/lib/aria-templates";
import {
  loadLauncherSettings, matchesHotkey, type LauncherSettings,
} from "@/lib/aria-launcher-settings";
import { useSpeechRecognition } from "@/lib/aria-speech";

type Props = {
  onSendPrompt: (text: string) => void;
  onSetInput?: (text: string) => void;
  onOpenSettings: () => void;
  onOpenLauncherSettings: () => void;
  onOpenHistory: () => void;
  onSignOut: () => void;
  voiceLang: string;
};

const ICON_FALLBACK = Icons.Sparkles;
const resolveIcon = (name?: string) => (name && (Icons as any)[name]) || ICON_FALLBACK;

export function TaskLauncher({
  onSendPrompt, onSetInput, onOpenSettings, onOpenLauncherSettings, onOpenHistory, onSignOut, voiceLang,
}: Props) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<LauncherSettings>(() => loadLauncherSettings());
  const [templates, setTemplates] = useState<CommandTemplate[]>(() => getAllTemplates());
  const [recent, setRecent] = useState(() => loadTaskHistory().slice(-6).reverse());
  const [search, setSearch] = useState("");

  // Refresh state when palette opens
  useEffect(() => {
    if (open) {
      setSettings(loadLauncherSettings());
      setTemplates(getAllTemplates());
      setRecent(loadTaskHistory().slice(-6).reverse());
      setSearch("");
    }
  }, [open]);

  // Hotkey
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!settings.enabled) return;
      if (matchesHotkey(e, settings.hotkey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settings.enabled, settings.hotkey]);

  // Voice input inside the launcher
  const onVoiceText = useCallback((text: string) => {
    setSearch(text);
    // Auto-run if it looks like a command sentence
    if (settings.autoExecute && text.trim().length > 1) {
      runPromptRef.current?.(text, "voice");
    }
  }, [settings.autoExecute]);
  const { listening, supported: micSupported, start, stop } = useSpeechRecognition(onVoiceText, voiceLang);

  const runPromptRef = useRef<(text: string, source?: "launcher" | "voice") => void>();

  const runPrompt = useCallback((rawPrompt: string, source: "launcher" | "voice" = "launcher") => {
    const prompt = rawPrompt.trim();
    if (!prompt) return;

    const alerts: SafetyAlert[] = scanInput(prompt);
    const level = highestLevel(alerts);
    const language = detectLanguage(prompt);

    if (level === "danger" || (settings.blockOnWarn && level === "warn")) {
      toast.error("Blocked by safety layer", {
        description: alerts.map((a) => `${a.category}: ${a.message}`).join(" • "),
        icon: <ShieldAlert className="w-4 h-4" />,
      });
      appendTaskHistory({ source, prompt, status: "blocked", safety: level, language });
      log.warn("[launcher] blocked", { level, alerts });
      return;
    }
    if (level === "warn") {
      toast.warning("Safety warning", {
        description: alerts.map((a) => a.message).join(" • "),
      });
      appendTaskHistory({ source, prompt, status: "warned", safety: level, language });
    } else {
      appendTaskHistory({ source, prompt, status: "completed", safety: level, language });
    }

    setOpen(false);
    if (settings.autoExecute) onSendPrompt(prompt);
    else onSetInput?.(prompt);
  }, [settings.autoExecute, settings.blockOnWarn, onSendPrompt, onSetInput]);

  useEffect(() => { runPromptRef.current = runPrompt; }, [runPrompt]);

  const handleTemplate = useCallback((t: CommandTemplate) => {
    const filled = fillTemplate(t.prompt);
    if (filled === null) return; // user cancelled
    runPrompt(filled);
  }, [runPrompt]);

  const groups = useMemo(() => {
    const order = ["Quick", "Productivity", "Creative", "Web", "System", "Custom"] as const;
    const map = new Map<string, CommandTemplate[]>();
    for (const g of order) map.set(g, []);
    for (const t of templates) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    }
    return Array.from(map.entries()).filter(([, items]) => items.length);
  }, [templates]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2 border-b px-3">
        <CommandInput
          value={search}
          onValueChange={setSearch}
          placeholder={listening ? "Listening…" : "Type a command, ask anything, or press Enter…"}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && search.trim() && !e.nativeEvent.isComposing) {
              // If the search doesn't match any template label, send it as a free prompt.
              const matches = templates.some((t) => t.label.toLowerCase().includes(search.toLowerCase()));
              if (!matches) {
                e.preventDefault();
                runPrompt(search);
              }
            }
          }}
        />
        {settings.voiceInput && micSupported && (
          <button
            type="button"
            onClick={() => (listening ? stop() : start())}
            className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              listening ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
            aria-label={listening ? "Stop voice" : "Voice input"}
            title={listening ? "Stop" : "Voice input"}
          >
            {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      <CommandList>
        <CommandEmpty>
          <div className="py-2 text-center">
            <p className="text-sm">Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> to send "{search}" to ARIA</p>
          </div>
        </CommandEmpty>

        {settings.showHistory && recent.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recent.map((r) => (
                <CommandItem key={r.id} value={`recent-${r.id}-${r.prompt}`} onSelect={() => runPrompt(r.prompt)}>
                  <HistoryIcon className="mr-2 h-4 w-4 opacity-70" />
                  <span className="truncate">{r.prompt}</span>
                  <CommandShortcut className="capitalize">{r.status}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {groups.map(([heading, items], gi) => (
          <div key={heading}>
            {gi > 0 && <CommandSeparator />}
            <CommandGroup heading={heading}>
              {items.map((t) => {
                const Icon = resolveIcon(t.icon);
                return (
                  <CommandItem key={t.id} value={`${t.id}-${t.label}`} onSelect={() => handleTemplate(t)}>
                    <Icon className="mr-2 h-4 w-4 opacity-80" />
                    <span>{t.label}</span>
                    {t.prompt.includes("{{") && (
                      <CommandShortcut className="text-[10px]">prompts you</CommandShortcut>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}

        <CommandSeparator />
        <CommandGroup heading="Launcher">
          <CommandItem onSelect={() => { setOpen(false); onOpenHistory(); }}>
            <HistoryIcon className="mr-2 h-4 w-4 opacity-80" />
            <span>View task history</span>
          </CommandItem>
          <CommandItem onSelect={() => { setOpen(false); onOpenLauncherSettings(); }}>
            <SettingsIcon className="mr-2 h-4 w-4 opacity-80" />
            <span>Launcher settings & templates</span>
          </CommandItem>
          <CommandItem onSelect={() => { setOpen(false); onOpenSettings(); }}>
            <SettingsIcon className="mr-2 h-4 w-4 opacity-80" />
            <span>Personalization</span>
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => { setOpen(false); onSignOut(); }}>
            <LogOut className="mr-2 h-4 w-4 opacity-80" />
            <span>Sign out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>

      {/* Footer hint bar — keyboard shortcuts & launcher state */}
      <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground/80">↵</kbd>
            run
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground/80">esc</kbd>
            close
          </span>
          {settings.voiceInput && micSupported && (
            <span className="flex items-center gap-1">
              <Mic className="w-3 h-3" />
              {listening ? "listening…" : "voice ready"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>{templates.length} templates</span>
          <span className="text-primary/70">•</span>
          <span>{settings.autoExecute ? "auto-run" : "to input"}</span>
        </div>
      </div>
    </CommandDialog>
  );
}
