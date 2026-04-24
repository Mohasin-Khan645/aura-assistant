// Parses [ACTION:type|payload] tags from AI responses and executes them.

const APP_URLS: Record<string, string> = {
  youtube: "https://www.youtube.com",
  gmail: "https://mail.google.com",
  gdrive: "https://drive.google.com",
  github: "https://github.com",
  chatgpt: "https://chat.openai.com",
  maps: "https://maps.google.com",
  calendar: "https://calendar.google.com",
  whatsapp: "https://web.whatsapp.com",
  spotify: "https://open.spotify.com",
  twitter: "https://x.com",
  linkedin: "https://www.linkedin.com",
  stackoverflow: "https://stackoverflow.com",
  notion: "https://www.notion.so",
  figma: "https://www.figma.com",
};

export type AriaAction =
  | { type: "open_url"; url: string; label: string }
  | { type: "open_app"; app: string; url: string; label: string }
  | { type: "search_google"; query: string; url: string; label: string }
  | { type: "search_youtube"; query: string; url: string; label: string };

const ACTION_REGEX = /\[ACTION:(\w+)\|([^\]]+)\]/g;

export function extractActions(text: string): { cleanText: string; actions: AriaAction[] } {
  const actions: AriaAction[] = [];
  const cleanText = text
    .replace(ACTION_REGEX, (_match, type: string, payload: string) => {
      const p = payload.trim();
      switch (type) {
        case "open_url":
          actions.push({ type: "open_url", url: p, label: `Open ${p}` });
          break;
        case "open_app": {
          const key = p.toLowerCase();
          const url = APP_URLS[key];
          if (url) actions.push({ type: "open_app", app: key, url, label: `Open ${key}` });
          break;
        }
        case "search_google":
          actions.push({
            type: "search_google",
            query: p,
            url: `https://www.google.com/search?q=${encodeURIComponent(p)}`,
            label: `Google: ${p}`,
          });
          break;
        case "search_youtube":
          actions.push({
            type: "search_youtube",
            query: p,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(p)}`,
            label: `YouTube: ${p}`,
          });
          break;
      }
      return ""; // strip from displayed text
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { cleanText, actions };
}

export function executeAction(action: AriaAction) {
  window.open(action.url, "_blank", "noopener,noreferrer");
}
