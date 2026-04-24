export type ChatMsg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aria-chat`;

export type StreamMeta = {
  reqId?: string;
  durationMs: number;
  chars: number;
  chunks: number;
};

export async function streamAria({
  messages,
  userName,
  addressStyle,
  onDelta,
  onDone,
  onError,
}: {
  messages: ChatMsg[];
  userName?: string;
  addressStyle?: string;
  onDelta: (chunk: string) => void;
  onDone: (meta: StreamMeta) => void;
  onError: (msg: string) => void;
}) {
  const startedAt = performance.now();
  let resp: Response;
  try {
    resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, userName, addressStyle }),
    });
  } catch (e) {
    onError("Network error reaching ARIA");
    return;
  }

  if (!resp.ok || !resp.body) {
    if (resp.status === 429) return onError("Rate limit hit. Try again in a moment.");
    if (resp.status === 402) return onError("AI credits exhausted. Add funds in Settings → Workspace → Usage.");
    try {
      const j = await resp.json();
      onError(j.error || `Error ${resp.status}`);
    } catch {
      onError(`Error ${resp.status}`);
    }
    return;
  }

  const reqId = resp.headers.get("x-aria-req-id") ?? undefined;
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;
  let chars = 0;
  let chunks = 0;

  const emit = (c: string) => { chars += c.length; chunks++; onDelta(c); };

  while (!done) {
    const { done: rDone, value } = await reader.read();
    if (rDone) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line || line.startsWith(":")) continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (c) emit(c);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  if (buffer.trim()) {
    for (const raw of buffer.split("\n")) {
      if (!raw || raw.startsWith(":") || !raw.startsWith("data: ")) continue;
      const json = raw.slice(6).trim();
      if (json === "[DONE]") continue;
      try {
        const p = JSON.parse(json);
        const c = p.choices?.[0]?.delta?.content;
        if (c) emit(c);
      } catch { /* ignore */ }
    }
  }

  onDone({ reqId, durationMs: Math.round(performance.now() - startedAt), chars, chunks });
}
