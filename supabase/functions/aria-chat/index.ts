// ARIA chat — streaming AI gateway with hardened validation, personalization & metadata.

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

type AddressStyle = "first_name" | "full_name" | "sir" | "boss" | "none";

/** Strip control chars, brackets, backticks; cap length. Prevents prompt injection via name. */
function sanitizeName(raw: string): string {
  return raw
    .replace(/[\r\n\t\u0000-\u001F]/g, " ")
    .replace(/[{}\[\]<>`$]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function buildSystemPrompt(userName: string, addressStyle: AddressStyle): string {
  const safeName = sanitizeName(userName) || "Mohasin Khan";
  const firstName = safeName.split(" ")[0] || safeName;

  let addressInstr: string;
  switch (addressStyle) {
    case "full_name":
      addressInstr = `Address the user by their full name "${safeName}" occasionally — never use generic terms like "user", "sir", "buddy", or "you there".`;
      break;
    case "sir":
      addressInstr = `Address the user as "sir" occasionally. Their actual name is "${safeName}" — use it sparingly when more personal.`;
      break;
    case "boss":
      addressInstr = `Address the user as "boss" occasionally. Their actual name is "${safeName}".`;
      break;
    case "none":
      addressInstr = `The user's name is "${safeName}". Do NOT address them by name or with generic terms — speak directly without salutation.`;
      break;
    case "first_name":
    default:
      addressInstr = `Address the user by their first name "${firstName}" occasionally (their full name is "${safeName}"). NEVER use generic terms like "user", "buddy", "friend", "you there", or default to "sir" unless explicitly told.`;
      break;
  }

  return `You are ARIA — Advanced Reasoning & Intelligent Assistant. A futuristic, friendly, capable AI companion inspired by Jarvis. Your user is ${safeName}, a CS/IT student & developer.

Personality:
- Calm, confident, slightly witty.
- ${addressInstr}
- Concise by default. Expand only when asked or for technical explanations.
- Use markdown. Code blocks for code. Bullet points for steps.

Language (CRITICAL):
- Detect the language of the user's most recent message and ALWAYS reply in that exact same language and script.
- Fully fluent in: English, Hindi (हिन्दी), Nepali (नेपाली), Urdu (اردو), Bengali (বাংলা), Spanish, French, Arabic, German, Japanese, Chinese — and reasonable in any other language.
- Hindi & Nepali both use Devanagari — pay attention to vocabulary cues (छ, छन्, हुन्, गर्न → Nepali; है, हैं, करना → Hindi). Reply in the user's variant.
- For Hinglish / Roman-script Hindi, mirror the user's Roman script. Same for Urdu/Arabic transliteration.
- Keep code, commands, file names, and URLs in English even when replying in another language.
- Never switch language unless the user does first.

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
[ACTION:add_task|Buy groceries tomorrow]
[ACTION:add_note|Meeting takeaways: ship v3 by Friday]
[ACTION:set_reminder|Call mom||in 30 minutes]   (format: title||when. when supports "in N min/hours/days", "tomorrow 9am", "5pm")
[ACTION:list_tasks|]
[ACTION:briefing|]                              (morning summary: time, weather, tasks)

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
}

interface Msg { role: string; content: string }

function validate(body: unknown):
  | { ok: true; messages: Msg[]; userName: string; addressStyle: AddressStyle }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "body must be an object" };
  const b = body as Record<string, unknown>;

  const m = b.messages;
  if (!Array.isArray(m)) return { ok: false, error: "messages must be an array" };
  if (m.length === 0) return { ok: false, error: "messages cannot be empty" };
  if (m.length > 60) return { ok: false, error: "too many messages (max 60)" };
  for (const x of m) {
    if (!x || typeof x !== "object") return { ok: false, error: "invalid message" };
    const xm = x as Record<string, unknown>;
    if (!["user", "assistant", "system"].includes(xm.role as string)) return { ok: false, error: "invalid role" };
    if (typeof xm.content !== "string") return { ok: false, error: "content must be string" };
    if ((xm.content as string).length > 8000) return { ok: false, error: "message too long (max 8000 chars)" };
  }

  const userName = typeof b.userName === "string" && b.userName.trim()
    ? b.userName
    : "Mohasin Khan";
  const styleRaw = typeof b.addressStyle === "string" ? b.addressStyle : "first_name";
  const addressStyle: AddressStyle =
    (["first_name", "full_name", "sir", "boss", "none"] as const).includes(styleRaw as AddressStyle)
      ? (styleRaw as AddressStyle)
      : "first_name";

  return { ok: true, messages: m as Msg[], userName, addressStyle };
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

  const systemPrompt = buildSystemPrompt(v.userName, v.addressStyle);
  const startedAt = Date.now();
  const reqId = crypto.randomUUID().slice(0, 8);
  console.log(JSON.stringify({
    evt: "aria_chat_request",
    reqId,
    userName: v.userName.slice(0, 60),
    addressStyle: v.addressStyle,
    msgCount: v.messages.length,
    lastUserChars: v.messages[v.messages.length - 1]?.content?.length ?? 0,
  }));

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
        messages: [{ role: "system", content: systemPrompt }, ...v.messages],
        stream: true,
      }),
    });
  } catch (e) {
    console.error(JSON.stringify({ evt: "aria_chat_upstream_fail", reqId, err: String(e) }));
    return json({ error: "AI gateway unreachable" }, 502);
  }

  if (!response.ok) {
    if (response.status === 429) return json({ error: "Rate limit exceeded. Try again in a moment." }, 429);
    if (response.status === 402) return json({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }, 402);
    const t = await response.text().catch(() => "");
    console.error(JSON.stringify({ evt: "aria_chat_gateway_err", reqId, status: response.status, body: t.slice(0, 500) }));
    return json({ error: `AI gateway error (${response.status})` }, 502);
  }

  // Tee stream so we can log metadata after completion without blocking the client.
  const [clientStream, logStream] = response.body!.tee();

  (async () => {
    try {
      const reader = logStream.getReader();
      const decoder = new TextDecoder();
      let chars = 0;
      let chunks = 0;
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            const c = j?.choices?.[0]?.delta?.content;
            if (typeof c === "string") { chars += c.length; chunks++; }
          } catch { /* ignore */ }
        }
      }
      console.log(JSON.stringify({
        evt: "aria_chat_response",
        reqId,
        durationMs: Date.now() - startedAt,
        chunks,
        chars,
      }));
    } catch (e) {
      console.error(JSON.stringify({ evt: "aria_chat_log_err", reqId, err: String(e) }));
    }
  })();

  return new Response(clientStream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "x-aria-req-id": reqId,
    },
  });
});
