// Production-safe logger. In prod, only warn/error are emitted, and we strip
// anything that looks like a Supabase JWT or bearer token before printing.
const isProd = import.meta.env.PROD;

const SECRET_RE = /(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})|(Bearer\s+[A-Za-z0-9._-]+)/g;

function scrub(args: unknown[]): unknown[] {
  return args.map((a) => {
    if (typeof a === "string") return a.replace(SECRET_RE, "[redacted]");
    if (a instanceof Error) return a.message.replace(SECRET_RE, "[redacted]");
    try {
      return JSON.parse(JSON.stringify(a, (_k, v) =>
        typeof v === "string" ? v.replace(SECRET_RE, "[redacted]") : v,
      ));
    } catch {
      return a;
    }
  });
}

export const log = {
  debug: (...a: unknown[]) => { if (!isProd) console.debug(...scrub(a)); },
  info: (...a: unknown[]) => { if (!isProd) console.info(...scrub(a)); },
  warn: (...a: unknown[]) => console.warn(...scrub(a)),
  error: (...a: unknown[]) => console.error(...scrub(a)),
};

/** Verify required Vite env vars are present at runtime (no values printed). */
export function assertEnv() {
  const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;
  const missing = required.filter((k) => !import.meta.env[k]);
  if (missing.length) {
    const msg = `Missing required env vars: ${missing.join(", ")}. Configure them on your host (e.g. Render → Environment).`;
    log.error(msg);
    if (typeof document !== "undefined") {
      const el = document.createElement("div");
      el.style.cssText = "position:fixed;inset:0;background:#0a0f1f;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;font:14px ui-monospace,monospace;text-align:center;z-index:99999";
      el.textContent = msg;
      document.body.appendChild(el);
    }
    return false;
  }
  return true;
}
