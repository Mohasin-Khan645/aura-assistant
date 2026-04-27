// Hardened action parser for ARIA.
// Supports: open_url, open_app, search_google, search_youtube, generate_image,
//           copy, set_theme, time, weather, calculate

const APP_URLS: Record<string, string> = {
  youtube: "https://www.youtube.com",
  gmail: "https://mail.google.com",
  gdrive: "https://drive.google.com",
  drive: "https://drive.google.com",
  github: "https://github.com",
  chatgpt: "https://chat.openai.com",
  maps: "https://maps.google.com",
  calendar: "https://calendar.google.com",
  whatsapp: "https://web.whatsapp.com",
  spotify: "https://open.spotify.com",
  twitter: "https://x.com",
  x: "https://x.com",
  linkedin: "https://www.linkedin.com",
  stackoverflow: "https://stackoverflow.com",
  notion: "https://www.notion.so",
  figma: "https://www.figma.com",
  reddit: "https://www.reddit.com",
  discord: "https://discord.com/app",
  netflix: "https://www.netflix.com",
  amazon: "https://www.amazon.com",
  wikipedia: "https://www.wikipedia.org",
  translate: "https://translate.google.com",
  lovable: "https://lovable.dev",
};

export type AriaAction =
  | { type: "open_url"; url: string; label: string }
  | { type: "open_app"; app: string; url: string; label: string }
  | { type: "search_google"; query: string; url: string; label: string }
  | { type: "search_youtube"; query: string; url: string; label: string }
  | { type: "generate_image"; prompt: string; label: string }
  | { type: "copy"; text: string; label: string }
  | { type: "set_theme"; mode: "dark" | "light"; label: string }
  | { type: "time"; label: string }
  | { type: "weather"; location: string; label: string }
  | { type: "calculate"; expression: string; label: string }
  | { type: "add_task"; title: string; label: string }
  | { type: "add_note"; content: string; label: string }
  | { type: "set_reminder"; title: string; whenIso: string; label: string }
  | { type: "list_tasks"; label: string }
  | { type: "briefing"; label: string };

const ACTION_REGEX = /\[ACTION:(\w+)\|([\s\S]*?)\]/g;
const MAX_PAYLOAD = 800;

const SAFE_PROTOCOLS = new Set(["http:", "https:"]);

function safeUrl(raw: string): string | null {
  try {
    let candidate = raw.trim();
    if (!/^https?:\/\//i.test(candidate)) candidate = "https://" + candidate;
    const u = new URL(candidate);
    if (!SAFE_PROTOCOLS.has(u.protocol)) return null;
    if (!u.hostname || u.hostname.length > 253) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function dedupeKey(a: AriaAction): string {
  switch (a.type) {
    case "open_url":
    case "open_app":
      return `${a.type}:${a.url}`;
    case "search_google":
    case "search_youtube":
      return `${a.type}:${a.query.toLowerCase()}`;
    case "generate_image":
      return `gen:${a.prompt.toLowerCase()}`;
    case "copy":
      return `copy:${a.text}`;
    case "set_theme":
      return `theme:${a.mode}`;
    case "time":
      return "time";
    case "weather":
      return `weather:${a.location.toLowerCase()}`;
    case "calculate":
      return `calc:${a.expression}`;
    case "add_task":
      return `task:${a.title.toLowerCase()}`;
    case "add_note":
      return `note:${a.content.slice(0, 40).toLowerCase()}`;
    case "set_reminder":
      return `rem:${a.title.toLowerCase()}@${a.whenIso}`;
    case "list_tasks":
      return "list_tasks";
    case "briefing":
      return "briefing";
  }
}

// Parse a natural "when" phrase into ISO. Returns null on failure.
function parseWhen(raw: string): string | null {
  const txt = raw.trim().toLowerCase();
  if (!txt) return null;
  const direct = new Date(raw);
  if (!isNaN(direct.getTime()) && /\d{4}-\d{2}-\d{2}/.test(raw)) return direct.toISOString();
  const now = new Date();
  const m = txt.match(/^in\s+(\d+)\s*(min(ute)?s?|h(ou)?rs?|days?)/);
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = m[2];
    const ms =
      /^min/.test(unit) ? n * 60_000 :
      /^h/.test(unit)   ? n * 3_600_000 :
                          n * 86_400_000;
    return new Date(now.getTime() + ms).toISOString();
  }
  const tm = txt.match(/(?:(today|tomorrow)\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (tm) {
    let hour = parseInt(tm[2], 10);
    const min = tm[3] ? parseInt(tm[3], 10) : 0;
    const mer = tm[4];
    if (mer === "pm" && hour < 12) hour += 12;
    if (mer === "am" && hour === 12) hour = 0;
    const d = new Date(now);
    if (tm[1] === "tomorrow") d.setDate(d.getDate() + 1);
    d.setHours(hour, min, 0, 0);
    if (d.getTime() <= now.getTime() && !tm[1]) d.setDate(d.getDate() + 1);
    return d.toISOString();
  }
  return null;
}

export function extractActions(text: string): { cleanText: string; actions: AriaAction[] } {
  const actions: AriaAction[] = [];
  const seen = new Set<string>();
  const push = (a: AriaAction | null) => {
    if (!a) return;
    const k = dedupeKey(a);
    if (seen.has(k)) return;
    seen.add(k);
    actions.push(a);
  };

  const cleanText = text
    .replace(ACTION_REGEX, (_match, rawType: string, rawPayload: string) => {
      const type = rawType.toLowerCase();
      const payload = rawPayload.trim().slice(0, MAX_PAYLOAD);
      if (!payload) return "";

      switch (type) {
        case "open_url": {
          const url = safeUrl(payload);
          if (url) push({ type: "open_url", url, label: `Open ${new URL(url).hostname}` });
          break;
        }
        case "open_app": {
          const key = payload.toLowerCase().replace(/[^a-z]/g, "");
          const url = APP_URLS[key];
          if (url) push({ type: "open_app", app: key, url, label: `Open ${key}` });
          break;
        }
        case "search_google": {
          const q = payload.slice(0, 200);
          push({
            type: "search_google",
            query: q,
            url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
            label: `Google: ${q}`,
          });
          break;
        }
        case "search_youtube": {
          const q = payload.slice(0, 200);
          push({
            type: "search_youtube",
            query: q,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
            label: `YouTube: ${q}`,
          });
          break;
        }
        case "generate_image": {
          const prompt = payload.slice(0, 500);
          push({ type: "generate_image", prompt, label: `Generate image: ${prompt.slice(0, 40)}…` });
          break;
        }
        case "copy": {
          push({ type: "copy", text: payload, label: `Copy to clipboard` });
          break;
        }
        case "set_theme": {
          const mode = payload.toLowerCase().includes("light") ? "light" : "dark";
          push({ type: "set_theme", mode, label: `Theme: ${mode}` });
          break;
        }
        case "time": {
          push({ type: "time", label: "Show current time" });
          break;
        }
        case "weather": {
          const loc = payload.slice(0, 100);
          push({ type: "weather", location: loc, label: `Weather: ${loc}` });
          break;
        }
        case "calculate": {
          push({ type: "calculate", expression: payload.slice(0, 200), label: `Calculate` });
          break;
        }
      }
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { cleanText, actions };
}

// Safe calculator: only digits, operators, parens, dot, spaces.
export function safeCalculate(expr: string): string {
  if (!/^[\d+\-*/().\s%]+$/.test(expr)) return "Invalid expression";
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr});`)();
    if (typeof result !== "number" || !Number.isFinite(result)) return "Invalid result";
    return String(result);
  } catch {
    return "Calculation error";
  }
}
