import { Gem, TriangleAlert } from "lucide-react";
import { formatImpact, type Territory } from "@/data/territories";
import { cn } from "@/lib/utils";

export function ValueFactors({ t, className }: { t: Territory; className?: string }) {
  return (
    <div className={cn("grid gap-4", className)}>
      <div>
        <p className="eyebrow !text-[10px]">Recursos que valorizam</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {t.resources.map((r) => (
            <li
              key={r.label}
              className="flex items-center gap-1.5 border border-mineral/40 bg-mineral/10 px-2 py-1.5 font-mono text-[10px] leading-snug"
            >
              <Gem className="h-3 w-3 shrink-0 text-mineral" />
              {r.label}
              <span className="tabular-nums text-mineral">{formatImpact(r.impact)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="eyebrow !text-[10px]">Riscos que desvalorizam</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {t.risks.map((r) => (
            <li
              key={r.label}
              className="flex items-center gap-1.5 border border-destructive/40 bg-destructive/10 px-2 py-1.5 font-mono text-[10px] leading-snug"
            >
              <TriangleAlert className="h-3 w-3 shrink-0 text-destructive" />
              {r.label}
              <span className="tabular-nums text-destructive">{formatImpact(r.impact)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
