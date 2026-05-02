import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import * as Icons from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import { ShieldAlert, Mic, MicOff, History as HistoryIcon, Settings as SettingsIcon, LogOut, Zap } from "lucide-react";
import { scanInput, highestLevel, type SafetyAlert, type SafetyLevel } from "@/lib/aria-safety";
import { toast } from "sonner";
import { log } from "@/lib/aria-logger";
import { appendTaskHistory, loadTaskHistory } from "@/lib/aria-task-history";
import { detectLanguage } from "@/lib/aria-languages";
import { getAllTemplates, fillTemplate, type CommandTemplate } from "@/lib/aria-templates";
import {
  loadLauncherSettings, matchesHotkey, type LauncherSettings,
} from "@/lib/aria-launcher-settings";
import { useSpeechRecognition } from "@/lib/aria-speech";
import { matchVoiceShortcut } from "@/lib/aria-voice-shortcuts";
import { ConfirmTaskDialog } from "@/components/ConfirmTaskDialog";

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

type PendingTask = {
  prompt: string;
  source: "launcher" | "voice";
  level: SafetyLevel;
  reasons: string[];
  language: string;
};

export function TaskLauncher({
  onSendPrompt, onSetInput, onOpenSettings, onOpenLauncherSettings, onOpenHistory, onSignOut, voiceLang,
}: Props) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<LauncherSettings>(() => loadLauncherSettings());
  const [templates, setTemplates] = useState<CommandTemplate[]>(() => getAllTemplates());
  const [recent, setRecent] = useState(() => loadTaskHistory().slice(-6).reverse());
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<PendingTask | null>(null);

  // Recall stack — unique recent prompts for ↑/↓ navigation.
  const recallStack = useMemo(
    () => Array.from(new Set(loadTaskHistory().map((r) => r.prompt))).slice(-50).reverse(),
    [open, recent.length],
  );
  const [recallIdx, setRecallIdx] = useState(-1);

  // Refresh state when palette opens
  useEffect(() => {
    if (open) {
      setSettings(loadLauncherSettings());
      setTemplates(getAllTemplates());
      setRecent(loadTaskHistory().slice(-6).reverse());
      setSearch("");
      setRecallIdx(-1);
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

  const runPromptRef = useRef<(text: string, source?: "launcher" | "voice") => void>();

  // Voice input inside the launcher — also matches voice shortcuts.
  const onVoiceText = useCallback((text: string) => {
    setSearch(text);
    if (settings.voiceShortcuts) {
      const match = matchVoiceShortcut(text);
      if (match) {
        toast.success(`Voice shortcut: "${match.phrase}"`, { icon: <Zap className="w-4 h-4" /> });
        runPromptRef.current?.(match.prompt, "voice");
        return;
      }
    }
    if (settings.autoExecute && text.trim().length > 1) {
      runPromptRef.current?.(text, "voice");
    }
  }, [settings.autoExecute, settings.voiceShortcuts]);
  const { listening, supported: micSupported, start, stop } = useSpeechRecognition(onVoiceText, voiceLang);

  const executeNow = useCallback((task: PendingTask) => {
    appendTaskHistory({
      source: task.source,
      prompt: task.prompt,
      status: task.level === "warn" ? "warned" : "completed",
      safety: task.level,
      language: task.language,
    });
    setOpen(false);
    if (settings.autoExecute) onSendPrompt(task.prompt);
    else onSetInput?.(task.prompt);
  }, [settings.autoExecute, onSendPrompt, onSetInput]);

  const runPrompt = useCallback((rawPrompt: string, source: "launcher" | "voice" = "launcher") => {
    const prompt = rawPrompt.trim();
    if (!prompt) return;

    const alerts: SafetyAlert[] = scanInput(prompt);
    const level = highestLevel(alerts);
    const language = detectLanguage(prompt);
    const reasons = alerts.map((a) => `${a.category}: ${a.message}`);

    if (level === "danger") {
      // Hard-block dangerous; offer override via confirmation.
      toast.error("Safety: dangerous content", {
        description: reasons.join(" • "),
        icon: <ShieldAlert className="w-4 h-4" />,
      });
      appendTaskHistory({ source, prompt, status: "blocked", safety: level, language });
      log.warn("[launcher] danger blocked", { level, alerts });
      setPending({ prompt, source, level, reasons, language });
      return;
    }

    const needsConfirm =
      settings.requireConfirm ||
      (settings.blockOnWarn && level === "warn") ||
      level === "warn";

    if (needsConfirm) {
      setPending({ prompt, source, level, reasons, language });
      return;
    }

    executeNow({ prompt, source, level, reasons, language });
  }, [settings.requireConfirm, settings.blockOnWarn, executeNow]);

  useEffect(() => { runPromptRef.current = runPrompt; }, [runPrompt]);

  const handleTemplate = useCallback((t: CommandTemplate) => {
    const filled = fillTemplate(t.prompt);
    if (filled === null) return;
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
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2 border-b px-3">
          <CommandInput
            value={search}
            onValueChange={(v) => { setSearch(v); setRecallIdx(-1); }}
            placeholder={listening ? "Listening…" : "Type a command, ask anything, ↑↓ to recall…"}
            className="flex-1"
            aria-keyshortcuts="ArrowUp ArrowDown Enter Escape"
            onKeyDown={(e) => {
              // Command history recall
              if (e.key === "ArrowUp" && recallStack.length > 0) {
                e.preventDefault();
                const next = Math.min(recallIdx + 1, recallStack.length - 1);
                setRecallIdx(next);
                setSearch(recallStack[next] ?? "");
                return;
              }
              if (e.key === "ArrowDown" && recallIdx >= 0) {
                e.preventDefault();
                const next = recallIdx - 1;
                setRecallIdx(next);
                setSearch(next < 0 ? "" : recallStack[next]);
                return;
              }
              if (e.key === "Enter" && search.trim() && !e.nativeEvent.isComposing) {
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
              className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                listening ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
              aria-label={listening ? "Stop voice" : "Voice input"}
              aria-pressed={listening}
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
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground/80">↑↓</kbd>
              recall
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

      {pending && (
        <ConfirmTaskDialog
          open={!!pending}
          prompt={pending.prompt}
          level={pending.level}
          reasons={pending.reasons}
          onCancel={() => setPending(null)}
          onConfirm={() => { const p = pending; setPending(null); executeNow(p); }}
        />
      )}
    </>
  );
}
