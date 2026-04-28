// Wake word listener — uses Web Speech API to listen for "hey aria" / "ok aria".
import { useEffect, useRef } from "react";

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: { isFinal: boolean; [k: number]: { transcript: string } }[] & { length: number };
}
type SR = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
};

const DEFAULT_PATTERNS = [/\bhey\s+aria\b/i, /\bok(ay)?\s+aria\b/i, /\baria\s+(wake|start|listen)\b/i];

export function useWakeWord(opts: { enabled: boolean; onWake: () => void; lang: string; suppressed: boolean; patterns?: RegExp[] }) {
  const recRef = useRef<SR | null>(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; recRef.current?.stop(); }, []);

  useEffect(() => {
    if (!opts.enabled || opts.suppressed) {
      recRef.current?.stop();
      recRef.current = null;
      return;
    }
    const W = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR });
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = opts.lang;
    rec.onresult = (e) => {
      const matchers = opts.patterns?.length ? opts.patterns : DEFAULT_PATTERNS;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (matchers.some((p) => p.test(t))) {
          opts.onWake();
          break;
        }
      }
    };
    rec.onerror = () => { /* keep silent — auto restart on end */ };
    rec.onend = () => {
      if (mounted.current && opts.enabled && !opts.suppressed) {
        try { rec.start(); } catch { /* ignore */ }
      }
    };
    try { rec.start(); recRef.current = rec; } catch { /* ignore */ }
    return () => { rec.stop(); recRef.current = null; };
  }, [opts.enabled, opts.suppressed, opts.lang, opts.onWake]);
}
