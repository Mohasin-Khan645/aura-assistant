// Multi-language support for ARIA: speech locales + auto-detection.

export type AriaLang = {
  code: string;            // BCP-47 (TTS / STT)
  short: string;           // ISO 639-1
  label: string;           // Human label
  nativeLabel: string;     // Endonym
  flag: string;            // emoji flag
};

export const ARIA_LANGS: AriaLang[] = [
  { code: "en-US", short: "en", label: "English (US)",   nativeLabel: "English",   flag: "🇺🇸" },
  { code: "en-GB", short: "en", label: "English (UK)",   nativeLabel: "English",   flag: "🇬🇧" },
  { code: "hi-IN", short: "hi", label: "Hindi",          nativeLabel: "हिन्दी",     flag: "🇮🇳" },
  { code: "ne-NP", short: "ne", label: "Nepali",         nativeLabel: "नेपाली",     flag: "🇳🇵" },
  { code: "ur-PK", short: "ur", label: "Urdu",           nativeLabel: "اردو",      flag: "🇵🇰" },
  { code: "bn-BD", short: "bn", label: "Bengali",        nativeLabel: "বাংলা",     flag: "🇧🇩" },
  { code: "es-ES", short: "es", label: "Spanish",        nativeLabel: "Español",   flag: "🇪🇸" },
  { code: "fr-FR", short: "fr", label: "French",         nativeLabel: "Français",  flag: "🇫🇷" },
  { code: "ar-SA", short: "ar", label: "Arabic",         nativeLabel: "العربية",   flag: "🇸🇦" },
  { code: "de-DE", short: "de", label: "German",         nativeLabel: "Deutsch",   flag: "🇩🇪" },
  { code: "ja-JP", short: "ja", label: "Japanese",       nativeLabel: "日本語",    flag: "🇯🇵" },
  { code: "zh-CN", short: "zh", label: "Chinese",        nativeLabel: "中文",      flag: "🇨🇳" },
];

export function findLang(code: string): AriaLang | undefined {
  return ARIA_LANGS.find((l) => l.code === code) ?? ARIA_LANGS.find((l) => l.short === code.slice(0, 2));
}

/**
 * Detect script/language of the supplied text.
 * Returns ISO 639-1 short code. Defaults to "en".
 *
 * Note: Hindi vs Nepali both use Devanagari. We use simple Nepali-distinctive
 * markers (छ / छन् / हो / हुन् / गर्न) when present; otherwise treat as Hindi.
 */
export function detectLanguage(text: string): string {
  if (!text) return "en";
  const t = text.trim();

  if (/[\u0600-\u06FF\u0750-\u077F]/.test(t)) {
    // Arabic block — Urdu uses extra letters ے ٹ ڈ ڑ پ چ ژ گ ں ھ
    if (/[ٹڈڑپچژگںھے]/.test(t)) return "ur";
    return "ar";
  }
  if (/[\u0980-\u09FF]/.test(t)) return "bn";
  if (/[\u3040-\u30FF]/.test(t)) return "ja";
  if (/[\u4E00-\u9FFF]/.test(t)) return "zh";

  if (/[\u0900-\u097F]/.test(t)) {
    // Devanagari — disambiguate Hindi vs Nepali
    if (/\b(छ|छन्|हो|हुन्|गर्न|भयो|गरेको|छैन)\b/.test(t)) return "ne";
    return "hi";
  }

  // Latin-based heuristics
  const lower = t.toLowerCase();
  if (/\b(hola|gracias|por favor|cómo estás|qué|señor|usted|buenos días)\b/.test(lower)) return "es";
  if (/\b(bonjour|merci|s'il vous plaît|comment|monsieur|où|pourquoi)\b/.test(lower)) return "fr";
  if (/\b(guten|danke|bitte|wie geht|warum|nicht|ist)\b/.test(lower)) return "de";

  return "en";
}

/** Pick a TTS-friendly BCP-47 code for a detected short code, preferring user's choice. */
export function bestLocaleFor(shortCode: string, fallbackLocale: string): string {
  const direct = ARIA_LANGS.find((l) => l.short === shortCode);
  if (direct) return direct.code;
  return fallbackLocale;
}
