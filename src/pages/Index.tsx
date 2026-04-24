import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Mic, MicOff, Send, Volume2, VolumeX, Sparkles, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AriaCore } from "@/components/AriaCore";
import { streamAria, type ChatMsg } from "@/lib/aria-chat";
import { extractActions, executeAction, type AriaAction } from "@/lib/aria-actions";
import { speak, stopSpeaking, useSpeechRecognition } from "@/lib/aria-speech";
import { cn } from "@/lib/utils";

type DisplayMsg = { role: "user" | "assistant"; content: string; actions?: AriaAction[] };

const SUGGESTIONS = [
  "Open YouTube",
  "Search Google for React hooks tutorial",
  "Open my Gmail",
  "Explain Big-O notation simply",
  "Open GitHub and Stack Overflow",
];

const Index = () => {
  const [messages, setMessages] = useState<DisplayMsg[]>([
    {
      role: "assistant",
      content:
        "Systems online. I'm **ARIA** — your personal AI assistant. Ask me anything, or tell me to open a website or app. How can I help you today, sir?",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      const userMsg: DisplayMsg = { role: "user", content: trimmed };
      const nextMsgs = [...messages, userMsg];
      setMessages([...nextMsgs, { role: "assistant", content: "" }]);
      setInput("");
      setStreaming(true);
      stopSpeaking();

      const apiHistory: ChatMsg[] = nextMsgs.map((m) => ({ role: m.role, content: m.content }));

      let acc = "";
      await streamAria({
        messages: apiHistory,
        onDelta: (chunk) => {
          acc += chunk;
          const { cleanText } = extractActions(acc);
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: cleanText };
            return copy;
          });
        },
        onDone: () => {
          const { cleanText, actions } = extractActions(acc);
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: cleanText, actions };
            return copy;
          });
          // Execute actions automatically
          if (actions.length) {
            actions.forEach((a, i) => {
              setTimeout(() => {
                executeAction(a);
                toast.success(`Executed: ${a.label}`);
              }, i * 350);
            });
          }
          if (voiceEnabled && cleanText) speak(cleanText);
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
    [messages, streaming, voiceEnabled],
  );

  const { listening, supported: voiceSupported, start: startListening, stop: stopListening } =
    useSpeechRecognition((text) => {
      setInput(text);
      void send(text);
    });

  const ariaState: "idle" | "listening" | "thinking" | "speaking" = listening
    ? "listening"
    : streaming
      ? "thinking"
      : "idle";

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-primary/10">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full bg-gradient-core shadow-glow-soft flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold tracking-wider aria-text-gradient">
              ARIA
            </h1>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-mono">
              Adv. Reasoning Intelligent Assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (voiceEnabled) stopSpeaking();
              setVoiceEnabled((v) => !v);
            }}
            className="text-primary hover:bg-primary/10"
            aria-label={voiceEnabled ? "Mute voice" : "Enable voice"}
          >
            {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5">
            <span className={cn("w-2 h-2 rounded-full", streaming ? "bg-accent animate-pulse" : "bg-primary shadow-glow-soft")} />
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              {streaming ? "Processing" : listening ? "Listening" : "Online"}
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col lg:flex-row gap-6 px-4 md:px-10 py-6 max-w-7xl mx-auto w-full">
        {/* Core visualization */}
        <aside className="lg:w-[320px] flex flex-col items-center justify-start lg:justify-center gap-6 pt-2">
          <AriaCore state={ariaState} size={260} />
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/80">
              {ariaState === "idle" && "Standing by"}
              {ariaState === "listening" && "Listening..."}
              {ariaState === "thinking" && "Thinking..."}
              {ariaState === "speaking" && "Speaking"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground max-w-[260px]">
              Tap the mic and speak, or type below.
            </p>
          </div>
        </aside>

        {/* Chat panel */}
        <section className="flex-1 flex flex-col aria-panel rounded-3xl overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 md:p-7 space-y-5 min-h-[400px] max-h-[calc(100vh-280px)]">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex flex-col gap-2 max-w-[88%]",
                  m.role === "user" ? "ml-auto items-end" : "mr-auto items-start",
                )}
              >
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {m.role === "user" ? "You" : "ARIA"}
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground shadow-glow-soft"
                      : "bg-secondary/60 border border-primary/15 text-foreground",
                  )}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-pre:my-2 prose-pre:bg-background/60 prose-pre:border prose-pre:border-primary/20 prose-code:text-primary prose-strong:text-primary-foreground prose-headings:text-primary">
                      <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
                {m.actions && m.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {m.actions.map((a, idx) => (
                      <button
                        key={idx}
                        onClick={() => executeAction(a)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border border-primary/30 bg-primary/10 hover:bg-primary/20 hover:shadow-glow-soft transition-smooth text-primary"
                      >
                        <Globe className="w-3 h-3" />
                        {a.label}
                      </button>
                    ))}
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

          {/* Suggestions */}
          {messages.length <= 2 && (
            <div className="px-5 md:px-7 pb-3 flex flex-wrap gap-2">
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

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="border-t border-primary/15 p-4 flex items-center gap-2 bg-background/40"
          >
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={!voiceSupported || streaming}
              onClick={() => (listening ? stopListening() : startListening())}
              className={cn(
                "rounded-full transition-smooth",
                listening
                  ? "bg-accent text-accent-foreground shadow-accent-glow"
                  : "text-primary hover:bg-primary/10",
              )}
              aria-label="Voice input"
              title={voiceSupported ? "Voice input" : "Voice not supported in this browser"}
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
              type="submit"
              size="icon"
              disabled={streaming || !input.trim()}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-soft disabled:opacity-40"
              aria-label="Send"
            >
              {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </form>
        </section>
      </main>

      <footer className="text-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 py-3">
        ARIA v1.0 · Powered by Lovable AI
      </footer>
    </div>
  );
};

export default Index;
