// Voice command shortcuts: map spoken phrases to launcher prompts/templates.
// Stored in localStorage. Match is normalized (lowercase, trimmed punctuation).

export type VoiceShortcut = {
  id: string;
  phrase: string;     // e.g. "open youtube", "morning brief"
  prompt: string;     // sent to ARIA when matched
  enabled: boolean;
};

const KEY = "aria.voiceShortcuts.v1";

export const DEFAULT_VOICE_SHORTCUTS: VoiceShortcut[] = [
  { id: "vs-yt",    phrase: "open youtube",    prompt: "Open YouTube",                  enabled: true },
  { id: "vs-gm",    phrase: "open gmail",      prompt: "Open Gmail",                    enabled: true },
  { id: "vs-gh",    phrase: "open github",     prompt: "Open GitHub",                   enabled: true },
  { id: "vs-time",  phrase: "what time",       prompt: "What time is it?",              enabled: true },
  { id: "vs-brief", phrase: "morning brief",   prompt: "Give me my morning briefing",   enabled: true },
  { id: "vs-tasks", phrase: "show my tasks",   prompt: "List my tasks",                 enabled: true },
];

export function loadVoiceShortcuts(): VoiceShortcut[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_VOICE_SHORTCUTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_VOICE_SHORTCUTS;
  } catch {
    return DEFAULT_VOICE_SHORTCUTS;
  }
}

export function saveVoiceShortcuts(list: VoiceShortcut[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* quota */ }
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

/** Find the first enabled shortcut whose phrase appears in `spoken`. */
export function matchVoiceShortcut(spoken: string, shortcuts = loadVoiceShortcuts()): VoiceShortcut | null {
  const text = norm(spoken);
  if (!text) return null;
  // Prefer the longest matching phrase (more specific).
  const candidates = shortcuts
    .filter((s) => s.enabled && s.phrase.trim())
    .map((s) => ({ s, p: norm(s.phrase) }))
    .filter(({ p }) => p && text.includes(p))
    .sort((a, b) => b.p.length - a.p.length);
  return candidates[0]?.s ?? null;
}
