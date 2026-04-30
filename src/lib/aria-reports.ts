// CSV / JSON / PDF exports for ARIA Task History reports.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { downloadFile } from "./aria-export";
import type { TaskHistoryEntry } from "./aria-task-history";

const fmtDate = (ms: number) => new Date(ms).toLocaleString();

export function buildHistoryCsv(entries: TaskHistoryEntry[]): string {
  const header = ["When", "Source", "Status", "Safety", "Language", "Duration (ms)", "Prompt", "Notes"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = entries.map((e) => [
    fmtDate(e.createdAt),
    e.source,
    e.status,
    e.safety,
    e.language ?? "",
    String(e.durationMs ?? ""),
    e.prompt,
    e.notes ?? "",
  ].map(escape).join(","));
  return [header.map(escape).join(","), ...rows].join("\n");
}

export function buildHistoryJson(entries: TaskHistoryEntry[]): string {
  return JSON.stringify(
    {
      version: 1,
      generatedAt: new Date().toISOString(),
      total: entries.length,
      entries,
    },
    null,
    2,
  );
}

type PdfContext = {
  profileName: string;
  history: TaskHistoryEntry[];
  conversationStats?: { total: number; user: number; assistant: number };
};

export function buildActivityPdf(ctx: PdfContext): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("ARIA Activity Report", 40, 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`User: ${ctx.profileName}  ·  Generated: ${new Date().toLocaleString()}`, 40, 55);

  // Summary
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 40, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const counts = ctx.history.reduce(
    (acc, e) => { acc[e.status] = (acc[e.status] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );
  const summaryLines = [
    `Total tasks executed: ${ctx.history.length}`,
    `Completed: ${counts.completed ?? 0}    Blocked: ${counts.blocked ?? 0}    Warned: ${counts.warned ?? 0}    Errors: ${counts.error ?? 0}`,
  ];
  if (ctx.conversationStats) {
    summaryLines.push(
      `Chat messages: ${ctx.conversationStats.total} (you: ${ctx.conversationStats.user}, ARIA: ${ctx.conversationStats.assistant})`,
    );
  }
  summaryLines.forEach((line, i) => doc.text(line, 40, 120 + i * 14));

  // Table
  const startY = 120 + summaryLines.length * 14 + 20;
  autoTable(doc, {
    startY,
    head: [["When", "Source", "Status", "Safety", "Lang", "Prompt"]],
    body: ctx.history
      .slice()
      .reverse()
      .slice(0, 200)
      .map((e) => [
        new Date(e.createdAt).toLocaleString(),
        e.source,
        e.status,
        e.safety,
        e.language ?? "—",
        e.prompt.slice(0, 110),
      ]),
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    columnStyles: { 5: { cellWidth: 230 } },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Page ${page}`, pageW - 50, doc.internal.pageSize.getHeight() - 20);
    },
  });

  return doc.output("blob");
}

export function downloadHistoryCsv(entries: TaskHistoryEntry[]) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  downloadFile(`aria-history-${stamp}.csv`, buildHistoryCsv(entries), "text/csv");
}
export function downloadHistoryJson(entries: TaskHistoryEntry[]) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  downloadFile(`aria-history-${stamp}.json`, buildHistoryJson(entries), "application/json");
}
export function downloadActivityPdf(ctx: PdfContext) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const blob = buildActivityPdf(ctx);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aria-activity-${stamp}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
