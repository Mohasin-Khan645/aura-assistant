import { ShieldAlert, ShieldCheck, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SafetyAlert } from "@/lib/aria-safety";

const ICONS = {
  info: Info,
  warn: AlertTriangle,
  danger: ShieldAlert,
  safe: ShieldCheck,
} as const;

const STYLES: Record<SafetyAlert["level"], string> = {
  safe: "border-primary/20 bg-primary/5 text-primary",
  info: "border-primary/30 bg-primary/10 text-primary",
  warn: "border-accent/40 bg-accent/10 text-accent-foreground",
  danger: "border-destructive/50 bg-destructive/10 text-destructive",
};

export const SafetyAlertBanner = ({
  alerts,
  onProceed,
  onDismiss,
}: {
  alerts: SafetyAlert[];
  onProceed?: () => void;
  onDismiss?: () => void;
}) => {
  if (!alerts.length) return null;
  const top = alerts[0];
  const Icon = ICONS[top.level] ?? ShieldAlert;

  return (
    <div
      role="alert"
      className={cn(
        "mx-3 md:mx-4 my-2 rounded-xl border px-3 py-2.5 flex items-start gap-2.5 text-xs",
        STYLES[top.level],
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-mono uppercase tracking-widest text-[10px] opacity-80">
          Trust &amp; Safety · {top.level}
        </p>
        <ul className="space-y-0.5">
          {alerts.slice(0, 3).map((a, i) => (
            <li key={i}>
              <span className="font-semibold">{a.category}:</span>{" "}
              <span className="opacity-90">{a.message}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-1.5 shrink-0">
        {onProceed && top.level !== "danger" && (
          <button
            onClick={onProceed}
            className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-md border border-current/30 hover:bg-current/10 transition-smooth"
          >
            Send anyway
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-md hover:bg-current/10 transition-smooth opacity-70"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};
