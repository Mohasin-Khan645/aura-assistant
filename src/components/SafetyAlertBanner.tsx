import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, Info, AlertTriangle, X } from "lucide-react";
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
  warn: "border-accent/40 bg-accent/15 text-accent-foreground",
  danger: "border-destructive/50 bg-destructive/10 text-destructive",
};

const OVERRIDE_TIMEOUT_MS = 8000;

export const SafetyAlertBanner = ({
  alerts,
  onProceed,
  onDismiss,
}: {
  alerts: SafetyAlert[];
  onProceed?: () => void;
  onDismiss?: () => void;
}) => {
  const [confirmStep, setConfirmStep] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OVERRIDE_TIMEOUT_MS / 1000);

  // Reset confirmation when alerts change
  useEffect(() => {
    setConfirmStep(false);
    setSecondsLeft(OVERRIDE_TIMEOUT_MS / 1000);
  }, [alerts]);

  // Countdown timer when in confirm step
  useEffect(() => {
    if (!confirmStep) return;
    if (secondsLeft <= 0) { setConfirmStep(false); return; }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [confirmStep, secondsLeft]);

  if (!alerts.length) return null;

  // Pick the highest-severity alert as the headline
  const order = ["safe", "info", "warn", "danger"] as const;
  const top = [...alerts].sort((a, b) => order.indexOf(b.level) - order.indexOf(a.level))[0];
  const Icon = ICONS[top.level] ?? ShieldAlert;
  const isDanger = top.level === "danger";

  const handleProceedClick = () => {
    if (!onProceed) return;
    if (!confirmStep) {
      setConfirmStep(true);
      setSecondsLeft(OVERRIDE_TIMEOUT_MS / 1000);
      return;
    }
    onProceed();
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "mx-3 md:mx-4 my-2 rounded-xl border px-3 py-2.5 flex items-start gap-2.5 text-xs",
        STYLES[top.level],
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-mono uppercase tracking-widest text-[10px] opacity-80">
          Trust &amp; Safety · {top.level} {alerts.length > 1 && `· ${alerts.length} issues`}
        </p>
        <ul className="space-y-0.5">
          {alerts.slice(0, 3).map((a, i) => (
            <li key={i}>
              <span className="font-semibold">{a.category}:</span>{" "}
              <span className="opacity-90">{a.message}</span>
            </li>
          ))}
          {alerts.length > 3 && (
            <li className="opacity-70 italic">+{alerts.length - 3} more</li>
          )}
        </ul>
        {confirmStep && !isDanger && (
          <p className="text-[10px] font-mono opacity-80 pt-1 border-t border-current/20 mt-1.5">
            Confirm: send anyway? Auto-cancels in <strong>{secondsLeft}s</strong>.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        {onProceed && !isDanger && (
          <button
            onClick={handleProceedClick}
            className={cn(
              "text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-md border transition-smooth",
              confirmStep
                ? "border-current bg-current/20 hover:bg-current/30"
                : "border-current/30 hover:bg-current/10",
            )}
          >
            {confirmStep ? `Confirm (${secondsLeft})` : "Send anyway"}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-md hover:bg-current/10 transition-smooth opacity-70 inline-flex items-center gap-1 justify-center"
            aria-label="Dismiss alert"
          >
            <X className="w-3 h-3" /> Dismiss
          </button>
        )}
      </div>
    </div>
  );
};
