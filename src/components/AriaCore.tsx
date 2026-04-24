import { cn } from "@/lib/utils";

interface AriaCoreProps {
  state: "idle" | "listening" | "thinking" | "speaking";
  size?: number;
}

export const AriaCore = ({ state, size = 220 }: AriaCoreProps) => {
  const isActive = state !== "idle";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={`ARIA ${state}`}
    >
      {/* Outer pulse rings */}
      <div
        className={cn(
          "absolute inset-0 rounded-full border border-primary/30",
          isActive && "pulse-ring"
        )}
      />
      <div
        className={cn(
          "absolute inset-4 rounded-full border border-primary/20",
          isActive && "pulse-ring"
        )}
        style={{ animationDelay: "0.3s" }}
      />

      {/* Rotating rings */}
      <svg
        className="absolute inset-0 core-rotate"
        viewBox="0 0 100 100"
        fill="none"
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          stroke="hsl(var(--primary) / 0.5)"
          strokeWidth="0.4"
          strokeDasharray="2 6"
        />
      </svg>
      <svg
        className="absolute inset-3 core-rotate-reverse"
        viewBox="0 0 100 100"
        fill="none"
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          stroke="hsl(var(--accent) / 0.4)"
          strokeWidth="0.3"
          strokeDasharray="1 4"
        />
      </svg>

      {/* Core orb */}
      <div
        className={cn(
          "relative rounded-full transition-all duration-500",
          state === "thinking" && "animate-pulse",
        )}
        style={{
          width: size * 0.55,
          height: size * 0.55,
          background: "var(--gradient-core)",
          boxShadow: isActive ? "var(--shadow-glow)" : "var(--shadow-glow-soft)",
        }}
      >
        <div className="absolute inset-0 rounded-full bg-primary/20 backdrop-blur-md" />
        <div
          className="absolute inset-[15%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, hsl(var(--primary-glow)), hsl(var(--primary) / 0.6) 50%, transparent 75%)",
          }}
        />

        {/* Voice bars when speaking/listening */}
        {(state === "listening" || state === "speaking") && (
          <div className="absolute inset-0 flex items-center justify-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="voice-bar w-1 rounded-full bg-primary-foreground/90"
                style={{
                  height: `${30 + (i % 3) * 12}%`,
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
