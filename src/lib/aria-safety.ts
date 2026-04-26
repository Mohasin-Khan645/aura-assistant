// Trust & Safety: detect risky patterns in user input before sending to model.
export type SafetyLevel = "safe" | "info" | "warn" | "danger";

export type SafetyAlert = {
  level: SafetyLevel;
  category: string;
  message: string;
};

const PATTERNS: { regex: RegExp; level: SafetyLevel; category: string; message: string }[] = [
  // Secrets
  { regex: /\b(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/, level: "danger", category: "API key", message: "Looks like an API key. Don't share secrets in chat." },
  { regex: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/, level: "danger", category: "Private key", message: "Private key detected. Remove before sending." },
  // PII
  { regex: /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/, level: "danger", category: "Card number", message: "Possible credit card number. Avoid sharing." },
  { regex: /\b\d{3}-\d{2}-\d{4}\b/, level: "warn", category: "SSN", message: "Possible SSN-like number." },
  { regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, level: "info", category: "Email", message: "Email address shared." },
  { regex: /\b(\+?\d[\d\s().-]{8,}\d)\b/, level: "info", category: "Phone", message: "Phone number shared." },
  // Destructive shell / SQL
  { regex: /\brm\s+-rf\s+\/(?!\w)/, level: "danger", category: "Destructive shell", message: "Destructive `rm -rf /` command." },
  { regex: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, level: "warn", category: "Destructive SQL", message: "Destructive SQL statement detected." },
  // Prompt injection
  { regex: /\b(ignore|disregard)\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts?)\b/i, level: "warn", category: "Prompt injection", message: "Possible prompt-injection phrasing." },
  { regex: /\bsystem\s*[:=]\s*["'`]?you\s+are\b/i, level: "warn", category: "Prompt injection", message: "Attempt to override system prompt." },
];

export function scanInput(text: string): SafetyAlert[] {
  if (!text || text.length < 4) return [];
  const found: SafetyAlert[] = [];
  const seen = new Set<string>();
  for (const p of PATTERNS) {
    if (p.regex.test(text)) {
      const key = `${p.category}:${p.level}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ level: p.level, category: p.category, message: p.message });
    }
  }
  return found;
}

export function highestLevel(alerts: SafetyAlert[]): SafetyLevel {
  const order: SafetyLevel[] = ["safe", "info", "warn", "danger"];
  return alerts.reduce<SafetyLevel>((acc, a) => (order.indexOf(a.level) > order.indexOf(acc) ? a.level : acc), "safe");
}
