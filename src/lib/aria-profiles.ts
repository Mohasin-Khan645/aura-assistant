// Multi-user profiles for ARIA. Each profile has its own memory + conversation.
import type { AriaMemory, AddressStyle } from "./aria-memory";
import { sanitizeName } from "./aria-memory";

const PROFILES_KEY = "aria.profiles.v1";
const ACTIVE_KEY = "aria.profiles.active.v1";

export type AriaProfile = {
  id: string;
  name: string;
  addressStyle: AddressStyle;
  voiceLang?: string;
  voiceEnabled?: boolean;
  createdAt: number;
};

const DEFAULT_PROFILE: AriaProfile = {
  id: "default",
  name: "Mohasin Khan",
  addressStyle: "first_name",
  createdAt: Date.now(),
};

export function loadProfiles(): AriaProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    const arr = raw ? (JSON.parse(raw) as AriaProfile[]) : [];
    if (!arr.length) return [DEFAULT_PROFILE];
    return arr;
  } catch {
    return [DEFAULT_PROFILE];
  }
}

export function saveProfiles(profiles: AriaProfile[]) {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch { /* quota */ }
}

export function loadActiveProfileId(): string {
  try { return localStorage.getItem(ACTIVE_KEY) || "default"; } catch { return "default"; }
}

export function saveActiveProfileId(id: string) {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* noop */ }
}

export function createProfile(name: string, addressStyle: AddressStyle = "first_name"): AriaProfile {
  return {
    id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: sanitizeName(name) || "Guest",
    addressStyle,
    createdAt: Date.now(),
  };
}

export function profileToMemory(p: AriaProfile): AriaMemory {
  return {
    userName: p.name,
    addressStyle: p.addressStyle,
    voiceLang: p.voiceLang,
    voiceEnabled: p.voiceEnabled,
  };
}
