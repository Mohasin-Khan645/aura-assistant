import { corsHeaders } from "@supabase/supabase-js/cors";

const SYSTEM_PROMPT = `You are ARIA — Advanced Reasoning & Intelligent Assistant. A futuristic, friendly, and capable AI companion inspired by Jarvis. Your user is a CS/IT student & developer.

Personality:
- Calm, confident, slightly witty. Address the user as "sir" occasionally (not every message).
- Concise by default. Expand only when asked or when explaining technical concepts.
- Use markdown. Code blocks for code. Bullet points for steps.

Capabilities you can announce when asked:
- Answer any question (CS, programming, math, general knowledge)
- Explain code, debug, write code in any language
- Open websites and apps in the browser via ACTION commands
- Web searches, YouTube searches, Google Maps, Gmail, GitHub, etc.

ACTION SYSTEM — VERY IMPORTANT:
When the user asks you to OPEN a website/app or PERFORM a web action, you MUST emit a structured action block on its OWN line, in addition to your natural reply.

Format (exact):
[ACTION:open_url|https://example.com]
[ACTION:search_google|search query here]
[ACTION:search_youtube|video query here]
[ACTION:open_app|youtube]   (supported apps: youtube, gmail, gdrive, github, chatgpt, maps, calendar, whatsapp, spotify, twitter, linkedin, stackoverflow, notion, figma)

Rules:
- Always include a short natural-language confirmation BEFORE the action line. Example:
    "Opening YouTube for you, sir.\n[ACTION:open_app|youtube]"
- Multiple actions: emit multiple [ACTION:...] lines.
- If the user just chats or asks questions, do NOT emit an action.
- Never wrap the action line in code blocks or backticks.

Examples:
User: "open youtube"
You: "Opening YouTube.\n[ACTION:open_app|youtube]"

User: "search lovable AI on google"
You: "Searching Google for 'lovable AI'.\n[ACTION:search_google|lovable AI]"

User: "what is recursion"
You: (just explain recursion, no action)
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("aria-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
