import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  Mic, MicOff, Send, Volume2, VolumeX, Sparkles, Globe, Loader2,
  Trash2, Copy, Check, Languages, Sun, Moon, Settings as SettingsIcon,
  Users, ShieldCheck, Download, Code2, LogOut, Ear, EarOff,
  History, Calendar, Rocket, GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { AriaCore } from "@/components/AriaCore";
import { ActionLog } from "@/components/ActionLog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { AdminSandbox } from "@/components/AdminSandbox";
import { SafetyAlertBanner } from "@/components/SafetyAlertBanner";
import { TasksNotesPanel } from "@/components/TasksNotesPanel";
import { CodingHelperDialog } from "@/components/CodingHelperDialog";
import { DailyBriefingCard } from "@/components/DailyBriefingCard";
import { WakeTrainerDialog } from "@/components/WakeTrainerDialog";
import { ActionHistoryDialog } from "@/components/ActionHistoryDialog";
import { ScheduleAutomationDialog } from "@/components/ScheduleAutomationDialog";
import { ShortcutLauncherDialog } from "@/components/ShortcutLauncherDialog";
import { BilingualMessage } from "@/components/BilingualMessage";
import { TaskLauncher } from "@/components/TaskLauncher";
import { loadWakePhrases, buildWakeMatchers } from "@/lib/aria-wake-training";
import { useScheduleRunner } from "@/hooks/useScheduleRunner";
import { streamAria, type ChatMsg, type StreamMeta } from "@/lib/aria-chat";
import { extractActions, type AriaAction } from "@/lib/aria-actions";
import { executeAction, type ActionLogEntry } from "@/lib/aria-executor";
import { speak, stopSpeaking, useSpeechRecognition, VOICE_LANGS } from "@/lib/aria-speech";
import {
  loadConversation, saveConversation, clearConversation,
  loadMemory, saveMemory, resolveAddress, type AriaMemory,
} from "@/lib/aria-memory";
import {
  loadProfiles, saveProfiles, loadActiveProfileId, saveActiveProfileId,
  profileToMemory, type AriaProfile,
} from "@/lib/aria-profiles";
import { scanInput, type SafetyAlert } from "@/lib/aria-safety";
import { buildReport, downloadFile, type ExportFormat } from "@/lib/aria-export";
import { LauncherSettingsDialog } from "@/components/LauncherSettingsDialog";
import { TaskHistoryDialog } from "@/components/TaskHistoryDialog";
import { appendTaskHistory } from "@/lib/aria-task-history";
import { detectLanguage } from "@/lib/aria-languages";
import { useAuth } from "@/hooks/useAuth";
import { useReminders } from "@/hooks/useReminders";
import { useWakeWord } from "@/hooks/useWakeWord";
import { getProfile, getSettings, updateProfile, updateSettings } from "@/lib/aria-cloud";
import { buildBriefing, shouldGiveBriefingToday } from "@/lib/aria-briefing";
import { cn } from "@/lib/utils";
import {
  loadThemeMode, saveThemeMode, resolveTheme, applyTheme, subscribeToSystemTheme,
  type ThemeMode,
} from "@/lib/aria-theme";
import { watchAndScrubBadges } from "@/lib/aria-publish";
import { logContrastAudit } from "@/lib/aria-a11y";
import { ThemeToggle } from "@/components/ThemeToggle";

type DisplayMsg = {
  role: "user" | "assistant";
  content: string;
  actions?: AriaAction[];
  meta?: StreamMeta;
};

const SUGGESTIONS = [
  "Open YouTube",
  "Generate an image of a futuristic city at night",
  "What's the weather in Tokyo?",
  "Calculate (12*8) + 45",
  "Search Google for React Server Components",
  "What time is it?",
];

const buildWelcome = (mem: AriaMemory): DisplayMsg => {
  const { name, style } = resolveAddress(mem);
  const greet = style === "none" ? "" : `, ${name}`;
  return {
    role: "assistant",
    content:
      `Systems online${greet}. I'm **ARIA** — your personal AI assistant. I can chat, generate images, open websites, fetch weather, do math, and more. How can I help you today?`,
  };
};

const Index = () => {
  // Profiles
  const initialProfiles = useMemo(loadProfiles, []);
  const initialActiveId = useMemo(loadActiveProfileId, []);
  const [profiles, setProfiles] = useState<AriaProfile[]>(initialProfiles);
  const [activeProfileId, setActiveProfileId] = useState<string>(
    initialProfiles.find((p) => p.id === initialActiveId)?.id ?? initialProfiles[0].id,
  );
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  // Memory derived from active profile
  const initialMem = useMemo(() => ({ ...loadMemory(), ...profileToMemory(activeProfile) }), []);
  const [memory, setMemory] = useState<AriaMemory>(initialMem);
  const [messages, setMessages] = useState<DisplayMsg[]>(
    () => loadConversation<DisplayMsg>() ?? [buildWelcome(initialMem)],
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(initialMem.voiceEnabled ?? true);
  const [voiceLang, setVoiceLang] = useState(initialMem.voiceLang ?? "en-US");
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => loadThemeMode());
  const [theme, setThemeState] = useState<"dark" | "light">(() => resolveTheme(loadThemeMode()));
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    saveThemeMode(mode);
    setThemeState(resolveTheme(mode));
  }, []);
  const setTheme = useCallback((next: "dark" | "light" | ((t: "dark" | "light") => "dark" | "light")) => {
    setThemeState((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      setThemeModeState(resolved);
      saveThemeMode(resolved);
      return resolved;
    });
  }, []);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [codingOpen, setCodingOpen] = useState(false);
  const [safetyAlerts, setSafetyAlerts] = useState<SafetyAlert[]>([]);
  const [safetyOverride, setSafetyOverride] = useState(false);
  const [wakeEnabled, setWakeEnabled] = useState(false);
  const [briefingCity, setBriefingCity] = useState<string | null>(null);
  const [briefingEnabled, setBriefingEnabled] = useState(true);
  const [tasksRefreshKey, setTasksRefreshKey] = useState(0);
  const [wakeTrainerOpen, setWakeTrainerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [bilingual, setBilingual] = useState(false);
  const [launcherSettingsOpen, setLauncherSettingsOpen] = useState(false);
  const [taskHistoryOpen, setTaskHistoryOpen] = useState(false);
  const [wakePhrases, setWakePhrases] = useState<string[]>(() => loadWakePhrases());
  const wakeMatchers = useMemo(() => buildWakeMatchers(wakePhrases), [wakePhrases]);
  const greetedRef = useRef(false);
  const briefedRef = useRef(false);
  const cloudHydrated = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { user, signOut } = useAuth();

  // Persist
  useEffect(() => {
    saveMemory({ ...memory, voiceEnabled, voiceLang });
  }, [memory, voiceEnabled, voiceLang]);
  useEffect(() => { saveConversation(messages); }, [messages]);
  useEffect(() => { saveProfiles(profiles); }, [profiles]);
  useEffect(() => { saveActiveProfileId(activeProfileId); }, [activeProfileId]);

  // Hydrate from cloud on first load
  useEffect(() => {
    if (!user || cloudHydrated.current) return;
    cloudHydrated.current = true;
    (async () => {
      try {
        const [prof, settings] = await Promise.all([getProfile(), getSettings()]);
        if (prof) {
          setMemory((m) => ({
            ...m,
            userName: prof.display_name || m.userName,
            addressStyle: (prof.address_style as AriaMemory["addressStyle"]) || m.addressStyle,
          }));
        }
        if (settings) {
          setVoiceEnabled(settings.voice_enabled);
          setTheme(settings.theme === "light" ? "light" : "dark");
          setWakeEnabled(settings.wake_word_enabled);
          setBriefingCity(settings.briefing_city);
          setBriefingEnabled(settings.briefing_enabled);
        }
      } catch (e) {
        console.warn("[ARIA] cloud hydrate failed", e);
      }
    })();
  }, [user]);

  // Reminders polling
  useReminders({
    enabled: !!user,
    voice: voiceEnabled,
    lang: voiceLang,
    userName: resolveAddress(memory).name,
  });

  // Schedule automation runner — fires recurring actions
  const fireScheduled = useCallback((action: AriaAction) => {
    toast.info(`⏱ Schedule: ${action.label}`, { duration: 2500 });
    void runActionRef.current?.(action);
  }, []);
  useScheduleRunner({ enabled: !!user, onFire: fireScheduled });

  // Wake word — pauses while user is speaking via mic or while streaming
  const handleWake = useCallback(() => {
    toast.success("ARIA is listening", { duration: 1500 });
    // Programmatically trigger mic input by setting flag — we'll start listening below
    setWakeTrigger((n) => n + 1);
  }, []);
  const [wakeTrigger, setWakeTrigger] = useState(0);
  useWakeWord({
    enabled: wakeEnabled && !!user,
    onWake: handleWake,
    lang: voiceLang,
    suppressed: streaming,
    patterns: wakeMatchers,
  });

  // Apply current theme to <html>
  useEffect(() => { applyTheme(theme); }, [theme]);

  // Auto-detect: when mode is "system", follow OS theme changes live.
  useEffect(() => {
    if (themeMode !== "system") return;
    return subscribeToSystemTheme((resolved) => setThemeState(resolved));
  }, [themeMode]);

  // Defensive badge scrubber — removes any injected branding badges if user opted in.
  useEffect(() => watchAndScrubBadges(), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  // Voice salutation on first load — confirms playback or warns user.
  useEffect(() => {
    if (greetedRef.current) return;
    if (!voiceEnabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.info("Voice synthesis not supported in this browser.");
      return;
    }
    greetedRef.current = true;

    const { name, style } = resolveAddress(memory);
    const hour = new Date().getHours();
    const tod = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const salutation =
      style === "none"
        ? `${tod}. ARIA online and ready.`
        : `${tod}, ${name}. ARIA online and ready.`;

    const fire = async () => {
      const result = await speak(salutation, voiceLang);
      if (result === "spoken") {
        toast.success("ARIA voice online", { description: salutation, duration: 2500 });
      } else if (result === "blocked") {
        toast.warning("Voice blocked", {
          description: "Click anywhere on the page once to allow ARIA to speak.",
          duration: 5000,
        });
      } else if (result === "unsupported") {
        toast.info("Voice synthesis not supported.");
      }
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      const handler = () => { void fire(); window.speechSynthesis.removeEventListener("voiceschanged", handler); };
      window.speechSynthesis.addEventListener("voiceschanged", handler);
      setTimeout(() => void fire(), 800);
    } else {
      setTimeout(() => void fire(), 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live safety scan as user types
  useEffect(() => {
    setSafetyAlerts(scanInput(input));
    setSafetyOverride(false);
  }, [input]);

  const logAction = useCallback((entry: ActionLogEntry) => {
    setActionLog((prev) => [...prev, entry].slice(-50));
  }, []);
  const updateAction = useCallback((id: string, patch: Partial<ActionLogEntry>) => {
    setActionLog((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const appendAssistantText = useCallback((text: string) => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") {
        copy[copy.length - 1] = { ...last, content: (last.content + "\n\n" + text).trim() };
      } else {
        copy.push({ role: "assistant", content: text });
      }
      return copy;
    });
  }, []);

  const runAction = useCallback(
    (a: AriaAction) =>
      executeAction(a, {
        setTheme,
        log: logAction,
        update: updateAction,
        appendAssistantText,
        onDataChanged: () => setTasksRefreshKey((k) => k + 1),
        userName: resolveAddress(memory).name,
        briefingCity,
      }),
    [logAction, updateAction, appendAssistantText, memory, briefingCity],
  );
  const runActionRef = useRef(runAction);
  useEffect(() => { runActionRef.current = runAction; }, [runAction]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      // Safety gate
      const alerts = scanInput(trimmed);
      const hasDanger = alerts.some((a) => a.level === "danger");
      const hasWarn = alerts.some((a) => a.level === "warn");
      if (hasDanger) {
        setSafetyAlerts(alerts);
        toast.error("Blocked: dangerous content detected");
        return;
      }
      if (hasWarn && !safetyOverride) {
        setSafetyAlerts(alerts);
        toast.warning("Review safety alert, then click 'Send anyway'.");
        return;
      }

      const userMsg: DisplayMsg = { role: "user", content: trimmed };
      const nextMsgs = [...messages, userMsg];
      setMessages([...nextMsgs, { role: "assistant", content: "" }]);
      setInput("");
      setSafetyAlerts([]);
      setSafetyOverride(false);
      setStreaming(true);
      stopSpeaking();
      const sendStartedAt = performance.now();
      const sendLanguage = detectLanguage(trimmed);

      const apiHistory: ChatMsg[] = nextMsgs.map((m) => ({ role: m.role, content: m.content }));

      let acc = "";
      await streamAria({
        messages: apiHistory,
        userName: memory.userName,
        addressStyle: memory.addressStyle,
        onDelta: (chunk) => {
          acc += chunk;
          const { cleanText } = extractActions(acc);
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: cleanText };
            return copy;
          });
        },
        onDone: (meta) => {
          const { cleanText, actions } = extractActions(acc);
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: cleanText, actions, meta };
            return copy;
          });
          console.log("[ARIA] response meta", meta);
          if (actions.length) {
            actions.forEach((a, i) => setTimeout(() => void runAction(a), i * 250));
          }
          if (voiceEnabled && cleanText) speak(cleanText, voiceLang);
          appendTaskHistory({
            source: "chat",
            prompt: trimmed,
            status: "completed",
            safety: hasWarn ? "warn" : "safe",
            language: sendLanguage,
            durationMs: Math.round(performance.now() - sendStartedAt),
          });
          setStreaming(false);
        },
        onError: (err) => {
          toast.error(err);
          appendTaskHistory({
            source: "chat",
            prompt: trimmed,
            status: "error",
            safety: "safe",
            language: sendLanguage,
            notes: err,
          });
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${err}` };
            return copy;
          });
          setStreaming(false);
        },
      });
    },
    [messages, streaming, voiceEnabled, voiceLang, runAction, memory.userName, memory.addressStyle, safetyOverride],
  );

  const { listening, supported: voiceSupported, start: startListening, stop: stopListening } =
    useSpeechRecognition((text) => {
      setInput(text);
      void send(text);
    }, voiceLang);

  // When wake word fires, start the mic
  useEffect(() => {
    if (wakeTrigger > 0 && voiceSupported && !listening && !streaming) {
      startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wakeTrigger]);

  // One-shot daily briefing after hydration
  useEffect(() => {
    if (briefedRef.current || !user || !cloudHydrated.current) return;
    if (!briefingEnabled) return;
    briefedRef.current = true;
    setTimeout(async () => {
      try {
        const text = await buildBriefing({ userName: resolveAddress(memory).name, city: briefingCity });
        // Only auto-speak/show if it's the first session today
        const settingsForGate = { briefing_enabled: briefingEnabled } as Parameters<typeof shouldGiveBriefingToday>[0];
        if (shouldGiveBriefingToday(settingsForGate)) {
          appendAssistantText(`☕ ${text}`);
          if (voiceEnabled) void speak(text, voiceLang);
        }
      } catch { /* ignore */ }
    }, 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, briefingEnabled]);

  const ariaState: "idle" | "listening" | "thinking" = listening
    ? "listening"
    : streaming ? "thinking" : "idle";

  const resetConversation = () => {
    setMessages([buildWelcome(memory)]);
    setActionLog([]);
    clearConversation();
    stopSpeaking();
    toast.success("Conversation cleared");
  };

  const copyMessage = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  // Profile switching
  const switchProfile = (id: string) => {
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    setActiveProfileId(id);
    const newMem = { ...memory, ...profileToMemory(p) };
    setMemory(newMem);
    setMessages([buildWelcome(newMem)]);
    clearConversation();
    setActionLog([]);
    stopSpeaking();
    toast.success(`Switched to ${p.name}`);
    if (voiceEnabled) {
      const { name, style } = resolveAddress(newMem);
      const greet = style === "none" ? "Profile switched." : `Welcome back, ${name}.`;
      setTimeout(() => speak(greet, voiceLang), 300);
    }
  };
  const createProfileEntry = (p: AriaProfile) => setProfiles((prev) => [...prev, p]);
  const deleteProfileEntry = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    toast.success("Profile removed");
  };

  // Export
  const exportReport = (fmt: ExportFormat) => {
    const ctx = { profileName: resolveAddress(memory).name, addressStyle: memory.addressStyle };
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const { content, mime, ext } = buildReport(fmt, messages, ctx);
    downloadFile(`aria-conversation-${stamp}.${ext}`, content, mime);
    toast.success(`Exported ${fmt.toUpperCase()} report`, {
      description: `${messages.length} messages · ${(content.length / 1024).toFixed(1)} KB`,
    });
  };

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-10 py-4 border-b border-primary/10 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 rounded-full bg-gradient-core shadow-glow-soft flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-display font-bold tracking-wider aria-text-gradient">ARIA</h1>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-mono truncate">
              {activeProfile.name} · Adv. Reasoning Intelligent Assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Select value={voiceLang} onValueChange={setVoiceLang}>
            <SelectTrigger className="h-9 w-[60px] md:w-[140px] bg-secondary/40 border-primary/20 text-xs">
              <Languages className="w-3.5 h-3.5 text-primary md:mr-1" />
              <span className="hidden md:inline"><SelectValue /></span>
            </SelectTrigger>
            <SelectContent>
              {VOICE_LANGS.map((l) => (
                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" onClick={() => setProfilesOpen(true)}
            className="text-primary hover:bg-primary/10" aria-label="Profiles" title="Profiles">
            <Users className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setAdminOpen(true)}
            className="text-primary hover:bg-primary/10" aria-label="Admin sandbox" title="Admin sandbox">
            <ShieldCheck className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10"
                aria-label="Export report" title="Export conversation">
                <Download className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportReport("md")}>Conversation: Markdown (.md)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportReport("html")}>Conversation: HTML (.html)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportReport("json")}>Conversation: JSON (.json)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportReport("txt")}>Conversation: Plain text (.txt)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTaskHistoryOpen(true)}>
                Task history & PDF report…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className="text-primary hover:bg-primary/10" aria-label="Toggle theme">
            {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>

          <Button variant="ghost" size="icon"
            onClick={() => { if (voiceEnabled) stopSpeaking(); setVoiceEnabled((v) => !v); }}
            className="text-primary hover:bg-primary/10"
            aria-label={voiceEnabled ? "Mute voice" : "Enable voice"}>
            {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setCodingOpen(true)}
            className="text-primary hover:bg-primary/10" aria-label="Coding helper" title="Coding helper">
            <Code2 className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon"
            onClick={() => {
              const next = !wakeEnabled;
              setWakeEnabled(next);
              void updateSettings({ wake_word_enabled: next }).catch(() => {});
              toast.success(next ? "Wake word ON — say 'Hey ARIA'" : "Wake word OFF");
            }}
            className={cn(
              "hover:bg-primary/10",
              wakeEnabled ? "text-accent wake-pulse" : "text-muted-foreground",
            )}
            aria-label="Toggle wake word"
            title={wakeEnabled ? "Wake word ON — say 'Hey ARIA'" : "Wake word OFF"}>
            {wakeEnabled ? <Ear className="w-5 h-5" /> : <EarOff className="w-5 h-5" />}
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setWakeTrainerOpen(true)}
            className="text-primary hover:bg-primary/10" aria-label="Train wake word" title="Train wake word">
            <GraduationCap className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setHistoryOpen(true)}
            className="text-primary hover:bg-primary/10" aria-label="Action history" title="Action history">
            <History className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setScheduleOpen(true)}
            className="text-primary hover:bg-primary/10" aria-label="Schedule automation" title="Schedule automation">
            <Calendar className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setShortcutsOpen(true)}
            className="text-primary hover:bg-primary/10" aria-label="Desktop shortcuts" title="Desktop shortcuts">
            <Rocket className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => {
              setBilingual((b) => { toast.success(`Bilingual mode ${!b ? "ON" : "OFF"}`); return !b; });
            }}
            className={cn("hover:bg-primary/10", bilingual ? "text-accent" : "text-primary")}
            aria-label="Bilingual transcript"
            title={`Bilingual transcript (translate to ${voiceLang.startsWith("hi") ? "English" : "Hindi"})`}>
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}
            className="text-primary hover:bg-primary/10" aria-label="Personalization settings" title="Personalization">
            <SettingsIcon className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={resetConversation}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label="Clear conversation">
            <Trash2 className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => void signOut()}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label="Sign out" title="Sign out">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 px-4 md:px-8 py-6 max-w-7xl mx-auto w-full">
        {/* Left: Core + Action Log */}
        <aside className="lg:w-[320px] flex flex-col gap-4">
          <div className="flex flex-col items-center gap-3 aria-panel rounded-2xl py-6">
            <AriaCore state={ariaState} size={180} />
            <div className="text-center">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/80">
                {ariaState === "idle" && "Standing by"}
                {ariaState === "listening" && "Listening..."}
                {ariaState === "thinking" && "Thinking..."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {wakeEnabled ? "Say \"Hey ARIA\" or tap mic" : "Tap mic or type below"}
              </p>
            </div>
          </div>
          <DailyBriefingCard
            userName={resolveAddress(memory).name}
            city={briefingCity}
            lang={voiceLang}
            onSpeak={voiceEnabled ? (t) => void speak(t, voiceLang) : undefined}
          />
          <div className="hidden lg:block">
            <ActionLog entries={actionLog} />
          </div>
          <div className="hidden lg:block flex-1 min-h-[260px]">
            <TasksNotesPanel refreshKey={tasksRefreshKey} />
          </div>
        </aside>

        {/* Chat panel */}
        <section className="flex-1 flex flex-col aria-panel rounded-2xl overflow-hidden min-h-[60vh]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 max-h-[calc(100vh-280px)]">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex flex-col gap-2 max-w-[88%] group",
                  m.role === "user" ? "ml-auto items-end" : "mr-auto items-start",
                )}
              >
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {m.role === "user" ? "You" : "ARIA"}
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm leading-relaxed relative",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground shadow-glow-soft"
                      : "bg-secondary/60 border border-primary/15 text-foreground",
                  )}
                >
                  {m.role === "assistant" ? (
                    <div className="aria-prose prose prose-sm max-w-none prose-p:my-2 prose-pre:my-2 prose-pre:bg-background/60 prose-pre:border prose-pre:border-primary/20 prose-code:text-primary prose-headings:text-primary prose-img:rounded-xl prose-img:border prose-img:border-primary/30">
                      <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                  {m.role === "assistant" && m.content && (
                    <button
                      onClick={() => copyMessage(m.content, i)}
                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-primary/30 rounded-full p-1.5 hover:bg-primary/10"
                      aria-label="Copy message"
                    >
                      {copiedIdx === i ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                    </button>
                  )}
                  {bilingual && m.content && (
                    <BilingualMessage
                      text={m.content}
                      targetLang={voiceLang.startsWith("hi") ? "en" : "hi"}
                    />
                  )}
                </div>
                {m.actions && m.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {m.actions.map((a, idx) => (
                      <button
                        key={idx}
                        onClick={() => void runAction(a)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border border-primary/30 bg-primary/10 hover:bg-primary/20 hover:shadow-glow-soft transition-smooth text-primary"
                      >
                        <Globe className="w-3 h-3" />
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
                {m.role === "assistant" && m.meta && (
                  <div className="text-[9px] font-mono text-muted-foreground/60 tracking-wider mt-0.5">
                    {m.meta.chars} chars · {m.meta.chunks} chunks · {m.meta.durationMs}ms
                    {m.meta.reqId && ` · #${m.meta.reqId}`}
                  </div>
                )}
              </div>
            ))}
            {streaming && messages[messages.length - 1]?.content === "" && (
              <div className="flex items-center gap-2 text-primary/80 text-sm font-mono">
                <Loader2 className="w-4 h-4 animate-spin" />
                ARIA is thinking…
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="px-4 md:px-6 pb-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  disabled={streaming}
                  className="px-3 py-1.5 rounded-full text-xs border border-primary/20 bg-primary/5 hover:bg-primary/15 hover:border-primary/40 transition-smooth text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <SafetyAlertBanner
            alerts={safetyAlerts}
            onProceed={
              safetyAlerts.some((a) => a.level === "danger")
                ? undefined
                : () => { setSafetyOverride(true); void send(input); }
            }
            onDismiss={() => setSafetyAlerts([])}
          />

          <form
            onSubmit={(e) => { e.preventDefault(); void send(input); }}
            className="border-t border-primary/15 p-3 md:p-4 flex items-center gap-2 bg-background/40"
          >
            <Button
              type="button" size="icon" variant="ghost"
              disabled={!voiceSupported || streaming}
              onClick={() => (listening ? stopListening() : startListening())}
              className={cn(
                "rounded-full transition-smooth shrink-0",
                listening
                  ? "bg-accent text-accent-foreground shadow-accent-glow"
                  : "text-primary hover:bg-primary/10",
              )}
              aria-label="Voice input"
              title={voiceSupported ? "Voice input" : "Voice not supported"}
            >
              {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask ARIA anything... or 'open youtube'"
              disabled={streaming}
              className="flex-1 bg-secondary/40 border-primary/20 focus-visible:ring-primary/60 focus-visible:border-primary/50 text-foreground placeholder:text-muted-foreground/60 h-11 rounded-full px-5"
            />
            <Button
              type="submit" size="icon"
              disabled={streaming || !input.trim()}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-soft disabled:opacity-40 shrink-0"
              aria-label="Send"
            >
              {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </form>
        </section>

        {/* Mobile action log */}
        <div className="lg:hidden">
          <ActionLog entries={actionLog} />
        </div>
      </main>

      <footer className="text-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 py-3">
        Mohasin Khan
      </footer>

      <TaskLauncher
        voiceLang={voiceLang}
        onSendPrompt={(text) => {
          setInput(text);
          void send(text);
        }}
        onSetInput={(text) => setInput(text)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenLauncherSettings={() => setLauncherSettingsOpen(true)}
        onOpenHistory={() => setTaskHistoryOpen(true)}
        onSignOut={() => void signOut()}
      />

      <LauncherSettingsDialog
        open={launcherSettingsOpen}
        onOpenChange={setLauncherSettingsOpen}
      />

      <TaskHistoryDialog
        open={taskHistoryOpen}
        onOpenChange={setTaskHistoryOpen}
        profileName={resolveAddress(memory).name}
        conversationStats={{
          total: messages.length,
          user: messages.filter((m) => m.role === "user").length,
          assistant: messages.filter((m) => m.role === "assistant").length,
        }}
        onReplay={(prompt) => { setInput(prompt); void send(prompt); }}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        memory={memory}
        onSave={(patch) => {
          setMemory((prev) => {
            const next = { ...prev, ...patch };
            setMessages((msgs) => (msgs.length <= 1 ? [buildWelcome(next)] : msgs));
            return next;
          });
          setProfiles((prev) =>
            prev.map((p) =>
              p.id === activeProfileId
                ? { ...p, name: patch.userName ?? p.name, addressStyle: patch.addressStyle ?? p.addressStyle }
                : p,
            ),
          );
          // Sync to cloud
          void updateProfile({
            display_name: patch.userName,
            address_style: patch.addressStyle,
          }).catch(() => {});
          void updateSettings({ voice_enabled: voiceEnabled, theme }).catch(() => {});
        }}
      />

      <ProfileSwitcher
        open={profilesOpen}
        onOpenChange={setProfilesOpen}
        profiles={profiles}
        activeId={activeProfileId}
        onSwitch={switchProfile}
        onCreate={createProfileEntry}
        onDelete={deleteProfileEntry}
      />

      <AdminSandbox
        open={adminOpen}
        onOpenChange={setAdminOpen}
        onSetTheme={setTheme}
      />

      <CodingHelperDialog
        open={codingOpen}
        onOpenChange={setCodingOpen}
        userName={resolveAddress(memory).name}
      />

      <WakeTrainerDialog
        open={wakeTrainerOpen}
        onOpenChange={setWakeTrainerOpen}
        onPhrasesChanged={setWakePhrases}
        lang={voiceLang}
      />

      <ActionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entries={actionLog}
        onReplay={(e) => void runAction(e.action)}
      />

      <ScheduleAutomationDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onRunNow={(a) => void runAction(a)}
      />

      <ShortcutLauncherDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />

      {/* Mobile tasks panel */}
      <div className="lg:hidden px-4 pb-6">
        <TasksNotesPanel refreshKey={tasksRefreshKey} />
      </div>
    </div>
  );
};

export default Index;
