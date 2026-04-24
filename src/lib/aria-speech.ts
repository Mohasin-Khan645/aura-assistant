// Browser SpeechRecognition wrapper hook
import { useCallback, useEffect, useRef, useState } from "react";

type SR = any;

export function useSpeechRecognition(onResult: (text: string) => void) {
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
    rec.lang = "en-US";
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
  }, [onResult]);

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

export function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  // Strip markdown for cleaner speech
  const clean = text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/[`*_#>\[\]()]/g, "")
    .replace(/https?:\/\/\S+/g, " link ")
    .slice(0, 600);
  const utter = new SpeechSynthesisUtterance(clean);
  utter.rate = 1.05;
  utter.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) => /female|samantha|zira|aria|google us/i.test(v.name)) || voices[0];
  if (preferred) utter.voice = preferred;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
