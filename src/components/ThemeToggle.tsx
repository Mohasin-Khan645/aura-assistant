import { Moon, Sun, Monitor, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ThemeMode, ResolvedTheme } from "@/lib/aria-theme";

type Props = {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  onChange: (mode: ThemeMode) => void;
};

const OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun; hint: string }[] = [
  { value: "light",  label: "Light",  icon: Sun,     hint: "Bright surfaces" },
  { value: "dark",   label: "Dark",   icon: Moon,    hint: "ARIA neon core" },
  { value: "system", label: "System", icon: Monitor, hint: "Follow OS" },
];

export function ThemeToggle({ mode, resolved, onChange }: Props) {
  const ActiveIcon = mode === "system" ? Monitor : resolved === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary hover:bg-primary/10 relative"
          aria-label={`Theme: ${mode} (currently ${resolved})`}
          title={`Theme: ${mode} · displaying ${resolved}`}
        >
          <ActiveIcon className="w-5 h-5" />
          {mode === "system" && (
            <span
              aria-hidden
              className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent shadow-accent-glow"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Appearance
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = mode === opt.value;
          return (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn("gap-2 cursor-pointer", active && "bg-primary/10")}
            >
              <Icon className="w-4 h-4 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="text-sm">{opt.label}</div>
                <div className="text-[10px] text-muted-foreground">{opt.hint}</div>
              </div>
              {active && <Check className="w-3.5 h-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
