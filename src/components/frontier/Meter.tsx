import { cn } from "@/lib/utils";

export function Meter({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="eyebrow !text-[10px]">{label}</span>
        <span className={cn("font-mono text-xs tabular-nums", highlight ? "text-mineral" : "text-foreground")}>
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-1.5 flex gap-[2px]" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className={cn("h-1.5 flex-1 transition-colors duration-500", i < Math.round(value / 5) ? "bg-primary" : "bg-border")}
          />
        ))}
      </div>
    </div>
  );
}
