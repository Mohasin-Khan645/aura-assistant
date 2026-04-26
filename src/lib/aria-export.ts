// Export conversation as Markdown or JSON report.
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

export function buildMarkdownReport(messages: ExportableMsg[], ctx: ExportContext): string {
  const at = (ctx.generatedAt ?? new Date()).toISOString();
  const userMsgs = messages.filter((m) => m.role === "user").length;
  const aiMsgs = messages.filter((m) => m.role === "assistant").length;
  const totalChars = messages.reduce((s, m) => s + m.content.length, 0);

  const header = [
    `# ARIA Conversation Report`,
    ``,
    `- **User**: ${ctx.profileName}`,
    `- **Address style**: ${ctx.addressStyle ?? "n/a"}`,
    `- **Generated**: ${at}`,
    `- **Messages**: ${messages.length} (you: ${userMsgs}, ARIA: ${aiMsgs})`,
    `- **Total characters**: ${totalChars}`,
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
      stats: {
        total: messages.length,
        user: messages.filter((m) => m.role === "user").length,
        assistant: messages.filter((m) => m.role === "assistant").length,
        characters: messages.reduce((s, m) => s + m.content.length, 0),
      },
      messages,
    },
    null,
    2,
  );
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
