// Executes ARIA actions and reports outcomes via callback.
import { type AriaAction, safeCalculate } from "./aria-actions";
import { supabase } from "@/integrations/supabase/client";

export type ActionLogEntry = {
  id: string;
  action: AriaAction;
  status: "success" | "error" | "pending";
  message?: string;
  timestamp: number;
  resultUrl?: string; // for image generation
};

export type ExecutorContext = {
  setTheme: (mode: "dark" | "light") => void;
  log: (entry: ActionLogEntry) => void;
  update: (id: string, patch: Partial<ActionLogEntry>) => void;
  appendAssistantText: (text: string) => void;
};

const newId = () => Math.random().toString(36).slice(2, 10);

async function fetchWeather(location: string) {
  // Use open-meteo (free, no key) with geocoding.
  const geo = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`,
  ).then((r) => r.json());
  const place = geo?.results?.[0];
  if (!place) throw new Error(`Couldn't find ${location}`);
  const w = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m`,
  ).then((r) => r.json());
  const c = w?.current;
  if (!c) throw new Error("No weather data");
  const codes: Record<number, string> = {
    0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow",
    80: "Showers", 81: "Showers", 82: "Heavy showers",
    95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
  };
  return `${place.name}, ${place.country}: ${c.temperature_2m}°C, ${codes[c.weather_code] ?? "—"}, wind ${c.wind_speed_10m} km/h, humidity ${c.relative_humidity_2m}%`;
}

export async function executeAction(action: AriaAction, ctx: ExecutorContext) {
  const id = newId();
  ctx.log({ id, action, status: "pending", timestamp: Date.now() });

  try {
    switch (action.type) {
      case "open_url":
      case "open_app":
      case "search_google":
      case "search_youtube": {
        const win = window.open(action.url, "_blank", "noopener,noreferrer");
        if (!win) throw new Error("Popup blocked — please allow popups");
        ctx.update(id, { status: "success", message: "Opened in new tab" });
        return;
      }
      case "copy": {
        await navigator.clipboard.writeText(action.text);
        ctx.update(id, { status: "success", message: "Copied to clipboard" });
        return;
      }
      case "set_theme": {
        ctx.setTheme(action.mode);
        ctx.update(id, { status: "success", message: `Theme: ${action.mode}` });
        return;
      }
      case "time": {
        const now = new Date();
        const text = `🕒 ${now.toLocaleString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
        ctx.appendAssistantText(text);
        ctx.update(id, { status: "success", message: now.toLocaleTimeString() });
        return;
      }
      case "calculate": {
        const result = safeCalculate(action.expression);
        ctx.appendAssistantText(`🧮 \`${action.expression}\` = **${result}**`);
        ctx.update(id, { status: "success", message: `= ${result}` });
        return;
      }
      case "weather": {
        const text = await fetchWeather(action.location);
        ctx.appendAssistantText(`🌤️ ${text}`);
        ctx.update(id, { status: "success", message: text });
        return;
      }
      case "generate_image": {
        const { data, error } = await supabase.functions.invoke("aria-image", {
          body: { prompt: action.prompt },
        });
        if (error) throw new Error(error.message || "Image generation failed");
        const url: string | undefined = data?.imageUrl;
        if (!url) throw new Error("No image returned");
        ctx.appendAssistantText(`🎨 Generated:\n\n![${action.prompt}](${url})`);
        ctx.update(id, { status: "success", message: "Image generated", resultUrl: url });
        return;
      }
    }
  } catch (e) {
    ctx.update(id, {
      status: "error",
      message: e instanceof Error ? e.message : "Unknown error",
    });
  }
}
