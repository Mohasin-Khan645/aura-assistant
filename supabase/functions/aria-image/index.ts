// ARIA image generation — calls Lovable AI gateway image model and returns base64 PNG.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let prompt: string;
  try {
    const body = await req.json();
    prompt = String(body?.prompt || "").trim().slice(0, 800);
    if (!prompt) return json({ error: "prompt required" }, 400);
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return json({ error: "Rate limit. Try again shortly." }, 429);
      if (resp.status === 402) return json({ error: "AI credits exhausted." }, 402);
      const t = await resp.text().catch(() => "");
      console.error("image gateway error:", resp.status, t);
      return json({ error: `Image generation failed (${resp.status})` }, 502);
    }

    const data = await resp.json();
    const imageUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) return json({ error: "no image in response" }, 502);

    return json({ imageUrl });
  } catch (e) {
    console.error("aria-image error:", e);
    return json({ error: "Image generation failed" }, 500);
  }
});
