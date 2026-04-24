// Lightweight session memory for ARIA — name, preferences, conversation.
const STORAGE_KEY = "aria.memory.v1";
const CONV_KEY = "aria.conversation.v1";

export type AriaMemory = {
  userName?: string;
  preferences?: string[];
  voiceLang?: string;
  voiceEnabled?: boolean;
};

export function loadMemory(): AriaMemory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    // Default to Mohasin Khan if no name set
    if (!parsed.userName) {
      parsed.userName = "Mohasin Khan";
    }
    return parsed;
  } catch {
    return { userName: "Mohasin Khan" };
  }
}

export function saveMemory(m: AriaMemory) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  } catch { /* quota */ }
}

export function loadConversation<T>(): T[] | null {
  try {
    const raw = localStorage.getItem(CONV_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveConversation<T>(msgs: T[]) {
  try {
    // Keep only last 30 messages to avoid bloat
    localStorage.setItem(CONV_KEY, JSON.stringify(msgs.slice(-30)));
  } catch { /* quota */ }
}

export function clearConversation() {
  try { localStorage.removeItem(CONV_KEY); } catch { /* noop */ }
}
