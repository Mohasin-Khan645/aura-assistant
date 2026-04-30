import { useEffect, useState } from "react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import {
  Globe, Image as ImageIcon, Cloud, Calculator, Search, Clock,
  Settings as SettingsIcon, LogOut, ShieldAlert,
} from "lucide-react";
import { scanInput, highestLevel, type SafetyAlert } from "@/lib/aria-safety";
import { toast } from "sonner";
import { log } from "@/lib/aria-logger";

export type LauncherCommand = {
  id: string;
  label: string;
  hint?: string;
  group: "Quick actions" | "Navigation" | "System";
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  prompt?: string; // sent into chat input
  run?: () => void; // direct action
};

type Props = {
  onSendPrompt: (text: string) => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
};

export function TaskLauncher({ onSendPrompt, onOpenSettings, onSignOut }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commands: LauncherCommand[] = [
    { id: "open-yt", label: "Open YouTube", group: "Quick actions", icon: Globe, prompt: "Open YouTube" },
    { id: "weather", label: "Check weather", group: "Quick actions", icon: Cloud, prompt: "What's the weather right now?" },
    { id: "image", label: "Generate an image", group: "Quick actions", icon: ImageIcon, prompt: "Generate an image of " },
    { id: "calc", label: "Quick calculation", group: "Quick actions", icon: Calculator, prompt: "Calculate " },
    { id: "search", label: "Search the web", group: "Quick actions", icon: Search, prompt: "Search Google for " },
    { id: "time", label: "What time is it?", group: "Quick actions", icon: Clock, prompt: "What time is it?" },
    { id: "settings", label: "Open settings", group: "Navigation", icon: SettingsIcon, shortcut: "⌘,", run: onOpenSettings },
    { id: "signout", label: "Sign out", group: "System", icon: LogOut, run: onSignOut },
  ];

  const runPrompt = (prompt: string) => {
    // Command safety layer — scan before dispatching
    const alerts: SafetyAlert[] = scanInput(prompt);
    const level = highestLevel(alerts);
    if (level === "danger") {
      toast.error("Blocked by safety layer", {
        description: alerts.map((a) => `${a.category}: ${a.message}`).join(" • "),
        icon: <ShieldAlert className="w-4 h-4" />,
      });
      log.warn("[launcher] blocked", { level, alerts });
      return;
    }
    if (level === "warn") {
      toast.warning("Safety warning", {
        description: alerts.map((a) => a.message).join(" • "),
      });
    }
    onSendPrompt(prompt);
  };

  const handle = (c: LauncherCommand) => {
    setOpen(false);
    if (c.run) {
      c.run();
      return;
    }
    if (c.prompt) runPrompt(c.prompt);
  };

  const groups = ["Quick actions", "Navigation", "System"] as const;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…  (⌘K / Ctrl+K)" />
      <CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>
        {groups.map((g, gi) => {
          const items = commands.filter((c) => c.group === g);
          if (!items.length) return null;
          return (
            <div key={g}>
              {gi > 0 && <CommandSeparator />}
              <CommandGroup heading={g}>
                {items.map((c) => {
                  const Icon = c.icon;
                  return (
                    <CommandItem key={c.id} onSelect={() => handle(c)}>
                      {Icon && <Icon className="mr-2 h-4 w-4 opacity-80" />}
                      <span>{c.label}</span>
                      {c.shortcut && <CommandShortcut>{c.shortcut}</CommandShortcut>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
