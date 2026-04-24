// Lightweight session memory for ARIA — name, preferences, conversation.
const STORAGE_KEY = "aria.memory.v1";
const CONV_KEY = "aria.conversation.v1";

export type AddressStyle = "first_name" | "full_name" | "sir" | "boss" | "none";

export type AriaMemory = {
  userName?: string;
  addressStyle?: AddressStyle;
  preferences?: string[];
  voiceLang?: string;
  voiceEnabled?: boolean;
};

const DEFAULT_MEM: AriaMemory = {
  userName: "Mohasin Khan",
  addressStyle: "first_name",
};

export function loadMemory(): AriaMemory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_MEM, ...parsed };
  } catch {
    return { ...DEFAULT_MEM };
  }
}

export function saveMemory(m: AriaMemory) {
  try {
    const merged = { ...loadMemory(), ...m };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch { /* quota */ }
}

/** Sanitize user-provided name to keep prompt safe (no newlines/braces/control chars). */
export function sanitizeName(raw: string): string {
  return raw
    .replace(/[\r\n\t\u0000-\u001F]/g, " ")
    .replace(/[{}\[\]<>`$]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Compute the form of address ARIA should use, based on stored preferences. */
export function resolveAddress(m: AriaMemory): { name: string; style: AddressStyle } {
  const safe = sanitizeName(m.userName || "Mohasin Khan");
  const style = m.addressStyle ?? "first_name";
  if (style === "first_name") return { name: safe.split(" ")[0] || safe, style };
  if (style === "full_name") return { name: safe, style };
  if (style === "sir") return { name: "sir", style };
  if (style === "boss") return { name: "boss", style };
  return { name: safe, style };
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
    localStorage.setItem(CONV_KEY, JSON.stringify(msgs.slice(-30)));
  } catch { /* quota */ }
}

export function clearConversation() {
  try { localStorage.removeItem(CONV_KEY); } catch { /* noop */ }
}
