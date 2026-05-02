// Keyboard shortcuts cheat sheet — opened with `?`.
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

type Props = { open: boolean; onOpenChange: (o: boolean) => void };

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["⌘/Ctrl", "K"], label: "Open command launcher" },
  { keys: ["/"],            label: "Focus chat input" },
  { keys: ["?"],            label: "Show this shortcuts panel" },
  { keys: ["Esc"],          label: "Close dialogs / stop voice" },
  { keys: ["↑", "↓"],       label: "Recall previous commands (in launcher)" },
  { keys: ["Enter"],        label: "Send message / confirm action" },
  { keys: ["Shift", "Enter"], label: "Newline in input (where supported)" },
  { keys: ["⌘/Ctrl", "."],  label: "Toggle voice output mute" },
  { keys: ["⌘/Ctrl", "L"],  label: "Clear conversation" },
];

export function KeyboardShortcutsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Speed up everything you do with ARIA.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="px-1.5 py-0.5 bg-muted border border-border rounded text-[11px] font-mono text-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
