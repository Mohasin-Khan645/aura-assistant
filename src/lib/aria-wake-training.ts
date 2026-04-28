// Wake-word training — store/retrieve custom wake phrases in localStorage.
const KEY = "aria:wakePhrases";
const DEFAULTS = ["hey aria", "ok aria", "okay aria", "aria wake"];

export function loadWakePhrases(): string[] {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return DEFAULTS;
    const merged = Array.from(new Set([...DEFAULTS, ...arr.filter((s) => typeof s === "string")]));
    return merged.slice(0, 20);
  } catch { return DEFAULTS; }
}

export function saveWakePhrases(phrases: string[]) {
  const custom = phrases
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length >= 3 && s.length <= 40 && !DEFAULTS.includes(s));
  localStorage.setItem(KEY, JSON.stringify(custom));
}

export function buildWakeMatchers(phrases: string[]): RegExp[] {
  return phrases.map((p) => {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    return new RegExp(`\\b${escaped}\\b`, "i");
  });
}

export function isDefaultPhrase(p: string) {
  return DEFAULTS.includes(p.trim().toLowerCase());
}
