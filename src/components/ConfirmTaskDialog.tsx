// Generic confirmation dialog for high-risk or user-confirmed tasks.
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert, AlertTriangle } from "lucide-react";
import type { SafetyLevel } from "@/lib/aria-safety";

type Props = {
  open: boolean;
  prompt: string;
  level: SafetyLevel;
  reasons?: string[];
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmTaskDialog({ open, prompt, level, reasons, onCancel, onConfirm }: Props) {
  const dangerous = level === "danger";
  const Icon = dangerous ? ShieldAlert : AlertTriangle;
  const tone = dangerous ? "text-destructive" : "text-amber-500";

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${tone}`} />
            Confirm task
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>You're about to run:</p>
              <pre className="text-xs bg-muted/60 border border-border rounded-md p-2 max-h-40 overflow-auto whitespace-pre-wrap text-foreground">
                {prompt}
              </pre>
              {reasons && reasons.length > 0 && (
                <ul className={`text-xs list-disc pl-5 ${tone}`}>
                  {reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                Press <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> to confirm,{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> to cancel.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            autoFocus
            className={dangerous ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            Run anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
