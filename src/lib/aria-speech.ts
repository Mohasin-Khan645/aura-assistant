// Browser SpeechRecognition wrapper hook with language support.
import { useCallback, useEffect, useRef, useState } from "react";

type SR = any;

export function useSpeechRecognition(
  onResult: (text: string) => void,
  lang: string = "en-US",
) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SR | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const rec: SR = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = lang;
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    return () => {
      try { rec.stop(); } catch { /* noop */ }
    };
  }, [onResult, lang]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch { /* already started */ }
  }, []);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
  }, []);

  return { listening, supported, start, stop };
}

export type SpeakResult = "spoken" | "unsupported" | "error" | "blocked";

/**
 * Speak text and resolve once playback has actually started (or failed).
 * Resolves to a status code so callers can confirm voice playback.
 */
function getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const v = window.speechSynthesis.getVoices();
    if (v && v.length) return resolve(v);
    const handler = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    setTimeout(() => resolve(window.speechSynthesis.getVoices() || []), 800);
  });
}

export async function speak(text: string, lang: string = "en-US"): Promise<SpeakResult> {
  if (!("speechSynthesis" in window)) return "unsupported";
  const clean = text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/[`*_#>\[\]()]/g, "")
    .replace(/https?:\/\/\S+/g, " link ")
    .slice(0, 600);
  if (!clean.trim()) return "error";

  // Auto-detect Hindi (Devanagari) regardless of selected lang
  const hasDevanagari = /[\u0900-\u097F]/.test(clean);
  const effectiveLang = hasDevanagari ? "hi-IN" : lang;

  const voices = await getVoicesAsync();
  const langPrefix = effectiveLang.slice(0, 2);
  const localized = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  let preferred: SpeechSynthesisVoice | undefined;
  if (langPrefix === "hi") {
    preferred =
      voices.find((v) => /hi-IN/i.test(v.lang) && /google/i.test(v.name)) ||
      voices.find((v) => /hi-IN/i.test(v.lang)) ||
      localized[0];
  } else {
    preferred =
      localized.find((v) => /female|samantha|zira|aria|google/i.test(v.name)) ||
      localized[0] ||
      voices[0];
  }

  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate = hasDevanagari ? 0.95 : 1.05;
    utter.pitch = 1;
    utter.lang = effectiveLang;
    if (preferred) utter.voice = preferred;

    let settled = false;
    const done = (r: SpeakResult) => { if (!settled) { settled = true; resolve(r); } };
    utter.onstart = () => done("spoken");
    utter.onerror = (e: any) => done(e?.error === "not-allowed" ? "blocked" : "error");
    utter.onend = () => done("spoken");

    window.speechSynthesis.cancel();
    try { window.speechSynthesis.speak(utter); } catch { return done("error"); }

    setTimeout(() => {
      if (settled) return;
      done(window.speechSynthesis.speaking ? "spoken" : "blocked");
    }, 1500);
  });
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export const VOICE_LANGS: { code: string; label: string }[] = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "hi-IN", label: "Hindi" },
  { code: "es-ES", label: "Spanish" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "ja-JP", label: "Japanese" },
  { code: "zh-CN", label: "Chinese" },
];
