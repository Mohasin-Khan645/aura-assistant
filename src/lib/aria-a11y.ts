// Accessibility contrast verification — checks key semantic token pairs
// against WCAG 2.1 AA thresholds (4.5:1 for normal text, 3:1 for large/UI).
// Runs in dev only; logs a compact report to the console so we catch
// regressions when tweaking the design system.

type HSL = { h: number; s: number; l: number };

const parseHsl = (raw: string): HSL | null => {
  const m = raw.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) return null;
  return { h: +m[1], s: +m[2], l: +m[3] };
};

const hslToRgb = ({ h, s, l }: HSL): [number, number, number] => {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
};

const relLuminance = ([r, g, b]: [number, number, number]) => {
  const [R, G, B] = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

export const contrastRatio = (a: string, b: string): number | null => {
  const A = parseHsl(a); const B = parseHsl(b);
  if (!A || !B) return null;
  const L1 = relLuminance(hslToRgb(A));
  const L2 = relLuminance(hslToRgb(B));
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
};

type Pair = { name: string; fg: string; bg: string; min: number };

const PAIRS: Pair[] = [
  { name: "foreground / background",      fg: "--foreground",         bg: "--background",         min: 4.5 },
  { name: "primary-fg / primary",         fg: "--primary-foreground", bg: "--primary",            min: 4.5 },
  { name: "muted-fg / background",        fg: "--muted-foreground",   bg: "--background",         min: 4.5 },
  { name: "secondary-fg / secondary",     fg: "--secondary-foreground", bg: "--secondary",        min: 4.5 },
  { name: "primary / background (UI)",    fg: "--primary",            bg: "--background",         min: 3.0 },
  { name: "accent-fg / accent",           fg: "--accent-foreground",  bg: "--accent",             min: 4.5 },
];

export type ContrastReport = {
  theme: "light" | "dark";
  results: { name: string; ratio: number; min: number; pass: boolean }[];
  failures: number;
};

export const auditContrast = (): ContrastReport | null => {
  if (typeof document === "undefined") return null;
  const styles = getComputedStyle(document.documentElement);
  const theme: "light" | "dark" =
    document.documentElement.classList.contains("light") ? "light" : "dark";
  const results = PAIRS.map((p) => {
    const fg = styles.getPropertyValue(p.fg);
    const bg = styles.getPropertyValue(p.bg);
    const ratio = contrastRatio(fg, bg) ?? 0;
    return { name: p.name, ratio: +ratio.toFixed(2), min: p.min, pass: ratio >= p.min };
  });
  return { theme, results, failures: results.filter((r) => !r.pass).length };
};

export const logContrastAudit = () => {
  const report = auditContrast();
  if (!report) return;
  const tag = report.failures
    ? `%c[a11y] ${report.theme} contrast — ${report.failures} issue(s)`
    : `%c[a11y] ${report.theme} contrast — all pass ✓`;
  const style = report.failures
    ? "color:#f97316;font-weight:600"
    : "color:#22c55e;font-weight:600";
  console.groupCollapsed(tag, style);
  console.table(report.results);
  console.groupEnd();
};
