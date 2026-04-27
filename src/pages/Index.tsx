import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  Mic, MicOff, Send, Volume2, VolumeX, Sparkles, Globe, Loader2,
  Trash2, Copy, Check, Languages, Sun, Moon, Settings as SettingsIcon,
  Users, ShieldCheck, Download, Code2, LogOut, Ear, EarOff,
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
import { useAuth } from "@/hooks/useAuth";
import { useReminders } from "@/hooks/useReminders";
import { useWakeWord } from "@/hooks/useWakeWord";
import { getProfile, getSettings, updateProfile, updateSettings } from "@/lib/aria-cloud";
import { buildBriefing, shouldGiveBriefingToday } from "@/lib/aria-briefing";
import { cn } from "@/lib/utils";

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
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [safetyAlerts, setSafetyAlerts] = useState<SafetyAlert[]>([]);
  const [safetyOverride, setSafetyOverride] = useState(false);
  const greetedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist
  useEffect(() => {
    saveMemory({ ...memory, voiceEnabled, voiceLang });
  }, [memory, voiceEnabled, voiceLang]);
  useEffect(() => { saveConversation(messages); }, [messages]);
  useEffect(() => { saveProfiles(profiles); }, [profiles]);
  useEffect(() => { saveActiveProfileId(activeProfileId); }, [activeProfileId]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

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
      }),
    [logAction, updateAction, appendAssistantText],
  );

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
          setStreaming(false);
        },
        onError: (err) => {
          toast.error(err);
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
              <DropdownMenuItem onClick={() => exportReport("md")}>Markdown (.md)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportReport("html")}>HTML (.html)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportReport("json")}>JSON (.json)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportReport("txt")}>Plain text (.txt)</DropdownMenuItem>
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

          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}
            className="text-primary hover:bg-primary/10" aria-label="Personalization settings" title="Personalization">
            <SettingsIcon className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={resetConversation}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label="Clear conversation">
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 px-4 md:px-8 py-6 max-w-7xl mx-auto w-full">
        {/* Left: Core + Action Log */}
        <aside className="lg:w-[300px] flex flex-col gap-4">
          <div className="flex flex-col items-center gap-3 aria-panel rounded-2xl py-6">
            <AriaCore state={ariaState} size={200} />
            <div className="text-center">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/80">
                {ariaState === "idle" && "Standing by"}
                {ariaState === "listening" && "Listening..."}
                {ariaState === "thinking" && "Thinking..."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tap mic or type below
              </p>
            </div>
          </div>
          <div className="hidden lg:block flex-1">
            <ActionLog entries={actionLog} />
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
                    <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-pre:my-2 prose-pre:bg-background/60 prose-pre:border prose-pre:border-primary/20 prose-code:text-primary prose-strong:text-primary-foreground prose-headings:text-primary prose-img:rounded-xl prose-img:border prose-img:border-primary/30">
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
        ARIA v2.2 · {profiles.length} profile{profiles.length !== 1 ? "s" : ""} · Active: {resolveAddress(memory).name} · Powered by Lovable AI
      </footer>

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
          // Sync into active profile too
          setProfiles((prev) =>
            prev.map((p) =>
              p.id === activeProfileId
                ? { ...p, name: patch.userName ?? p.name, addressStyle: patch.addressStyle ?? p.addressStyle }
                : p,
            ),
          );
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
    </div>
  );
};

export default Index;
