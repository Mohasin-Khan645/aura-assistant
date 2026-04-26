// Export conversation as Markdown, JSON, HTML, or TXT report.
export type ExportFormat = "md" | "json" | "html" | "txt";

export type ExportableMsg = {
  role: "user" | "assistant";
  content: string;
  meta?: { chars: number; chunks: number; durationMs: number; reqId?: string };
};

export type ExportContext = {
  profileName: string;
  addressStyle?: string;
  generatedAt?: Date;
};

const stats = (messages: ExportableMsg[]) => ({
  total: messages.length,
  user: messages.filter((m) => m.role === "user").length,
  assistant: messages.filter((m) => m.role === "assistant").length,
  characters: messages.reduce((s, m) => s + m.content.length, 0),
});

export function buildMarkdownReport(messages: ExportableMsg[], ctx: ExportContext): string {
  const at = (ctx.generatedAt ?? new Date()).toISOString();
  const s = stats(messages);
  const header = [
    `# ARIA Conversation Report`,
    ``,
    `- **User**: ${ctx.profileName}`,
    `- **Address style**: ${ctx.addressStyle ?? "n/a"}`,
    `- **Generated**: ${at}`,
    `- **Messages**: ${s.total} (you: ${s.user}, ARIA: ${s.assistant})`,
    `- **Total characters**: ${s.characters}`,
    ``,
    `---`,
    ``,
  ].join("\n");

  const body = messages
    .map((m, i) => {
      const who = m.role === "user" ? `### ${i + 1}. ${ctx.profileName}` : `### ${i + 1}. ARIA`;
      const meta = m.meta
        ? `\n\n> _${m.meta.chars} chars · ${m.meta.chunks} chunks · ${m.meta.durationMs}ms${m.meta.reqId ? ` · #${m.meta.reqId}` : ""}_`
        : "";
      return `${who}\n\n${m.content || "_(empty)_"}${meta}`;
    })
    .join("\n\n");

  return header + body + "\n";
}

export function buildJsonReport(messages: ExportableMsg[], ctx: ExportContext): string {
  return JSON.stringify(
    {
      version: 1,
      user: ctx.profileName,
      addressStyle: ctx.addressStyle,
      generatedAt: (ctx.generatedAt ?? new Date()).toISOString(),
      stats: stats(messages),
      messages,
    },
    null,
    2,
  );
}

export function buildTxtReport(messages: ExportableMsg[], ctx: ExportContext): string {
  const at = (ctx.generatedAt ?? new Date()).toISOString();
  const s = stats(messages);
  const head =
    `ARIA Conversation Report\n` +
    `User: ${ctx.profileName}\n` +
    `Generated: ${at}\n` +
    `Messages: ${s.total} (you: ${s.user}, ARIA: ${s.assistant})\n` +
    `${"=".repeat(60)}\n\n`;
  const body = messages
    .map((m, i) => {
      const who = m.role === "user" ? ctx.profileName.toUpperCase() : "ARIA";
      return `[${i + 1}] ${who}\n${"-".repeat(40)}\n${m.content || "(empty)"}\n`;
    })
    .join("\n");
  return head + body;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function buildHtmlReport(messages: ExportableMsg[], ctx: ExportContext): string {
  const at = (ctx.generatedAt ?? new Date()).toISOString();
  const s = stats(messages);
  const items = messages
    .map((m, i) => {
      const who = m.role === "user" ? ctx.profileName : "ARIA";
      const cls = m.role === "user" ? "user" : "aria";
      const meta = m.meta
        ? `<div class="meta">${m.meta.chars} chars · ${m.meta.chunks} chunks · ${m.meta.durationMs}ms${m.meta.reqId ? ` · #${escapeHtml(m.meta.reqId)}` : ""}</div>`
        : "";
      return `<article class="msg ${cls}">
        <header><span class="num">#${i + 1}</span> <strong>${escapeHtml(who)}</strong></header>
        <pre>${escapeHtml(m.content || "(empty)")}</pre>
        ${meta}
      </article>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>ARIA Conversation — ${escapeHtml(ctx.profileName)}</title>
<style>
  :root { color-scheme: dark light; }
  body { font: 15px/1.55 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 820px; margin: 2rem auto; padding: 0 1rem; background:#0b0f17; color:#e6edf3; }
  h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
  .summary { color:#8b949e; font-size: 13px; margin-bottom: 1.5rem; }
  .msg { border:1px solid #1f2937; border-radius:14px; padding:14px 16px; margin:14px 0; background:#11161f; }
  .msg.user { border-color:#2b6cb0; background:#0f1a2b; }
  .msg.aria { border-color:#1f3d2b; background:#0f1a14; }
  .msg header { font-size:12px; color:#9ca3af; margin-bottom:6px; letter-spacing:.05em; text-transform:uppercase; }
  .msg .num { color:#6b7280; margin-right:6px; }
  pre { white-space: pre-wrap; word-wrap: break-word; margin:0; font: 14px/1.5 ui-monospace, Menlo, Consolas, monospace; }
  .meta { margin-top:8px; font-size:11px; color:#6b7280; font-family: ui-monospace, monospace; }
  footer { margin-top:2rem; font-size:11px; color:#6b7280; text-align:center; }
</style>
</head>
<body>
  <h1>ARIA Conversation Report</h1>
  <div class="summary">
    <strong>${escapeHtml(ctx.profileName)}</strong> · ${at}<br/>
    ${s.total} messages (you: ${s.user}, ARIA: ${s.assistant}) · ${s.characters} chars
  </div>
  ${items}
  <footer>Generated by ARIA · v2.2</footer>
</body>
</html>`;
}

export function buildReport(format: ExportFormat, messages: ExportableMsg[], ctx: ExportContext) {
  switch (format) {
    case "md":   return { content: buildMarkdownReport(messages, ctx), mime: "text/markdown",  ext: "md" };
    case "json": return { content: buildJsonReport(messages, ctx),     mime: "application/json", ext: "json" };
    case "html": return { content: buildHtmlReport(messages, ctx),     mime: "text/html",       ext: "html" };
    case "txt":  return { content: buildTxtReport(messages, ctx),      mime: "text/plain",      ext: "txt" };
  }
}

export function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
