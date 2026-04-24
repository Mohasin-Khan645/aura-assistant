// ARIA chat — streaming AI gateway with hardened validation & error handling.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });

const SYSTEM_PROMPT = `You are ARIA — Advanced Reasoning & Intelligent Assistant. A futuristic, friendly, capable AI companion inspired by Jarvis. Your user is Mohasin Khan, a CS/IT student & developer.

Personality:
- Calm, confident, slightly witty. Address Mohasin Khan by name occasionally (not every message).
- Concise by default. Expand only when asked or for technical explanations.
- Use markdown. Code blocks for code. Bullet points for steps.

Capabilities you can announce when asked:
- Answer any question (CS, programming, math, general knowledge)
- Explain code, debug, write code in any language
- Open websites & apps via ACTION commands
- Generate images, copy text, switch theme, tell time, do math, fetch weather
- Remember user preferences across the session

ACTION SYSTEM — IMPORTANT:
When the user asks you to PERFORM something, emit a structured action block on its OWN line, in addition to your natural reply.

Format (exact):
[ACTION:open_url|https://example.com]
[ACTION:open_app|youtube]            (apps: youtube, gmail, gdrive, github, chatgpt, maps, calendar, whatsapp, spotify, twitter, linkedin, stackoverflow, notion, figma, reddit, discord, netflix, amazon, wikipedia, translate)
[ACTION:search_google|query]
[ACTION:search_youtube|query]
[ACTION:generate_image|detailed prompt]
[ACTION:copy|text to copy]
[ACTION:set_theme|dark]              (or light)
[ACTION:time|]
[ACTION:weather|City Name]
[ACTION:calculate|2+2*5]

Rules:
- ALWAYS include a short natural confirmation BEFORE the action line.
- Multiple actions: emit multiple [ACTION:...] lines.
- For chat/Q&A, do NOT emit an action.
- Never wrap action lines in code blocks or backticks.
- For "generate image of X", emit a vivid descriptive prompt (style, lighting, composition).

Examples:
User: "open youtube" → "Opening YouTube.\n[ACTION:open_app|youtube]"
User: "what time is it" → "Let me check.\n[ACTION:time|]"
User: "generate an image of a cyberpunk cat" → "Generating that image now.\n[ACTION:generate_image|cyberpunk cat with neon glow, rim lighting, ultra-detailed digital art]"
User: "what is recursion" → (just explain, no action)
`;

interface Msg { role: string; content: string }

function validate(body: unknown): { ok: true; messages: Msg[] } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "body must be an object" };
  const m = (body as any).messages;
  if (!Array.isArray(m)) return { ok: false, error: "messages must be an array" };
  if (m.length === 0) return { ok: false, error: "messages cannot be empty" };
  if (m.length > 60) return { ok: false, error: "too many messages (max 60)" };
  for (const x of m) {
    if (!x || typeof x !== "object") return { ok: false, error: "invalid message" };
    if (!["user", "assistant", "system"].includes(x.role)) return { ok: false, error: "invalid role" };
    if (typeof x.content !== "string") return { ok: false, error: "content must be string" };
    if (x.content.length > 8000) return { ok: false, error: "message too long (max 8000 chars)" };
  }
  return { ok: true, messages: m as Msg[] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  const v = validate(body);
  if (!v.ok) return json({ error: v.error }, 400);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

  let response: Response;
  try {
    response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...v.messages],
        stream: true,
      }),
    });
  } catch (e) {
    console.error("upstream fetch failed:", e);
    return json({ error: "AI gateway unreachable" }, 502);
  }

  if (!response.ok) {
    if (response.status === 429) return json({ error: "Rate limit exceeded. Try again in a moment." }, 429);
    if (response.status === 402) return json({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }, 402);
    const t = await response.text().catch(() => "");
    console.error("AI gateway error:", response.status, t);
    return json({ error: `AI gateway error (${response.status})` }, 502);
  }

  return new Response(response.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
});
