// Lightweight free translation via MyMemory API. Used for bilingual transcript mode.
const cache = new Map<string, string>();

export async function translate(text: string, to: string, from = "auto"): Promise<string> {
  const clean = text.replace(/```[\s\S]*?```/g, " [code] ").trim();
  if (!clean || clean.length > 1500) return text;
  const key = `${from}>${to}:${clean}`;
  if (cache.has(key)) return cache.get(key)!;
  try {
    const langPair = `${from === "auto" ? "en" : from.slice(0, 2)}|${to.slice(0, 2)}`;
    const r = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${langPair}`,
    );
    const j = await r.json();
    const out = j?.responseData?.translatedText;
    if (typeof out === "string" && out.trim()) {
      cache.set(key, out);
      return out;
    }
  } catch { /* network */ }
  return text;
}

// Detect script: Devanagari = Hindi, else English-ish
export function detectScript(text: string): "hi" | "en" {
  return /[\u0900-\u097F]/.test(text) ? "hi" : "en";
}
